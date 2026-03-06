(() => {
  const toggles = document.querySelectorAll('.ai-context-toggle');

  toggles.forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      if (!targetId) {
        return;
      }

      const panel = document.getElementById(targetId);
      if (!panel) {
        return;
      }

      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
      button.textContent = isExpanded ? '✨ Show AI Context' : '✨ Hide AI Context';
      panel.hidden = isExpanded;
    });
  });

  const rootNode = document.getElementById('experience-ask-root');
  if (!rootNode || typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    return;
  }

  const e = React.createElement;

  function buildAnswer(rawQuestion) {
    const question = rawQuestion.toLowerCase();

    if (question.includes('torc') || question.includes('autonomous') || question.includes('lidar')) {
      return "At Torc, my strongest contribution is translating messy autonomous vehicle telemetry into actionable product workflows. I built React experiences and API contracts so operators can reason about faults faster, not just view data. The key impact was reducing time-to-understand incidents and making reliability measurable with Datadog SLOs and synthetic checks.";
    }

    if (question.includes('soc 2') || question.includes('security') || question.includes('ancera')) {
      return "At Ancera, I treated security as an engineering system rather than a compliance checklist. I led DevSecOps standards, added pipeline controls, and aligned platform choices with auditability. That made SOC 2 an outcome of daily engineering behavior, not a one-time scramble.";
    }

    if (question.includes('lead') || question.includes('team') || question.includes('management')) {
      return "My leadership style is hands-on technical ownership with clear delivery guardrails. I set architecture direction, unblock teams, and make reliability and quality visible through standards and instrumentation. The pattern across roles is moving teams from heroics to repeatable execution.";
    }

    if (question.includes('api') || question.includes('architecture') || question.includes('design')) {
      return "I usually start with contracts and operating boundaries: what the API guarantees, what the data model optimizes for, and how observability proves behavior in production. This keeps frontend/backend work parallel and reduces integration churn across teams.";
    }

    return "The consistent thread in my experience is building cloud-native systems that are both shippable and operable. I focus on architecture clarity, measurable reliability, and delivery practices that scale from startup speed to enterprise rigor.";
  }

  function AskExperienceApp() {
    const [question, setQuestion] = React.useState('');
    const [answer, setAnswer] = React.useState('');
    const [status, setStatus] = React.useState('');

    const quickPrompts = [
      'What was your biggest impact at Torc?',
      'How did you drive SOC 2 at Ancera?',
      'What kind of roles are your best fit now?'
    ];

    const onUsePrompt = (prompt) => {
      setQuestion(prompt);
      setStatus('');
    };

    const onAsk = () => {
      const trimmed = question.trim();
      if (!trimmed) {
        setStatus('Type a question first.');
        return;
      }
      setStatus('Answer ready below.');
      setAnswer(buildAnswer(trimmed));
    };

    const onKeyDown = (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onAsk();
      }
    };

    return e(
      'section',
      { className: 'ask-panel', 'aria-label': 'Ask about experience' },
      e('label', { className: 'ask-label', htmlFor: 'experience-question' }, 'Ask about my experience'),
      e(
        'div',
        { className: 'ask-quick-prompts', role: 'group', 'aria-label': 'Suggested questions' },
        quickPrompts.map((prompt) =>
          e(
            'button',
            {
              key: prompt,
              type: 'button',
              className: 'ask-chip',
              onClick: () => onUsePrompt(prompt)
            },
            prompt
          )
        )
      ),
      e('textarea', {
        id: 'experience-question',
        className: 'ask-input',
        placeholder: 'Ask about a role, decision, architecture tradeoff, or impact...',
        value: question,
        onChange: (event) => {
          setQuestion(event.target.value);
          setStatus('');
        },
        onKeyDown
      }),
      e(
        'button',
        { className: 'ask-btn', type: 'button', onClick: onAsk },
        'Ask Experience AI'
      ),
      e('p', { className: 'ask-hint' }, 'Tip: Press Cmd+Enter (or Ctrl+Enter) to submit quickly.'),
      status ? e('p', { className: 'ask-status' }, status) : null,
      answer
        ? e(
            'div',
            { className: 'ask-answer' },
            answer
          )
        : null
    );
  }

  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(rootNode).render(e(AskExperienceApp));
    return;
  }

  if (ReactDOM.render) {
    ReactDOM.render(e(AskExperienceApp), rootNode);
  }
})();
