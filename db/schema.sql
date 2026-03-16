-- Portfolio site schema for PostgreSQL (Azure Database for PostgreSQL)
-- Safe to run multiple times for table/index creation.

BEGIN;

CREATE TABLE IF NOT EXISTS candidate_profile (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  title TEXT,
  target_titles TEXT[] NOT NULL DEFAULT '{}',
  target_company_stages TEXT[] NOT NULL DEFAULT '{}',
  elevator_pitch TEXT,
  career_narrative TEXT,
  looking_for TEXT,
  not_looking_for TEXT,
  management_style TEXT,
  work_style TEXT,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  availability_status TEXT,
  availability_date DATE,
  location TEXT,
  remote_preference TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  CONSTRAINT candidate_profile_salary_range_chk
    CHECK (
      salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS candidate_profile_email_uidx
  ON candidate_profile (LOWER(email));

CREATE TABLE IF NOT EXISTS experiences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_name TEXT NOT NULL,
  title TEXT,
  title_progression TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  bullet_points TEXT[] NOT NULL DEFAULT '{}',
  why_joined TEXT,
  why_left TEXT,
  actual_contributions TEXT,
  proudest_achievement TEXT,
  would_do_differently TEXT,
  challenges_faced TEXT,
  lessons_learned TEXT,
  manager_would_say TEXT,
  reports_would_say TEXT,
  quantified_impact JSONB,
  display_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT experiences_date_range_chk
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS experiences_candidate_id_idx
  ON experiences (candidate_id);

CREATE INDEX IF NOT EXISTS experiences_candidate_order_idx
  ON experiences (candidate_id, display_order, start_date DESC);

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  self_rating INTEGER,
  evidence TEXT,
  honest_notes TEXT,
  years_experience NUMERIC(4,1),
  last_used DATE,
  CONSTRAINT skills_category_chk CHECK (category IN ('strong', 'moderate', 'gap')),
  CONSTRAINT skills_self_rating_chk CHECK (self_rating IS NULL OR self_rating BETWEEN 1 AND 5),
  CONSTRAINT skills_years_experience_chk CHECK (years_experience IS NULL OR years_experience >= 0)
);

CREATE INDEX IF NOT EXISTS skills_candidate_id_idx
  ON skills (candidate_id);

CREATE INDEX IF NOT EXISTS skills_candidate_category_idx
  ON skills (candidate_id, category);

CREATE TABLE IF NOT EXISTS gaps_weaknesses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gap_type TEXT NOT NULL,
  description TEXT NOT NULL,
  why_its_a_gap TEXT,
  interest_in_learning BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT gaps_weaknesses_gap_type_chk
    CHECK (gap_type IN ('skill', 'experience', 'environment', 'role_type'))
);

CREATE INDEX IF NOT EXISTS gaps_weaknesses_candidate_id_idx
  ON gaps_weaknesses (candidate_id);

CREATE TABLE IF NOT EXISTS values_culture (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  must_haves TEXT[] NOT NULL DEFAULT '{}',
  dealbreakers TEXT[] NOT NULL DEFAULT '{}',
  management_style_preferences TEXT,
  team_size_preferences TEXT,
  how_handle_conflict TEXT,
  how_handle_ambiguity TEXT,
  how_handle_failure TEXT
);

CREATE INDEX IF NOT EXISTS values_culture_candidate_id_idx
  ON values_culture (candidate_id);

CREATE TABLE IF NOT EXISTS faq_responses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_common_question BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS faq_responses_candidate_id_idx
  ON faq_responses (candidate_id);

CREATE INDEX IF NOT EXISTS faq_responses_common_idx
  ON faq_responses (candidate_id, is_common_question);

CREATE TABLE IF NOT EXISTS education (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  institution TEXT,
  degree TEXT,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  grade TEXT,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS education_candidate_id_idx
  ON education (candidate_id);

CREATE TABLE IF NOT EXISTS ai_instructions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidate_profile(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instruction_type TEXT NOT NULL,
  instruction TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  CONSTRAINT ai_instructions_instruction_type_chk
    CHECK (instruction_type IN ('honesty', 'tone', 'boundaries'))
);

CREATE INDEX IF NOT EXISTS ai_instructions_candidate_id_idx
  ON ai_instructions (candidate_id);

CREATE INDEX IF NOT EXISTS ai_instructions_priority_idx
  ON ai_instructions (candidate_id, instruction_type, priority);

-- AI response cache table
CREATE TABLE IF NOT EXISTS ai_response_cache (
  hash TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  model TEXT NOT NULL,
  response TEXT NOT NULL,
  cache_hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMPTZ,
  is_cached BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ai_response_cache_last_accessed_idx
  ON ai_response_cache (last_accessed);

-- Cache invalidation policy: Only invalidate after writes to candidate_profile, experiences, skills, gaps_weaknesses, values_culture, faq_responses, ai_instructions. Never invalidate after writes to ai_response_cache.
-- Cache invalidation policy: Only invalidate after writes to candidate_profile, experiences, skills, gaps_weaknesses, values_culture, faq_responses, education, ai_instructions. Never invalidate after writes to ai_response_cache.

COMMENT ON INDEX ai_response_cache_last_accessed_idx
  IS 'Cache invalidation policy: Only invalidate after writes to candidate_profile, experiences, skills, gaps_weaknesses, values_culture, faq_responses, ai_instructions. Never invalidate after writes to ai_response_cache';

COMMIT;
