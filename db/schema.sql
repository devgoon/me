-- Converted schema for Azure SQL (T-SQL) from PostgreSQL schema.sql
-- Safe to run multiple times; uses IF NOT EXISTS guards for tables and indexes.

SET NOCOUNT ON;

-- candidate_profile
IF OBJECT_ID('dbo.candidate_profile', 'U') IS NULL
BEGIN
CREATE TABLE dbo.candidate_profile (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  name NVARCHAR(MAX) NOT NULL,
  email NVARCHAR(512) NOT NULL,
  title NVARCHAR(MAX),
  target_titles NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
  target_company_stages NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
  elevator_pitch NVARCHAR(MAX),
  career_narrative NVARCHAR(MAX),
  looking_for NVARCHAR(MAX),
  not_looking_for NVARCHAR(MAX),
  management_style NVARCHAR(MAX),
  work_style NVARCHAR(MAX),
  salary_min DECIMAL(12,2),
  salary_max DECIMAL(12,2),
  availability_status NVARCHAR(128),
  availability_date DATE,
  location NVARCHAR(MAX),
  remote_preference NVARCHAR(128),
  github_url NVARCHAR(2048),
  linkedin_url NVARCHAR(2048),
  twitter_url NVARCHAR(2048),
  CONSTRAINT candidate_profile_salary_range_chk
    CHECK (
      salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
    )
);
END
GO

-- Unique index on email (SQL Server default collation is often case-insensitive)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'candidate_profile_email_uidx' AND object_id = OBJECT_ID('dbo.candidate_profile'))
BEGIN
  CREATE UNIQUE INDEX candidate_profile_email_uidx ON dbo.candidate_profile (email);
END
GO

-- experiences
IF OBJECT_ID('dbo.experiences', 'U') IS NULL
BEGIN
CREATE TABLE dbo.experiences (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  company_name NVARCHAR(450) NOT NULL,
  title NVARCHAR(MAX),
  title_progression NVARCHAR(MAX),
  start_date DATE,
  end_date DATE,
  is_current BIT NOT NULL DEFAULT 0,
  bullet_points NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
  why_joined NVARCHAR(MAX),
  why_left NVARCHAR(MAX),
  actual_contributions NVARCHAR(MAX),
  proudest_achievement NVARCHAR(MAX),
  would_do_differently NVARCHAR(MAX),
  challenges_faced NVARCHAR(MAX),
  lessons_learned NVARCHAR(MAX),
  manager_would_say NVARCHAR(MAX),
  reports_would_say NVARCHAR(MAX),
  quantified_impact NVARCHAR(MAX),
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT experiences_date_range_chk
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT experiences_candidate_company_unique UNIQUE (candidate_id, company_name, start_date)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'experiences_candidate_id_idx' AND object_id = OBJECT_ID('dbo.experiences'))
BEGIN
  CREATE INDEX experiences_candidate_id_idx ON dbo.experiences (candidate_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'experiences_candidate_order_idx' AND object_id = OBJECT_ID('dbo.experiences'))
BEGIN
  CREATE INDEX experiences_candidate_order_idx ON dbo.experiences (candidate_id, display_order, start_date);
END
GO

-- skills
IF OBJECT_ID('dbo.skills', 'U') IS NULL
BEGIN
CREATE TABLE dbo.skills (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  skill_name NVARCHAR(400) NOT NULL,
  category NVARCHAR(64) NOT NULL,
  self_rating INT,
  evidence NVARCHAR(MAX),
  honest_notes NVARCHAR(MAX),
  years_experience DECIMAL(4,1),
  last_used DATE,
  CONSTRAINT skills_category_chk CHECK (category IN ('strong', 'moderate', 'gap')),
  CONSTRAINT skills_self_rating_chk CHECK (self_rating IS NULL OR self_rating BETWEEN 1 AND 5),
  CONSTRAINT skills_years_experience_chk CHECK (years_experience IS NULL OR years_experience >= 0),
  CONSTRAINT skills_candidate_skill_name_unique UNIQUE (candidate_id, skill_name)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'skills_candidate_id_idx' AND object_id = OBJECT_ID('dbo.skills'))
BEGIN
  CREATE INDEX skills_candidate_id_idx ON dbo.skills (candidate_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'skills_candidate_category_idx' AND object_id = OBJECT_ID('dbo.skills'))
BEGIN
  CREATE INDEX skills_candidate_category_idx ON dbo.skills (candidate_id, category);
END
GO

