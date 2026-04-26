# Refactor v0.5.1 — `@layer` en CSS (recomendación #2)

Cambia el control de la cascada de "depende del orden de los `<link>`" a
"lo declaras explícitamente con un `@layer` en `<head>`". A partir de aquí,
añadir, quitar o reordenar archivos CSS no puede invertir la cascada.

## Cambio núcleo

En `<head>`, **antes** de los `<link>`:

```html
<style>@layer reset, tokens, base, layout, component, debug;</style>
```

El orden de izquierda a derecha = de menor a mayor prioridad. Una regla en
una capa más a la derecha gana, sin importar specificity ni orden de archivos.

Cada CSS está envuelto en su capa:

```css
/* nav.css */
@layer component {
  .nav { ... }
}

/* debug.css */
@layer debug {
  body.debug * { outline: ... }   /* gana siempre, aunque tenga specificity baja */
}
```

## Ganancias concretas

- **Adiós a las guerras de specificity en el futuro.** Cuando agregues una
  librería de form, modals, datepicker... sus reglas viven en su propia capa
  (o sin capa = pierden contra todo lo declarado). Tu CSS gana sin `!important`.
- **Reordenar `<link>` no rompe nada.** El orden visual solo importa dentro
  de la misma capa.
- **Override semántico explícito.** `@layer debug` siempre gana → puedes
  usar selectores simples (`.foo`) en debug sin pelear contra componentes.

## Archivos modificados

Todos los CSS quedaron envueltos en `@layer X { ... }`, con el comentario de
cabecera intacto encima del wrapper:

| Archivo | Capa |
|---|---|
| `assets/css/reset.css` | `reset` |
| `assets/css/tokens.css` | `tokens` |
| `assets/css/base.css` | `base` |
| `assets/css/layout/container.css` | `layout` |
| `assets/css/layout/grid.css` | `layout` |
| `assets/css/layout/split.css` | `layout` |
| `assets/css/components/nav.css` | `component` |
| `assets/css/components/menu-bar.css` | `component` |
| `assets/css/components/menu-drawer.css` | `component` |
| `assets/css/components/button.css` | `component` |
| `assets/css/components/hero.css` | `component` |
| `assets/css/components/card.css` | `component` |
| `assets/css/debug.css` | `debug` |

Y en `index.html`:
- Declaración `<style>@layer reset, tokens, base, layout, component, debug;</style>` añadida en `<head>` antes de los `<link>`.
- `--version` bumpeada a `v0.5.1` y los 16 cache-busters `?v=0.5.1`.

## Cómo aplicar (PowerShell, desde la raíz de `w2`)

```powershell
$base = "https://raw.githubusercontent.com/ssmael14/nuevo/claude/extract-website-styles-NkVGx/w2-fix"

# index.html (declaración @layer + cache busters v0.5.1)
curl.exe -fsSL "$base/index.html"                                 -o index.html

# Foundation
curl.exe -fsSL "$base/assets/css/tokens.css"                      -o assets/css/tokens.css
curl.exe -fsSL "$base/assets/css/reset.css"                       -o assets/css/reset.css
curl.exe -fsSL "$base/assets/css/base.css"                        -o assets/css/base.css
curl.exe -fsSL "$base/assets/css/debug.css"                       -o assets/css/debug.css

# Layout
curl.exe -fsSL "$base/assets/css/layout/container.css"            -o assets/css/layout/container.css
curl.exe -fsSL "$base/assets/css/layout/grid.css"                 -o assets/css/layout/grid.css
curl.exe -fsSL "$base/assets/css/layout/split.css"                -o assets/css/layout/split.css

# Components
curl.exe -fsSL "$base/assets/css/components/nav.css"              -o assets/css/components/nav.css
curl.exe -fsSL "$base/assets/css/components/menu-bar.css"         -o assets/css/components/menu-bar.css
curl.exe -fsSL "$base/assets/css/components/menu-drawer.css"      -o assets/css/components/menu-drawer.css
curl.exe -fsSL "$base/assets/css/components/button.css"           -o assets/css/components/button.css
curl.exe -fsSL "$base/assets/css/components/hero.css"             -o assets/css/components/hero.css
curl.exe -fsSL "$base/assets/css/components/card.css"             -o assets/css/components/card.css

# JS sin cambios respecto a v0.5.0 (lo bajo igual por completitud)
curl.exe -fsSL "$base/assets/js/menu-drawer.js"                   -o assets/js/menu-drawer.js
```

Equivalente bash/zsh:

```bash
base=https://raw.githubusercontent.com/ssmael14/nuevo/claude/extract-website-styles-NkVGx/w2-fix
files=(
  index.html
  assets/css/tokens.css
  assets/css/reset.css
  assets/css/base.css
  assets/css/debug.css
  assets/css/layout/container.css
  assets/css/layout/grid.css
  assets/css/layout/split.css
  assets/css/components/nav.css
  assets/css/components/menu-bar.css
  assets/css/components/menu-drawer.css
  assets/css/components/button.css
  assets/css/components/hero.css
  assets/css/components/card.css
  assets/js/menu-drawer.js
)
for f in "${files[@]}"; do curl -fsSL "$base/$f" -o "$f"; done
```

## Verificación

```powershell
Select-String -Path index.html -Pattern '@layer reset, tokens'
Select-String -Path assets\css\tokens.css -Pattern '--version'
Get-ChildItem assets\css -Recurse -Filter '*.css' | ForEach-Object {
  $first = (Get-Content $_.FullName | Select-String '^@layer').Line
  "{0,-50}  {1}" -f $_.Name, $first
}
```

Tras refrescar `duecaz.github.io/w2/`:
- Badge de la esquina debe leer **DEBUG v0.5.1**.
- Visualmente nada cambia (capas no alteran el render actual; solo aseguran el orden a futuro).

## Cómo añadir nuevos archivos CSS de aquí en adelante

1. Crea el archivo, e.g. `assets/css/components/footer.css`.
2. Envuelve su contenido en `@layer component { ... }`.
3. Añádelo en `index.html` con `?v=` actualizado.
4. Listo — no importa dónde esté en el orden de `<link>`.

Si algún día metes una librería externa (datepicker, modal, etc.) sin
control de su CSS, su código vivirá fuera de toda capa = mayor prioridad
que cualquier capa. Para domarla, envuélvela tú:

```html
<style>
  @import url("https://cdn.example/datepicker.css") layer(vendor);
</style>
```

Y declara `vendor` en el orden que toque:

```html
<style>@layer reset, tokens, base, layout, vendor, component, debug;</style>
```

Aquí `vendor` queda entre `layout` y `component`: tus componentes ganan,
pero la librería gana contra layout / base / reset.

## Soporte

`@layer` funciona en **Chrome 99+, Firefox 97+, Safari 15.4+** (todos
desde marzo 2022). En navegadores anteriores, todo el CSS se ignora — pero
ese rango ya está fuera de cualquier matriz de soporte razonable.
