-- Seed data for portfolio database
-- Re-runnable: identifies candidate by email, updates profile, and refreshes child records.

BEGIN;

DO $$
DECLARE
  v_candidate_id BIGINT;
BEGIN
  SELECT id
  INTO v_candidate_id
  FROM candidate_profile
  WHERE LOWER(email) = LOWER('vminnocci@gmail.com')
  LIMIT 1;

  IF v_candidate_id IS NULL THEN
    INSERT INTO candidate_profile (
      name,
      email,
      title,
      target_titles,
      target_company_stages,
      elevator_pitch,
      career_narrative,
      looking_for,
      not_looking_for,
      management_style,
      work_style,
      salary_min,
      salary_max,
      availability_status,
      availability_date,
      location,
      remote_preference,
      github_url,
      linkedin_url,
      twitter_url
    )
    VALUES (
      'Lodovico Minnocci',
      'vminnocci@gmail.com',
      'Senior Software Engineer',
      ARRAY['Senior Software Engineer', 'Staff Engineer', 'Solutions Architect', 'Engineering Lead'],
      ARRAY['startup', 'growth', 'enterprise'],
      'Cloud-native software engineer and architect focused on scalable systems, strong observability, and practical delivery.',
      'Built systems across startups and Fortune 500 organizations, with recent focus on autonomous vehicle software and platform reliability.',
      'High-impact engineering roles with ownership of architecture, reliability, and delivery outcomes.',
      'Pure people-management tracks without technical ownership, and roles with weak product/engineering alignment.',
      'Hands-on leadership, clear decision frameworks, and measurable outcomes.',
      'Collaborative, architecture-first, iterative delivery with strong quality guardrails.',
      185000,
      245000,
      'open',
      CURRENT_DATE + INTERVAL '30 days',
      'Connecticut, USA',
      'hybrid_or_remote',
      'https://github.com/devgoon',
      'https://www.linkedin.com/in/lodovico-minnocci/',
      NULL
    )
    RETURNING id INTO v_candidate_id;
  ELSE
    UPDATE candidate_profile
    SET
      updated_at = NOW(),
      name = 'Lodovico Minnocci',
      title = 'Senior Software Engineer',
      target_titles = ARRAY['Senior Software Engineer', 'Staff Engineer', 'Solutions Architect', 'Engineering Lead'],
      target_company_stages = ARRAY['startup', 'growth', 'enterprise'],
      elevator_pitch = 'Cloud-native software engineer and architect focused on scalable systems, strong observability, and practical delivery.',
      career_narrative = 'Built systems across startups and Fortune 500 organizations, with recent focus on autonomous vehicle software and platform reliability.',
      looking_for = 'High-impact engineering roles with ownership of architecture, reliability, and delivery outcomes.',
      not_looking_for = 'Pure people-management tracks without technical ownership, and roles with weak product/engineering alignment.',
      management_style = 'Hands-on leadership, clear decision frameworks, and measurable outcomes.',
      work_style = 'Collaborative, architecture-first, iterative delivery with strong quality guardrails.',
      salary_min = 185000,
      salary_max = 245000,
      availability_status = 'open',
      availability_date = CURRENT_DATE + INTERVAL '30 days',
      location = 'Connecticut, USA',
      remote_preference = 'hybrid_or_remote',
      github_url = 'https://github.com/devgoon',
      linkedin_url = 'https://www.linkedin.com/in/lodovico-minnocci/',
      twitter_url = NULL
    WHERE id = v_candidate_id;
  END IF;

  DELETE FROM experiences WHERE candidate_id = v_candidate_id;
  DELETE FROM skills WHERE candidate_id = v_candidate_id;
  DELETE FROM gaps_weaknesses WHERE candidate_id = v_candidate_id;
  DELETE FROM values_culture WHERE candidate_id = v_candidate_id;
  DELETE FROM faq_responses WHERE candidate_id = v_candidate_id;
  DELETE FROM ai_instructions WHERE candidate_id = v_candidate_id;

  INSERT INTO experiences (
    candidate_id,
    company_name,
    title,
    title_progression,
    start_date,
    end_date,
    is_current,
    bullet_points,
    why_joined,
    why_left,
    actual_contributions,
    proudest_achievement,
    would_do_differently,
    challenges_faced,
    lessons_learned,
    manager_would_say,
    reports_would_say,
    quantified_impact,
    display_order
  ) VALUES
  (
    v_candidate_id,
    'Torc Robotics',
    'Senior Software Engineer',
    NULL,
    DATE '2024-09-01',
    NULL,
    TRUE,
    ARRAY[
      'Built React applications for monitoring fault events and live truck telemetry.',
      'Designed OpenAPI-driven REST endpoints backed by DynamoDB for internal tooling.',
      'Implemented Datadog dashboards and SLOs to improve production reliability.'
    ],
    'Wanted to work on high-impact autonomous systems and modern cloud-native architecture.',
    NULL,
    'Owned frontend + API design for operational tooling used by engineering and operations teams.',
    'Delivered a reliable fleet observability workflow that shortened incident triage cycles.',
    'Would establish stronger data contracts even earlier between producer and consumer systems.',
    'Balancing fast feature delivery with strict reliability expectations in safety-adjacent software.',
    'Clear contracts and observability-first architecture reduce long-term operational risk.',
    'Raises quality standards and delivers under ambiguity with strong ownership.',
    'Provides clarity, technical mentorship, and practical execution support.',
    '{"scope":"fleet operations tooling","impact":"faster fault triage and stronger reliability posture"}'::jsonb,
    10
  ),
  (
    v_candidate_id,
    'Ancera',
    'Systems Architect',
    NULL,
    DATE '2020-12-01',
    DATE '2024-09-01',
    FALSE,
    ARRAY[
      'Led Azure administration, security hardening, and DevOps modernization.',
      'Designed edge AI workflows that improved image recognition performance by 700%.',
      'Implemented DevSecOps processes contributing to SOC 2 readiness.'
    ],
    'Opportunity to shape architecture and platform direction in a growing product company.',
    'Role concluded after major platform goals and compliance milestones were achieved.',
    'Built secure CI/CD and deployment standards while enabling faster engineering throughput.',
    'Created a platform maturity roadmap that balanced speed, security, and cost.',
    'Would formalize engineering KPIs sooner to quantify process improvements over time.',
    'Evolving infrastructure maturity while maintaining delivery commitments.',
    'Security and compliance should be built into delivery workflows, not bolted on later.',
    'Strong systems thinker with execution discipline and clear communication.',
    'Supportive and direct; sets standards while helping teams level up.',
    '{"image_recognition_improvement_pct":700,"compliance":"SOC 2 path accelerated"}'::jsonb,
    20
  ),
  (
    v_candidate_id,
    'Subway',
    'Lead Integration Engineer',
    NULL,
    DATE '2019-07-01',
    DATE '2020-12-01',
    FALSE,
    ARRAY[
      'Built APIs supporting mobile, web, and B2B channels at large scale.',
      'Led distributed engineering efforts for integration delivery.',
      'Implemented AWS serverless and CI/CD patterns for faster releases.'
    ],
    'Chance to lead high-scale integration architecture for a major global brand.',
    'Moved to a broader architecture scope aligned with long-term goals.',
    'Drove API and integration reliability across multiple dependent teams.',
    'Established a delivery cadence that improved cross-team predictability.',
    'Would invest earlier in consumer onboarding docs for faster partner adoption.',
    'Managing cross-team dependencies while sustaining release velocity.',
    'At scale, consistency in contracts and delivery process matters as much as raw coding speed.',
    'Dependable technical lead with strong systems and delivery focus.',
    'Creates structure and removes blockers effectively.',
    '{"scale":"millions of users daily","focus":"api reliability and release velocity"}'::jsonb,
    30
  );

  INSERT INTO skills (
    candidate_id,
    skill_name,
    category,
    self_rating,
    evidence,
    honest_notes,
    years_experience,
    last_used
  ) VALUES
  (v_candidate_id, 'AWS', 'strong', 5, 'Production systems using Lambda, API Gateway, DynamoDB, and observability tooling.', 'Confident in architecture and operational tradeoffs at scale.', 8.0, CURRENT_DATE),
  (v_candidate_id, 'TypeScript', 'strong', 5, 'Delivered React and backend API contracts in recent roles.', 'Strong practical fluency and tooling habits.', 5.0, CURRENT_DATE),
  (v_candidate_id, 'React', 'strong', 5, 'Operational dashboards and interfaces for fleet tooling.', 'Strong in product-facing engineering with performance awareness.', 6.0, CURRENT_DATE),
  (v_candidate_id, 'Azure', 'moderate', 4, 'Led administration and DevOps workflows at Ancera.', 'Strong operational experience; less recent than AWS-heavy work.', 6.0, DATE '2024-09-01'),
  (v_candidate_id, 'Kubernetes', 'moderate', 3, 'Platform experiments and production support in enterprise contexts.', 'Solid working knowledge; not current daily focus.', 4.0, DATE '2023-12-01'),
  (v_candidate_id, 'iOS Swift', 'gap', 1, 'No deep production ownership in native iOS stack.', 'Would need ramp time for mobile-native specialist roles.', 0.0, NULL),
  (v_candidate_id, 'Android Kotlin', 'gap', 1, 'Limited direct delivery history.', 'Not a target specialization.', 0.0, NULL);

  INSERT INTO gaps_weaknesses (
    candidate_id,
    gap_type,
    description,
    why_its_a_gap,
    interest_in_learning
  ) VALUES
  (v_candidate_id, 'skill', 'Deep native iOS stack ownership', 'Most recent work centers on cloud platform and web/API systems.', FALSE),
  (v_candidate_id, 'experience', 'Consumer growth experimentation loops', 'Primary history is platform and enterprise/product infrastructure.', TRUE),
  (v_candidate_id, 'role_type', 'Pure engineering manager roles', 'Prefers hands-on technical leadership rather than people-only scope.', FALSE);

  INSERT INTO values_culture (
    candidate_id,
    must_haves,
    dealbreakers,
    management_style_preferences,
    team_size_preferences,
    how_handle_conflict,
    how_handle_ambiguity,
    how_handle_failure
  ) VALUES (
    v_candidate_id,
    ARRAY['Clear ownership', 'Engineering quality culture', 'Honest communication', 'Measurable outcomes'],
    ARRAY['Blame-driven culture', 'Persistent unclear ownership', 'No quality standards'],
    'Direct, transparent, and context-rich leadership with technical credibility.',
    'Works well in focused teams (5-15) and cross-functional orgs with clear interfaces.',
    'Addresses conflict early with data, explicit goals, and direct conversation.',
    'Breaks ambiguity into testable assumptions and short feedback loops.',
    'Treats failures as systems feedback: document, adjust, and prevent recurrence.'
  );

  INSERT INTO faq_responses (
    candidate_id,
    question,
    answer,
    is_common_question
  ) VALUES
  (v_candidate_id, 'What is your biggest weakness?', 'I can over-index on architecture rigor too early; I mitigate this by right-sizing process to the project phase.', TRUE),
  (v_candidate_id, 'Tell me about a project that failed.', 'One initiative suffered from unclear upstream contracts; I learned to align ownership and API boundaries early.', TRUE),
  (v_candidate_id, 'Why did you leave your last role?', 'I move when scope and impact align with long-term growth in technical leadership and architecture ownership.', TRUE),
  (v_candidate_id, 'What would your manager say about you?', 'High ownership, strong execution under ambiguity, and focus on measurable reliability.', TRUE);

  INSERT INTO ai_instructions (
    candidate_id,
    instruction_type,
    instruction,
    priority
  ) VALUES
  (v_candidate_id, 'honesty', 'Be direct about fit, including explicit gaps and non-fit scenarios.', 10),
  (v_candidate_id, 'tone', 'Use concise, professional language and avoid over-selling claims.', 20),
  (v_candidate_id, 'boundaries', 'Do not fabricate accomplishments, dates, or metrics not present in data.', 5);
END $$;

COMMIT;
