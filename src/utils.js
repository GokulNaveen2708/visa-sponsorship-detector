// src/utils.js
(function (ns) {
  ns.utils = ns.utils || {};

  ns.utils.debounce = function(fn, ms = 300) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  ns.utils.normalizeText = function(s) {
    if (!s) return '';
    try { return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
    catch (e) { return s.replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  };

  ns.utils.escapeRegex = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };

  ns.utils.buildRegexesFromPhrases = function(phrases) {
    return phrases.map(p => new RegExp('\\b' + ns.utils.escapeRegex(p) + '\\b', 'u'));
  };

  ns.utils.escapeHtml = function(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
  };

  ns.utils.extractAroundRaw = function(rawText, rawIndex, matchLen, radius = 140) {
    if (!rawText) return '';
    const start = Math.max(0, rawIndex - radius);
    const end = Math.min(rawText.length, rawIndex + matchLen + radius);
    return rawText.slice(start, end).replace(/\s+/g, ' ').trim();
  };

  ns.utils.findIndexInRaw = function(rawText, matchNormalized) {
    const rawLower = (rawText || '').toLowerCase();
    let idx = rawLower.indexOf(matchNormalized);
    if (idx >= 0) return idx;
    const compact = rawLower.replace(/[^\w\s]/g, ' ');
    idx = compact.indexOf(matchNormalized);
    return idx;
  };

})(window.VisaDetector = window.VisaDetector || {});
