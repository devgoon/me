--
-- PostgreSQL database dump
--

\restrict V6cimolRlygJ0JCKCBeYmhNSVMYqJ5rZtuYGLfRxeMDW0AQynthjv4fLlDHEV2b

-- Dumped from database version 16.12
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    full_name text,
    password_hash text NOT NULL
);


--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ai_instructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_instructions (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    instruction_type text NOT NULL,
    instruction text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    CONSTRAINT ai_instructions_instruction_type_chk CHECK ((instruction_type = ANY (ARRAY['honesty'::text, 'tone'::text, 'boundaries'::text])))
);


--
-- Name: ai_instructions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ai_instructions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ai_instructions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ai_response_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_response_cache (
    hash text NOT NULL,
    question text NOT NULL,
    model text NOT NULL,
    response text NOT NULL,
    cache_hit_count integer DEFAULT 0 NOT NULL,
    last_accessed timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_cached boolean DEFAULT false NOT NULL
);


--
-- Name: candidate_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_profile (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    title text,
    target_titles text[] DEFAULT '{}'::text[] NOT NULL,
    target_company_stages text[] DEFAULT '{}'::text[] NOT NULL,
    elevator_pitch text,
    career_narrative text,
    looking_for text,
    not_looking_for text,
    management_style text,
    work_style text,
    salary_min numeric(12,2),
    salary_max numeric(12,2),
    availability_status text,
    availability_date date,
    location text,
    remote_preference text,
    github_url text,
    linkedin_url text,
    twitter_url text,
    CONSTRAINT candidate_profile_salary_range_chk CHECK (((salary_min IS NULL) OR (salary_max IS NULL) OR (salary_min <= salary_max)))
);


--
-- Name: candidate_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.candidate_profile ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.candidate_profile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: experiences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiences (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_name text NOT NULL,
    title text,
    title_progression text,
    start_date date,
    end_date date,
    is_current boolean DEFAULT false NOT NULL,
    bullet_points text[] DEFAULT '{}'::text[] NOT NULL,
    why_joined text,
    why_left text,
    actual_contributions text,
    proudest_achievement text,
    would_do_differently text,
    challenges_faced text,
    lessons_learned text,
    manager_would_say text,
    reports_would_say text,
    quantified_impact jsonb,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT experiences_date_range_chk CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: experiences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.experiences ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.experiences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: faq_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faq_responses (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    is_common_question boolean DEFAULT false NOT NULL
);


--
-- Name: faq_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.faq_responses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.faq_responses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gaps_weaknesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gaps_weaknesses (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    gap_type text NOT NULL,
    description text NOT NULL,
    why_its_a_gap text,
    interest_in_learning boolean DEFAULT false NOT NULL,
    CONSTRAINT gaps_weaknesses_gap_type_chk CHECK ((gap_type = ANY (ARRAY['skill'::text, 'experience'::text, 'environment'::text, 'role_type'::text])))
);


--
-- Name: gaps_weaknesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.gaps_weaknesses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.gaps_weaknesses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    skill_name text NOT NULL,
    category text NOT NULL,
    self_rating integer,
    evidence text,
    honest_notes text,
    years_experience numeric(4,1),
    last_used date,
    CONSTRAINT skills_category_chk CHECK ((category = ANY (ARRAY['strong'::text, 'moderate'::text, 'gap'::text]))),
    CONSTRAINT skills_self_rating_chk CHECK (((self_rating IS NULL) OR ((self_rating >= 1) AND (self_rating <= 5)))),
    CONSTRAINT skills_years_experience_chk CHECK (((years_experience IS NULL) OR (years_experience >= (0)::numeric)))
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.skills ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.skills_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: values_culture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.values_culture (
    id bigint NOT NULL,
    candidate_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    must_haves text[] DEFAULT '{}'::text[] NOT NULL,
    dealbreakers text[] DEFAULT '{}'::text[] NOT NULL,
    management_style_preferences text,
    team_size_preferences text,
    how_handle_conflict text,
    how_handle_ambiguity text,
    how_handle_failure text
);


--
-- Name: values_culture_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.values_culture ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.values_culture_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, created_at, email, full_name, password_hash) FROM stdin;
\.


