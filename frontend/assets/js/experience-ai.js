// @ts-nocheck
/**
 * @fileoverview Experience AI UI utilities for rendering AI-generated experience summaries.
 * @module frontend/assets/js/experience-ai.js
 */
(() => {
  const experienceList = document.getElementById('experience-list');
  const skillsList = document.getElementById('skills-list');
  const errorNode = document.getElementById('experience-error');
  if (!experienceList || !skillsList) {
    return;
  }
  // Caching moved to server-side `ai_response_cache`; always fetch live payload
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function formatDateRange(startDate, endDate, isCurrent) {
    const fmt = (dateValue) => {
      if (!dateValue) {
        return 'Present';
      }
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) {
        return dateValue;
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    };
    const start = fmt(startDate);
    const end = isCurrent ? 'Present' : fmt(endDate);
    return `${start} - ${end}`;
  }
  function normalizeList(items) {
    if (!items) return [];
    if (Array.isArray(items)) return items.filter(Boolean).map(String);
    if (typeof items === 'string') {
      const t = items.trim();
      if (!t) return [];
      try {
        if (t.startsWith('[') || t.startsWith('{')) {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
          return Object.values(parsed).map(String).filter(Boolean);
        }
      } catch (e) {
        // fallthrough to splitting
      }
      // split by newlines or commas
      const byComma = t
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (byComma.length > 1) return byComma;
      return t
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (typeof items === 'object') {
      try {
        return Object.values(items).map(String).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
    return [];
  }
  function renderExperience(experiences) {
    // Sort experiences by start date descending (most recent first)
    const sorted = (experiences || []).slice().sort((a, b) => {
      const ta = a && a.startDate ? new Date(a.startDate).getTime() : 0;
      const tb = b && b.startDate ? new Date(b.startDate).getTime() : 0;
      return tb - ta;
    });
    experienceList.innerHTML = sorted
      .map((exp) => {
        const contextId = `context-${exp.id}`;
        const bullets = normalizeList(exp.bulletPoints)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('');
        return `
          <article class="role-card">
                        <div class="role-meta">
                              <h2>${escapeHtml(exp.companyName)}${
          exp.isCurrent
            ? ' <span class="current-star" aria-hidden="true" style="color:#ffd700;font-size:1.5rem;">★</span>'
            : ''
        }</h2>
                            <span>${escapeHtml(
                              formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)
                            )}</span>
                        </div>
            <p class="role-title">${escapeHtml(exp.title || '')}</p>
            ${
              bullets
                ? `<ul class="achievement-list">${bullets}</ul>`
                : `<p class="no-achievements">No public achievements provided.</p>`
            }
            <button class="ai-context-toggle" type="button" aria-expanded="false" aria-controls="${contextId}" data-target="${contextId}">✨ Show AI Context</button>
            <div class="ai-context-panel" id="${contextId}" hidden>
              <h3>SITUATION</h3>
              <p>${escapeHtml(exp.aiContext.situation)}</p>
              <h3>APPROACH</h3>
              <p>${escapeHtml(exp.aiContext.approach)}</p>
              <h3>TECHNICAL WORK</h3>
              <p>${escapeHtml(exp.aiContext.technicalWork)}</p>
              <h3>LESSONS LEARNED</h3>
              <p class="lessons">${escapeHtml(exp.aiContext.lessonsLearned)}</p>
            </div>
          </article>
        `;
      })
      .join('');
  }
  function renderSkillColumn(title, className, items) {
    const list =
      items && items.length
        ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        : '<li>None listed</li>';
    return `
      <article class="role-card skills-card ${className}">
        <h2>${title}</h2>
        <ul class="achievement-list">${list}</ul>
      </article>
    `;
  }
  function renderSkills(skills) {
    // Normalize arrays
    const strong = skills.strong || [];
    const moderate = skills.moderate || [];
    const gaps = skills.gaps || skills.gap || [];

    // gaps may be strings or objects. Partition into "interested" and "not interested"
    const interested = [];
    const notInterested = [];
    gaps.forEach((g) => {
      if (!g) return;
      // object: prefer description/whyItsAGap
      const text =
        typeof g === 'string' ? g : g.description || g.whyItsAGap || g.text || g.label || '';
      // Determine explicit interest flags (support camelCase and snake_case)
      const isTrue =
        g &&
        (g.interested === true ||
          g.interestedInLearning === true ||
          g.interest_in_learning === true);
      const isFalse =
        g &&
        (g.interested === false ||
          g.interestedInLearning === false ||
          g.interest_in_learning === false);
      if (isTrue) {
        interested.push(text);
      } else if (isFalse) {
        notInterested.push(text);
      } else {
        // default: treat string gaps or unspecified as not interested
        if (typeof g === 'string') notInterested.push(text);
      }
    });

    skillsList.innerHTML = [
      renderSkillColumn('STRONG ✓', 'skills-card--strong', strong),
      renderSkillColumn('BROADER EXPERTISE ○', 'skills-card--moderate', moderate),
      renderSkillColumn('INTERESTED IN', 'skills-card---interested', interested),
      renderSkillColumn('NOT INTERESTED IN', 'skills-card---not-interested', notInterested),
    ].join('');
  }
  async function loadData() {
    const spinnerExperienceHtml = `
                    <div class="loading" aria-busy="true" aria-live="polite">
                        Enriching work experience with AI generated context …
                    </div>
                `;
    const spinnerSkillsHtml = `
                  <div class="loading" aria-busy="true" aria-live="polite">
                      Analyzing skills and interests with AI …
                  </div>
              `;
    experienceList.innerHTML = `<article class="role-card" style="text-align:left;padding:24px">${spinnerExperienceHtml}</article>`;
    skillsList.innerHTML = `<article class="role-card" style="text-align:left;padding:24px">${spinnerSkillsHtml}</article>`;
    try {
      // Always request server-side cached payload (server stores in ai_response_cache)

      const response = await fetch('/api/experience', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = await response.json();
      // Server maintains cache in `ai_response_cache`; client does not persist.
      renderExperience(data.experiences || []);
      renderSkills(data.skills || { strong: [], moderate: [], gap: [] });
    } catch (error) {
      if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent =
          'The API is a bit cold. Please try refreshing the page in a few moments.';
      }
      experienceList.innerHTML = '';
      skillsList.innerHTML = '';
    }
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.ai-context-toggle');
    if (!button) {
      return;
    }
    const targetId = button.getAttribute('data-target');
    if (!targetId) {
      return;
    }
    const panel = document.getElementById(targetId);
    if (!panel) {
      return;
    }
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isExpanded));
    button.textContent = isExpanded ? '✨ Show AI Context' : '✨ Hide AI Context';
    panel.hidden = isExpanded;
  });
  loadData();
})();
