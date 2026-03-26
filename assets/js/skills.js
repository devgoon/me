(function(){
  function createTag(text) {
    var span = document.createElement('span');
    span.textContent = text;
    return span;
  }

  function render(containerId, items) {
    var container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    items.forEach(function(item){
      container.appendChild(createTag(item));
    });
  }

  function fetchWithTimeout(url, opts, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs || 8000);
    return fetch(url, Object.assign({}, opts || {}, { signal: controller.signal }))
      .finally(() => clearTimeout(id));
  }

  async function loadSkillsFromApi() {
    try {
      const res = await fetchWithTimeout('/api/experience', { method: 'GET', headers: { 'Accept': 'application/json' } }, 8000);
      if (!res.ok) throw new Error('Non-OK response');
      const data = await res.json();
      const skills = data && data.skills ? data.skills : null;
      if (skills && (Array.isArray(skills.strong) || Array.isArray(skills.moderate))) {
        return { strong: skills.strong || [], moderate: skills.moderate || [] };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', async function(){
    // Try DB-backed API first, then fall back to static window.SKILLS_DATA
    var data = await loadSkillsFromApi();
    if (!data) {
      data = window.SKILLS_DATA || { strong: [], moderate: [] };
    }
    render('skill-tags-current', data.strong || []);
    render('skill-tags-broader', data.moderate || []);
  });
})();
