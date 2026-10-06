/* Decorative motion only. No library, no network, no change to inventory data. */
(function () {
  'use strict';
  function init() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    const button = document.getElementById('motion-toggle');
    const stage = document.querySelector('.ocean-stage');
    const hero = document.querySelector('.home-hero');
    let enabled, frame = 0, x = 0, y = 0;
    function reset() {
      cancelAnimationFrame(frame); frame = 0;
      stage.style.removeProperty('--tilt-x'); stage.style.removeProperty('--tilt-y');
    }
    function apply(value) {
      enabled = value && !reduced.matches;
      document.body.dataset.motion = enabled ? 'on' : 'off';
      button.textContent = enabled ? '◈ Effetti: attivi' : '◈ Effetti: fermi';
      button.setAttribute('aria-pressed', String(enabled));
      button.disabled = reduced.matches;
      button.title = reduced.matches ? 'Animazioni disattivate dalla preferenza del dispositivo' : 'Attiva o ferma i riflessi e le animazioni 3D';
      if (!enabled) reset();
    }
    let preference = 'on';
    try { preference = localStorage.getItem('fi_motion') || 'on'; } catch {}
    apply(preference !== 'off');
    button.addEventListener('click', () => {
      apply(!enabled);
      try { localStorage.setItem('fi_motion', enabled ? 'on' : 'off'); } catch {}
    });
    reduced.addEventListener('change', () => {
      try { preference = localStorage.getItem('fi_motion') || 'on'; } catch {}
      apply(preference !== 'off');
    });
    hero.addEventListener('pointermove', event => {
      if (!enabled || !pointer.matches) return;
      const rect = hero.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width - .5;
      y = (event.clientY - rect.top) / rect.height - .5;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        stage.style.setProperty('--tilt-x', (-y * 10).toFixed(2) + 'deg');
        stage.style.setProperty('--tilt-y', (x * 14).toFixed(2) + 'deg');
      });
    }, {passive:true});
    hero.addEventListener('pointerleave', reset);
    let heroVisible = true;
    const pauseAmbient = () => hero.classList.toggle('ocean-paused', document.hidden || !heroVisible);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); pauseAmbient(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; pauseAmbient(); }).observe(hero);
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (enabled) entry.target.classList.add('ocean-enter');
        observer.unobserve(entry.target);
      }), {threshold:.08});
      document.querySelectorAll('.quick-actions, .home-grid > .card, .home-editorial').forEach(el => observer.observe(el));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
