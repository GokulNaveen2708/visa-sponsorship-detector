// src/detector.js
(function (ns) {
  const u = ns.utils;

  ns.detector = ns.detector || {};

  // Load extra keywords from storage (cached for performance)
  let _extraPositive = [];
  let _extraLoaded = false;
  try {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['extraKeywords'], (result) => {
        if (result && result.extraKeywords && Array.isArray(result.extraKeywords)) {
          _extraPositive = result.extraKeywords.map(k => k.trim().toLowerCase()).filter(Boolean);
          _extraLoaded = true;
          console.debug('[VisaDetector][detector] loaded extra keywords:', _extraPositive);
        }
      });
      // Listen for changes
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.extraKeywords) {
          const newVal = changes.extraKeywords.newValue;
          _extraPositive = Array.isArray(newVal) ? newVal.map(k => k.trim().toLowerCase()).filter(Boolean) : [];
          console.debug('[VisaDetector][detector] extra keywords updated:', _extraPositive);
        }
      });
    }
  } catch (e) { /* storage not available */ }

  // Accepts optional fullJD text to avoid redundant DOM scraping
  ns.detector.detectVisaSponsorship = function (fullJDText) {
    const positivePhrases = [
      'visa sponsorship', 'will sponsor', 'can sponsor', 'sponsorship available',
      'we can sponsor', 'we will sponsor', 'sponsorship provided', 'sponsorship may be available',
      'h-1b', 'h1b', 'work visa', 'work permit', 'h1b sponsorship', 'immigration sponsorship'
    ];
    // merge user extra keywords
    const allPositive = positivePhrases.concat(_extraPositive);

    const negativePhrases = [
      'without sponsorship', 'no sponsorship', 'no visa sponsorship',
      'will not sponsor', 'does not sponsor', 'not eligible for sponsorship',
      'no visa', 'unable to sponsor', 'not able to sponsor',
      'does not provide sponsorship', 'do not provide sponsorship',
      'not provide sponsorship', 'does not offer sponsorship',
      'do not offer sponsorship', 'not offer sponsorship',
      'will not provide sponsorship', 'will not offer sponsorship'
    ];
    const requirementPhrases = [
      'must be a us citizen', 'us citizen', 'us citizenship',
      'u.s. citizen', 'u.s. citizenship',
      'united states citizen', 'must be a united states citizen',
      'citizen of the united states',
      'only us citizens', 'only u.s. citizens',
      'permanent resident', 'green card holder',
      'security clearance required', 'security clearance',
      'clearance required', 'top secret clearance',
      'ts/sci', 'secret clearance',
      'must be authorized to work in the united states without sponsorship',
      'authorized to work in the united states',
      'legally authorized to work in the u.s',
      'legally authorized to work in the united states',
      'work authorization required',
      'us work authorization', 'u.s. work authorization',
      'authorized to be employed', 'legally authorized to be employed',
      'eligible for employment'
    ];

    const posRegexes = u.buildRegexesFromPhrases(allPositive);
    const negRegexes = u.buildRegexesFromPhrases(negativePhrases);
    const reqRegexes = u.buildRegexesFromPhrases(requirementPhrases);

    // Use provided text if available, otherwise read DOM
    let rawCandidate = fullJDText || '';

    if (!rawCandidate) {
      try {
        const host = (location.hostname || '').toLowerCase();
        const selectorsByHost = {
          'linkedin.com': ['.jobs-description__container', '.jobs-description__content', '.description__text', '[data-test-job-details]'],
          'indeed.com': ['#jobDescriptionText', '.jobsearch-JobComponent-description'],
          'greenhouse.io': ['#content', '.job-post-content', '#job_description', '.job__description', '[data-mapped="true"]']
        };
        let sels = [];
        for (const k of Object.keys(selectorsByHost)) if (host.includes(k)) sels = selectorsByHost[k];
        if (!sels.length) sels = selectorsByHost['linkedin.com'];
        for (const s of sels) {
          try {
            const el = document.querySelector(s);
            if (el && el.innerText && el.innerText.trim().length > 40) { rawCandidate = el.innerText; break; }
          } catch (e) { }
        }
      } catch (e) { }

      // fallback TreeWalker (capped for performance)
      if (!rawCandidate) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => {
            const v = (n.nodeValue || '').trim();
            if (!v) return NodeFilter.FILTER_REJECT;
            const p = n.parentNode; if (!p) return NodeFilter.FILTER_REJECT;
            const tag = p.nodeName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'iframe', 'button', 'input', 'textarea', 'select', 'a'].includes(tag)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let txt = '', count = 0;
        while (walker.nextNode() && count < 800) { txt += ' ' + walker.currentNode.nodeValue; count++; if (txt.length > 150000) break; }
        rawCandidate = txt;
      }
    }

    const rawTrimmed = (rawCandidate || '').replace(/\s+/g, ' ').trim();
    if (!rawTrimmed) return { status: 'unknown', reason: 'no-text', snippet: '' };

    const normalized = u.normalizeText(rawTrimmed);

    const makeSnippet = (matchNorm) => {
      const idx = u.findIndexInRaw(rawTrimmed, matchNorm);
      if (idx >= 0) return u.extractAroundRaw(rawTrimmed, idx, matchNorm.length);
      return rawTrimmed.slice(0, 300);
    };

    for (const rx of reqRegexes) {
      const mres = rx.exec(normalized);
      if (mres) { const matchNorm = mres[0]; return { status: 'no', reason: 'requirement', match: matchNorm, snippet: makeSnippet(matchNorm) }; }
    }
    for (const rx of negRegexes) {
      const mres = rx.exec(normalized);
      if (mres) { const matchNorm = mres[0]; return { status: 'no', reason: 'explicit-negative', match: matchNorm, snippet: makeSnippet(matchNorm) }; }
    }
    for (const rx of posRegexes) {
      const mres = rx.exec(normalized);
      if (mres) {
        const matchNorm = mres[0], idxNorm = mres.index;
        const ctx = ns.detector.contextHasNegation ? ns.detector.contextHasNegation(normalized, idxNorm, matchNorm.length) : null;
        const snippet = makeSnippet(matchNorm);
        if (ctx && (ctx.kind === 'negation' || ctx.kind === 'requirement')) return { status: 'no', reason: ctx.kind, match: matchNorm, ctx: ctx.ctx, snippet };
        return { status: 'yes', reason: 'positive', match: matchNorm, snippet };
      }
    }

    // No hard matches found. Look for ambiguous terms that the AI could verify.
    const ambiguousRegex = /\b(sponsor|sponsorship|visa|h1b|h-1b)\b/i;
    const aiMatch = ambiguousRegex.exec(rawTrimmed);
    if (aiMatch) {
      const idx = aiMatch.index;
      const radius = 250; // Grab a wide chunk to find sentence boundaries
      const start = Math.max(0, idx - radius);
      const end = Math.min(rawTrimmed.length, idx + aiMatch[0].length + radius);
      const ctx = rawTrimmed.slice(start, end);

      // Snap to sentence boundaries
      const matchPosInCtx = idx - start;
      const before = ctx.slice(0, matchPosInCtx);
      const after = ctx.slice(matchPosInCtx + aiMatch[0].length);

      const beforeParts = before.split(/[.?!↵\n]+/);
      const afterParts = after.split(/[.?!↵\n]+/);

      const beforeStr = beforeParts[beforeParts.length - 1];
      const afterStr = afterParts[0];

      const cleanSentence = (beforeStr + aiMatch[0] + afterStr).trim();

      if (cleanSentence.length > 20) {
        return {
          status: 'ambiguous',
          reason: 'ai-request',
          sentence: cleanSentence,
          snippet: rawTrimmed.slice(0, 300)
        };
      }
    }

    return { status: 'unknown', reason: 'no-match', snippet: rawTrimmed.slice(0, 400) };
  };

  // small context checker — tightly bound to prevent catching unrelated words in other sentences
  ns.detector.contextHasNegation = function (normalizedText, matchIndex, matchLen) {
    const radius = 45; // reduced from 120 to prevent false negatives from adjacent sentences

    // Grab surrounding text, but cut off at sentence boundaries (.!?) to stay in-context
    const rawBefore = normalizedText.slice(Math.max(0, matchIndex - radius), matchIndex);
    const rawAfter = normalizedText.slice(matchIndex + matchLen, Math.min(normalizedText.length, matchIndex + matchLen + radius));

    // Split by sentence terminators taking the part closest to the match
    const beforeParts = rawBefore.split(/[.?!↵\n]+/);
    const beforeCtx = beforeParts[beforeParts.length - 1]; // last segment before match

    const afterParts = rawAfter.split(/[.?!↵\n]+/);
    const afterCtx = afterParts[0]; // first segment after match

    const ctx = beforeCtx + ' [MATCH] ' + afterCtx;

    const req = /\b(security clearance|active secret|only (us|u\.s\.) citizens|us citizen|us citizenship|permanent resident|green card holder|must be authorized to work in the united states without sponsorship)\b/;
    const neg = /\b(no|without|not|does not|doesn't|will not|won't|unable|not able|cannot|can't|no sponsorship|no visa|not eligible|not eligible for sponsorship)\b/;

    if (req.test(ctx)) return { kind: 'requirement', ctx };
    if (neg.test(ctx)) return { kind: 'negation', ctx };
    return null;
  };

})(window.VisaDetector = window.VisaDetector || {});
