// @ts-nocheck
(function () {
    const DRAFT_KEY = "admin_panel_draft_v1";
    const LOGOUT_URL = "/.auth/logout?post_logout_redirect_uri=/auth";
    const COMPANY_STAGES = [
        "Seed",
        "Series A",
        "Series B",
        "Series C+",
        "Growth",
        "Public",
        "Enterprise"
    ];
    const DEFAULT_FAQ = [
        { question: "What are your strongest skills?", answer: "", isCommonQuestion: true },
        { question: "What are your biggest gaps right now?", answer: "", isCommonQuestion: true },
        { question: "What kind of team are you looking for?", answer: "", isCommonQuestion: true }
    ];
    const state = {
        profile: {
            fullName: "",
            email: "",
            currentTitle: "",
            targetTitles: [],
            targetCompanyStages: [],
            elevatorPitch: "",
            careerNarrative: "",
            lookingFor: "",
            notLookingFor: "",
            managementStyle: "",
            workStylePreferences: "",
            salaryMin: "",
            salaryMax: "",
            availabilityStatus: "",
            availableStarting: "",
            location: "",
            remotePreference: "",
            linkedInUrl: "",
            githubUrl: ""
        },
        experiences: [],
        skills: [],
        gaps: [],
        education: [],
        valuesCulture: {
            mustHaves: "",
            dealbreakers: "",
            managementStylePreferences: "",
            teamSizePreferences: "",
            howHandleConflict: "",
            howHandleAmbiguity: "",
            howHandleFailure: ""
        },
        faq: DEFAULT_FAQ.slice(),
        aiInstructions: {
            honestyLevel: 7,
            rules: []
        }
    };
    function setMessage(text, isError) {
        const el = document.getElementById("admin-message");
        if (!el)
            return;
        el.hidden = !text;
        el.textContent = text || "";
        el.classList.toggle("error", Boolean(text && isError));
        el.classList.toggle("ok", Boolean(text && !isError));
    }
    async function apiRequest(url, options) {
        const response = await fetch(url, {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options && options.headers ? options.headers : {})
            }
        });
        let data = {};
        try {
            data = await response.json();
        }
        catch (error) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }
        return data;
    }
    function mergeState(payload) {
        if (!payload || typeof payload !== "object")
            return;
        if (payload.profile)
            Object.assign(state.profile, payload.profile);
        if (Array.isArray(payload.experiences))
            state.experiences = payload.experiences;
            if (Array.isArray(payload.education))
                state.education = payload.education;
        if (Array.isArray(payload.skills))
            state.skills = payload.skills;
        if (Array.isArray(payload.gaps))
            state.gaps = payload.gaps;
        if (payload.valuesCulture)
            Object.assign(state.valuesCulture, payload.valuesCulture);
        if (Array.isArray(payload.faq))
            state.faq = payload.faq.length ? payload.faq : DEFAULT_FAQ.slice();
        if (payload.aiInstructions) {
            state.aiInstructions.honestyLevel = Number(payload.aiInstructions.honestyLevel || 7);
            state.aiInstructions.rules = Array.isArray(payload.aiInstructions.rules) ? payload.aiInstructions.rules : [];
        }
    }
    async function loadCacheReport() {
        setMessage("Loading cache report...", false);
        let data = [];
        try {
            // Use top-level API path
            data = await apiRequest("/api/cache-report", { method: "GET" });
        }
        catch (error) {
            setMessage(error.message || "Failed to load cache report", true);
            renderCacheReport([]);
            return;
        }
        setMessage("Cache report loaded.", false);
        renderCacheReport(data);
    }

    function renderCacheReport(report) {
        const table = document.getElementById("cache-table");
        if (!table)
            return;
        const tbody = table.querySelector("tbody");
        if (!tbody)
            return;
        if (!Array.isArray(report) || report.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6'>No cache records found.</td></tr>";
            return;
        }
        tbody.innerHTML = report.map((item) =>
            `<tr>`
            + `<td>${escapeHtml(item.question || "")}</td>`
            + `<td>${escapeHtml(item.model || "")}</td>`
            + `<td>${escapeHtml(String(item.cached || "0"))}</td>`
            + `<td>${escapeHtml(String(item.lastAccessed || ""))}</td>`
            + `<td>${escapeHtml(String(item.invalidatedAt || ""))}</td>`
            + `<td>${escapeHtml(String(typeof item.is_cached !== 'undefined' ? item.is_cached : !item.hidden))}</td>`
            + `</tr>`
        ).join("");
    }
    function wireTabs() {
        const tabs = Array.from(document.querySelectorAll("[data-tab]"));
        const panels = Array.from(document.querySelectorAll("[data-panel]"));
        tabs.forEach((tab) => {
            tab.addEventListener("click", async () => {
                const panelName = tab.dataset.tab;
                tabs.forEach((btn) => btn.classList.toggle("is-active", btn === tab));
                panels.forEach((panel) => {
                    panel.hidden = panel.dataset.panel !== panelName;
                });
                if (panelName === "cache") {
                    try {
                        await loadCacheReport();
                    }
                    catch (e) {
                        // ignore - loadCacheReport handles messaging
                    }
                }
            });
        });
    }
    function fillSimpleFields() {
        const mappings = [
            ["profile-fullName", "profile", "fullName"],
            ["profile-email", "profile", "email"],
            ["profile-currentTitle", "profile", "currentTitle"],
            ["profile-location", "profile", "location"],
            ["profile-availabilityStatus", "profile", "availabilityStatus"],
            ["profile-availableStarting", "profile", "availableStarting"],
            ["profile-remotePreference", "profile", "remotePreference"],
            ["profile-managementStyle", "profile", "managementStyle"],
            ["profile-workStylePreferences", "profile", "workStylePreferences"],
            ["profile-salaryMin", "profile", "salaryMin"],
            ["profile-salaryMax", "profile", "salaryMax"],
            ["profile-linkedInUrl", "profile", "linkedInUrl"],
            ["profile-githubUrl", "profile", "githubUrl"],
            ["profile-elevatorPitch", "profile", "elevatorPitch"],
            ["profile-careerNarrative", "profile", "careerNarrative"],
            ["profile-lookingFor", "profile", "lookingFor"],
            ["profile-notLookingFor", "profile", "notLookingFor"],
            ["values-mustHaves", "valuesCulture", "mustHaves"],
            ["values-dealbreakers", "valuesCulture", "dealbreakers"],
            ["values-managementStylePreferences", "valuesCulture", "managementStylePreferences"],
            ["values-teamSizePreferences", "valuesCulture", "teamSizePreferences"],
            ["values-howHandleConflict", "valuesCulture", "howHandleConflict"],
            ["values-howHandleAmbiguity", "valuesCulture", "howHandleAmbiguity"],
            ["values-howHandleFailure", "valuesCulture", "howHandleFailure"]
        ];
        mappings.forEach((entry) => {
            const id = entry[0];
            const root = entry[1];
            const key = entry[2];
            const el = document.getElementById(id);
            if (!el)
                return;
            el.value = state[root][key] || "";
            el.addEventListener("input", () => {
                state[root][key] = el.value;
            });
        });
        const honesty = document.getElementById("ai-honestyLevel");
        const display = document.getElementById("honesty-level-display");
        if (honesty && display) {
            honesty.value = String(state.aiInstructions.honestyLevel || 7);
            display.textContent = honesty.value;
            honesty.addEventListener("input", () => {
                state.aiInstructions.honestyLevel = Number(honesty.value || "7");
                display.textContent = honesty.value;
            });
        }
    }
    function renderTargetTitles() {
        const list = document.getElementById("target-title-list");
        if (!list)
            return;
        list.innerHTML = state.profile.targetTitles
            .map((title, index) => "<li>" + escapeHtml(title) + " <button class=\"mini-btn danger\" type=\"button\" data-remove-title=\"" + index + "\">Remove</button></li>")
            .join("");
        list.querySelectorAll("[data-remove-title]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeTitle);
                state.profile.targetTitles.splice(i, 1);
                renderTargetTitles();
            });
        });
    }
    function renderCompanyStages() {
        const wrap = document.getElementById("company-stage-list");
        if (!wrap)
            return;
        wrap.innerHTML = COMPANY_STAGES.map((stage) => {
            const checked = state.profile.targetCompanyStages.includes(stage) ? " checked" : "";
            return "<label><input type=\"checkbox\" data-stage=\"" + escapeAttr(stage) + "\"" + checked + ">" + escapeHtml(stage) + "</label>";
        }).join("");
        wrap.querySelectorAll("[data-stage]").forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                const value = checkbox.dataset.stage;
                if (checkbox.checked) {
                    if (!state.profile.targetCompanyStages.includes(value)) {
                        state.profile.targetCompanyStages.push(value);
                    }
                }
                else {
                    state.profile.targetCompanyStages = state.profile.targetCompanyStages.filter((item) => item !== value);
                }
            });
        });
    }
    function renderExperiences() {
        const list = document.getElementById("experience-list");
        if (!list)
            return;
        list.innerHTML = state.experiences.map((item, index) => {
            const bullets = Array.isArray(item.achievementBullets) ? item.achievementBullets : [];
            const bulletHtml = bullets.map((bullet, bulletIndex) => {
                return "<div class=\"bullet-row\"><input data-exp-bullet=\"" + index + "\" data-bullet-index=\"" + bulletIndex + "\" type=\"text\" value=\"" + escapeAttr(bullet || "") + "\"><button class=\"mini-btn danger\" data-remove-bullet=\"" + index + "\" data-bullet-index=\"" + bulletIndex + "\" type=\"button\">X</button></div>";
            }).join("");
            const currentChecked = item.current ? " checked" : "";
            return "<article class=\"item-card\">"
                + "<header><h3>Experience " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-exp=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Company<input data-exp=\"" + index + "\" data-field=\"companyName\" type=\"text\" value=\"" + escapeAttr(item.companyName || "") + "\"></label>"
                + "<label>Title<input data-exp=\"" + index + "\" data-field=\"title\" type=\"text\" value=\"" + escapeAttr(item.title || "") + "\"></label>"
                + "<label>Title progression<input data-exp=\"" + index + "\" data-field=\"titleProgression\" type=\"text\" value=\"" + escapeAttr(item.titleProgression || "") + "\"></label>"
                + "<label>Display order<input data-exp=\"" + index + "\" data-field=\"displayOrder\" type=\"number\" value=\"" + escapeAttr(String(item.displayOrder || index)) + "\"></label>"
                + "<label>Start date<input data-exp=\"" + index + "\" data-field=\"startDate\" type=\"date\" value=\"" + escapeAttr(item.startDate || "") + "\"></label>"
                + "<label>End date<input data-exp=\"" + index + "\" data-field=\"endDate\" type=\"date\" value=\"" + escapeAttr(item.endDate || "") + "\"></label>"
                + "<label>Current role <input data-exp=\"" + index + "\" data-field=\"current\" type=\"checkbox\"" + currentChecked + "></label>"
                + "</div>"
                + "<div class=\"subpanel\"><h3>Achievement bullets</h3>"
                + bulletHtml
                + "<button class=\"mini-btn\" data-add-bullet=\"" + index + "\" type=\"button\">Add bullet</button></div>"
                + "<label>Why joined<textarea data-exp=\"" + index + "\" data-field=\"whyJoined\" rows=\"2\">" + escapeHtml(item.whyJoined || "") + "</textarea></label>"
                + "<label>Why left<textarea data-exp=\"" + index + "\" data-field=\"whyLeft\" rows=\"2\">" + escapeHtml(item.whyLeft || "") + "</textarea></label>"
                + "<details class=\"subpanel\"><summary>Private context (for AI only)</summary>"
                + "<label>Actual contributions<textarea data-exp=\"" + index + "\" data-field=\"actualContributions\" rows=\"2\">" + escapeHtml(item.actualContributions || "") + "</textarea></label>"
                + "<label>Proudest achievement<textarea data-exp=\"" + index + "\" data-field=\"proudestAchievement\" rows=\"2\">" + escapeHtml(item.proudestAchievement || "") + "</textarea></label>"
                + "<label>Would do differently<textarea data-exp=\"" + index + "\" data-field=\"wouldDoDifferently\" rows=\"2\">" + escapeHtml(item.wouldDoDifferently || "") + "</textarea></label>"
                + "<label>Hard/frustrating<textarea data-exp=\"" + index + "\" data-field=\"hardOrFrustrating\" rows=\"2\">" + escapeHtml(item.hardOrFrustrating || "") + "</textarea></label>"
                + "<label>Lessons learned<textarea data-exp=\"" + index + "\" data-field=\"lessonsLearned\" rows=\"2\">" + escapeHtml(item.lessonsLearned || "") + "</textarea></label>"
                + "<label>Manager would describe<textarea data-exp=\"" + index + "\" data-field=\"managerDescribe\" rows=\"2\">" + escapeHtml(item.managerDescribe || "") + "</textarea></label>"
                + "<label>Reports would describe<textarea data-exp=\"" + index + "\" data-field=\"reportsDescribe\" rows=\"2\">" + escapeHtml(item.reportsDescribe || "") + "</textarea></label>"
                + "<label>Conflicts/challenges<textarea data-exp=\"" + index + "\" data-field=\"conflictsChallenges\" rows=\"2\">" + escapeHtml(item.conflictsChallenges || "") + "</textarea></label>"
                + "<label>Quantified impact (JSON)<textarea data-exp=\"" + index + "\" data-field=\"quantifiedImpact\" rows=\"3\">" + escapeHtml(item.quantifiedImpact || "") + "</textarea></label>"
                + "</details>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-exp]").forEach((input) => {
            input.addEventListener("input", () => {
                const expIndex = Number(input.dataset.exp);
                const field = input.dataset.field;
                if (!state.experiences[expIndex] || !field)
                    return;
                if (input.type === "checkbox") {
                    state.experiences[expIndex][field] = Boolean(input.checked);
                }
                else {
                    state.experiences[expIndex][field] = input.value;
                }
            });
            if (input.type === "checkbox") {
                input.addEventListener("change", () => {
                    const expIndex = Number(input.dataset.exp);
                    const field = input.dataset.field;
                    if (!state.experiences[expIndex] || !field)
                        return;
                    state.experiences[expIndex][field] = Boolean(input.checked);
                });
            }
        });
        list.querySelectorAll("[data-remove-exp]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeExp);
                state.experiences.splice(i, 1);
                renderExperiences();
            });
        });
        list.querySelectorAll("[data-add-bullet]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.addBullet);
                if (!Array.isArray(state.experiences[i].achievementBullets)) {
                    state.experiences[i].achievementBullets = [];
                }
                state.experiences[i].achievementBullets.push("");
                renderExperiences();
            });
        });
        list.querySelectorAll("[data-exp-bullet]").forEach((input) => {
            input.addEventListener("input", () => {
                const expIndex = Number(input.dataset.expBullet);
                const bulletIndex = Number(input.dataset.bulletIndex);
                if (!state.experiences[expIndex])
                    return;
                if (!Array.isArray(state.experiences[expIndex].achievementBullets)) {
                    state.experiences[expIndex].achievementBullets = [];
                }
                state.experiences[expIndex].achievementBullets[bulletIndex] = input.value;
            });
        });
        list.querySelectorAll("[data-remove-bullet]").forEach((button) => {
            button.addEventListener("click", () => {
                const expIndex = Number(button.dataset.removeBullet);
                const bulletIndex = Number(button.dataset.bulletIndex);
                if (!state.experiences[expIndex])
                    return;
                if (!Array.isArray(state.experiences[expIndex].achievementBullets))
                    return;
                state.experiences[expIndex].achievementBullets.splice(bulletIndex, 1);
                renderExperiences();
            });
        });
    }
    function defaultEducation() {
        return {
            institution: "",
            degree: "",
            fieldOfStudy: "",
            startDate: "",
            endDate: "",
            current: false,
            grade: "",
            notes: "",
            displayOrder: state.education.length
        };
    }
    function renderEducation() {
        const list = document.getElementById("education-list");
        if (!list)
            return;
        list.innerHTML = state.education.map((item, index) => {
            const currentChecked = item.current ? " checked" : "";
            return "<article class=\"item-card\">"
                + "<header><h3>Education " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-education=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Institution<input data-edu=\"" + index + "\" data-field=\"institution\" type=\"text\" value=\"" + escapeAttr(item.institution || "") + "\"></label>"
                + "<label>Degree<input data-edu=\"" + index + "\" data-field=\"degree\" type=\"text\" value=\"" + escapeAttr(item.degree || "") + "\"></label>"
                + "<label>Field of study<input data-edu=\"" + index + "\" data-field=\"fieldOfStudy\" type=\"text\" value=\"" + escapeAttr(item.fieldOfStudy || "") + "\"></label>"
                + "<label>Display order<input data-edu=\"" + index + "\" data-field=\"displayOrder\" type=\"number\" value=\"" + escapeAttr(String(item.displayOrder || index)) + "\"></label>"
                + "</div>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Start date<input data-edu=\"" + index + "\" data-field=\"startDate\" type=\"date\" value=\"" + escapeAttr(item.startDate || "") + "\"></label>"
                + "<label>End date<input data-edu=\"" + index + "\" data-field=\"endDate\" type=\"date\" value=\"" + escapeAttr(item.endDate || "") + "\"></label>"
                + "<label>Current<input data-edu=\"" + index + "\" data-field=\"current\" type=\"checkbox\"" + currentChecked + "></label>"
                + "<label>Grade<input data-edu=\"" + index + "\" data-field=\"grade\" type=\"text\" value=\"" + escapeAttr(item.grade || "") + "\"></label>"
                + "</div>"
                + "<label>Notes<textarea data-edu=\"" + index + "\" data-field=\"notes\" rows=\"2\">" + escapeHtml(item.notes || "") + "</textarea></label>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-edu]").forEach((input) => {
            const handler = () => {
                const i = Number(input.dataset.edu);
                const field = input.dataset.field;
                if (!state.education[i] || !field)
                    return;
                if (input.type === "checkbox") {
                    state.education[i][field] = Boolean(input.checked);
                }
                else {
                    state.education[i][field] = input.value;
                }
            };
            input.addEventListener("input", handler);
            input.addEventListener("change", handler);
        });
        list.querySelectorAll("[data-remove-education]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeEducation);
                state.education.splice(i, 1);
                renderEducation();
            });
        });
    }
    function renderSkills() {
        const list = document.getElementById("skills-list");
        if (!list)
            return;
        list.innerHTML = state.skills.map((item, index) => {
            return "<article class=\"item-card\">"
                + "<header><h3>Skill " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-skill=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Skill name<input data-skill=\"" + index + "\" data-field=\"skillName\" type=\"text\" value=\"" + escapeAttr(item.skillName || "") + "\"></label>"
                + "<label>Category<select data-skill=\"" + index + "\" data-field=\"category\">"
                + buildSelectOptions(item.category, ["strong", "moderate", "gap"])
                + "</select></label>"
                + "<label>Self rating (1-5)<input data-skill=\"" + index + "\" data-field=\"selfRating\" type=\"number\" min=\"1\" max=\"5\" value=\"" + escapeAttr(String(item.selfRating || 3)) + "\"></label>"
                + "<label>Years experience<input data-skill=\"" + index + "\" data-field=\"yearsExperience\" type=\"number\" min=\"0\" step=\"0.5\" value=\"" + escapeAttr(String(item.yearsExperience || "")) + "\"></label>"
                + "<label>Last used<input data-skill=\"" + index + "\" data-field=\"lastUsed\" type=\"date\" value=\"" + escapeAttr(item.lastUsed || "") + "\"></label>"
                + "</div>"
                + "<label>Evidence<textarea data-skill=\"" + index + "\" data-field=\"evidence\" rows=\"2\">" + escapeHtml(item.evidence || "") + "</textarea></label>"
                + "<label>Honest notes<textarea data-skill=\"" + index + "\" data-field=\"honestNotes\" rows=\"2\">" + escapeHtml(item.honestNotes || "") + "</textarea></label>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-skill]").forEach((input) => {
            input.addEventListener("input", () => {
                const index = Number(input.dataset.skill);
                const field = input.dataset.field;
                if (!state.skills[index] || !field)
                    return;
                state.skills[index][field] = input.value;
            });
            input.addEventListener("change", () => {
                const index = Number(input.dataset.skill);
                const field = input.dataset.field;
                if (!state.skills[index] || !field)
                    return;
                state.skills[index][field] = input.value;
            });
        });
        list.querySelectorAll("[data-remove-skill]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeSkill);
                state.skills.splice(i, 1);
                renderSkills();
            });
        });
    }
    function renderGaps() {
        const list = document.getElementById("gaps-list");
        if (!list)
            return;
        list.innerHTML = state.gaps.map((item, index) => {
            const checked = item.interestedInLearning ? " checked" : "";
            return "<article class=\"item-card\">"
                + "<header><h3>Gap " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-gap=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Gap type<select data-gap=\"" + index + "\" data-field=\"gapType\">"
                + buildSelectOptions(item.gapType, ["skill", "experience", "environment", "role_type"])
                + "</select></label>"
                + "<label>Interested in learning <input data-gap=\"" + index + "\" data-field=\"interestedInLearning\" type=\"checkbox\"" + checked + "></label>"
                + "</div>"
                + "<label>Description<textarea data-gap=\"" + index + "\" data-field=\"description\" rows=\"2\">" + escapeHtml(item.description || "") + "</textarea></label>"
                + "<label>Why this is a gap<textarea data-gap=\"" + index + "\" data-field=\"whyItsAGap\" rows=\"2\">" + escapeHtml(item.whyItsAGap || "") + "</textarea></label>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-gap]").forEach((input) => {
            const handler = () => {
                const index = Number(input.dataset.gap);
                const field = input.dataset.field;
                if (!state.gaps[index] || !field)
                    return;
                state.gaps[index][field] = input.type === "checkbox" ? Boolean(input.checked) : input.value;
            };
            input.addEventListener("input", handler);
            input.addEventListener("change", handler);
        });
        list.querySelectorAll("[data-remove-gap]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeGap);
                state.gaps.splice(i, 1);
                renderGaps();
            });
        });
    }
    function renderFaq() {
        const list = document.getElementById("faq-list");
        if (!list)
            return;
        list.innerHTML = state.faq.map((item, index) => {
            const checked = item.isCommonQuestion ? " checked" : "";
            return "<article class=\"item-card\">"
                + "<header><h3>FAQ " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-faq=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<label>Question<textarea data-faq=\"" + index + "\" data-field=\"question\" rows=\"2\">" + escapeHtml(item.question || "") + "</textarea></label>"
                + "<label>Answer<textarea data-faq=\"" + index + "\" data-field=\"answer\" rows=\"3\">" + escapeHtml(item.answer || "") + "</textarea></label>"
                + "<label>Common question <input data-faq=\"" + index + "\" data-field=\"isCommonQuestion\" type=\"checkbox\"" + checked + "></label>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-faq]").forEach((input) => {
            const handler = () => {
                const index = Number(input.dataset.faq);
                const field = input.dataset.field;
                if (!state.faq[index] || !field)
                    return;
                state.faq[index][field] = input.type === "checkbox" ? Boolean(input.checked) : input.value;
            };
            input.addEventListener("input", handler);
            input.addEventListener("change", handler);
        });
        list.querySelectorAll("[data-remove-faq]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeFaq);
                state.faq.splice(i, 1);
                renderFaq();
            });
        });
    }
    function renderAiRules() {
        const list = document.getElementById("ai-rule-list");
        if (!list)
            return;
        list.innerHTML = state.aiInstructions.rules.map((item, index) => {
            return "<article class=\"item-card\">"
                + "<header><h3>Rule " + (index + 1) + "</h3><button class=\"mini-btn danger\" data-remove-rule=\"" + index + "\" type=\"button\">Remove</button></header>"
                + "<div class=\"form-grid two-col\">"
                + "<label>Type<select data-rule=\"" + index + "\" data-field=\"instructionType\">"
                + buildSelectOptions(item.instructionType, ["honesty", "tone", "boundaries"])
                + "</select></label>"
                + "<label>Priority<input data-rule=\"" + index + "\" data-field=\"priority\" type=\"number\" value=\"" + escapeAttr(String(item.priority || (index + 1) * 10)) + "\"></label>"
                + "</div>"
                + "<label>Instruction<textarea data-rule=\"" + index + "\" data-field=\"instruction\" rows=\"3\">" + escapeHtml(item.instruction || "") + "</textarea></label>"
                + "</article>";
        }).join("");
        list.querySelectorAll("[data-rule]").forEach((input) => {
            const handler = () => {
                const index = Number(input.dataset.rule);
                const field = input.dataset.field;
                if (!state.aiInstructions.rules[index] || !field)
                    return;
                state.aiInstructions.rules[index][field] = input.value;
            };
            input.addEventListener("input", handler);
            input.addEventListener("change", handler);
        });
        list.querySelectorAll("[data-remove-rule]").forEach((button) => {
            button.addEventListener("click", () => {
                const i = Number(button.dataset.removeRule);
                state.aiInstructions.rules.splice(i, 1);
                renderAiRules();
            });
        });
    }
    function defaultExperience() {
        return {
            companyName: "",
            title: "",
            titleProgression: "",
            startDate: "",
            endDate: "",
            current: false,
            achievementBullets: [],
            whyJoined: "",
            whyLeft: "",
            actualContributions: "",
            proudestAchievement: "",
            wouldDoDifferently: "",
            hardOrFrustrating: "",
            lessonsLearned: "",
            managerDescribe: "",
            reportsDescribe: "",
            conflictsChallenges: "",
            quantifiedImpact: "",
            displayOrder: state.experiences.length
        };
    }
    function defaultSkill() {
        return {
            skillName: "",
            category: "strong",
            selfRating: 3,
            evidence: "",
            honestNotes: "",
            yearsExperience: "",
            lastUsed: ""
        };
    }
    function defaultGap() {
        return {
            gapType: "skill",
            description: "",
            whyItsAGap: "",
            interestedInLearning: true
        };
    }
    function defaultFaq() {
        return {
            question: "",
            answer: "",
            isCommonQuestion: false
        };
    }
    function defaultRule() {
        return {
            instructionType: "tone",
            instruction: "",
            priority: (state.aiInstructions.rules.length + 1) * 10
        };
    }
    function wireAddButtons() {
        const targetInput = document.getElementById("target-title-input");
        const addTarget = document.getElementById("add-target-title");
        if (addTarget && targetInput) {
            addTarget.addEventListener("click", () => {
                const value = (targetInput.value || "").trim();
                if (!value)
                    return;
                state.profile.targetTitles.push(value);
                targetInput.value = "";
                renderTargetTitles();
            });
        }
        const addExperience = document.getElementById("add-experience");
        if (addExperience) {
            addExperience.addEventListener("click", () => {
                state.experiences.push(defaultExperience());
                renderExperiences();
            });
        }
        const addSkill = document.getElementById("add-skill");
        if (addSkill) {
            addSkill.addEventListener("click", () => {
                state.skills.push(defaultSkill());
                renderSkills();
            });
        }
        const addEducation = document.getElementById("add-education");
        if (addEducation) {
            addEducation.addEventListener("click", () => {
                state.education.push(defaultEducation());
                renderEducation();
            });
        }
        const addGap = document.getElementById("add-gap");
        if (addGap) {
            addGap.addEventListener("click", () => {
                state.gaps.push(defaultGap());
                renderGaps();
            });
        }
        const addFaq = document.getElementById("add-faq");
        if (addFaq) {
            addFaq.addEventListener("click", () => {
                state.faq.push(defaultFaq());
                renderFaq();
            });
        }
        const addRule = document.getElementById("add-ai-rule");
        if (addRule) {
            addRule.addEventListener("click", () => {
                state.aiInstructions.rules.push(defaultRule());
                renderAiRules();
            });
        }
    }
    function sanitizeForSave() {
        const payload = JSON.parse(JSON.stringify(state));
        payload.experiences = (payload.experiences || []).filter((item) => {
            return String(item.companyName || "").trim() && String(item.title || "").trim();
        });
        payload.skills = (payload.skills || []).filter((item) => {
            return String(item.skillName || "").trim();
        });
        payload.gaps = (payload.gaps || []).filter((item) => {
            return String(item.description || "").trim();
        });
        payload.faq = (payload.faq || []).filter((item) => {
            return String(item.question || "").trim() || String(item.answer || "").trim();
        });
        payload.aiInstructions.rules = (payload.aiInstructions.rules || []).filter((item) => {
            return String(item.instruction || "").trim();
        });
        return payload;
    }
    function parseNullableNumber(value) {
        if (value === null || value === undefined) {
            return null;
        }
        const raw = String(value).trim();
        if (!raw) {
            return null;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }
    function validateSalaryRange(payload) {
        const profile = payload && payload.profile ? payload.profile : {};
        const salaryMin = parseNullableNumber(profile.salaryMin);
        const salaryMax = parseNullableNumber(profile.salaryMax);
        if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
            throw new Error("Salary min cannot be greater than salary max");
        }
    }
    async function saveAll() {
        setMessage("Saving all changes...", false);
        const payload = sanitizeForSave();
        validateSalaryRange(payload);
        await apiRequest("/api/panel-data", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        localStorage.removeItem(DRAFT_KEY);
        setMessage("All changes saved successfully.", false);
    }
    function saveDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
            setMessage("Draft autosaved locally.", false);
            window.setTimeout(() => {
                const el = document.getElementById("admin-message");
                if (el && el.textContent === "Draft autosaved locally.") {
                    el.hidden = true;
                }
            }, 1500);
        }
        catch (error) {
            // Ignore localStorage quota errors and continue.
        }
    }
    function loadDraftIfAny() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw)
                return;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object")
                return;
            // Apply draft conservatively: only merge fields that are meaningfully present
            const safe = {};
            if (parsed.profile && Object.keys(parsed.profile).some((k) => parsed.profile[k] !== undefined && parsed.profile[k] !== "")) {
                safe.profile = parsed.profile;
            }
            if (Array.isArray(parsed.experiences) && parsed.experiences.length > 0) {
                const nonEmptyExp = parsed.experiences.filter((it) => it && (String(it.companyName || it.company || '').trim() || String(it.title || '').trim()));
                if (nonEmptyExp.length > 0) safe.experiences = nonEmptyExp;
            }
            if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
                const nonEmptySkills = parsed.skills.filter((it) => it && String(it.skillName || '').trim());
                if (nonEmptySkills.length > 0) safe.skills = nonEmptySkills;
            }
            if (Array.isArray(parsed.gaps) && parsed.gaps.length > 0) {
                const nonEmptyGaps = parsed.gaps.filter((it) => it && (String(it.description || it.whyItsAGap || '').trim()));
                if (nonEmptyGaps.length > 0) safe.gaps = nonEmptyGaps;
            }
            if (Array.isArray(parsed.education) && parsed.education.length > 0) {
                const nonEmptyEdu = parsed.education.filter((it) => it && (String(it.institution || it.degree || it.fieldOfStudy || it.field_of_study || '').trim()));
                if (nonEmptyEdu.length > 0) safe.education = nonEmptyEdu;
            }
            if (parsed.valuesCulture && Object.keys(parsed.valuesCulture).some((k) => parsed.valuesCulture[k] !== undefined && parsed.valuesCulture[k] !== "")) {
                safe.valuesCulture = parsed.valuesCulture;
            }
            if (Array.isArray(parsed.faq) && parsed.faq.length > 0) {
                safe.faq = parsed.faq;
            }
            if (parsed.aiInstructions) {
                safe.aiInstructions = parsed.aiInstructions;
            }
            if (Object.keys(safe).length === 0) {
                return;
            }
            mergeState(safe);
            setMessage("Recovered unsaved draft from this browser.", false);
        }
        catch (error) {
            localStorage.removeItem(DRAFT_KEY);
        }
    }
    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    function escapeAttr(value) {
        return escapeHtml(value).replace(/\n/g, "&#10;");
    }
    function buildSelectOptions(current, values) {
        return values.map((value) => {
            const selected = String(current || "") === String(value) ? " selected" : "";
            return "<option value=\"" + escapeAttr(value) + "\"" + selected + ">" + escapeHtml(value) + "</option>";
        }).join("");
    }
    function renderAll() {
        fillSimpleFields();
        renderTargetTitles();
        renderCompanyStages();
        renderExperiences();
        renderEducation();
        renderSkills();
        renderGaps();
        renderFaq();
        renderAiRules();
    }
    async function authenticate() {
        try {
            const data = await apiRequest("/api/auth/me", { method: "GET" });
            const label = document.getElementById("admin-user");
            const providerBadge = document.getElementById("admin-provider");
            if (label && data.user) {
                label.textContent = data.user.email + (data.user.fullName ? " (" + data.user.fullName + ")" : "");
            }
            if (providerBadge) {
                const provider = String((data.user && data.user.provider) || "").toLowerCase();
                providerBadge.textContent = provider === "aad" ? "Signed in via Microsoft" : "Signed in";
                providerBadge.hidden = false;
            }
            return true;
        }
        catch (error) {
            window.location.href = "/auth";
            return false;
        }
    }
    async function loadServerData() {
        setMessage("Loading admin data...", false);
        const data = await apiRequest("/api/panel-data", { method: "GET" });
        mergeState(data);
        setMessage("Admin data loaded.", false);
    }
    function wireGlobalActions() {
        const saveButton = document.getElementById("save-all");
        if (saveButton) {
            saveButton.addEventListener("click", async () => {
                try {
                    await saveAll();
                }
                catch (error) {
                    setMessage(error.message || "Save failed", true);
                }
            });
        }
        const signOut = document.getElementById("sign-out");
        if (signOut) {
            signOut.addEventListener("click", () => {
                localStorage.removeItem(DRAFT_KEY);
                window.location.href = LOGOUT_URL;
            });
        }
        const cacheRefreshBtn = document.getElementById("cache-refresh");
        if (cacheRefreshBtn) {
            cacheRefreshBtn.addEventListener("click", async () => {
                try {
                    await loadCacheReport();
                }
                catch (error) {
                    setMessage(error.message || "Failed to load cache report", true);
                }
            });
        }
    }
    async function init() {
        wireTabs();
        wireAddButtons();
        wireGlobalActions();
        const ok = await authenticate();
        if (!ok)
            return;
        try {
            await loadServerData();
        }
        catch (error) {
            setMessage(error.message || "Failed to load server data", true);
        }
        loadDraftIfAny();
        renderAll();
        window.setInterval(saveDraft, 15000);
    }
    init();
})();
