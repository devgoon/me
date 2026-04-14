// Ensure the frontend fetch helper is loaded so `apiFetch` is present in test/node environments

// This uses a conditional require so browsers aren't affected.
if (typeof require === 'function') {
  try {
    require('./fetch-utils.js');
  } catch (e) {}
}

(function () {
  function mainSkills() {
    function createTag(text) {
      var span = document.createElement('span');
      span.className = 'skill-tag';
      try {
        if (text && typeof text === 'object') {
          // support objects with common label fields
          span.textContent = String(
            text.label || text.description || text.text || JSON.stringify(text)
          );
        } else {
          span.textContent = String(text == null ? '' : text);
        }
      } catch (e) {
        span.textContent = '';
      }
      return span;
    }

    function render(containerId, items) {
      var container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      try {
        (items || []).forEach(function (item) {
          try {
            container.appendChild(createTag(item));
          } catch (e) {
            console.warn('[skills] failed to render tag', e);
          }
        });
      } catch (e) {
        console.warn('[skills] render failed', e);
      }
    }

    // apiFetch is required; defensive fallbacks removed.

    let skillsApiError = null;

    async function loadSkillsFromApi() {
      skillsApiError = null;
      try {
        // Use centralized apiFetch (required). Remove defensive fallbacks.
        const res = await apiFetch(
          '/api/skills',
          { method: 'GET', headers: { Accept: 'application/json' } },
          { timeoutMs: 10000, maxAttempts: 7, baseDelay: 500 }
        );

        if (!res || !res.ok) throw new Error('Non-OK response ' + (res && res.status));
        const data = await res.json();
        const skills = data && data.skills ? data.skills : null;
        if (skills && (Array.isArray(skills.strong) || Array.isArray(skills.moderate))) {
          return { strong: skills.strong || [], moderate: skills.moderate || [] };
        }
        throw new Error('Malformed skills payload');
      } catch (err) {
        skillsApiError = err;
        console.warn('[skills] API load failed', err && err.message);
        return null;
      }
    }

    async function onDomReady() {
      // Insert a loading indicator into the skills columns
      var loadingText =
        typeof window !== 'undefined' && typeof window.getLoadingMessage === 'function'
          ? window.getLoadingMessage()
          : 'Loading Skills';
      var typingHtml =
        '<div class="skills-loading" role="status" aria-live="polite" aria-busy="true">' +
        String(loadingText) +
        '</div>';
      var cur = document.getElementById('skill-tags-current');
      var bro = document.getElementById('skill-tags-broader');
      if (cur)
        cur.innerHTML =
          '<article class="role-card" style="text-align:center;padding:12px">' +
          typingHtml +
          '</article>';
      if (bro)
        bro.innerHTML =
          '<article class="role-card" style="text-align:center;padding:12px">' +
          typingHtml +
          '</article>';

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
        console.error('[skills] API load failed', skillsApiError);
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
      function sanitize(items) {
        if (!Array.isArray(items)) return [];
        return items
          .filter(function (it) {
            return it !== false && it !== true && it !== null && it !== undefined;
          })
          .map(function (it) {
            return it;
          });
      }

      render('skill-tags-current', sanitize(data.strong));
      render('skill-tags-broader', sanitize(data.moderate));
    }
    // end of mainSkills
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
      try {
        onDomReady();
      } catch (e) {}
    }
  }
  // `fetch-utils.js` is loaded globally from HTML; simply initialize.
  try {
    mainSkills();
  } catch (e) {}
})();
