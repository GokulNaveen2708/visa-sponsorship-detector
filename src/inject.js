// src/inject.js
// Bootstrap + rescan wiring for VisaDetector content script
// Uses window.VisaDetector.* modules if present, but includes safe fallbacks.

(function () {
  // short helpers and defensive fallbacks
  const fallbackDebounce = (fn, ms = 300) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => { try { fn(...a); } catch (e) { console.error('[VisaDetector][fallback] debounced fn error', e); } }, ms); };
  };

  // Wait a moment for other modules to attach to window.VisaDetector
  const MAX_WAIT = 1200;
  const POLL = 80;
  const start = Date.now();

  // ---- Result cache by job UID for instant re-visits ----
  const resultCache = new Map();
  const CACHE_MAX = 50;

  function startWhenReady() {
    const ns = window.VisaDetector || {};
    const haveUtils = !!(ns.utils && typeof ns.utils.debounce === 'function');
    const utils = haveUtils ? ns.utils : { debounce: fallbackDebounce };

    const doRescan = utils.debounce(() => {
      try {
        // URL guard: only run on job pages (LinkedIn SPA can navigate to profiles)
        const href = location.href.toLowerCase();
        const isJobPage = href.includes('/jobs/') || href.includes('/jobs?') ||
          href.includes('indeed.com/viewjob') || href.includes('indeed.com/jobs') ||
          href.includes('greenhouse.io/');
        if (!isJobPage) {
          // Not a job page — remove UI if present and bail
          const staleUI = document.getElementById('visa-detector-root');
          if (staleUI) try { staleUI.remove(); } catch (e) { }
          return;
        }

        const VD = window.VisaDetector || {};
        const metaModule = VD.meta || null;
        const detector = VD.detector || null;
        const ui = VD.ui || null;
        const keywords = VD.keywords || null;

        // extract fresh meta at start of each rescan
        let meta = { company: '', title: '', dateText: '', fullJD: '' };
        try { if (metaModule && typeof metaModule.extractJobMetaAndFullJD === 'function') meta = metaModule.extractJobMetaAndFullJD(); } catch (e) { console.warn('[VisaDetector] meta extraction error', e); }

        // determine a job-unique id
        function getJobUID() {
          const byUrl = (location.href.match(/jobs\/view\/(\d+)/) || location.search.match(/currentJobId=(\d+)/) || [])[1];
          if (byUrl) return 'jobid:' + byUrl;
          return 'snap:' + ((meta.title || '').slice(0, 120)) + '|' + ((meta.company || '').slice(0, 80));
        }
        const currentJobUID = getJobUID();

        // if job changed, remove UI to avoid stale refs and force full rebuild
        if (!window.__visaLastJobUID) window.__visaLastJobUID = null;
        if (window.__visaLastJobUID !== currentJobUID) {
          console.debug('[VisaDetector] job changed from', window.__visaLastJobUID, 'to', currentJobUID);
          window.__visaLastJobUID = currentJobUID;
          const existing = document.getElementById('visa-detector-root');
          if (existing) {
            try { existing.remove(); } catch (e) { }
          }
        }

        // check cache first for instant re-visits
        const cached = resultCache.get(currentJobUID);
        if (cached && window.__visaLastJobUID === currentJobUID && document.getElementById('visa-detector-root')) {
          // UI already showing for this job — skip
          return;
        }

        // run detection — pass full JD text to avoid redundant DOM scrape
        let res = { status: 'unknown', reason: 'no-detector', snippet: '' };
        try {
          if (detector && typeof detector.detectVisaSponsorship === 'function') {
            // Check the FUNCTION's arity, not the namespace object
            const fn = detector.detectVisaSponsorship;
            try {
              if (fn.length >= 1) {
                res = fn(meta.fullJD || '');
              } else {
                res = fn();
              }
            } catch (inner) {
              console.warn('[VisaDetector] detector threw', inner);
              res = { status: 'unknown', reason: 'detector-error', snippet: meta.fullJD ? meta.fullJD.slice(0, 400) : '' };
            }
          }
        } catch (e) {
          console.error('[VisaDetector] detection failed', e);
        }

        // ensure snippet presence
        if (!res.snippet || !res.snippet.length) res.snippet = (meta.fullJD || '').slice(0, 600);

        // Known-sponsor check: if JD doesn't mention sponsorship, check if company is a known sponsor
        const sponsorsModule = VD.sponsors || null;
        if ((res.status === 'unknown' || res.status === 'ambiguous') && sponsorsModule && typeof sponsorsModule.check === 'function') {
          try {
            const sponsorCheck = sponsorsModule.check(meta.company);
            if (sponsorCheck.isKnown) {
              res = {
                status: 'yes',
                reason: 'known-sponsor',
                match: sponsorCheck.matchedName,
                snippet: res.snippet
              };
              console.debug('[VisaDetector] company', meta.company, 'matched known sponsor:', sponsorCheck.matchedName);
            }
          } catch (e) { console.warn('[VisaDetector] sponsor check failed', e); }
        }

        // extract tech keywords
        let techKeywords = [];
        try {
          if (keywords && typeof keywords.extract === 'function') {
            techKeywords = keywords.extract(meta.fullJD || '');
          }
        } catch (e) { console.warn('[VisaDetector] keyword extraction failed', e); }

        // Handle AI hybrid path for ambiguous sentences
        if (res.status === 'ambiguous' && res.sentence) {
          console.debug('[VisaDetector] Found ambiguous sentence for AI:', res.sentence);

          // 1. Instantly show a loading UI
          const loadingRes = { ...res, status: 'loading', reason: 'ai-analyzing' };
          try {
            if (ui && typeof ui.createOrUpdateSidebar === 'function') {
              ui.createOrUpdateSidebar(Object.assign({}, loadingRes, { meta, techKeywords }));
            }
          } catch (e) { }

          // 2. Message the background worker for AI inference
          chrome.runtime.sendMessage(
            { type: 'ANALYZE_SENTENCE', sentence: res.sentence },
            (response) => {
              if (chrome.runtime.lastError || !response) {
                console.error('[VisaDetector] AI messaging failed', chrome.runtime.lastError);
                response = { status: 'unknown', reason: 'ai-error', match: 'AI failed to respond' };
              }

              const finalRes = { ...res, ...response };
              finalRes.snippet = res.snippet || res.sentence;

              if (resultCache.size > CACHE_MAX) {
                const firstKey = resultCache.keys().next().value;
                resultCache.delete(firstKey);
              }
              resultCache.set(currentJobUID, { res: finalRes, meta, techKeywords });

              try {
                if (ui && typeof ui.createOrUpdateSidebar === 'function') {
                  ui.createOrUpdateSidebar(Object.assign({}, finalRes, { meta, techKeywords }));
                }
              } catch (e) { }
            }
          );

          return; // The async callback handles caching and the final UI update
        }

        // --- Normal Flow ---

        // cache the result
        if (resultCache.size > CACHE_MAX) {
          const firstKey = resultCache.keys().next().value;
          resultCache.delete(firstKey);
        }
        resultCache.set(currentJobUID, { res, meta, techKeywords });

        // update UI — pass meta and keywords to avoid double extraction
        try {
          if (ui && typeof ui.createOrUpdateSidebar === 'function') {
            ui.createOrUpdateSidebar(Object.assign({}, res, { meta, techKeywords }));
          } else {
            console.debug('[VisaDetector] ui module missing — logging res', res);
          }
        } catch (e) {
          console.error('[VisaDetector] ui.createOrUpdateSidebar failed', e);
        }

      } catch (err) { console.error('[VisaDetector] doRescan top-level error', err); }
    }, 150); // reduced from 220ms for faster response

    // expose
    window.__visaDetector = window.__visaDetector || {};
    window.__visaDetector.doRescan = doRescan;

    // wire message listener for background/popup
    try {
      if (chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
          if (msg && msg.action === 'visaRescan') {
            console.debug('[VisaDetector] received visaRescan message');
            doRescan();
            sendResp && sendResp({ ok: true });
            return true;
          }
        });
      }
    } catch (e) { console.warn('[VisaDetector] chrome.runtime not available', e); }

    // enable SPA detection via observer module (if present) or fallback
    // Uses shared flag to prevent double history-wrapping
    try {
      const obsModule = window.VisaDetector && window.VisaDetector.observer;
      if (obsModule && typeof obsModule.enableLocationChangeEvents === 'function') {
        obsModule.enableLocationChangeEvents();
      } else if (!window.__visaLocationWrapped) {
        // fallback history wrapper
        const _wr = (type) => {
          const orig = history[type];
          return function () { const rv = orig.apply(this, arguments); window.dispatchEvent(new Event('locationchange')); return rv; };
        };
        history.pushState = _wr('pushState');
        history.replaceState = _wr('replaceState');
        window.addEventListener('popstate', () => window.dispatchEvent(new Event('locationchange')));
        window.__visaLocationWrapped = true;
        console.debug('[VisaDetector] history fallback installed');
      }
    } catch (e) { console.warn('[VisaDetector] SPA wiring failed', e); }

    // on locationchange: ask observer to attach and run rescan
    window.addEventListener('locationchange', () => {
      setTimeout(() => {
        try { window.VisaDetector && window.VisaDetector.observer && window.VisaDetector.observer.tryAttachObservers && window.VisaDetector.observer.tryAttachObservers(window.__visaDetector.doRescan); } catch (e) { }
        try { window.__visaDetector.doRescan && window.__visaDetector.doRescan(); } catch (e) { }
      }, 200);
    });

    // start href poller through observer if present else start basic poller
    try {
      if (window.VisaDetector && window.VisaDetector.observer && typeof window.VisaDetector.observer.startHrefPoller === 'function') {
        window.VisaDetector.observer.startHrefPoller();
      } else {
        if (!window.__visaHrefPoller) {
          window.__visaLastHref = location.href;
          window.__visaHrefPoller = setInterval(() => {
            if (location.href !== (window.__visaLastHref || '')) {
              window.__visaLastHref = location.href;
              window.dispatchEvent(new Event('locationchange'));
            }
          }, 700);
          console.debug('[VisaDetector] injected local href poller fallback');
        }
      }
    } catch (e) { console.warn('[VisaDetector] starting href poller failed', e); }

    // initial attach + scan
    try { window.VisaDetector && window.VisaDetector.observer && window.VisaDetector.observer.tryAttachObservers && window.VisaDetector.observer.tryAttachObservers(window.__visaDetector.doRescan); } catch (e) { }
    try { window.__visaDetector.doRescan && window.__visaDetector.doRescan(); } catch (e) { }

    console.debug('[VisaDetector] inject bootstrap started. Utils present:', haveUtils);
  }

  // Wait briefly for other scripts to attach, then start
  function waitForStart() {
    if (window.VisaDetector && (window.VisaDetector.utils || Date.now() - start > MAX_WAIT)) {
      return startWhenReady();
    }
    setTimeout(waitForStart, POLL);
  }
  waitForStart();

  // --- Self-healing health checks ---

  function healOnce() {
    try {
      console.debug('[VisaDetector][health] running healOnce check');
      // ensure observer exists
      if (window.VisaDetector && window.VisaDetector.observer && typeof window.VisaDetector.observer.tryAttachObservers === 'function') {
        try {
          window.VisaDetector.observer.tryAttachObservers(window.__visaDetector && window.__visaDetector.doRescan);
        } catch (e) { console.warn('[VisaDetector][health] tryAttachObservers error', e); }
      }

      // ensure doRescan is available
      if (!window.__visaDetector || typeof window.__visaDetector.doRescan !== 'function') {
        try {
          if (window.VisaDetector && window.VisaDetector.utils && typeof window.VisaDetector.utils.debounce === 'function') {
            window.__visaDetector = window.__visaDetector || {};
            window.__visaDetector.doRescan = window.VisaDetector.utils.debounce(() => {
              try {
                const metaM = window.VisaDetector.meta;
                const det = window.VisaDetector.detector;
                const ui = window.VisaDetector.ui;
                const kw = window.VisaDetector.keywords;
                const meta = metaM && metaM.extractJobMetaAndFullJD ? metaM.extractJobMetaAndFullJD() : {};
                let res = { status: 'unknown', reason: 'no-detector', snippet: meta.fullJD || '' };
                if (det && typeof det.detectVisaSponsorship === 'function') {
                  const fn = det.detectVisaSponsorship;
                  try { res = fn.length >= 1 ? fn(meta.fullJD || '') : fn(); }
                  catch (inner) { console.warn('[VisaDetector][health] detector error', inner); }
                }
                const techKeywords = kw && typeof kw.extract === 'function' ? kw.extract(meta.fullJD || '') : [];
                if (ui && typeof ui.createOrUpdateSidebar === 'function') ui.createOrUpdateSidebar(Object.assign({}, res, { meta, techKeywords }));
              } catch (err) { console.error('[VisaDetector][health] re-created doRescan failed', err); }
            }, 150);
            console.info('[VisaDetector][health] re-exposed doRescan');
          }
        } catch (e) { console.warn('[VisaDetector][health] failed to re-expose doRescan', e); }
      }

      // ensure UI exists; if missing, call doRescan to recreate it
      const root = document.getElementById('visa-detector-root');
      if (!root) {
        try { window.__visaDetector && window.__visaDetector.doRescan && window.__visaDetector.doRescan(); } catch (e) { }
      }

      // if observer lost, ensure poller is running — properly guard and assign
      if (!window.__visaJobObserver && !window.__visaHrefPoller) {
        console.debug('[VisaDetector][health] No observer and no poller — starting fallback poller');
        window.__visaLastHref = location.href;
        const pollerId = setInterval(() => {
          if (location.href !== (window.__visaLastHref || '')) {
            window.__visaLastHref = location.href;
            window.dispatchEvent(new Event('locationchange'));
          }
        }, 900);
        window.__visaHrefPoller = pollerId;
      }
    } catch (err) {
      console.error('[VisaDetector][health] healOnce fatal', err);
    }
  }

  // run health check when page gains focus
  window.addEventListener('focus', () => { try { healOnce(); } catch (e) { } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) try { healOnce(); } catch (e) { } });

  // periodic health check (every 60s)
  if (!window.__visaHealthInterval) {
    window.__visaHealthInterval = setInterval(() => {
      try { healOnce(); } catch (e) { }
    }, 60000);
  }

  window.__visaDetectorHealth = window.__visaDetectorHealth || function () { healOnce(); console.info('[VisaDetector][health] manual run complete'); };

})();
