/* Conservative consent gate: no ad request until certified CMP signals consent.
 * A home-made cookie checkbox is deliberately not treated as TCF consent. */
(function () {
  'use strict';
  const config = window.FI_ADS;
  const production = config.productionHosts.includes(location.hostname);
  let permitted = false, loaded = false, requested = false, observer;
  const slots = () => [...document.querySelectorAll('ins[data-ad-client]')];
  function eligible(el) {
    return !el.dataset.fiRequested && !el.dataset.adsbygoogleStatus && el.getBoundingClientRect().width > 0 && el.getClientRects().length > 0;
  }
  function request(el) {
    if (!permitted || !loaded || !eligible(el)) return;
    const rect = el.getBoundingClientRect();
    if (rect.top > innerHeight + 200 || rect.bottom < -200) return;
    el.classList.add('adsbygoogle');
    el.dataset.fiRequested = 'true';
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (error) { console.warn('Annuncio non disponibile', error); }
  }
  function observe() {
    if (!observer) observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) request(entry.target); }), { rootMargin: '200px' });
    slots().forEach(el => { observer.observe(el); request(el); });
  }
  function start() {
    if (!production || !permitted || requested) return;
    requested = true;
    const script = document.createElement('script');
    script.async = true; script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.client;
    script.onload = () => { loaded = true; observe(); };
    script.onerror = () => { document.documentElement.classList.add('fi-ads-unavailable'); };
    document.head.appendChild(script);
  }
  function consent(data, success) {
    if (!success || data.cmpStatus !== 'loaded' || !['tcloaded', 'useractioncomplete'].includes(data.eventStatus)) return;
    const next = data.gdprApplies === false || (data.gdprApplies === true && data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true);
    const revocation = permitted && !next;
    permitted = next;
    document.documentElement.classList.toggle('fi-ads-consented', next);
    if (revocation && requested) { location.reload(); return; }
    if (next) start();
  }
  window.FIAds = {
    refresh: () => { if (permitted && loaded) observe(); },
    preferences: () => {
      if (production && typeof window.googlefc?.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
      else alert(production ? 'Le preferenze sono disponibili quando il messaggio di consenso Google è attivo. Nel frattempo non vengono richiesti annunci.' : 'Anteprima locale: nessun annuncio reale e nessun cookie pubblicitario.');
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-privacy-preferences]').forEach(button => button.addEventListener('click', window.FIAds.preferences));
    slots().forEach(el => {
      el.classList.remove('adsbygoogle');
      const wrapper = el.parentElement;
      wrapper.classList.add('fi-ad-space');
      const label = document.createElement('span'); label.className = 'fi-ad-label'; label.textContent = production ? 'Pubblicità' : 'Spazio pubblicitario · anteprima senza annunci';
      wrapper.prepend(label);
      if (!production) wrapper.classList.add('fi-ad-preview');
      new MutationObserver(() => { if (el.dataset.adStatus === 'unfilled') wrapper.hidden = true; }).observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    });
    if (!production) return;
    // Google Funding Choices loads only on the real domain. Account-side message publication is required.
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    let subscribed = false;
    const attach = () => {
      if (subscribed || typeof window.__tcfapi !== 'function') return;
      subscribed = true; window.__tcfapi('addEventListener', 2, consent);
    };
    window.googlefc.callbackQueue.push({ CONSENT_API_READY: attach });
    const cmp = document.createElement('script'); cmp.async = true;
    cmp.src = 'https://fundingchoicesmessages.google.com/i/' + config.publisher + '?ers=1';
    cmp.onload = attach; document.head.appendChild(cmp);
    let attempts = 0;
    const timer = setInterval(() => { attach(); if (subscribed || ++attempts >= 30) clearInterval(timer); }, 1000);
  });
})();
