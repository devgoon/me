// @ts-nocheck
(() => {
    const rootNode = document.getElementById('fit-app-root');
    if (!rootNode || typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
        return;
    }
    const e = React.createElement;
    const profileStrengths = [
        { key: 'aws', label: 'Strong AWS platform and architecture depth (Lambda/API Gateway/DynamoDB).' },
        { key: 'azure', label: 'Proven Azure administration and cloud migration leadership.' },
        { key: 'react', label: 'Hands-on React delivery for production operational systems.' },
        { key: 'typescript', label: 'TypeScript implementation across frontend and API contracts.' },
        { key: 'api', label: 'API-first design with OpenAPI and service integration experience.' },
        { key: 'devops', label: 'DevOps/DevSecOps ownership with CI/CD hardening.' },
        { key: 'observability', label: 'Datadog dashboards, SLOs, and reliability instrumentation.' },
        { key: 'docker', label: 'Containerization and platform modernization background.' },
        { key: 'kubernetes', label: 'Kubernetes and platform evolution experience.' },
        { key: 'lead', label: 'Cross-team technical leadership and delivery ownership.' }
    ];
    const possibleGaps = [
        { keys: ['swift', 'swiftui', 'ios'], text: 'The role is centered on native iOS/Swift, which is not a primary recent focus.' },
        { keys: ['android', 'kotlin'], text: 'Deep Android/Kotlin delivery is not a core strength in my recent track record.' },
        { keys: ['onsite', 'san francisco', 'sf'], text: 'Strict onsite location constraints may not align depending on logistics expectations.' },
        { keys: ['phd', 'research scientist'], text: 'Research-heavy or academic credential requirements are outside my profile emphasis.' },
        { keys: ['salesforce'], text: 'Salesforce-specific platform depth is not highlighted in my recent experience.' },
        { keys: ['unity', '3d', 'graphics'], text: 'Specialized graphics/rendering stack requirements are outside my usual delivery scope.' }
    ];
    function includesAny(text, terms) {
        return terms.some((term) => text.includes(term));
    }
    function buildFollowUpAnswer(question, verdict) {
        const q = question.toLowerCase();
        if (q.includes('salary') || q.includes('compensation')) {
            return 'I would discuss compensation only after we validate scope, expectations, and impact ownership. Strong fit should map to strong leveling and comp.';
        }
        if (q.includes('remote') || q.includes('onsite') || q.includes('hybrid')) {
            return 'Work model matters less than execution clarity. If the role is otherwise aligned, I would evaluate remote/on-site expectations based on collaboration needs and outcomes.';
        }
        if (q.includes('risk') || q.includes('gap')) {
            return verdict === 'Strong Fit'
                ? 'Main risk is usually domain ramp time, not core engineering capability. I would de-risk with a scoped technical plan in the first 30-60 days.'
                : 'The highest risk is mismatch in core stack expectations. I would only proceed if the team values transferable systems and architecture experience over exact stack history.';
        }
        return 'I would use this assessment as a filter, then ask one high-signal question: What must this person deliver in 90 days to be considered a clear success?';
    }
    function FitApp() {
        const [jobDescription, setJobDescription] = React.useState('');
        const [result, setResult] = React.useState(null);
        const [followUp, setFollowUp] = React.useState('');
        const [followUpAnswer, setFollowUpAnswer] = React.useState('');
        const analyze = () => {
            const jd = jobDescription.trim();
            if (!jd) {
                return;
            }
            const lower = jd.toLowerCase();
            const transfers = profileStrengths
                .filter((entry) => lower.includes(entry.key))
                .map((entry) => entry.label);
            const gaps = possibleGaps
                .filter((entry) => includesAny(lower, entry.keys))
                .map((entry) => entry.text);
            const score = (transfers.length * 2) - (gaps.length * 2);
            let verdict = 'Worth a Conversation';
            let verdictClass = 'mid';
            let opening = "I'd call this a mixed fit: I can likely deliver meaningful value here, but I would want to align expectations on the few areas that are less direct matches.";
            let recommendation = 'Proceed to a technical conversation focused on the highest-risk requirements, then decide quickly based on concrete gap tolerance.';
            if (score >= 5 && gaps.length <= 1) {
                verdict = 'Strong Fit';
                verdictClass = 'strong';
                opening = "I'm a strong fit for this role based on direct overlap in cloud architecture, API delivery, and production reliability outcomes.";
                recommendation = 'Move forward with a scoped technical interview centered on architecture depth and execution speed in your domain.';
            }
            else if (score <= 0 || gaps.length >= 3) {
                verdict = 'Probably Not Your Person';
                verdictClass = 'weak';
                opening = "I'm probably not your person for this specific role as written, and I'd rather be direct about that than force a weak match.";
                recommendation = 'If these requirements are truly fixed, I would pass; if they are flexible, reframe around platform/API ownership and we can reassess quickly.';
            }
            setResult({
                verdict,
                verdictClass,
                opening,
                recommendation,
                gaps: gaps.length > 0
                    ? gaps
                    : ['No major red flags in the JD wording, but I would still validate role scope, seniority expectations, and team operating model in conversation.'],
                transfers: transfers.length > 0
                    ? transfers
                    : ['My transferable strengths are broad cloud architecture, systems design, and shipping reliable software in high-stakes environments.']
            });
            setFollowUp('');
            setFollowUpAnswer('');
        };
        const askFollowUp = () => {
            const question = followUp.trim();
            if (!question || !result) {
                return;
            }
            setFollowUpAnswer(buildFollowUpAnswer(question, result.verdict));
        };
        return e(React.Fragment, null, e('section', { className: 'fit-panel', 'aria-label': 'Fit analyzer' }, e('label', { className: 'jd-label', htmlFor: 'job-description' }, 'Job description'), e('p', { className: 'jd-hint' }, 'Copy/paste JD here.'), e('textarea', {
            id: 'job-description',
            className: 'jd-input',
            placeholder: 'e.g. Senior Software Engineer - Cloud Platform\nLooking for TypeScript/React, AWS (Lambda/API Gateway/DynamoDB), API design, CI/CD, and observability with Datadog.',
            value: jobDescription,
            onChange: (event) => setJobDescription(event.target.value)
        }), e('button', { id: 'analyze-fit', className: 'analyze-btn', type: 'button', onClick: analyze }, e('i', { className: 'bi bi-stars', 'aria-hidden': 'true' }), e('span', null, 'Analyze Fit'))), result
            ? e('section', { className: 'fit-output', 'aria-live': 'polite' }, e('article', { className: 'role-card fit-card' }, e('div', { className: 'fit-verdict-row' }, e('h2', null, 'Assessment'), e('span', { className: `verdict-badge ${result.verdictClass}` }, result.verdict)), e('p', { className: 'opening-assessment' }, result.opening), e('h3', null, "WHERE I DON'T FIT"), e('ul', { className: 'achievement-list' }, result.gaps.map((item) => e('li', { key: `gap-${item}` }, item))), e('h3', null, 'WHAT TRANSFERS'), e('ul', { className: 'achievement-list' }, result.transfers.map((item) => e('li', { key: `transfer-${item}` }, item))), e('h3', null, 'MY RECOMMENDATION'), e('p', { className: 'recommendation' }, result.recommendation), e('aside', { className: 'philosophy-callout' }, e('strong', null, 'Philosophy:'), e('p', null, 'This signals something completely different than "please consider my resume." You\'re qualifying them. Your time is valuable.'))), e('section', { className: 'ask-panel', 'aria-label': 'Ask about this fit assessment' }, e('label', { className: 'ask-label', htmlFor: 'fit-follow-up' }, 'Ask about this fit assessment'), e('textarea', {
                id: 'fit-follow-up',
                className: 'ask-input',
                placeholder: 'Ask a follow-up like: "What is the biggest risk here?"',
                value: followUp,
                onChange: (event) => setFollowUp(event.target.value)
            }), e('button', { className: 'ask-btn', type: 'button', onClick: askFollowUp }, 'Ask Fit AI'), followUpAnswer ? e('div', { className: 'ask-answer' }, followUpAnswer) : null))
            : null);
    }
    ReactDOM.createRoot(rootNode).render(e(FitApp));
})();