--
-- Data for Name: ai_instructions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_instructions (id, candidate_id, created_at, instruction_type, instruction, priority) FROM stdin;
95	1	2026-03-08 20:47:43.46842+00	honesty	HONESTY_LEVEL:7	0
96	1	2026-03-08 20:47:43.46842+00	boundaries	Do not fabricate accomplishments, dates, or metrics not present in data.	5
97	1	2026-03-08 20:47:43.46842+00	honesty	Be direct about fit, including explicit gaps and non-fit scenarios.	10
98	1	2026-03-08 20:47:43.46842+00	tone	Use concise, professional language and avoid over-selling claims.	20
\.


--
-- Data for Name: ai_response_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_response_cache (hash, question, model, response, cache_hit_count, last_accessed, updated_at, is_cached) FROM stdin;
458128a52b16814ef7c683c9d05b53baf8a632f6f399b8d064cd2b0ddd0af988	What's your biggest weakness?	claude-sonnet-4-20250514	I can over-index on architecture rigor too early in a project. When I see a technical challenge, my instinct is to design for scale, resilience, and maintainability right from the start — which is usually good, but sometimes I'll spend time on architectural patterns before we've validated that we're even solving the right problem.\n\nI've learned to mitigate this by right-sizing my process to the project phase. For early-stage work or prototypes, I now focus on speed and learning first, then gradually introduce more structured architecture as requirements become clearer and the system proves its value.\n\nThe flip side is that when we do need robust, scalable systems — which is most of my career — this tendency serves me well. But I've had to learn when to dial it back and when to lean into it.	8	2026-03-11 16:25:22.293314+00	2026-03-09 17:08:07.739453+00	t
d25f2f2af5c149ed10c9b0bed66de8ddb9a8b9691c79dea1b1cb615b11f745ed	What would your last manager say about you?	claude-sonnet-4-20250514	My last manager would say I'm someone who takes high ownership of complex problems and delivers reliable solutions even when requirements aren't perfectly clear upfront. \n\nAt Torc, I consistently raised quality standards - whether that was implementing proper SLOs in Datadog, designing clean OpenAPI contracts for our internal tools, or building React applications that actually helped operations teams triage incidents faster. \n\nThey'd probably mention that I don't just write code - I think about the whole system. When I built our fleet telemetry monitoring tools, I wasn't just focused on getting the UI working. I was thinking about data contracts, error handling, observability, and how the system would behave under load or when things went wrong.\n\nI think they'd also say I'm direct and transparent in my communication. If I see a technical decision that's going to cause problems down the road, I speak up early with data and alternative approaches rather than just going along with it.\n\nThe one area they might push me on is that I can sometimes over-engineer early - I care deeply about building things right, which occasionally means I need to be reminded to balance architectural rigor with delivery timelines. But they'd probably also say that this attention to quality usually pays off in reduced operational overhead later.	1	2026-03-10 20:12:26.558992+00	2026-03-10 20:12:26.558992+00	t
ff2e54c35785ea9d01df6b0fbdf6f2b5b50e11da6685fa10e2d812012f61ab85	Tell me about a project that failed	claude-sonnet-4-20250514	During the height of the microservices and Kubernetes hype cycle, I watched many organizations rush to break apart their monolithic applications simply because it was the trend — not because it solved a real problem. Teams were eager to "modernize," but often without understanding where the actual separation of concerns should be, or whether microservices were even the right architectural fit.\n\nFrom my perspective, leadership seemed more focused on projecting modernity — adopting microservices, containers, service meshes, CI/CD tools — instead of stepping back and asking the critical question: "What is the root cause of our problems, and will this architecture actually address it?"\n\nToo often, the answer was no.\n\nWhat I saw repeatedly were situations where:\n- The monolith's issues were caused by poor domain boundaries, not its size\n- Teams lacked the operational maturity for distributed systems — observability, SLOs, dependency mapping, on-call readiness\n- The organization underestimated the complexity tax of microservices: networking, data consistency, orchestration, deployment pipelines, incident surface area\n- Architectures became fragmented, harder to test, harder to reason about, and more failure‑prone\n- The "modernization effort" consumed enormous engineering time while failing to address the original bottlenecks\n\nWhat was missing was problem-first thinking. Instead of asking, "How do we adopt Kubernetes?" the real questions should have been: "What pain are we trying to relieve? Is the issue architectural… or organizational? Do we understand our domains well enough to split them correctly?"\n\nIn many cases, companies didn't need microservices — what they needed was clearer ownership boundaries, better CI/CD, stronger testing strategies, improved observability, and cultural changes, not technological ones.\n\nThis period taught me that modern technology doesn't fix fundamental problems if you don't understand the system well enough to diagnose them. It reinforced my belief that architecture should always follow context, constraints, and clarity — not trends.	6	2026-03-11 15:29:32.806476+00	2026-03-09 17:08:20.522231+00	t
d113a09f7c73fb8d35ffe1c87cf6d7d691559fc0b133cc6a298ee0b9710b2080	Why did you leave [Company]?	claude-sonnet-4-20250514	I'd be happy to answer that, but I need to know which company you're asking about. I've worked at several places recently:\n\n- **Torc Robotics** (where I currently work)\n- **Ancera** (left in 2024)\n- **Subway** (left in 2020)\n\nWhich one were you curious about? Each transition had different reasons, and I'm happy to be direct about what drove those decisions.	1	2026-03-11 16:53:51.859498+00	2026-03-11 16:53:51.859498+00	t
\.


