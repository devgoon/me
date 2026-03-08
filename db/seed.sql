-- Seed generated from live database
-- Generated at 2026-03-08T00:35:02.182Z
BEGIN;

TRUNCATE TABLE
  ai_instructions,
  faq_responses,
  values_culture,
  gaps_weaknesses,
  skills,
  experiences,
  admin_users,
  candidate_profile
RESTART IDENTITY CASCADE;

-- candidate_profile: 2 row(s)
INSERT INTO candidate_profile (id, created_at, updated_at, name, email, title, target_titles, target_company_stages, elevator_pitch, career_narrative, looking_for, not_looking_for, management_style, work_style, salary_min, salary_max, availability_status, availability_date, location, remote_preference, github_url, linkedin_url, twitter_url) VALUES
  ('1', '"2026-03-06T01:00:24.311Z"'::jsonb, '"2026-03-07T16:18:31.127Z"'::jsonb, 'Lodovico Minnocci', 'vminnocci@gmail.com', 'Senior Software Engineer', ARRAY['Senior Software Engineer', 'Staff Engineer', 'Solutions Architect', 'Engineering Lead'], ARRAY['startup', 'growth', 'enterprise', 'Public'], 'Cloud-native software engineer and architect focused on scalable systems, strong observability, and practical delivery.', 'Built systems across startups and Fortune 500 organizations, with recent focus on autonomous vehicle software and platform reliability.', 'High-impact engineering roles with ownership of architecture, reliability, and delivery outcomes.', 'Pure people-management tracks without technical ownership, and roles with weak product/engineering alignment.', 'Hands-on leadership, clear decision frameworks, and measurable outcomes.', 'Collaborative, architecture-first, iterative delivery with strong quality guardrails.', '185000.00', '1000000.00', 'Open to opportunities', '"2026-03-07T05:00:00.000Z"'::jsonb, 'Connecticut, USA', 'Remote only', 'https://github.com/devgoon', 'https://www.linkedin.com/in/lodovico-minnocci/', NULL),
  ('2', '"2026-03-07T15:47:41.545Z"'::jsonb, '"2026-03-07T15:47:41.545Z"'::jsonb, 'lodovico.minnocci', 'lodovico.minnocci@lodovi.co', NULL, ARRAY[]::text[], ARRAY[]::text[], NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- experiences: 3 row(s)
INSERT INTO experiences (id, candidate_id, created_at, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, why_joined, why_left, actual_contributions, proudest_achievement, would_do_differently, challenges_faced, lessons_learned, manager_would_say, reports_would_say, quantified_impact, display_order) VALUES
  ('16', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Torc Robotics', 'Senior Software Engineer', NULL, '"2024-09-01T04:00:00.000Z"'::jsonb, NULL, TRUE, ARRAY['Built React applications for monitoring fault events and live truck telemetry.', 'Designed OpenAPI-driven REST endpoints backed by DynamoDB for internal tooling.', 'Implemented Datadog dashboards and SLOs to improve production reliability.'], 'Wanted to work on high-impact autonomous systems and modern cloud-native architecture.', NULL, 'Owned frontend + API design for operational tooling used by engineering and operations teams.', 'Delivered a reliable fleet observability workflow that shortened incident triage cycles.', 'Would establish stronger data contracts even earlier between producer and consumer systems.', 'Balancing fast feature delivery with strict reliability expectations in safety-adjacent software.', 'Clear contracts and observability-first architecture reduce long-term operational risk.', 'Raises quality standards and delivers under ambiguity with strong ownership.', 'Provides clarity, technical mentorship, and practical execution support.', '{"scope":"fleet operations tooling","impact":"faster fault triage and stronger reliability posture"}'::jsonb, 10),
  ('17', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Ancera', 'Systems Architect', NULL, '"2020-12-01T05:00:00.000Z"'::jsonb, '"2024-09-01T04:00:00.000Z"'::jsonb, FALSE, ARRAY['Led Azure administration, security hardening, and DevOps modernization.', 'Designed edge AI workflows that improved image recognition performance by 700%.', 'Implemented DevSecOps processes contributing to SOC 2 readiness.'], 'Opportunity to shape architecture and platform direction in a growing product company.', 'Role concluded after major platform goals and compliance milestones were achieved.', 'Built secure CI/CD and deployment standards while enabling faster engineering throughput.', 'Created a platform maturity roadmap that balanced speed, security, and cost.', 'Would formalize engineering KPIs sooner to quantify process improvements over time.', 'Evolving infrastructure maturity while maintaining delivery commitments.', 'Security and compliance should be built into delivery workflows, not bolted on later.', 'Strong systems thinker with execution discipline and clear communication.', 'Supportive and direct; sets standards while helping teams level up.', '{"compliance":"SOC 2 path accelerated","image_recognition_improvement_pct":700}'::jsonb, 20),
  ('18', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Subway', 'Lead Integration Engineer', NULL, '"2019-07-01T04:00:00.000Z"'::jsonb, '"2020-12-01T05:00:00.000Z"'::jsonb, FALSE, ARRAY['Built APIs supporting mobile, web, and B2B channels at large scale.', 'Led distributed engineering efforts for integration delivery.', 'Implemented AWS serverless and CI/CD patterns for faster releases.'], 'Chance to lead high-scale integration architecture for a major global brand.', 'Moved to a broader architecture scope aligned with long-term goals.', 'Drove API and integration reliability across multiple dependent teams.', 'Established a delivery cadence that improved cross-team predictability.', 'Would invest earlier in consumer onboarding docs for faster partner adoption.', 'Managing cross-team dependencies while sustaining release velocity.', 'At scale, consistency in contracts and delivery process matters as much as raw coding speed.', 'Dependable technical lead with strong systems and delivery focus.', 'Creates structure and removes blockers effectively.', '{"focus":"api reliability and release velocity","scale":"millions of users daily"}'::jsonb, 30);

-- skills: 4 row(s)
INSERT INTO skills (id, candidate_id, created_at, skill_name, category, self_rating, evidence, honest_notes, years_experience, last_used) VALUES
  ('33', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Azure', 'strong', 4, 'Led administration and DevOps workflows at Ancera.', 'Strong operational experience; less recent than AWS-heavy work.', '6.0', '"2024-09-01T04:00:00.000Z"'::jsonb),
  ('34', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'AWS', 'strong', 5, 'Production systems using Lambda, API Gateway, DynamoDB, and observability tooling.', 'Confident in architecture and operational tradeoffs at scale.', '8.0', '"2026-03-06T05:00:00.000Z"'::jsonb),
  ('35', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'React', 'moderate', 3, 'Operational dashboards and interfaces for fleet tooling.', 'Strong in product-facing engineering with performance awareness.', '2.0', '"2026-03-06T05:00:00.000Z"'::jsonb),
  ('36', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'TypeScript', 'moderate', 3, 'Delivered React and backend API contracts in recent roles.', 'Strong practical fluency and tooling habits.', '2.0', '"2026-03-06T05:00:00.000Z"'::jsonb);

-- gaps_weaknesses: 3 row(s)
INSERT INTO gaps_weaknesses (id, candidate_id, created_at, gap_type, description, why_its_a_gap, interest_in_learning) VALUES
  ('16', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'skill', 'Deep native iOS stack ownership', 'Most recent work centers on cloud platform and web/API systems.', FALSE),
  ('17', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'experience', 'Consumer growth experimentation loops', 'Primary history is platform and enterprise/product infrastructure.', TRUE),
  ('18', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'role_type', 'Pure engineering manager roles', 'Prefers hands-on technical leadership rather than people-only scope.', FALSE);

-- values_culture: 1 row(s)
INSERT INTO values_culture (id, candidate_id, created_at, must_haves, dealbreakers, management_style_preferences, team_size_preferences, how_handle_conflict, how_handle_ambiguity, how_handle_failure) VALUES
  ('6', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, ARRAY['Clear ownership', 'Engineering quality culture', 'Honest communication', 'Measurable outcomes'], ARRAY['Blame-driven culture', 'Persistent unclear ownership', 'No quality standards'], 'Direct, transparent, and context-rich leadership with technical credibility.', 'Works well in focused teams (5-15) and cross-functional orgs with clear interfaces.', 'Addresses conflict early with data, explicit goals, and direct conversation.', 'Breaks ambiguity into testable assumptions and short feedback loops.', 'Treats failures as systems feedback: document, adjust, and prevent recurrence.');

-- faq_responses: 4 row(s)
INSERT INTO faq_responses (id, candidate_id, created_at, question, answer, is_common_question) VALUES
  ('21', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'What is your biggest weakness?', 'I can over-index on architecture rigor too early; I mitigate this by right-sizing process to the project phase.', TRUE),
  ('22', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Tell me about a project that failed.', 'One initiative suffered from unclear upstream contracts; I learned to align ownership and API boundaries early.', TRUE),
  ('23', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'Why did you leave your last role?', 'I move when scope and impact align with long-term growth in technical leadership and architecture ownership.', TRUE),
  ('24', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'What would your manager say about you?', 'High ownership, strong execution under ambiguity, and focus on measurable reliability.', TRUE);

-- ai_instructions: 4 row(s)
INSERT INTO ai_instructions (id, candidate_id, created_at, instruction_type, instruction, priority) VALUES
  ('19', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'honesty', 'HONESTY_LEVEL:7', 0),
  ('20', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'boundaries', 'Do not fabricate accomplishments, dates, or metrics not present in data.', 5),
  ('21', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'honesty', 'Be direct about fit, including explicit gaps and non-fit scenarios.', 10),
  ('22', '1', '"2026-03-07T16:18:31.127Z"'::jsonb, 'tone', 'Use concise, professional language and avoid over-selling claims.', 20);

-- admin_users: 0 rows

COMMIT;
