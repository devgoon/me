// assets/js/experience.js
// Fetches experience data from /api/experience and renders it into the page.
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const listEl = document.getElementById('experience-list');
    const loadingEl = document.getElementById('experience-loading');
    if (!listEl) return;

    if (loadingEl) loadingEl.style.display = '';

    // Experience loading placeholder now shows plain text; chat bubble removed

    var _fetch =
      (typeof apiFetch !== 'undefined' && apiFetch) ||
      (typeof fetchWithTimeout !== 'undefined' &&
        function (u, o) {
          return fetchWithTimeout(u, o, 10000);
        }) ||
      fetch;

    _fetch('/api/experience', { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(function (data) {
        if (loadingEl) loadingEl.style.display = 'none';
        renderExperience((data && data.experiences) || [], listEl);
      })
      .catch(function (err) {
        if (loadingEl) loadingEl.textContent = 'Unable to load experience.';
        console.error('Failed to load experience', err);
      });

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
      // Sort so current work experiences appear first
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