--
-- Data for Name: candidate_profile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidate_profile (id, created_at, updated_at, name, email, title, target_titles, target_company_stages, elevator_pitch, career_narrative, looking_for, not_looking_for, management_style, work_style, salary_min, salary_max, availability_status, availability_date, location, remote_preference, github_url, linkedin_url, twitter_url) FROM stdin;
2	2026-03-07 15:47:41.545177+00	2026-03-07 15:47:41.545177+00	lodovico.minnocci	lodovico.minnocci@lodovi.co	\N	{}	{}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1	2026-03-06 01:00:24.311936+00	2026-03-08 20:47:43.46842+00	Lodovico Minnocci	vminnocci@gmail.com	Senior Software Engineer	{"Senior Software Engineer","Staff Engineer","Solutions Architect","Engineering Lead"}	{startup,growth,enterprise,Public,Enterprise}	Hi, I’m Lodovico. I’m a senior‑level software engineer and architect with deep experience in cloud‑native applications, DevOps, and observability. Over my career I’ve led engineering teams, modernized infrastructure, and delivered high‑impact systems across industries — from autonomous trucking at Torc Robotics to edge AI platforms at Ancera and global API platforms at Subway. I’m known for bridging architecture and execution: designing scalable systems, automating everything, ensuring security compliance, and helping teams move faster with confidence.	Over the span of more than 25 years in software engineering, I’ve built a career around one consistent theme: solving complex, high‑stakes engineering problems by blending strong technical architecture with practical, scalable execution. My journey has taken me through multiple industries — autonomous vehicles, biotechnology, global retail, and enterprise scientific platforms — and across each one, I’ve earned a reputation as the engineer who can bring clarity, stability, and forward momentum to challenging technical environments. [Lodovico-R...e-11-19-25 | PDF]\nI started my career as a hands-on engineer, building and optimizing systems in environments where reliability and performance were non-negotiable. As I grew into senior and principal roles, I became equally focused on the bigger picture: how to design cloud‑native architectures, automate infrastructure, and build the DevOps and observability foundations that modern software teams depend on. My technical leadership style has been shaped by this duality — I can dive deep into code and systems when needed, but I also think holistically about system design, security, cost, resiliency, and team enablement.\nAt Thermo Fisher Scientific, I expanded my expertise into containerization and Kubernetes, creating early prototypes of distributed and observable applications used by Fortune 500 customers. At Subway, I moved into high‑transaction, global API development, leading international engineering teams and designing serverless architectures capable of supporting millions of daily users. This experience sharpened my ability to build systems that are both scalable and maintainable in diverse, fast-moving organizations. [Lodovico-R...e-11-19-25 | PDF]\nMy transition into Ancera marked a major milestone: I took on a systems architect role overseeing Azure infrastructure, DevOps, and security at a company working at the intersection of biology, data science, and edge computing. I led the organization through SOC 2 compliance, built secure CI/CD pipelines, deployed ML and AI workflows, and implemented edge AI solutions that improved performance by 700%. These were not just technological achievements — they were examples of building platforms that accelerated scientific outcomes while ensuring operational excellence. [Lodovico-R...e-11-19-25 | PDF]\nToday at Torc Robotics, I apply that same mindset to the autonomous vehicle domain. My work spans React-based telemetry applications, configuration management systems, API design, DynamoDB data models, and robust observability pipelines in Datadog. The stakes at Torc are profoundly high — safety, compliance, and real-time insight — and I thrive in environments where engineering decisions have real-world impact. [Lodovico-R...e-11-19-25 | PDF]\nAcross my entire career, one pattern stands out:\nI build the systems that help organizations move faster with greater confidence.\nWhether it’s through cloud architecture, DevOps automation, SLO-driven observability, or cross-functional leadership, I’m at my best when enabling teams to deliver secure, scalable, high-quality solutions. My background in both computer science and psychology gives me an additional advantage — I communicate clearly, mentor effectively, and navigate technical strategy in a way that builds alignment and trust.\nI’m now continuing to grow as a senior engineer and technical leader, focused on roles where I can influence architecture, raise engineering standards, and help organizations build resilient systems that scale.	I’m looking for a senior engineering role at a cutting‑edge, industry‑leading technology company where innovation, scale, and engineering excellence are core to the culture. I’m drawn to large, publicly traded organizations — such as Microsoft, GitHub, Nvidia, Apple, Meta, or Google — where long-term stability, competitive compensation, and strong generational benefits reflect the value placed on experienced engineers.\nThe ideal environment for me is one where:\n\nDeep technical challenges are part of the everyday work — distributed systems, cloud‑native design, large‑scale data, AI/ML, or high‑reliability platforms.\nEngineering quality, automation, and observability are taken seriously, not treated as afterthoughts.\nThere is room to influence architecture, shape technical strategy, and mentor teams.\nThe company invests in innovation while still maintaining the structure and stability that come with being a global enterprise.\nThe culture rewards craftsmanship, accountability, and continuous improvement.\nThere are clear opportunities for growth into Staff, Principal, or Architect‑level roles.\n\nI’m particularly excited about organizations that operate at global scale and push the boundaries of cloud platforms, AI, developer tooling, or next‑generation user experiences. My goal is to bring my 25+ years of experience in cloud architecture, DevOps automation, and high‑performance engineering to a company where I can contribute meaningfully while growing into the next chapter of my career.	I’m not looking for roles in slow-moving, legacy, or heavily regulated industries — such as insurance, healthcare, government IT, or old‑guard enterprise software — where innovation is limited, bureaucracy is high, and engineering is viewed primarily as a cost center rather than a strategic driver.\nI’m also not seeking roles that require people management, traditional line management, or performance oversight responsibilities. My strength and passion are firmly in high‑impact individual contributor work — designing systems, solving complex engineering problems, driving architecture, and raising technical standards — not managing headcount, staffing, or administrative personnel tasks.\nI want to avoid environments where:\n\nThe pace of innovation is slow and dictated by compliance or decades‑old processes.\nThe technology stack is outdated, under‑funded, or resistant to modernization.\nEngineering teams are focused on maintenance, patching, and firefighting instead of building.\nSenior engineers are expected to manage people instead of owning complex technical problems.\nPromotions depend on management track progression rather than technical excellence.\nLayers of committees, approvals, and rigid process prevent meaningful progress.\nCompensation, growth, and long-term benefits lag behind modern technology companies.\n\nI’m not looking for:\n\nStartups with high volatility or unclear financial runway.\nSmall private companies without stability or generational benefits.\nIndustries that lack technical ambition, such as insurance or healthcare.\nRoles that require managing teams instead of solving big engineering challenges.\n\nIn short:\nI want to avoid boring, slow, or legacy industries — and roles that push me toward management instead of deep, impactful engineering work.	Hands-on leadership, clear decision frameworks, and measurable outcomes.	Collaborative, architecture-first, iterative delivery with strong quality guardrails.	185000.00	1000000.00	Open to opportunities	2026-03-07	Connecticut, USA	Remote only	https://github.com/devgoon	https://www.linkedin.com/in/lodovico-minnocci/	\N
\.


