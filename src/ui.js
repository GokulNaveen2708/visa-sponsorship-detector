// src/ui.js
// Vibrant badge + expandable panel UI for VisaDetector
// Uses Shadow DOM for style isolation
(function (ns) {
  const u = ns.utils;
  const m = ns.meta;

  ns.ui = ns.ui || {};

  // Color schemes for each status
  const STATUS_CONFIG = {
    yes: {
      label: 'Sponsors Visa',
      icon: '✓',
      gradient: 'linear-gradient(135deg, #00e676, #00bfa5)',
      glow: '0 0 20px rgba(0,230,118,0.5), 0 0 40px rgba(0,230,118,0.15)',
      textColor: '#fff',
      borderColor: 'rgba(0,230,118,0.6)'
    },
    no: {
      label: 'No Sponsorship',
      icon: '✕',
      gradient: 'linear-gradient(135deg, #ff4081, #ff6e40)',
      glow: '0 0 20px rgba(255,64,129,0.5), 0 0 40px rgba(255,64,129,0.15)',
      textColor: '#fff',
      borderColor: 'rgba(255,64,129,0.6)'
    },
    unknown: {
      label: 'No Mention',
      icon: '?',
      gradient: 'linear-gradient(135deg, #7c4dff, #536dfe)',
      glow: '0 0 20px rgba(124,77,255,0.4), 0 0 40px rgba(124,77,255,0.1)',
      textColor: '#fff',
      borderColor: 'rgba(124,77,255,0.5)'
    },
    ambiguous: {
      label: 'Ambiguous',
      icon: '🤔',
      gradient: 'linear-gradient(135deg, #ff8a65, #d84315)',
      glow: '0 0 20px rgba(216,67,21,0.4), 0 0 40px rgba(216,67,21,0.1)',
      textColor: '#fff',
      borderColor: 'rgba(216,67,21,0.5)'
    },
    loading: {
      label: 'AI Analyzing...',
      icon: '⏳',
      gradient: 'linear-gradient(135deg, #ffb74d, #f57c00)',
      glow: '0 0 20px rgba(255,152,0,0.5), 0 0 40px rgba(255,183,77,0.2)',
      textColor: '#2c1400',
      borderColor: 'rgba(255,152,0,0.6)'
    }
  };

  // Tech keyword color assignments (rotating palette)
  const KEYWORD_COLORS = [
    { bg: 'rgba(0,150,255,0.15)', border: 'rgba(0,150,255,0.4)', text: '#4db8ff' },
    { bg: 'rgba(0,230,180,0.15)', border: 'rgba(0,230,180,0.4)', text: '#00e6b4' },
    { bg: 'rgba(255,152,0,0.15)', border: 'rgba(255,152,0,0.4)', text: '#ffb74d' },
    { bg: 'rgba(156,39,255,0.15)', border: 'rgba(156,39,255,0.4)', text: '#ce93d8' },
    { bg: 'rgba(255,64,129,0.15)', border: 'rgba(255,64,129,0.4)', text: '#ff80ab' },
    { bg: 'rgba(0,200,83,0.15)', border: 'rgba(0,200,83,0.4)', text: '#69f0ae' },
    { bg: 'rgba(255,235,59,0.12)', border: 'rgba(255,235,59,0.35)', text: '#fff176' },
    { bg: 'rgba(41,182,246,0.15)', border: 'rgba(41,182,246,0.4)', text: '#4fc3f7' },
  ];

  const PANEL_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :host { all: initial; font-family: 'Inter', system-ui, -apple-system, sans-serif; }

    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 50px;
      font-weight: 700; font-size: 13px; letter-spacing: 0.3px;
      cursor: pointer; user-select: none;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      border: 1px solid transparent;
      animation: slideIn 0.3s ease-out;
    }
    .badge:hover { transform: scale(1.05); }
    .badge:active { transform: scale(0.97); }
    .badge-icon { font-size: 15px; font-weight: 800; }

    .panel {
      width: 360px; max-height: 75vh; overflow-y: auto;
      background: rgba(18, 20, 30, 0.94);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 16px;
      color: #e8e8e8;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04);
      animation: slideIn 0.25s ease-out;
    }
    .panel::-webkit-scrollbar { width: 4px; }
    .panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-icon { font-size: 18px; }
    .logo-text { font-weight: 800; font-size: 14px; color: #fff; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .close-btn {
      width: 24px; height: 24px; border-radius: 8px;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; transition: all 0.15s;
    }
    .close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 50px;
      font-weight: 700; font-size: 11px; letter-spacing: 0.3px;
      border: 1px solid transparent;
    }

    .meta-section { margin-bottom: 12px; }
    .job-title { font-weight: 700; font-size: 15px; color: #fff; margin: 0 0 3px 0; line-height: 1.3; }
    .job-company { font-size: 13px; color: rgba(255,255,255,0.55); margin: 0 0 6px 0; }
    .date-row { display: flex; align-items: center; gap: 8px; }
    .date-text { font-size: 12px; color: rgba(255,255,255,0.45); }
    .fresh-tag {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 50px;
      font-size: 11px; font-weight: 700; color: #fff;
    }

    .section-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 8px 0; }

    .keywords { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 4px; }
    .kw-tag {
      padding: 3px 9px; border-radius: 50px;
      font-size: 11px; font-weight: 600;
      border: 1px solid transparent;
      transition: transform 0.12s;
    }
    .kw-tag:hover { transform: scale(1.08); }

    .snippet-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 10px 12px;
      font-size: 12px; line-height: 1.5;
      color: rgba(255,255,255,0.6);
      white-space: pre-wrap; word-break: break-word;
      max-height: 140px; overflow-y: auto;
      transition: max-height 0.3s ease;
    }
    .snippet-card.expanded { max-height: none; }
    .snippet-card::-webkit-scrollbar { width: 3px; }
    .snippet-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    .reason-text { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 6px; }

    .actions { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .action-btn {
      padding: 7px 14px; border-radius: 50px;
      font-size: 11px; font-weight: 600;
      background: transparent; cursor: pointer;
      transition: all 0.15s; color: inherit;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .action-btn:hover { background: rgba(255,255,255,0.08); transform: scale(1.04); }
    .action-btn.blue { color: #4db8ff; border: 1px solid rgba(0,150,255,0.35); }
    .action-btn.teal { color: #00e6b4; border: 1px solid rgba(0,230,180,0.35); }
    .action-btn.purple { color: #ce93d8; border: 1px solid rgba(156,39,255,0.35); }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
  `;

  function getJDPreview(text, sentences) {
    sentences = sentences || 2;
    if (!text) return '';
    const sents = text.split(/(?<=[.?!])\s+/);
    if (sents.length <= sentences) return text.slice(0, 320);
    return sents.slice(0, sentences).join(' ').slice(0, 320) + '…';
  }

  function formatReason(result) {
    if (!result || !result.reason) return '';
    switch (result.reason) {
      case 'known-sponsor': return `🏢 Known H-1B Sponsor${result.match ? ' — ' + result.match : ''}`;
      case 'positive': return '✅ Mentioned in JD';
      case 'explicit-negative': return '❌ Explicitly states no sponsorship';
      case 'requirement': return '🚫 Requires authorization / citizenship';
      case 'negation': return '❌ Contextual negation detected';
      case 'no-match': return '🔍 No sponsorship language found';
      case 'no-text': return '⚠️ Could not read job description';
      case 'no-detector': return '⚠️ Detector not loaded';
      default: return 'Reason: ' + result.reason;
    }
  }

  ns.ui.createOrUpdateSidebar = function (result) {
    try {
      // Use meta passed from inject.js — no double extraction
      const meta = result.meta || {};
      const rawFull = meta.fullJD || result.snippet || '';
      const fullJD = (rawFull || '').replace(/\s+/g, ' ').trim();
      const preview = getJDPreview(fullJD, 2);
      const techKeywords = result.techKeywords || [];

      const parsedDate = m.parseDateTextToISO(meta.dateText) || null;
      const fresh = m.computeFreshness(parsedDate);

      const status = result.status || 'unknown';
      const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

      const existing = document.getElementById('visa-detector-root');

      // --- Fast update path: just update data, no DOM rebuild ---
      if (existing && existing._mode && existing._refs) {
        const refs = existing._refs;
        try {
          // Update badge
          if (refs.badgeEl) {
            refs.badgeEl.style.background = cfg.gradient;
            refs.badgeEl.style.boxShadow = cfg.glow;
            refs.badgeEl.style.borderColor = cfg.borderColor;
            if (refs.badgeIcon) refs.badgeIcon.textContent = cfg.icon;
            if (refs.badgeLabel) refs.badgeLabel.textContent = cfg.label;
          }
          // Update panel elements if expanded
          if (refs.statusBadge) {
            refs.statusBadge.style.background = cfg.gradient;
            refs.statusBadge.style.borderColor = cfg.borderColor;
            refs.statusBadge.querySelector('.sb-icon').textContent = cfg.icon;
            refs.statusBadge.querySelector('.sb-label').textContent = cfg.label;
          }
          if (refs.titleEl) refs.titleEl.textContent = meta.title || '(no title)';
          if (refs.companyEl) refs.companyEl.textContent = meta.company || '(no company)';
          if (refs.dateEl) refs.dateEl.textContent = meta.dateText || (parsedDate ? `${fresh.daysAgo}d ago` : 'Unknown');
          if (refs.freshTag) { refs.freshTag.textContent = `${fresh.emoji} ${fresh.label}`; refs.freshTag.style.background = fresh.color; }
          if (refs.snippetEl) refs.snippetEl.textContent = existing._expanded ? fullJD : preview;
          if (refs.reasonEl) refs.reasonEl.textContent = formatReason(result);
          // Update keywords
          if (refs.kwContainer) {
            refs.kwContainer.innerHTML = '';
            techKeywords.forEach((kw, i) => {
              const c = KEYWORD_COLORS[i % KEYWORD_COLORS.length];
              const tag = document.createElement('span');
              tag.className = 'kw-tag';
              tag.textContent = kw;
              tag.style.background = c.bg;
              tag.style.borderColor = c.border;
              tag.style.color = c.text;
              refs.kwContainer.appendChild(tag);
            });
          }
          // Store latest data for button handlers
          existing._fullJD = fullJD;
          existing._preview = preview;
          return; // fast path done
        } catch (e) {
          console.warn('[VisaDetector][ui] fast update failed, rebuilding', e);
        }
      }

      // --- Full build ---
      if (existing) try { existing.remove(); } catch (e) { }

      const hostRoot = document.createElement('div');
      hostRoot.id = 'visa-detector-root';
      hostRoot.style.cssText = 'position:fixed;top:80px;right:14px;z-index:2147483647;';
      document.documentElement.appendChild(hostRoot);

      const shadow = hostRoot.attachShadow({ mode: 'open' });

      // --- Build badge ---
      const badgeEl = document.createElement('div');
      badgeEl.className = 'badge';
      badgeEl.style.background = cfg.gradient;
      badgeEl.style.boxShadow = cfg.glow;
      badgeEl.style.borderColor = cfg.borderColor;
      badgeEl.style.color = cfg.textColor;

      const badgeIcon = document.createElement('span');
      badgeIcon.className = 'badge-icon';
      badgeIcon.textContent = cfg.icon;

      const badgeLabel = document.createElement('span');
      badgeLabel.textContent = cfg.label;

      badgeEl.appendChild(badgeIcon);
      badgeEl.appendChild(badgeLabel);

      // --- Build panel (hidden initially) ---
      const panelEl = document.createElement('div');
      panelEl.className = 'panel';
      panelEl.style.display = 'none';

      // Header
      const header = document.createElement('div');
      header.className = 'header';

      const logo = document.createElement('div');
      logo.className = 'logo';
      logo.innerHTML = '<span class="logo-icon">🛡️</span><span class="logo-text">Visa Detector</span>';

      const headerRight = document.createElement('div');
      headerRight.className = 'header-right';

      const statusBadge = document.createElement('div');
      statusBadge.className = 'status-badge';
      statusBadge.style.background = cfg.gradient;
      statusBadge.style.borderColor = cfg.borderColor;
      statusBadge.style.color = cfg.textColor;
      statusBadge.innerHTML = `<span class="sb-icon">${u.escapeHtml(cfg.icon)}</span><span class="sb-label">${u.escapeHtml(cfg.label)}</span>`;

      const closeBtn = document.createElement('div');
      closeBtn.className = 'close-btn';
      closeBtn.textContent = '✕';

      headerRight.appendChild(statusBadge);
      headerRight.appendChild(closeBtn);
      header.appendChild(logo);
      header.appendChild(headerRight);

      // Meta section
      const metaSection = document.createElement('div');
      metaSection.className = 'meta-section';

      const titleEl = document.createElement('div');
      titleEl.className = 'job-title';
      titleEl.textContent = meta.title || '(no title)';

      const companyEl = document.createElement('div');
      companyEl.className = 'job-company';
      companyEl.textContent = meta.company || '(no company)';

      const dateRow = document.createElement('div');
      dateRow.className = 'date-row';

      const dateEl = document.createElement('span');
      dateEl.className = 'date-text';
      dateEl.textContent = meta.dateText || (parsedDate ? `${fresh.daysAgo}d ago` : 'Unknown');

      const freshTag = document.createElement('span');
      freshTag.className = 'fresh-tag';
      freshTag.textContent = `${fresh.emoji} ${fresh.label}`;
      freshTag.style.background = fresh.color;

      dateRow.appendChild(dateEl);
      dateRow.appendChild(freshTag);

      metaSection.appendChild(titleEl);
      metaSection.appendChild(companyEl);
      metaSection.appendChild(dateRow);

      // Keywords section
      const kwLabel = document.createElement('div');
      kwLabel.className = 'section-label';
      kwLabel.textContent = 'Tech Stack';

      const kwContainer = document.createElement('div');
      kwContainer.className = 'keywords';
      techKeywords.forEach((kw, i) => {
        const c = KEYWORD_COLORS[i % KEYWORD_COLORS.length];
        const tag = document.createElement('span');
        tag.className = 'kw-tag';
        tag.textContent = kw;
        tag.style.background = c.bg;
        tag.style.borderColor = c.border;
        tag.style.color = c.text;
        kwContainer.appendChild(tag);
      });

      // Snippet section
      const snippetLabel = document.createElement('div');
      snippetLabel.className = 'section-label';
      snippetLabel.textContent = 'JD Preview';

      const snippetEl = document.createElement('div');
      snippetEl.className = 'snippet-card';
      snippetEl.textContent = preview;

      // Reason
      const reasonEl = document.createElement('div');
      reasonEl.className = 'reason-text';
      reasonEl.textContent = formatReason(result);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'actions';

      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn blue';
      copyBtn.innerHTML = '📋&nbsp;Copy JD';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'action-btn teal';
      toggleBtn.innerHTML = '📖&nbsp;Show More';

      const openBtn = document.createElement('button');
      openBtn.className = 'action-btn purple';
      openBtn.innerHTML = '🔗&nbsp;Open Job';

      actions.appendChild(copyBtn);
      actions.appendChild(toggleBtn);
      actions.appendChild(openBtn);

      // Assemble panel
      panelEl.appendChild(header);
      panelEl.appendChild(metaSection);
      if (techKeywords.length > 0) {
        panelEl.appendChild(kwLabel);
        panelEl.appendChild(kwContainer);
      }
      panelEl.appendChild(snippetLabel);
      panelEl.appendChild(snippetEl);
      panelEl.appendChild(reasonEl);
      panelEl.appendChild(actions);

      // Style tag
      const style = document.createElement('style');
      style.textContent = PANEL_CSS;

      shadow.appendChild(style);
      shadow.appendChild(badgeEl);
      shadow.appendChild(panelEl);

      // Store state
      hostRoot._mode = 'badge'; // 'badge' or 'panel'
      hostRoot._expanded = false;
      hostRoot._fullJD = fullJD;
      hostRoot._preview = preview;
      hostRoot._refs = {
        badgeEl, badgeIcon, badgeLabel,
        panelEl, statusBadge, closeBtn,
        titleEl, companyEl, dateEl, freshTag,
        kwContainer, snippetEl, reasonEl,
        copyBtn, toggleBtn, openBtn
      };

      // --- Event handlers ---

      // Badge click → expand to panel
      badgeEl.addEventListener('click', () => {
        badgeEl.style.display = 'none';
        panelEl.style.display = 'block';
        hostRoot._mode = 'panel';
      });

      // Close → collapse to badge
      closeBtn.addEventListener('click', () => {
        panelEl.style.display = 'none';
        badgeEl.style.display = 'inline-flex';
        hostRoot._mode = 'badge';
      });

      // Copy JD
      copyBtn.addEventListener('click', () => {
        const text = hostRoot._fullJD || '';
        navigator.clipboard?.writeText(text).then(() => {
          copyBtn.innerHTML = '✓&nbsp;Copied!';
          setTimeout(() => { copyBtn.innerHTML = '📋&nbsp;Copy JD'; }, 1200);
        }).catch(() => alert('Copy failed'));
      });

      // Toggle snippet
      toggleBtn.addEventListener('click', () => {
        hostRoot._expanded = !hostRoot._expanded;
        if (hostRoot._expanded) {
          snippetEl.textContent = hostRoot._fullJD;
          snippetEl.classList.add('expanded');
          toggleBtn.innerHTML = '📖&nbsp;Show Less';
        } else {
          snippetEl.textContent = hostRoot._preview;
          snippetEl.classList.remove('expanded');
          toggleBtn.innerHTML = '📖&nbsp;Show More';
        }
      });

      // Open job in new tab (extract clean job URL)
      openBtn.addEventListener('click', () => {
        let jobUrl = location.href;
        // Try to get a clean LinkedIn job URL
        const jobIdMatch = location.href.match(/jobs\/view\/(\d+)/) || location.search.match(/currentJobId=(\d+)/);
        if (jobIdMatch && jobIdMatch[1]) {
          jobUrl = 'https://www.linkedin.com/jobs/view/' + jobIdMatch[1] + '/';
        }
        window.open(jobUrl, '_blank');
      });

      // --- Draggable ---
      let isDragging = false, dragStartX = 0, dragStartY = 0, origRight = 14, origTop = 80;

      const onMouseDown = (e) => {
        // only drag from header or badge
        if (e.target === closeBtn || e.target.closest('.action-btn') || e.target.closest('.kw-tag')) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = hostRoot.getBoundingClientRect();
        origRight = window.innerWidth - rect.right;
        origTop = rect.top;
        e.preventDefault();
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        hostRoot.style.right = Math.max(0, origRight - dx) + 'px';
        hostRoot.style.top = Math.max(0, origTop + dy) + 'px';
      };

      const onMouseUp = () => { isDragging = false; };

      badgeEl.addEventListener('mousedown', onMouseDown);
      header.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

    } catch (err) {
      console.error('[VisaDetector][ui] createOrUpdateSidebar error', err);
    }
  };

})(window.VisaDetector = window.VisaDetector || {});
