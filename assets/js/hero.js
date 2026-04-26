/* ==========================================================================
   HERO.JS — carrusel con autoplay + touch swipe + play/pause + a11y
   --------------------------------------------------------------------------
   · Autoplay basado en animationend de la barra de progreso (no setInterval),
     así pausa/reanuda es natural y no requiere recalcular timers.
   · Pausa al hover, focus, drag o click en el botón pause (CSS, una regla).
   · Swipe táctil con Pointer Events (mouse + touch + pen unificados).
   · Counter "01 / 03" + aria-live para screen readers.
   · prefers-reduced-motion → arranca pausado.

   Secciones (Ctrl+F):
     1) ELEMENTOS Y ESTADO
     2) HELPERS (fmt, announce)
     3) setActive(i) — el corazón del slider
     4) AUTOPLAY (animationend)
     5) BARRAS — click + teclado
     6) PLAY / PAUSE
     7) SWIPE — Pointer Events
     8) INIT
   ========================================================================== */

(() => {

  // === 1) ELEMENTOS Y ESTADO =================================================
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const track    = hero.querySelector('.hero-track');
  const slides   = [...hero.querySelectorAll('.hero-slide')];
  const items    = [...hero.querySelectorAll('.hero-progress-item')];
  const counter  = hero.querySelector('.hero-counter__current');
  const totalEl  = hero.querySelector('.hero-counter__total');
  const live     = hero.querySelector('[data-hero-live]');
  const playBtn  = hero.querySelector('.hero-playpause');

  // Salida temprana si la marcación está incompleta (un slide solo, mismatch...).
  if (!track || slides.length < 2 || items.length !== slides.length) return;

  const total = slides.length;
  let current = 0;
  // Detección persistente: lo consultamos en cada gesto, no solo al cargar,
  // por si el usuario cambia la preferencia del sistema en caliente.
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused  = mqReduce.matches;

  if (totalEl) totalEl.textContent = String(total).padStart(2, '0');


  // === 2) HELPERS ============================================================

  // "1" → "01", para el counter
  const fmt = (n) => String(n + 1).padStart(2, '0');

  // Anuncia al lector de pantalla cuando cambia el slide
  const announce = (i) => {
    if (!live) return;
    const title = slides[i].querySelector('.hero-title')?.textContent.trim() || '';
    live.textContent = `Slide ${i + 1} de ${total}: ${title}`;
  };


  // === 3) setActive(i) — el corazón del slider ===============================
  // Centraliza TODO el cambio de slide: clases, theme, counter, a11y, cleanup.
  // Cualquier acción que cambia el slide (auto, click, swipe, teclado) llama acá.
  const setActive = (i) => {
    slides.forEach((s, idx) => {
      const on = idx === i;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('inert', !on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (!on) s.style.transform = '';   // limpia transform de drag previo
    });
    items.forEach((it, idx) => {
      it.classList.toggle('is-active', idx === i);
      it.classList.toggle('is-done',   idx <  i);
      it.setAttribute('aria-selected', idx === i ? 'true' : 'false');
      it.setAttribute('tabindex',      idx === i ? '0' : '-1');
    });
    const theme = slides[i].dataset.theme;
    if (theme) hero.dataset.theme = theme;
    if (counter) counter.textContent = fmt(i);
    announce(i);
    current = i;
  };

  const next = () => setActive((current + 1) % total);
  const prev = () => setActive((current - 1 + total) % total);


  // === 4) AUTOPLAY ===========================================================
  // La barra activa anima scaleX(0→1) en --slide-dur (5s). Cuando termina,
  // dispara animationend y avanzamos. Pausa = animation-play-state: paused.
  hero.addEventListener('animationend', (e) => {
    if (!e.target.classList.contains('hero-progress-fill')) return;
    if (!items[current].contains(e.target)) return;
    next();
  });


  // === 5) BARRAS — click + teclado ===========================================
  items.forEach((it, idx) => {
    // Click: si es la activa, reinicia su animación (force reflow).
    it.addEventListener('click', () => {
      if (idx === current) {
        it.classList.remove('is-active');
        void it.offsetWidth;
        it.classList.add('is-active');
      } else {
        setActive(idx);
      }
    });
    // Flechas: navegan entre slides y mueven el foco a la barra activa.
    it.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault(); next(); items[current].focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault(); prev(); items[current].focus();
      }
    });
  });


  // === 6) PLAY / PAUSE =======================================================
  const setPaused = (p) => {
    paused = p;
    hero.classList.toggle('is-paused', p);
    if (playBtn) {
      playBtn.setAttribute('aria-label',  p ? 'Reanudar slideshow' : 'Pausar slideshow');
      playBtn.setAttribute('aria-pressed', String(p));
    }
  };
  setPaused(paused);
  playBtn?.addEventListener('click', () => setPaused(!paused));


  // === 7) SWIPE — Pointer Events =============================================
  // Una sola API moderna unifica mouse + touch + pen.
  //   - touch-action: pan-y (CSS) deja pasar scroll vertical nativo.
  //   - Lock direccional: si el gesto es vertical, abandonamos.
  //   - Feedback visual sutil: el slide activo se traslada con factor 0.25.
  //   - Threshold 60px para confirmar cambio de slide.
  const SWIPE_TH    = 60;
  const DRAG_FACTOR = 0.25;
  let drag = null;   // { x, y, id, dx, locked }

  // 7a) inicio del gesto
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // No interceptamos clicks sobre controles internos (CTAs, barras).
    if (e.target.closest('a, button')) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, locked: false };
    track.setPointerCapture(e.pointerId);
  });

  // 7b) movimiento — decide dirección y aplica transform
  track.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    // Lock direction al primer movimiento significativo
    if (!drag.locked) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }  // gesto vertical → abandono
      drag.locked = true;
      hero.classList.add('is-dragging');
    }

    drag.dx = dx;
    slides[current].style.transform = `translateX(${dx * DRAG_FACTOR}px)`;
  });

  // 7c) fin del gesto — decide si cambia o vuelve
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const dx    = drag.dx;
    const slide = slides[current];

    hero.classList.remove('is-dragging');

    // Respeta prefers-reduced-motion: snap-back instantáneo, sin animación.
    // En modo normal, .is-snapping aplica transition: transform var(--t-base).
    // Limpiamos la clase con transitionend (no necesitamos magic numbers).
    if (mqReduce.matches) {
      slide.style.transform = '';
    } else {
      slide.classList.add('is-snapping');
      slide.style.transform = '';
      const cleanup = () => slide.classList.remove('is-snapping');
      slide.addEventListener('transitionend', cleanup, { once: true });
    }

    if (Math.abs(dx) > SWIPE_TH) (dx < 0 ? next : prev)();
    drag = null;
  };
  track.addEventListener('pointerup',     endDrag);
  track.addEventListener('pointercancel', endDrag);


  // === 8) INIT ===============================================================
  setActive(0);
})();