--
-- Data for Name: experiences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.experiences (id, candidate_id, created_at, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, why_joined, why_left, actual_contributions, proudest_achievement, would_do_differently, challenges_faced, lessons_learned, manager_would_say, reports_would_say, quantified_impact, display_order) FROM stdin;
73	1	2026-03-08 20:47:43.46842+00	Torc Robotics	Senior Software Engineer	\N	2024-09-01	\N	t	{"Built React applications for monitoring fault events and live truck telemetry.","Designed OpenAPI-driven REST endpoints backed by DynamoDB for internal tooling.","Implemented Datadog dashboards and SLOs to improve production reliability."}	Wanted to work on high-impact autonomous systems and modern cloud-native architecture.	\N	Owned frontend + API design for operational tooling used by engineering and operations teams.	Delivered a reliable fleet observability workflow that shortened incident triage cycles.	Would establish stronger data contracts even earlier between producer and consumer systems.	Balancing fast feature delivery with strict reliability expectations in safety-adjacent software.	Clear contracts and observability-first architecture reduce long-term operational risk.	Raises quality standards and delivers under ambiguity with strong ownership.	Provides clarity, technical mentorship, and practical execution support.	{"scope": "fleet operations tooling", "impact": "faster fault triage and stronger reliability posture"}	10
74	1	2026-03-08 20:47:43.46842+00	Ancera	Systems Architect	\N	2020-12-01	2024-09-01	f	{"Led Azure administration, security hardening, and DevOps modernization.","Designed edge AI workflows that improved image recognition performance by 700%.","Implemented DevSecOps processes contributing to SOC 2 readiness."}	Opportunity to shape architecture and platform direction in a growing product company.	Role concluded after major platform goals and compliance milestones were achieved.	Built secure CI/CD and deployment standards while enabling faster engineering throughput.	Created a platform maturity roadmap that balanced speed, security, and cost.	Would formalize engineering KPIs sooner to quantify process improvements over time.	Evolving infrastructure maturity while maintaining delivery commitments.	Security and compliance should be built into delivery workflows, not bolted on later.	Strong systems thinker with execution discipline and clear communication.	Supportive and direct; sets standards while helping teams level up.	{"compliance": "SOC 2 path accelerated", "image_recognition_improvement_pct": 700}	20
75	1	2026-03-08 20:47:43.46842+00	Subway	Lead Integration Engineer	\N	2019-07-01	2020-12-01	f	{"Built APIs supporting mobile, web, and B2B channels at large scale.","Led distributed engineering efforts for integration delivery.","Implemented AWS serverless and CI/CD patterns for faster releases."}	Chance to lead high-scale integration architecture for a major global brand.	Moved to a broader architecture scope aligned with long-term goals.	Drove API and integration reliability across multiple dependent teams.	Established a delivery cadence that improved cross-team predictability.	Would invest earlier in consumer onboarding docs for faster partner adoption.	Managing cross-team dependencies while sustaining release velocity.	At scale, consistency in contracts and delivery process matters as much as raw coding speed.	Dependable technical lead with strong systems and delivery focus.	Creates structure and removes blockers effectively.	{"focus": "api reliability and release velocity", "scale": "millions of users daily"}	30
\.


