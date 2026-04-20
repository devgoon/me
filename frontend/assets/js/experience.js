if (typeof require === 'function') {
  require('./fetch-utils.js');
}

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const listEl = document.getElementById('experience-list');
    const loadingEl = document.getElementById('experience-loading');
    if (!listEl) return;

    if (loadingEl) {
      loadingEl.style.display = '';
      try {
        if (typeof window !== 'undefined' && typeof window.getLoadingMessage === 'function') {
          loadingEl.textContent = window.getLoadingMessage();
        }
      } catch (e) {
        /* ignore */
      }
    }
    async function loadExperienceFromApi() {
      try {
        const res = await apiFetch(
          '/api/experience?skipAI=1',
          { method: 'GET' },
          { timeoutMs: 10000, maxAttempts: 7, baseDelay: 500 }
        );

        if (!res || !res.ok) throw new Error('Non-OK response ' + (res && res.status));
        const data = await res.json().catch(function () {
          return null;
        });
        if (data && Array.isArray(data.experiences)) return data.experiences;
        throw new Error('Malformed experience payload');
      } catch (err) {
        console.error('[experience] API load failed', err && err.message);
        return null;
      }
    }

    (async function () {
      try {
        let defaults = null;
        try {
          const resp = await fetch('/_shared/default-data.json', { cache: 'no-store' });
          if (resp && resp.ok) {
            const json = await resp.json();
            if (json && json.experience && Array.isArray(json.experience.experiences)) {
              defaults = json.experience;
              console.log('[experience] loaded default data from /_shared/default-data.json');
            } else if (json && Array.isArray(json.experiences)) {
              defaults = json;
              console.log('[experience] loaded default data from /_shared/default-data.json');
            }
          }
        } catch (err) {
          console.error(
            '[experience] failed to load defaults from /_shared/default-data.json',
            err
          );
        }

        if (defaults) {
          renderExperience(defaults.experiences || defaults.experience || [], listEl);
        }
      } catch (err) {
        console.warn(
          '[experience] failed to render defaults',
          err && err.message ? err.message : err
        );
      }

      const experiences = await loadExperienceFromApi();
      if (loadingEl) loadingEl.style.display = 'none';
      if (!experiences) {
        if (loadingEl) loadingEl.textContent = 'Unable to load experience.';
        console.log('[experience] keeping default data (API unavailable)');
        return;
      }
      console.info(
        '[experience] API returned, overriding defaults with',
        (experiences || []).length,
        'items'
      );
      renderExperience(experiences || [], listEl);
    })();

    function formatDate(iso) {
      if (!iso) return '';
      try {
        var d = new Date(iso);
        return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
      } catch (e) {
        return iso;
      }
    }

    function renderExperience(experiences, container) {
      container.innerHTML = '';
      var sorted = (Array.isArray(experiences) ? experiences.slice() : []).sort(function (a, b) {
        if (!!a.isCurrent === !!b.isCurrent) return 0;
        return a.isCurrent ? -1 : 1;
      });

      sorted.forEach(function (exp) {
        var item = document.createElement('div');
        item.className = 'resume-item';
        if (exp.isCurrent) item.classList.add('resume-item--current');

        var header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-start flex-wrap gap-2 mb-2';

        var h4 = document.createElement('h4');
        h4.textContent = exp.title || '';
        var h5 = document.createElement('h5');
        var start = formatDate(exp.startDate);
        var end = exp.isCurrent ? 'Present' : formatDate(exp.endDate);
        h5.textContent = start || end ? (start + ' – ' + (end || '')).trim() : '';

        header.appendChild(h4);
        header.appendChild(h5);
        item.appendChild(header);

        if (exp.companyName || exp.title) {
          var p = document.createElement('p');
          var em = document.createElement('em');
          var companyHtml = escapeHtml(exp.companyName || '');
          em.innerHTML = companyHtml + (exp.title ? ' &mdash; ' + escapeHtml(exp.title) : '');
          p.appendChild(em);
          item.appendChild(p);
        }

        if (Array.isArray(exp.bulletPoints) && exp.bulletPoints.length) {
          var ul = document.createElement('ul');
          exp.bulletPoints.forEach(function (b) {
            var li = document.createElement('li');
            li.textContent = b;
            ul.appendChild(li);
          });
          item.appendChild(ul);
        }

        container.appendChild(item);
      });
    }

    function escapeHtml(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  });
})();
