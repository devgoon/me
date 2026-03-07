// @ts-nocheck
(() => {
    const experienceList = document.getElementById("experience-list");
    const skillsList = document.getElementById("skills-list");
    const errorNode = document.getElementById("experience-error");
    if (!experienceList || !skillsList) {
        return;
    }
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    function formatDateRange(startDate, endDate, isCurrent) {
        const fmt = (dateValue) => {
            if (!dateValue) {
                return "Present";
            }
            const date = new Date(dateValue);
            if (Number.isNaN(date.getTime())) {
                return dateValue;
            }
            return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        };
        const start = fmt(startDate);
        const end = isCurrent ? "Present" : fmt(endDate);
        return `${start} - ${end}`;
    }
    function renderExperience(experiences) {
        experienceList.innerHTML = experiences
            .map((exp) => {
            const contextId = `context-${exp.id}`;
            const bullets = (exp.bulletPoints || [])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("");
            return `
          <article class="role-card">
            <div class="role-meta">
              <h2>${escapeHtml(exp.companyName)}</h2>
              <span>${escapeHtml(formatDateRange(exp.startDate, exp.endDate, exp.isCurrent))}</span>
            </div>
            <p class="role-title">${escapeHtml(exp.title || "")}</p>
            <ul class="achievement-list">${bullets || "<li>No public achievements provided.</li>"}</ul>
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
            .join("");
    }
    function renderSkillColumn(title, className, items) {
        const list = items && items.length
            ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
            : "<li>None listed</li>";
        return `
      <article class="role-card skills-card ${className}">
        <h2>${title}</h2>
        <ul class="achievement-list">${list}</ul>
      </article>
    `;
    }
    function renderSkills(skills) {
        skillsList.innerHTML = [
            renderSkillColumn("STRONG ✓", "skills-card--strong", skills.strong || []),
            renderSkillColumn("MODERATE ○", "skills-card--moderate", skills.moderate || []),
            renderSkillColumn("GAPS ✗", "skills-card--gaps", skills.gap || [])
        ].join("");
    }
    async function loadData() {
        experienceList.innerHTML = "<article class=\"role-card\"><p>AI analyzing experience data...</p></article>";
        skillsList.innerHTML = "<article class=\"role-card\"><p>AI analyzing skills profile...</p></article>";
        try {
            const response = await fetch("/api/experience", { method: "GET" });
            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }
            const data = await response.json();
            renderExperience(data.experiences || []);
            renderSkills(data.skills || { strong: [], moderate: [], gap: [] });
        }
        catch (error) {
            if (errorNode) {
                errorNode.hidden = false;
                errorNode.textContent = "Unable to load AI/DB experience data right now.";
            }
            experienceList.innerHTML = "";
            skillsList.innerHTML = "";
        }
    }
    document.addEventListener("click", (event) => {
        const button = event.target.closest(".ai-context-toggle");
        if (!button) {
            return;
        }
        const targetId = button.getAttribute("data-target");
        if (!targetId) {
            return;
        }
        const panel = document.getElementById(targetId);
        if (!panel) {
            return;
        }
        const isExpanded = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isExpanded));
        button.textContent = isExpanded ? "✨ Show AI Context" : "✨ Hide AI Context";
        panel.hidden = isExpanded;
    });
    loadData();
})();