--
-- Data for Name: faq_responses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.faq_responses (id, candidate_id, created_at, question, answer, is_common_question) FROM stdin;
97	1	2026-03-08 20:47:43.46842+00	What is your biggest weakness?	I can over-index on architecture rigor too early; I mitigate this by right-sizing process to the project phase.	t
98	1	2026-03-08 20:47:43.46842+00	Tell me about a project that failed.	During the height of the microservices and Kubernetes hype cycle, I watched many organizations rush to break apart their monolithic applications simply because it was the trend — not because it solved a real problem. Teams were eager to “modernize,” but often without understanding where the actual separation of concerns should be, or whether microservices were even the right architectural fit.\nFrom my perspective, leadership seemed more focused on projecting modernity — adopting microservices, containers, service meshes, CI/CD tools — instead of stepping back and asking the critical question:\n“What is the root cause of our problems, and will this architecture actually address it?”\nToo often, the answer was no.\nWhat I saw repeatedly were situations where:\n\nThe monolith’s issues were caused by poor domain boundaries, not its size.\nTeams lacked the operational maturity for distributed systems — observability, SLOs, dependency mapping, on-call readiness.\nThe organization underestimated the complexity tax of microservices: networking, data consistency, orchestration, deployment pipelines, incident surface area.\nArchitectures became fragmented, harder to test, harder to reason about, and more failure‑prone.\nThe “modernization effort” consumed enormous engineering time while failing to address the original bottlenecks.\n\nWhat was missing was problem-first thinking.\nInstead of asking, “How do we adopt Kubernetes?” the real questions should have been:\n\n“What pain are we trying to relieve?”\n“Is the issue architectural… or organizational?”\n“Do we understand our domains well enough to split them correctly?”\n“Do we have the observability and engineering rigor to support distributed systems?”\n\nIn many cases, companies didn’t need microservices — what they needed was:\n\nClearer ownership boundaries\nBetter CI/CD\nStronger testing strategies\nImproved observability\nA more modular monolith\nCultural changes, not technological ones\n\nThis period taught me an important professional lesson:\n\nModern technology doesn’t fix fundamental problems if you don’t understand the system well enough to diagnose them.\n\nIt reinforced my belief that architecture should always follow context, constraints, and clarity — not trends.	t
99	1	2026-03-08 20:47:43.46842+00	Why did you leave your last role?	I left Ancera because I had reached a natural inflection point in my growth there. After nearly four years, I had accomplished the major technical transformations I was brought in to deliver — including leading Azure administration, implementing DevOps and security best practices, driving the company through SOC 2 compliance, building edge AI pipelines, and modernizing infrastructure and automation. [linkedin.com]\nOnce those foundational systems were in place, the work shifted from architecting and building toward maintenance and incremental improvements, and the role no longer aligned with the level of technical challenge I’m motivated by.\nI’m driven by environments where I can:\n\nSolve large‑scale engineering problems\nInfluence architecture and technical strategy\nWork with modern cloud, AI, and distributed systems\nHelp teams grow through automation and observability\nBuild systems that have real impact at scale\n\nAncera is a smaller organization in a very specific niche, and after successfully stabilizing and maturing its engineering foundations, I was ready to return to solving bigger, more complex, enterprise‑level challenges — the kind found at top technology companies.\nIn short:\nI left Ancera because I had completed the transformation I was	t
100	1	2026-03-08 20:47:43.46842+00	What would your manager say about you?	High ownership, strong execution under ambiguity, and focus on measurable reliability.	t
\.


