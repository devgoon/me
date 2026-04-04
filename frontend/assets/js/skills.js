/**
 * @fileoverview Skills tag rendering and API loader for the frontend.
 * @module frontend/assets/js/skills.js
 */

(function () {
  function createTag(text) {
    var span = document.createElement('span');
    span.textContent = text;
    return span;
  }

  function render(containerId, items) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(function (item) {
      container.appendChild(createTag(item));
    });
  }

  function fetchWithTimeout(url, opts, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs || 8000);
    return fetch(url, Object.assign({}, opts || {}, { signal: controller.signal })).finally(() =>
      clearTimeout(id)
    );
  }

  let __skillsApiError = null;
  const __SKILLS_API_MAX_ATTEMPTS = 5;
  const __SKILLS_API_BASE_DELAY_MS = 1000;

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function loadSkillsFromApi() {
    __skillsApiError = null;
    for (let attempt = 1; attempt <= __SKILLS_API_MAX_ATTEMPTS; attempt++) {
      try {
        console.info(`[skills] API attempt ${attempt}/${__SKILLS_API_MAX_ATTEMPTS}`);
        // use the lightweight skills endpoint (reads DB directly, no AI)
        const res = await fetchWithTimeout(
          '/api/skills',
          { method: 'GET', headers: { Accept: 'application/json' } },
          8000
        );
        if (!res.ok) throw new Error('Non-OK response ' + res.status);
        const data = await res.json();
        const skills = data && data.skills ? data.skills : null;
        if (skills && (Array.isArray(skills.strong) || Array.isArray(skills.moderate))) {
          if (attempt > 1) console.info('[skills] API succeeded on attempt', attempt);
          return { strong: skills.strong || [], moderate: skills.moderate || [] };
        }
        throw new Error('Malformed skills payload');
      } catch (err) {
        __skillsApiError = err;
        console.warn('[skills] API attempt failed', attempt, err && err.message);
        if (attempt < __SKILLS_API_MAX_ATTEMPTS) {
          const backoff = __SKILLS_API_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await delay(backoff);
        }
      }
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    // Insert loading spinners into the skills columns
    var spinnerHtml = `<div class="loading" aria-busy="true" aria-live="polite">Loading…</div>`;
    var cur = document.getElementById('skill-tags-current');
    var bro = document.getElementById('skill-tags-broader');
    if (cur)
      cur.innerHTML = `<article class="role-card" style="text-align:center;padding:12px">${spinnerHtml}</article>`;
    if (bro)
      bro.innerHTML = `<article class="role-card" style="text-align:center;padding:12px">${spinnerHtml}</article>`;

    // Try DB-backed API first, then fall back to static window.SKILLS_DATA
    var data = await loadSkillsFromApi();
    var source = 'api';
    if (!data) {
      data = window.SKILLS_DATA || { strong: [], moderate: [] };
      source = 'fallback';
    }
    console.info(
      '[skills] rendering from',
      source,
      'strong=',
      (data.strong || []).length,
      'moderate=',
      (data.moderate || []).length
    );

    if (source === 'fallback') {
      console.error('[skills] API load failed', __skillsApiError);
      // add a visible notice near the skills group
      try {
        var skillsContainer = document.querySelector('.skills');
        if (skillsContainer) {
          var note = document.createElement('div');
          note.className = 'skills-load-warning';
          note.setAttribute('role', 'status');
          note.textContent = 'Skills loaded from fallback data (API unavailable).';
          // insert after the section title
          var title = skillsContainer.querySelector('.section-title');
          if (title && title.parentNode) {
            title.parentNode.insertBefore(note, title.nextSibling);
          } else {
            skillsContainer.insertBefore(note, skillsContainer.firstChild);
          }
        }
      } catch (e) {
        console.warn('[skills] failed to insert load warning', e);
      }
    }
    render('skill-tags-current', data.strong || []);
    render('skill-tags-broader', data.moderate || []);
  });
})();
