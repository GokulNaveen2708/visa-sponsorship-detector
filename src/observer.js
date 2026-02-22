// src/observer.js
// SPA helpers + MutationObserver wiring for VisaDetector
// Exposes window.VisaDetector.observer

(function (ns) {
  ns = ns || (window.VisaDetector = window.VisaDetector || {});
  ns.observer = ns.observer || {};

  // Wrap history push/replace to emit a 'locationchange' event
  // Uses a shared global flag to prevent double-wrapping from inject.js fallback
  ns.observer.enableLocationChangeEvents = function enableLocationChangeEvents() {
    try {
      if (window.__visaLocationWrapped) return;
      const wrap = (type) => {
        const orig = history[type];
        return function () {
          const rv = orig.apply(this, arguments);
          try { window.dispatchEvent(new Event('locationchange')); } catch(e) {}
          return rv;
        };
      };
      history.pushState = wrap('pushState');
      history.replaceState = wrap('replaceState');
      window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
      window.__visaLocationWrapped = true;
      console.debug('[VisaDetector][observer] locationchange wrapper installed');
    } catch (err) {
      console.warn('[VisaDetector][observer] enableLocationChangeEvents failed', err);
    }
  };

  // Check if a node is inside our own UI (to avoid infinite observer loops)
  function isOwnUI(node) {
    try {
      let n = node;
      while (n) {
        if (n.id === 'visa-detector-root') return true;
        n = n.parentNode || n.host; // host for shadow DOM
      }
    } catch (e) {}
    return false;
  }

  // Attach a robust MutationObserver to a stable parent node
  // doRescan: function to call when meaningful mutations occur
  ns.observer.tryAttachObservers = function tryAttachObservers(doRescan) {
    try {
      // disconnect old observer if present
      if (window.__visaJobObserver) {
        try { window.__visaJobObserver.disconnect(); } catch (e) {}
        window.__visaJobObserver = null;
      }

      // Candidate selectors in order of preference
      const candidateSelectors = [
        '.jobs-unified-top-card',
        '.jobs-unified-top-card__content',
        '.jobs-description__container',
        '[data-test-job-details]',
        'main',
        '#main',
        'body'
      ];

      let attachNode = null;
      for (const sel of candidateSelectors) {
        try {
          const el = document.querySelector(sel);
          if (el && el.innerText && el.innerText.length > 40) { attachNode = el; break; }
        } catch (e) {}
      }
      if (!attachNode) attachNode = document.body;

      // MutationObserver callback — skip mutations from our own UI
      const observerCb = (mutationsList) => {
        let relevant = false;
        for (const m of mutationsList) {
          // Skip any mutation that targets our own extension UI
          if (isOwnUI(m.target)) continue;

          // Also check added/removed nodes
          let allOwn = true;
          if (m.addedNodes && m.addedNodes.length) {
            for (const n of m.addedNodes) { if (!isOwnUI(n)) { allOwn = false; break; } }
            if (allOwn) continue;
          }

          if (m.type === 'characterData') { relevant = true; break; }
          if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) { relevant = true; break; }
          if (m.type === 'attributes') { relevant = true; break; }
        }
        if (relevant) {
          try { doRescan && doRescan(); } catch (e) { console.warn('[VisaDetector][observer] doRescan invocation failed', e); }
        }
      };

      const obs = new MutationObserver(observerCb);
      obs.observe(attachNode, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'data-job-id', 'data-test-job-details', 'aria-hidden', 'data-occludable-job-id']
      });

      window.__visaJobObserver = obs;
      console.debug('[VisaDetector][observer] attached MutationObserver to', attachNode);
    } catch (err) {
      console.warn('[VisaDetector][observer] tryAttachObservers failed', err);
    }
  };

  // Simple poller that dispatches locationchange when URL changes (fallback)
  ns.observer.startHrefPoller = function startHrefPoller(intervalMs = 700) {
    try {
      if (window.__visaHrefPoller) return;
      window.__visaLastHref = location.href;
      window.__visaHrefPoller = setInterval(() => {
        try {
          if (location.href !== (window.__visaLastHref || '')) {
            window.__visaLastHref = location.href;
            window.dispatchEvent(new Event('locationchange'));
          }
        } catch (e) {}
      }, intervalMs);
      console.debug('[VisaDetector][observer] href poller started');
    } catch (err) {
      console.warn('[VisaDetector][observer] startHrefPoller failed', err);
    }
  };

})(window.VisaDetector = window.VisaDetector || {});