--
-- Data for Name: gaps_weaknesses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gaps_weaknesses (id, candidate_id, created_at, gap_type, description, why_its_a_gap, interest_in_learning) FROM stdin;
96	1	2026-03-08 20:47:43.46842+00	skill	Deep native iOS stack ownership	Most recent work centers on cloud platform and web/API systems.	t
97	1	2026-03-08 20:47:43.46842+00	skill	Machine Learning Training	Never hand an opportunity, but very interested.	t
98	1	2026-03-08 20:47:43.46842+00	skill	Deep native Android stack ownership	Never hand an opportunity, but very interested.	t
99	1	2026-03-08 20:47:43.46842+00	skill	Rust	Emerging language, never had a use, but interested.	t
100	1	2026-03-08 20:47:43.46842+00	skill	C++	Classic performant, safe language never had a use, but interested.	t
\.


--
-- Data for Name: pgmigrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pgmigrations (id, name, run_on) FROM stdin;
1	20260309104133-schema	2026-03-09 14:41:34.772051
2	20260309104158-schema	2026-03-09 14:41:59.536499
3	20260309104247-schema	2026-03-09 14:42:49.064222
4	20260309104526-schema	2026-03-09 14:45:27.415999
5	20260309104618-schema	2026-03-09 14:51:34.576549
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skills (id, candidate_id, created_at, skill_name, category, self_rating, evidence, honest_notes, years_experience, last_used) FROM stdin;
199	1	2026-03-09 16:53:35.081186+00	TypeScript	strong	\N	Used for React apps, REST APIs, and platform development at Torc Robotics and Thermo Fisher.	Confident in modern TypeScript, but always learning new patterns.	\N	\N
200	1	2026-03-09 16:53:35.081186+00	React	strong	\N	Built monitoring and visualization apps for vehicle data at Torc Robotics.	Strong with React, but want to deepen advanced hooks and performance optimization.	\N	\N
201	1	2026-03-09 16:53:35.081186+00	Software Architecture	strong	\N	Designed cloud-native, microservices, and enterprise systems for Fortune 500 and startups.	Enjoy architecting scalable systems, but always refining design for maintainability.	\N	\N
202	1	2026-03-09 16:53:35.081186+00	AWS Lambda	strong	\N	Implemented serverless APIs and integrations at Subway and Thermo Fisher.	Solid with Lambda, but want to explore more advanced event-driven patterns.	\N	\N
203	1	2026-03-09 16:53:35.081186+00	AWS API Gateway	strong	\N	Designed REST APIs with API Gateway for client SDK generation.	Comfortable, but want to master complex routing and security features.	\N	\N
204	1	2026-03-09 16:53:35.081186+00	AWS S3	strong	\N	Used for storage in serverless and data pipelines.	Experienced, but want to optimize for cost and performance.	\N	\N
205	1	2026-03-09 16:53:35.081186+00	AWS DynamoDB	strong	\N	Integrated with REST APIs and configuration management systems.	Confident, but want to deepen understanding of advanced indexing and scaling.	\N	\N
206	1	2026-03-09 16:53:35.081186+00	API Design and Development	strong	\N	Designed and developed APIs for mobile, web, and B2B integrations serving millions.	Always striving for clarity and maintainability in API design.	\N	\N
207	1	2026-03-09 16:53:35.081186+00	Datadog / Observability	strong	\N	Authored dashboards, SLOs, and monitoring tests for multiple services.	Strong in observability, but want to learn more about distributed tracing.	\N	\N
208	1	2026-03-09 16:53:35.081186+00	Python	strong	\N	Used for ML-Ops, scripting, and backend development.	Confident, but want to improve in advanced Python and ML frameworks.	\N	\N
209	1	2026-03-09 16:53:35.081186+00	Terraform	strong	\N	Infrastructure as code for Azure and AWS, including SOC 2 compliance.	Experienced, but want to master complex module composition.	\N	\N
210	1	2026-03-09 16:53:35.081186+00	Azure DevOps	moderate	\N	Led DevOps strategy and CI/CD pipelines at Ancera.	Moderate, want to deepen automation and pipeline customization.	\N	\N
211	1	2026-03-09 16:53:35.081186+00	Azure Cloud	moderate	\N	Managed Azure infrastructure and administration.	Moderate, want to explore more advanced Azure services.	\N	\N
212	1	2026-03-09 16:53:35.081186+00	Azure Administration	moderate	\N	Administered Azure for edge AI and agri-tech solutions.	Moderate, want to improve in security and cost optimization.	\N	\N
213	1	2026-03-09 16:53:35.081186+00	Docker / Containerization	moderate	\N	Designed edge AI solutions and platform apps using Docker.	Comfortable, but want to deepen orchestration and security.	\N	\N
214	1	2026-03-09 16:53:35.081186+00	DevSecOps	moderate	\N	Implemented DevSecOps practices with Snyk and Beagle Security.	Moderate, want to learn more about automated security testing.	\N	\N
215	1	2026-03-09 16:53:35.081186+00	SNYK	moderate	\N	Used for vulnerability scanning in CI/CD pipelines.	Moderate, want to improve in remediation and reporting.	\N	\N
216	1	2026-03-09 16:53:35.081186+00	Cryptography and Security Concepts	moderate	\N	Worked on SOC 2 compliance and secure pipelines.	Moderate, want to deepen practical cryptography.	\N	\N
217	1	2026-03-09 16:53:35.081186+00	Pen Testing Tools	moderate	\N	Used Beagle Security and other tools for DevSecOps.	Moderate, want to learn more about manual and automated pen testing.	\N	\N
218	1	2026-03-09 16:53:35.081186+00	C#	moderate	\N	Developed enterprise apps at The Hartford and Neopost.	Moderate, want to refresh skills for modern .NET.	\N	\N
219	1	2026-03-09 16:53:35.081186+00	Object-Oriented Design	moderate	\N	Designed OO systems for multiple enterprise projects.	Solid, but always refining design patterns.	\N	\N
220	1	2026-03-09 16:53:35.081186+00	Java	moderate	\N	Developed platform apps and document management systems.	Moderate, want to deepen modern Java and JVM performance.	\N	\N
221	1	2026-03-09 16:53:35.081186+00	Relational Databases	moderate	\N	Designed and managed databases for multiple projects.	Moderate, want to improve in advanced SQL and optimization.	\N	\N
222	1	2026-03-09 16:53:35.081186+00	Node.js	moderate	\N	Taught Node.js and built APIs for web and mobile.	Moderate, want to deepen async and performance patterns.	\N	\N
223	1	2026-03-09 16:53:35.081186+00	Agile / Scrum	moderate	\N	Led and participated in Agile teams across roles.	Moderate, want to improve in facilitation and delivery.	\N	\N
224	1	2026-03-09 16:53:35.081186+00	Jenkins	moderate	\N	Used Jenkins for CI/CD in multiple projects.	Moderate, want to deepen pipeline scripting and automation.	\N	\N
\.


