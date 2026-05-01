/** Default FAQ entries used when no FAQ data is present. */
export const ADMIN_DEFAULT_FAQ = [
  { question: 'What are your strongest skills?', answer: '', isCommonQuestion: true },
  { question: 'What are your biggest gaps right now?', answer: '', isCommonQuestion: true },
  { question: 'What kind of team are you looking for?', answer: '', isCommonQuestion: true },
];

/**
 * Initial admin UI model used to bootstrap the admin panel state.
 */
export const ADMIN_INITIAL_STATE = {
  profile: {
    fullName: '',
    email: '',
    currentTitle: '',
    targetTitles: [],
    targetCompanyStages: [],
    elevatorPitch: '',
    careerNarrative: '',
    lookingFor: '',
    notLookingFor: '',
    managementStyle: '',
    workStylePreferences: '',
    salaryMin: '',
    salaryMax: '',
    availabilityStatus: '',
    availableStarting: '',
    location: '',
    remotePreference: '',
    linkedInUrl: '',
    githubUrl: '',
  },
  experiences: [],
  skills: [],
  gaps: [],
  education: [],
  certifications: [],
  valuesCulture: {
    mustHaves: '',
    dealbreakers: '',
    managementStylePreferences: '',
    teamSizePreferences: '',
    howHandleConflict: '',
    howHandleAmbiguity: '',
    howHandleFailure: '',
  },
  faq: ADMIN_DEFAULT_FAQ,
  aiInstructions: {
    honestyLevel: 7,
    rules: [],
  },
  allFields: {},
};

export const COMPANY_STAGES = [
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Growth',
  'Public',
  'Enterprise',
];

export const ADMIN_TABS = [
  'profile',
  'experience',
  'skills',
  'education',
  'certifications',
  'gaps',
  'values',
  'faq',
  'ai',
  'cache',
];