-- skill_equivalence
IF OBJECT_ID('dbo.skill_equivalence', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.skill_equivalence;
END
GO

IF OBJECT_ID('dbo.skill_equivalence', 'U') IS NULL
BEGIN
CREATE TABLE dbo.skill_equivalence (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  skill_name NVARCHAR(400) NOT NULL,
  equivalent_name NVARCHAR(400) NOT NULL,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  notes NVARCHAR(MAX),
  CONSTRAINT skill_equivalence_unique UNIQUE (skill_name, equivalent_name)
);
END
GO

-- gaps_weaknesses
IF OBJECT_ID('dbo.gaps_weaknesses', 'U') IS NULL
BEGIN
CREATE TABLE dbo.gaps_weaknesses (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  gap_type NVARCHAR(64) NOT NULL,
  description NVARCHAR(450) NOT NULL,
  why_its_a_gap NVARCHAR(MAX),
  interest_in_learning BIT NOT NULL DEFAULT 0,
  CONSTRAINT gaps_weaknesses_gap_type_chk CHECK (gap_type IN ('skill', 'experience', 'environment', 'role_type')),
  CONSTRAINT gaps_weaknesses_candidate_description_unique UNIQUE (candidate_id, description)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'gaps_weaknesses_candidate_id_idx' AND object_id = OBJECT_ID('dbo.gaps_weaknesses'))
BEGIN
  CREATE INDEX gaps_weaknesses_candidate_id_idx ON dbo.gaps_weaknesses (candidate_id);
END
GO

-- values_culture
IF OBJECT_ID('dbo.values_culture', 'U') IS NULL
BEGIN
CREATE TABLE dbo.values_culture (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  must_haves NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
  dealbreakers NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
  management_style_preferences NVARCHAR(MAX),
  team_size_preferences NVARCHAR(MAX),
  how_handle_conflict NVARCHAR(MAX),
  how_handle_ambiguity NVARCHAR(MAX),
  how_handle_failure NVARCHAR(MAX)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'values_culture_candidate_id_idx' AND object_id = OBJECT_ID('dbo.values_culture'))
BEGIN
  CREATE INDEX values_culture_candidate_id_idx ON dbo.values_culture (candidate_id);
END
GO

-- faq_responses
IF OBJECT_ID('dbo.faq_responses', 'U') IS NULL
BEGIN
CREATE TABLE dbo.faq_responses (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  question NVARCHAR(MAX) NOT NULL,
  answer NVARCHAR(MAX) NOT NULL,
  is_common_question BIT NOT NULL DEFAULT 0
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'faq_responses_candidate_id_idx' AND object_id = OBJECT_ID('dbo.faq_responses'))
BEGIN
  CREATE INDEX faq_responses_candidate_id_idx ON dbo.faq_responses (candidate_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'faq_responses_common_idx' AND object_id = OBJECT_ID('dbo.faq_responses'))
BEGIN
  CREATE INDEX faq_responses_common_idx ON dbo.faq_responses (candidate_id, is_common_question);
END
GO

-- education
IF OBJECT_ID('dbo.education', 'U') IS NULL
BEGIN
CREATE TABLE dbo.education (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  institution NVARCHAR(450),
  degree NVARCHAR(256),
  field_of_study NVARCHAR(256),
  start_date DATE,
  end_date DATE,
  is_current BIT NOT NULL DEFAULT 0,
  grade NVARCHAR(64),
  notes NVARCHAR(MAX),
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT education_candidate_institution_unique UNIQUE (candidate_id, institution, degree, start_date)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'education_candidate_id_idx' AND object_id = OBJECT_ID('dbo.education'))
BEGIN
  CREATE INDEX education_candidate_id_idx ON dbo.education (candidate_id);
END
GO

-- certifications
IF OBJECT_ID('dbo.certifications', 'U') IS NULL
BEGIN
CREATE TABLE dbo.certifications (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  name NVARCHAR(1024) NOT NULL,
  issuer NVARCHAR(512),
  issue_date DATE,
  expiration_date DATE,
  credential_id NVARCHAR(256),
  verification_url NVARCHAR(2048),
  notes NVARCHAR(MAX),
  display_order INT DEFAULT 0,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'certifications_candidate_id_idx' AND object_id = OBJECT_ID('dbo.certifications'))
BEGIN
  CREATE INDEX certifications_candidate_id_idx ON dbo.certifications (candidate_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'certifications_display_order_idx' AND object_id = OBJECT_ID('dbo.certifications'))
BEGIN
  CREATE INDEX certifications_display_order_idx ON dbo.certifications (candidate_id, display_order);
END
GO

-- ai_instructions
IF OBJECT_ID('dbo.ai_instructions', 'U') IS NULL
BEGIN
CREATE TABLE dbo.ai_instructions (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES dbo.candidate_profile(id) ON DELETE CASCADE,
  created_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  instruction_type NVARCHAR(64) NOT NULL,
  instruction NVARCHAR(MAX) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  CONSTRAINT ai_instructions_instruction_type_chk CHECK (instruction_type IN ('honesty', 'tone', 'boundaries'))
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ai_instructions_candidate_id_idx' AND object_id = OBJECT_ID('dbo.ai_instructions'))
BEGIN
  CREATE INDEX ai_instructions_candidate_id_idx ON dbo.ai_instructions (candidate_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ai_instructions_priority_idx' AND object_id = OBJECT_ID('dbo.ai_instructions'))
BEGIN
  CREATE INDEX ai_instructions_priority_idx ON dbo.ai_instructions (candidate_id, instruction_type, priority);
END
GO

-- ai_response_cache
IF OBJECT_ID('dbo.ai_response_cache', 'U') IS NULL
BEGIN
CREATE TABLE dbo.ai_response_cache (
  hash NVARCHAR(128) PRIMARY KEY,
  question NVARCHAR(MAX) NOT NULL,
  model NVARCHAR(256) NOT NULL,
  response NVARCHAR(MAX) NOT NULL,
  cache_hit_count INT NOT NULL DEFAULT 0,
  last_accessed DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_at DATETIMEOFFSET(3) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  invalidated_at DATETIMEOFFSET(3),
  is_cached BIT NOT NULL DEFAULT 0
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ai_response_cache_last_accessed_idx' AND object_id = OBJECT_ID('dbo.ai_response_cache'))
BEGIN
  CREATE INDEX ai_response_cache_last_accessed_idx ON dbo.ai_response_cache (last_accessed);
END
GO

-- End of schema