--
-- Data for Name: values_culture; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.values_culture (id, candidate_id, created_at, must_haves, dealbreakers, management_style_preferences, team_size_preferences, how_handle_conflict, how_handle_ambiguity, how_handle_failure) FROM stdin;
25	1	2026-03-08 20:47:43.46842+00	{"Clear ownership","Engineering quality culture","Honest communication","Measurable outcomes","Clear career development tracks","Fair reviews"}	{"Blame-driven culture","Persistent unclear ownership","No quality standards","No career development tracks","Unstructured reviews"}	Direct, transparent, and context-rich leadership with technical credibility.	Works well in focused teams (5-15) and cross-functional orgs with clear interfaces.	Addresses conflict early with data, explicit goals, and direct conversation.	Breaks ambiguity into testable assumptions and short feedback loops.	Treats failures as systems feedback: document, adjust, and prevent recurrence.
\.


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 1, false);


--
-- Name: ai_instructions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_instructions_id_seq', 98, true);


--
-- Name: candidate_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidate_profile_id_seq', 2, true);


--
-- Name: experiences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.experiences_id_seq', 75, true);


--
-- Name: faq_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.faq_responses_id_seq', 100, true);


--
-- Name: gaps_weaknesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gaps_weaknesses_id_seq', 100, true);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pgmigrations_id_seq', 3, true);


