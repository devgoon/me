import ExperiencePanel from '../../components/admin/ExperiencePanel.jsx';
import {
  AiPanel,
  CachePanel,
  CertificationsPanel,
  EducationPanel,
  FaqPanel,
  GapsPanel,
  ProfilePanel,
  SkillsPanel,
  ValuesPanel,
} from '../../components/admin/AdminPanels.jsx';

export const ADMIN_PANEL_REGISTRY = {
  profile: {
    Component: ProfilePanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      targetTitleInput: admin.targetTitleInput,
      setTargetTitleInput: admin.setTargetTitleInput,
      setProfileField: admin.setProfileField,
      setAdminData: admin.setAdminData,
    }),
  },
  experience: {
    Component: ExperiencePanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
      setAdminData: admin.setAdminData,
    }),
  },
  skills: {
    Component: SkillsPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
    }),
  },
  education: {
    Component: EducationPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
    }),
  },
  certifications: {
    Component: CertificationsPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
    }),
  },
  gaps: {
    Component: GapsPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
    }),
  },
  values: {
    Component: ValuesPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      setValuesField: admin.setValuesField,
    }),
  },
  faq: {
    Component: FaqPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      prependListItem: admin.prependListItem,
      removeListItem: admin.removeListItem,
      updateListItem: admin.updateListItem,
    }),
  },
  ai: {
    Component: AiPanel,
    buildProps: (admin) => ({
      adminData: admin.adminData,
      setAdminData: admin.setAdminData,
    }),
  },
  cache: {
    Component: CachePanel,
    buildProps: (admin) => ({
      loadCacheReport: admin.loadCacheReport,
      cacheSearch: admin.cacheSearch,
      setCacheSearch: admin.setCacheSearch,
      filteredCache: admin.filteredCache,
    }),
  },
};
