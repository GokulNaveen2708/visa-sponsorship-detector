// src/meta.js
// Job metadata extraction + improved posted-date parsing + freshness
// Exposes window.VisaDetector.meta

(function (ns) {
  ns = ns || (window.VisaDetector = window.VisaDetector || {});
  ns.meta = ns.meta || {};

  // small helper to get visible text of an element
  ns.meta.textOf = function (el) {
    try {
      return (el && (el.innerText || el.textContent)) ? (el.innerText || el.textContent).trim() : '';
    } catch (e) {
      return '';
    }
  };

  // Extract a "posted X ago" snippet from messy text.
  // Handles "3 months ago", "3 mo", "3mos", "3m", "Posted 3 days ago", "3 months ago • Remote", ISO dates, and "Sep 27, 2025".
  // Extract a "posted" token — supports "3 months ago", "3 mo", "3h", "3 hrs", "30m", "today", ISO, "Sep 27, 2025"
  ns.meta.extractPostedFromText = function (text) {
    if (!text) return '';
    const t = String(text);

    // Primary patterns include "X ago" forms and "today/yesterday"
    const patterns = [
      /\b(?:posted[:\s]*)?(\d+)\s*(minutes?|mins?|min|m(?!o\b)|hours?|hrs?|hr|h|days?|d|weeks?|w|months?|mos?|mo|mth|years?|yrs?|y)\s*ago\b/i,
      /\b(?:posted[:\s]*)?(today|yesterday|just now)\b/i,
      /\b(\d{4}-\d{2}-\d{2})\b/,                         // ISO
      /\b([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{0,4})\b/        // "Sep 27, 2025" style
    ];

    for (const rx of patterns) {
      const m = t.match(rx);
      if (m) return m[0].trim();
    }

    // Short forms like "3h", "3 h", "3 hrs", "30m", "30 min", "2d", "1w" (no 'ago')
    const shortForms = [
      /(^|\s)(\d{1,2})\s*(h|hr|hrs)\b/i,    // hours
      /(^|\s)(\d{1,3})\s*(m|min|mins)\b/i,  // minutes
      /(^|\s)(\d{1,2})\s*(d|day|days)\b/i,  // days
      /(^|\s)(\d{1,2})\s*(w|wk|weeks?)\b/i, // weeks
      /(^|\s)(\d{1,2})\s*(mo|mos|months?)\b/i // months
    ];
    for (const rx of shortForms) {
      const m = t.match(rx);
      if (m) {
        // return a normalized readable token (we'll parse it later)
        return (m[2] + ' ' + m[3]).trim();
      }
    }

    // Split on bullets/pipes and re-test parts
    const parts = t.split(/[\u2022•|·–—-]+/).map(s => s.trim());
    for (const p of parts) {
      for (const rx of patterns.concat(shortForms)) {
        const m = p.match(rx);
        if (m) return m[0].trim();
      }
    }

    // Last resort: any "X ago" anywhere
    const anyAgo = t.match(/(\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?|mo|years?|yrs?)\s*ago)/i);
    if (anyAgo) return anyAgo[0].trim();

    return '';
  };


  // Parse a dateText (possibly messy) to a Date object, or return null if unknown.
  // Accepts outputs from extractPostedFromText or raw strings like ISO/friendly.
  ns.meta.parseDateTextToISO = function (dateText) {
    if (!dateText) return null;
    let candidate = String(dateText).trim();

    // If candidate is a messy string, try extracting a compact token
    try {
      const ext = ns.meta.extractPostedFromText(candidate);
      if (ext) candidate = ext;
    } catch (e) { /* ignore */ }

    const s = candidate.toLowerCase();

    // direct ISO / friendly parse
    const iso = Date.parse(s);
    if (!isNaN(iso)) return new Date(iso);

    // Patterns:
    // - "3 months ago", "5 days ago"
    const rel = s.match(/(\d+)\s*(months?|mos?|mth|minutes?|mins?|min|hours?|hrs?|hr|days?|weeks?|years?|yrs?|h|d|w|m|y)s?\s*ago/);
    if (rel) {
      const n = parseInt(rel[1], 10);
      const unit = rel[2];
      const now = new Date();
      // Check longer units first to avoid 'm' matching before 'months'
      if (/^(months?|mos?|mth)$/i.test(unit)) { now.setMonth(now.getMonth() - n); return now; }
      if (/^(minutes?|mins?|min|m)$/i.test(unit)) { now.setMinutes(now.getMinutes() - n); return now; }
      if (/^(hours?|hrs?|hr|h)$/i.test(unit)) { now.setHours(now.getHours() - n); return now; }
      if (/^(days?|d)$/i.test(unit)) { now.setDate(now.getDate() - n); return now; }
      if (/^(weeks?|w)$/i.test(unit)) { now.setDate(now.getDate() - n * 7); return now; }
      if (/^(years?|yrs?|y)$/i.test(unit)) { now.setFullYear(now.getFullYear() - n); return now; }
    }

    // Short forms without "ago": "3 h", "3h", "30 m", "3d", "1w"
    // Check longer units first: months before minutes
    const short = s.match(/(^|\s)(\d+)\s*(months?|mos?|mo|hrs?|hr|h|mins?|min|m|days?|d|weeks?|wk|w)\b/);
    if (short) {
      const n = parseInt(short[2], 10);
      const unit = short[3];
      const now = new Date();
      if (/^(months?|mos?|mo)$/i.test(unit)) { now.setMonth(now.getMonth() - n); return now; }
      if (/^(hrs?|hr|h)$/i.test(unit)) { now.setHours(now.getHours() - n); return now; }
      if (/^(mins?|min|m)$/i.test(unit)) { now.setMinutes(now.getMinutes() - n); return now; }
      if (/^(days?|d)$/i.test(unit)) { now.setDate(now.getDate() - n); return now; }
      if (/^(weeks?|wk|w)$/i.test(unit)) { now.setDate(now.getDate() - n * 7); return now; }
    }

    // relative words
    if (/\byesterday\b/.test(s)) { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
    if (/\btoday\b|\bjust now\b/.test(s)) return new Date();

    // friendly parse after removing ordinals
    const friendly = Date.parse(s.replace(/(\d+)(st|nd|rd|th)/gi, '$1'));
    if (!isNaN(friendly)) return new Date(friendly);

    return null;
  };


  // Compute freshness bucket from Date object
  ns.meta.computeFreshness = function (dateObj) {
    if (!dateObj) return { daysAgo: null, label: 'Unknown', emoji: '❔', color: '#cccccc' };
    const now = new Date();
    const diffMs = now - dateObj;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 3) return { daysAgo: days, label: 'Hot', emoji: '🔥', color: '#ff4d4f' };
    if (days <= 7) return { daysAgo: days, label: 'Warm', emoji: '🟠', color: '#ff7a45' };
    if (days <= 30) return { daysAgo: days, label: 'Neutral', emoji: '🟡', color: '#fadb14' };
    return { daysAgo: days, label: 'Cold', emoji: '🧊', color: '#87a6f9' };
  };

  // Robust extraction of company, title, posted date and full JD (LinkedIn-first then fallbacks)
  ns.meta.extractJobMetaAndFullJD = function () {
    let company = '', title = '', dateText = '', fullJD = '';

    const textOf = ns.meta.textOf;
    const host = (location.hostname || '').toLowerCase();

    // 1) LinkedIn top card / job view variants
    try {
      const topCard = document.querySelector('.jobs-unified-top-card') ||
        document.querySelector('.jobs-unified-top-card__content') ||
        document.querySelector('.topcard') ||
        document.querySelector('.jobs-top-card') ||
        document.querySelector('[data-job-id]') ||
        null;

      if (topCard) {
        // title attempts
        const titleSelectors = [
          '.jobs-unified-top-card__job-title',
          'h1.jobs-unified-top-card__job-title',
          'h1.topcard__title',
          '[data-test-job-title]',
          'h1',
          '[role="heading"]'
        ];
        for (const sel of titleSelectors) {
          const el = topCard.querySelector(sel);
          const t = textOf(el);
          if (t && t.length > 1 && !/^(top job picks|linkedin|jobs for you|recommended jobs)$/i.test(t.trim())) { title = t; break; }
        }
        if (!title) {
          const headings = Array.from(topCard.querySelectorAll('h1,h2,[role="heading"]')).map(el => textOf(el)).filter(Boolean);
          if (headings.length) {
            headings.sort((a, b) => b.length - a.length);
            title = headings[0];
          }
        }

        // company attempts
        const companySelectors = [
          'a.jobs-unified-top-card__company-name-link',
          '.jobs-unified-top-card__company-name',
          'a.topcard__org-name-link',
          '.topcard__flavor--link',
          '[data-test-company-name]',
          '.topcard__flavor'
        ];
        for (const sel of companySelectors) {
          const el = topCard.querySelector(sel);
          const c = textOf(el);
          if (c && c.length > 1) { company = c; break; }
        }
        if (!company) {
          const anchors = Array.from(topCard.querySelectorAll('a[href]'));
          for (const a of anchors) {
            const href = (a.getAttribute('href') || '').toLowerCase();
            if (href.includes('/company/') || href.includes('/cmp/') || href.includes('/companies/')) {
              const c = textOf(a);
              if (c && c.length > 1) { company = c; break; }
            }
          }
        }

        // date attempts inside top
        const dateSelectors = [
          '.posted-time-ago__text',
          '.jobs-unified-top-card__posted-date',
          '[data-test-job-posted-date]',
          '.posted-date',
          '.topcard__flavor--metadata'
        ];
        for (const sel of dateSelectors) {
          const el = topCard.querySelector(sel);
          const d = textOf(el);
          if (d && d.length > 1) {
            // extract a clean posted token if possible
            dateText = ns.meta.extractPostedFromText(d) || d;
            break;
          }
        }

        // if still no dateText, try to sniff "X ago" in the topCard text
        if (!dateText) {
          const txt = textOf(topCard).slice(0, 400);
          const postedRegex = /(\d+\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?|mo|years?|yrs?)\s*ago|today|yesterday|just now)/i;
          const m = txt.match(postedRegex);
          if (m) dateText = m[0].trim();
        }
      }
    } catch (e) {
      // ignore top-card extraction errors
      console.debug('[VisaDetector][meta] topCard extraction error', e);
    }

    // 2) JSON-LD / OG fallbacks
    try {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent);
          const arr = Array.isArray(data) ? data : [data];
          for (const obj of arr) {
            if (!obj) continue;
            if (!title && obj.title && obj.title.trim()) title = obj.title;
            if (!company && obj.hiringOrganization && obj.hiringOrganization.name) company = obj.hiringOrganization.name;
            if (!dateText && obj.datePosted) dateText = ns.meta.extractPostedFromText(obj.datePosted) || obj.datePosted;
          }
        } catch (e) { /* ignore invalid JSON-LD */ }
      }
    } catch (e) { /* ignore */ }

    // 3) Generic heading fallback (if we still lack a title)
    if (!title) {
      try {
        const h1 = document.querySelector('h1');
        if (h1 && textOf(h1)) title = textOf(h1);
      } catch (e) { }
    }
    if (!title) {
      try {
        const headings = Array.from(document.querySelectorAll('[role="heading"], h2, h3')).map(el => ({ t: textOf(el), el }));
        if (headings.length) {
          headings.sort((a, b) => b.t.length - a.t.length);
          title = headings[0].t || '';
        }
      } catch (e) { }
    }

    // 4) Company fallback: search anchors site-wide for company-like links
    if (!company) {
      try {
        const anchors = Array.from(document.querySelectorAll('a[href]'));
        for (const a of anchors) {
          const href = (a.getAttribute('href') || '').toLowerCase();
          if (href.includes('/company/') || href.includes('/cmp/') || href.includes('/companies/') || href.includes('/employers/')) {
            const t = textOf(a);
            if (t) { company = t; break; }
          }
        }
      } catch (e) { }
    }
    if (!company) {
      try {
        const sels = ['.company', '.job-company', '[data-company]', '.topcard__org-name', '.jobs-unified-top-card__company-name'];
        for (const s of sels) {
          const el = document.querySelector(s);
          if (el && textOf(el)) { company = textOf(el); break; }
        }
      } catch (e) { }
    }

    // strip obvious suffixes from title
    if (title) {
      title = title.replace(/\s+[-–|]\s*LinkedIn\s*$/i, '').trim();
      title = title.replace(/\s+[—–-]\s*[\w\s]{1,50}$/, '').trim();
    }

    // 5.5) Greenhouse-specific metadata extraction
    if (host.includes('greenhouse.io')) {
      try {
        if (!title) {
          const ghTitle = document.querySelector('.app-title') || document.querySelector('h1.heading');
          if (ghTitle && textOf(ghTitle)) title = textOf(ghTitle);
        }
        if (!company) {
          const ghCompany = document.querySelector('.company-name') || document.querySelector('span.company-name');
          if (ghCompany && textOf(ghCompany)) company = textOf(ghCompany);
          // Greenhouse often has company in the page title: "Job at CompanyName"
          if (!company) {
            const pageTitle = document.title || '';
            const atMatch = pageTitle.match(/at\s+(.+?)(?:\s*[-–|]|$)/i);
            if (atMatch && atMatch[1]) company = atMatch[1].trim();
          }
        }
      } catch (e) { }
    }

    // 5) Full JD extraction (host-specific selectors then tree walker fallback)
    try {
      const selectorsByHost = {
        'linkedin.com': ['.jobs-description__container', '.jobs-description__content', '.description__text', '[data-test-job-details]', '.jobs-box__html-content'],
        'indeed.com': ['#jobDescriptionText', '.jobsearch-JobComponent-description'],
        'greenhouse.io': ['#content', '.job-post-content', '#job_description', '.job__description', '[data-mapped="true"]']
      };
      const hostKey = Object.keys(selectorsByHost).find(k => host.includes(k));
      const sels = hostKey ? selectorsByHost[hostKey] : ['#jobDescriptionText', '.jobsearch-JobComponent-description', '.jobs-description__container', '.description__text', '[data-test-job-details]'];
      for (const s of sels) {
        try {
          const el = document.querySelector(s);
          if (el && textOf(el) && textOf(el).length > 20) { fullJD = textOf(el); break; }
        } catch (e) { }
      }
    } catch (e) { /* ignore */ }

    if (!fullJD) {
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => {
            const v = (n.nodeValue || '').trim();
            if (!v) return NodeFilter.FILTER_REJECT;
            const p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
            const tag = p.nodeName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'iframe', 'button', 'input', 'textarea', 'a'].includes(tag)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let text = '', count = 0;
        while (walker.nextNode() && count < 1500) {
          text += ' ' + walker.currentNode.nodeValue;
          count++;
          if (text.length > 200000) break;
        }
        fullJD = text.replace(/\s+/g, ' ').trim();
      } catch (e) { }
    }
    // ===== aggressive extra search for posted date (for collection/recommended pages) =====
    if (!dateText) {
      try {
        // 1) If we have currentJobId (collection/recommended view), check that card
        const jobIdMatch = (location.href.match(/jobs\/view\/(\d+)/) || location.search.match(/currentJobId=(\d+)/) || []);
        const jobId = jobIdMatch[1];
        if (jobId) {
          const card = document.querySelector(`[data-job-id="${jobId}"]`) || document.querySelector(`[data-job-id*="${jobId}"]`);
          if (card) {
            const txt = (card.innerText || '').slice(0, 1200);
            const m = txt.match(/(\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?|mo|years?|yrs?)\s*ago|today|yesterday|just now|\d+\s*(?:h|hr|hrs|m|min|mins|d|w|mo)\b)/i);
            if (m) dateText = m[0].trim();
          }
        }

        // 2) Scan nearby small text nodes likely to show "X ago"
        if (!dateText) {
          const candEls = Array.from(document.querySelectorAll('time, span, div, a')).filter(el => {
            try {
              const t = (el.innerText || '').trim();
              return t && t.length < 80 && /ago|posted|today|yesterday|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2}|(^|\s)\d+(h|hr|hrs|m|min|mins|d|w|mo)\b/i.test(t);
            } catch (e) { return false; }
          }).slice(0, 60);

          for (const el of candEls) {
            const t = (el.innerText || '').trim();
            const extracted = ns.meta.extractPostedFromText(t);
            if (extracted) { dateText = extracted; break; }
          }
        }

        // 3) meta/time attributes fallback
        if (!dateText) {
          dateText = document.querySelector('meta[property="article:published_time"]')?.content
            || document.querySelector('meta[name="date"]')?.content || '';
          if (dateText) dateText = ns.meta.extractPostedFromText(dateText) || dateText;
        }

        // 4) global page scan (last resort)
        if (!dateText) {
          const globalMatch = (document.body.innerText || '').slice(0, 20000).match(/(\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|mos?|mo|years?|yrs?)\s*ago|today|yesterday|just now|[A-Za-z]{3,9}\s+\d{1,2},?\s*\d{0,4}|\d{4}-\d{2}-\d{2}|(^|\s)\d+(h|hr|hrs|m|min|mins|d|w|mo)\b)/i);
          if (globalMatch) dateText = globalMatch[0].trim();
        }
      } catch (e) {
        console.debug('[VisaDetector][meta] aggressive date fallback error', e);
      }
    }
    // ===== end aggressive fallback =====


    // final normalization
    company = (company || '').trim();
    title = (title || '').trim();
    dateText = (dateText || '').trim();
    fullJD = (fullJD || '').trim();

    return { company, title, dateText, fullJD };
  };

  // expose finished namespace
  ns.meta = ns.meta;

})(window.VisaDetector = window.VisaDetector || {});
