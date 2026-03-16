// Lightweight Fit UI (no React) — uses window.fitAnalyzer when available
(function(){
  'use strict';
  function qs(sel){ try{return document.querySelector(sel);}catch(e){return null;} }
  function ce(tag, attrs, ...children){ const el = document.createElement(tag); if(attrs) Object.keys(attrs).forEach(k=>{ if(k==='class') el.className=attrs[k]; else if(k.startsWith('on')&&typeof attrs[k]==='function') el.addEventListener(k.substring(2), attrs[k]); else el.setAttribute(k, attrs[k]); }); children.flat().forEach(c=>{ if(c==null) return; if(typeof c==='string') el.appendChild(document.createTextNode(c)); else el.appendChild(c); }); return el; }

  function buildFollowUpAnswer(question, verdict){
    const q = String(question||'').toLowerCase();
    if(q.includes('salary')||q.includes('compensation')) return 'Discuss compensation after scope and impact are clear.';
    if(q.includes('remote')||q.includes('onsite')) return 'Work model matters less than clear collaboration expectations.';
    if(q.includes('risk')||q.includes('gap')) return verdict==='Strong Fit' ? 'Main risk is ramp time; mitigate with a scoped 30-60 day plan.' : 'Mismatch in core stack is highest risk; validate transferable experience.';
    return 'Use this assessment as a filter; ask what success looks like in 90 days.';
  }

  async function fetchFit(){
    try{
      const r = await fetch('/api/fit');
      if(!r.ok) throw new Error('failed');
      return await r.json();
    }catch(e){ return null; }
  }

  function renderResult(container, res){
        container.innerHTML = '';
        if(!res) return;
        const card = ce('article',{class:'role-card fit-card'},
            ce('div',{class:'fit-verdict-row'},
                ce('h2',null,'Assessment'),
                ce('span',{class: 'verdict-badge '+(res.verdictClass||'mid')}, res.verdict)
            ),
            ce('p',{class:'opening-assessment'}, res.opening||''),
            ce('h3',null,"WHERE I DON'T FIT"),
            ce('ul',{class:'achievement-list'}, (res.gaps||[]).map(g=>ce('li',null,g))),
            ce('h3',null,'WHAT TRANSFERS'),
            ce('ul',{class:'achievement-list'}, (res.transfers||[]).map(t=>ce('li',null,t))),
            ce('h3',null,'MY RECOMMENDATION'),
            ce('p',{class:'recommendation'}, res.recommendation||'')
        );
        container.appendChild(card);
  }

  async function init(){
    const root = qs('#fit-app-root');
    if(!root) return;
    root.innerHTML = '';
        const panel = ce('div',{class:'fit-panel'},
            ce('label', {for:'job-description', class: 'jd-label'}, 'Job description'),
            ce('textarea',{id:'job-description', class:'jd-input', rows:8}),
            ce('div',{style:'margin-top:8px'},
                ce('button',{id:'analyze-btn', class:'analyze-btn'}, 'Analyze Fit')
            ),
            ce('div',{id:'fit-status', class:'ask-status', style:'margin-top:12px'}, 'Loading profile and skills…')
        );
    const output = ce('div',{id:'fit-output', style:'margin-top:16px'});
    root.appendChild(panel); root.appendChild(output);

    let profile = null;
    const status = qs('#fit-status');
    const data = await fetchFit();
    if(data){ profile = data; status.textContent = 'Profile loaded.'; } else { status.textContent = 'Profile unavailable — using local analyzer only.'; }

    qs('#analyze-btn').addEventListener('click', async ()=>{
      const jd = qs('#job-description').value.trim();
      if(!jd) return alert('Paste a job description first');
      let analysis = null;
      try{
        if(window.fitAnalyzer && typeof window.fitAnalyzer.analyzeJD === 'function'){
          const strengths = (profile && profile.skills) ? profile.skills.map(s=>({key:String((s.skillName||'').toLowerCase()), label: s.skillName||''})) : [];
          const gaps = (profile && profile.gaps) ? profile.gaps.map((g,idx)=>({keys: String((g.description||g.whyItsAGap||'')).toLowerCase().split(/\W+/).filter(Boolean).slice(0,6), text: g.description||g.whyItsAGap||`gap-${idx}`})) : [];
          const education = (profile && profile.education) ? profile.education.map(e=>({degree: e.degree||'', fieldOfStudy: e.fieldOfStudy||e.field_of_study||'', institution: e.institution||''})) : [];
          analysis = window.fitAnalyzer.analyzeJD(jd, strengths, gaps, education);
        } else {
          analysis = { verdict: 'Worth a Conversation', verdictClass: 'mid', opening: 'Analyzer not available', recommendation: 'Ensure fit-analyzer.js is loaded', gaps: [], transfers: [] };
        }
      }catch(err){ console.error(err); analysis = { verdict: 'Worth a Conversation', opening: 'Analyzer error', recommendation: String(err), gaps: [], transfers: [] }; }
      renderResult(output, analysis);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
// end of non-React UI
