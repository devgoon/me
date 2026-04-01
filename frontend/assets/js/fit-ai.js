// Lightweight Fit UI (no React) — uses window.fitAnalyzer when available
(function () {
  "use strict";
  function qs(sel) {
    try {
      return document.querySelector(sel);
    } catch (e) {
      return null;
    }
  }
  function ce(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs)
      Object.keys(attrs).forEach((k) => {
        if (k === "class") el.className = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function")
          el.addEventListener(k.substring(2), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      });
    children.flat().forEach((c) => {
      if (c == null) return;
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  // follow-up helper removed (unused in UI)


  function renderResult(container, res) {
    container.innerHTML = "";
    if (!res) return;
    const gapsContent =
      Array.isArray(res.gaps) && res.gaps.length > 0
        ? ce(
            "ul",
            { class: "achievement-list" },
            (res.gaps || []).map((g) => ce("li", null, g)),
          )
        : ce("p", { class: "subtle" }, "No JD-specific gaps identified.");

    const card = ce(
      "article",
      { class: "role-card fit-card" },
      ce(
        "div",
        { class: "fit-verdict-row" },
        ce("h2", null, "Assessment"),
        ce(
          "div",
          { class: "verdict-wrap" },
          ce(
            "span",
            { class: "verdict-badge " + (res.verdictClass || "mid") },
            res.verdict,
          ),
          ce(
            "button",
            {
              class: "copy-btn",
              "aria-label": "Copy assessment",
              onclick: function (e) {
                try {
                  const parts = [];
                  parts.push(`Assessment: ${res.verdict}`);
                  if (res.opening) parts.push(res.opening);
                  if (res.recommendation) parts.push(`Recommendation: ${res.recommendation}`);
                  if (Array.isArray(res.gaps) && res.gaps.length) {
                    parts.push("WHERE I DON'T FIT:");
                    res.gaps.forEach((g) => parts.push(`- ${g}`));
                  }
                  if (Array.isArray(res.transfers) && res.transfers.length) {
                    parts.push('WHAT TRANSFERS:');
                    res.transfers.forEach((t) => parts.push(`- ${t}`));
                  }
                  const text = parts.join('\n');
                  const btn = e.currentTarget;
                  const orig = btn.innerHTML;
                  const showCopied = () => {
                    btn.classList.add('copied');
                    btn.innerHTML = '<i class="bx bx-check" aria-hidden="true"></i><span class="copy-label">Copied</span>';
                    setTimeout(() => {
                      btn.innerHTML = orig;
                      btn.classList.remove('copied');
                    }, 1400);
                  };

                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(showCopied).catch((err) => {
                      console.error('clipboard.writeText failed', err);
                      showCopied();
                    });
                  } else {
                    // fallback
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    try {
                      document.execCommand('copy');
                      showCopied();
                    } catch (err) {
                      console.error('fallback copy failed', err);
                      alert('Copy failed');
                    }
                    document.body.removeChild(ta);
                  }
                } catch (err) {
                  console.error('copy failed', err);
                }
              },
            },
            ce('i', { class: 'bx bx-copy', 'aria-hidden': 'true' }),
            ce('span', { class: 'copy-label' }, 'Copy'),
          ),
        ),
      ),
      ce("p", { class: "opening-assessment" }, res.opening || ""),
      ce("h3", null, "WHERE I DON'T FIT"),
      gapsContent,
      ce("h3", null, "WHAT TRANSFERS"),
      ce(
        "ul",
        { class: "achievement-list" },
        (res.transfers || []).map((t) => ce("li", null, t)),
      ),
      ce("h3", null, "MY RECOMMENDATION"),
      ce("p", { class: "recommendation" }, res.recommendation || ""),
    );
    container.appendChild(card);
  }

  async function init() {
    const root = qs("#fit-app-root");
    if (!root) return;
    root.innerHTML = "";
    const panel = ce(
      "div",
      { class: "fit-panel" },
      ce(
        "label",
        { for: "job-description", class: "jd-label" },
        "Job description",
      ),
      ce("textarea", { id: "job-description", class: "jd-input", rows: 8 }),
      ce(
        "div",
        { style: "margin-top:8px" },
        ce(
          "button",
          { id: "analyze-btn", class: "analyze-btn" },
          "Analyze Fit",
        ),
      ),
      ce(
        "div",
        { id: "fit-status", class: "ask-status", style: "margin-top:12px" },
        "Loading profile and skills…",
      ),
    );
    const output = ce("div", { id: "fit-output", style: "margin-top:16px" });
    root.appendChild(panel);
    root.appendChild(output);

    // last analysis intentionally not retained in UI
    const status = qs("#fit-status");
    status.textContent = '';

    // follow-up UI removed per user request

    qs("#analyze-btn").addEventListener("click", async () => {
      const jd = qs("#job-description").value.trim();
      if (!jd) return alert("Paste a job description first");
      let analysis = null;
      status.innerHTML = `<article class="role-card" style="text-align:center;padding:12px"><div class="loading" aria-busy="true" aria-live="polite">Determining fit…</div></article>`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds
        const res = await fetch("/api/fit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription: jd }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("Fit API error");
        const ai = await res.json();
        // Map AI response to UI fields
        analysis = {
          verdict: ai.verdict || 'Unknown',
          verdictClass: (ai.verdict === 'FIT') ? 'strong' : (ai.verdict === 'MARGINAL') ? 'mid' : 'weak',
          opening: `Score: ${ai.score || 'N/A'}`,
          recommendation: ai.suggestedMessage || '',
          gaps: ai.mismatches || [],
          transfers: ai.reasons || []
        };
        // store suppressed: _lastAnalysis = analysis; (intentionally unused)
      } catch (err) {
        console.error(err);
        analysis = {
          verdict: "Error",
          verdictClass: "weak",
          opening: "Fit API error",
          recommendation: String(err),
          gaps: [],
          transfers: [],
        };
      }
      status.textContent = "";
      renderResult(output, analysis);
      // follow-up UI removed; nothing to show
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
// end of non-React UI