--
-- Name: skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.skills_id_seq', 224, true);


--
-- Name: values_culture_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.values_culture_id_seq', 25, true);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: ai_instructions ai_instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_instructions
    ADD CONSTRAINT ai_instructions_pkey PRIMARY KEY (id);


--
-- Name: ai_response_cache ai_response_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_response_cache
    ADD CONSTRAINT ai_response_cache_pkey PRIMARY KEY (hash);


--
-- Name: candidate_profile candidate_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_profile
    ADD CONSTRAINT candidate_profile_pkey PRIMARY KEY (id);


--
-- Name: experiences experiences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiences
    ADD CONSTRAINT experiences_pkey PRIMARY KEY (id);


--
-- Name: faq_responses faq_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_responses
    ADD CONSTRAINT faq_responses_pkey PRIMARY KEY (id);


--
-- Name: gaps_weaknesses gaps_weaknesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gaps_weaknesses
    ADD CONSTRAINT gaps_weaknesses_pkey PRIMARY KEY (id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: values_culture values_culture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.values_culture
    ADD CONSTRAINT values_culture_pkey PRIMARY KEY (id);


--
-- Name: admin_users_email_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_users_email_uidx ON public.admin_users USING btree (lower(email));


--
-- Name: ai_instructions_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_instructions_candidate_id_idx ON public.ai_instructions USING btree (candidate_id);


--
-- Name: ai_instructions_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_instructions_priority_idx ON public.ai_instructions USING btree (candidate_id, instruction_type, priority);


--
-- Name: ai_response_cache_last_accessed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_response_cache_last_accessed_idx ON public.ai_response_cache USING btree (last_accessed);


--
-- Name: INDEX ai_response_cache_last_accessed_idx; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.ai_response_cache_last_accessed_idx IS 'Cache invalidation policy: Only invalidate after writes to candidate_profile, experiences, skills, gaps_weaknesses, values_culture, faq_responses, ai_instructions. Never invalidate after writes to ai_response_cache';


--
-- Name: candidate_profile_email_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX candidate_profile_email_uidx ON public.candidate_profile USING btree (lower(email));


--
-- Name: experiences_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX experiences_candidate_id_idx ON public.experiences USING btree (candidate_id);


--
-- Name: experiences_candidate_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX experiences_candidate_order_idx ON public.experiences USING btree (candidate_id, display_order, start_date DESC);


--
-- Name: faq_responses_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX faq_responses_candidate_id_idx ON public.faq_responses USING btree (candidate_id);


--
-- Name: faq_responses_common_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX faq_responses_common_idx ON public.faq_responses USING btree (candidate_id, is_common_question);


--
-- Name: gaps_weaknesses_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gaps_weaknesses_candidate_id_idx ON public.gaps_weaknesses USING btree (candidate_id);


--
-- Name: skills_candidate_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX skills_candidate_category_idx ON public.skills USING btree (candidate_id, category);


--
-- Name: skills_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX skills_candidate_id_idx ON public.skills USING btree (candidate_id);


--
-- Name: values_culture_candidate_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX values_culture_candidate_id_idx ON public.values_culture USING btree (candidate_id);


--
-- Name: ai_instructions ai_instructions_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_instructions
    ADD CONSTRAINT ai_instructions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- Name: experiences experiences_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiences
    ADD CONSTRAINT experiences_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- Name: faq_responses faq_responses_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faq_responses
    ADD CONSTRAINT faq_responses_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- Name: gaps_weaknesses gaps_weaknesses_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gaps_weaknesses
    ADD CONSTRAINT gaps_weaknesses_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- Name: skills skills_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- Name: values_culture values_culture_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.values_culture
    ADD CONSTRAINT values_culture_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profile(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict V6cimolRlygJ0JCKCBeYmhNSVMYqJ5rZtuYGLfRxeMDW0AQynthjv4fLlDHEV2b

