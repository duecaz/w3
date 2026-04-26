/* ==========================================================================
   MENU-DRAWER.JS — overlay fullscreen mobile + accordion submenús
   --------------------------------------------------------------------------
   · Toggle por hamburguesa (.nav-toggle).
   · Cierra con: Escape, click en link hoja, cambio a desktop.
   · Submenús accordion: click en .menu-drawer-link[aria-expanded] togglea.
   · Focus trap mientras está abierto.
   · Bloquea scroll del body con .no-scroll en <html>.
   · Aplica inert al <main>.
   · NO toca el .nav directamente. Despacha CustomEvent('drawer:open' /
     'drawer:close') en `document` y deja que otros módulos reaccionen
     (nav-scroll.js → marca is-menu-open; futuro hero.js → pausar slideshow).
     Esto desacopla el drawer de quien escucha y permite que cualquier
     módulo se subscriba sin que menu-drawer.js lo conozca.

   Secciones (Ctrl+F):
     1) ELEMENTOS Y CONFIG
     2) HELPERS (isOpen, focusables)
     3) OPEN / CLOSE
     4) SUBMENÚS (accordion)
     5) LISTENERS
   ========================================================================== */

(() => {

  // === 1) ELEMENTOS Y CONFIG =================================================
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.querySelector('.menu-drawer');
  const main   = document.querySelector('main');

  if (!toggle || !drawer) return;

  const mqDesktop = matchMedia('(min-width: 960px)');


  // === 2) HELPERS ============================================================
  const isOpen = () => drawer.classList.contains('is-open');

  // Lista de elementos enfocables visibles dentro del drawer (focus trap).
  const focusables = () => drawer.querySelectorAll(
    'a, button, [tabindex]:not([tabindex="-1"])'
  );


  // === 3) OPEN / CLOSE =======================================================
  const open = () => {
    toggle.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    drawer.classList.add('is-open');
    document.documentElement.classList.add('no-scroll');
    if (main) main.setAttribute('inert', '');
    document.dispatchEvent(new CustomEvent('drawer:open'));
    focusables()[0]?.focus();
  };

  const close = () => {
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('no-scroll');
    if (main) main.removeAttribute('inert');
    // Colapsa submenús abiertos al cerrar el drawer
    drawer.querySelectorAll('[aria-expanded="true"]').forEach(b => {
      if (b !== toggle) b.setAttribute('aria-expanded', 'false');
    });
    document.dispatchEvent(new CustomEvent('drawer:close'));
    toggle.focus();
  };


  // === 4) SUBMENÚS (accordion) ==============================================
  // Cualquier .menu-drawer-link con aria-expanded actúa como toggle de su sublist.
  drawer.querySelectorAll('.menu-drawer-link[aria-expanded]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (mqDesktop.matches) return;          // en desktop el drawer está oculto
      e.preventDefault();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  });


  // === 5) LISTENERS ==========================================================

  toggle.addEventListener('click', () => isOpen() ? close() : open());

  // Escape cierra; Tab queda atrapado dentro del drawer.
  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const list = [...focusables()];
      if (!list.length) return;
      const first = list[0];
      const last  = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Click en un link "hoja" (sin submenu) cierra el drawer.
  drawer.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && !mqDesktop.matches) close();
  });

  // Si el usuario cambia a desktop con el drawer abierto, limpia estado.
  mqDesktop.addEventListener('change', e => {
    if (e.matches && isOpen()) close();
  });
})();
