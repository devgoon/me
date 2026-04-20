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

    let skillsApiError = null;

    async function loadSkillsFromApi() {
      skillsApiError = null;
      try {
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
      var cur = document.getElementById('skill-tags-current');
      var bro = document.getElementById('skill-tags-broader');

      try {
        let defaults = null;
        try {
          const resp = await fetch('/_shared/default-data.json', { cache: 'no-store' });
          if (resp && resp.ok) {
            const json = await resp.json();
            if (json && json.skills) {
              defaults = json.skills;
              console.log('[skills] loaded default skills from /_shared/default-data.json');
            }
          }
        } catch (e) {
          // single canonical fallback failed — nothing else to try
        }
        if (defaults) {
          render('skill-tags-current', Array.isArray(defaults.strong) ? defaults.strong : []);
          render('skill-tags-broader', Array.isArray(defaults.moderate) ? defaults.moderate : []);
        }
      } catch (err) {
        console.warn('[skills] failed to render defaults', err && err.message ? err.message : err);
      }

      var data = await loadSkillsFromApi();
      if (data) {
        console.info(
          '[skills] API returned, overriding defaults: strong=',
          (data.strong || []).length,
          'moderate=',
          (data.moderate || []).length
        );
        render('skill-tags-current', Array.isArray(data.strong) ? data.strong : []);
        render('skill-tags-broader', Array.isArray(data.moderate) ? data.moderate : []);
      } else {
        console.error('[skills] API load failed', skillsApiError);
        console.log('[skills] keeping default skills (API unavailable)');
        try {
          var skillsContainer = document.querySelector('.skills');
          if (skillsContainer) {
            var note = document.createElement('div');
            note.className = 'skills-load-warning';
            note.setAttribute('role', 'status');
            note.textContent = 'Skills loaded from fallback data (API unavailable).';
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
    }
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
      try {
        onDomReady();
      } catch (e) {}
    }
  }
  try {
    mainSkills();
  } catch (e) {}
})();
