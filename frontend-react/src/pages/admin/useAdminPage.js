import { useEffect, useMemo, useState } from 'react';
import { ADMIN_INITIAL_STATE } from '../../components/admin/state.js';
import {
  normalizeAdminIncoming,
  sanitizeForSave,
  validateSalaryRange,
  defaultExperience,
  defaultSkill,
  defaultEducation,
  defaultCertification,
  defaultGap,
  defaultFaq,
  defaultRule,
} from '../../components/admin/utils.js';
import {
  fetchAuthMe,
  fetchCacheReport,
  fetchPanelData,
  savePanelData,
} from './adminService.js';

function redirectTo(path) {
  if (import.meta.env?.VITEST) return;
  window.location.href = path;
}

export function useAdminPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [adminData, setAdminData] = useState(ADMIN_INITIAL_STATE);
  const [targetTitleInput, setTargetTitleInput] = useState('');
  const [cacheRows, setCacheRows] = useState([]);
  const [cacheSearch, setCacheSearch] = useState('');

  function setProfileField(field, value) {
    setAdminData((prev) => ({ ...prev, profile: { ...prev.profile, [field]: value } }));
  }

  function setValuesField(field, value) {
    setAdminData((prev) => ({ ...prev, valuesCulture: { ...prev.valuesCulture, [field]: value } }));
  }

  function updateListItem(listName, index, field, value) {
    setAdminData((prev) => {
      const list = [...(prev[listName] || [])];
      if (!list[index]) return prev;
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [listName]: list };
    });
  }

  function removeListItem(listName, index) {
    setAdminData((prev) => {
      const list = [...(prev[listName] || [])];
      list.splice(index, 1);
      return { ...prev, [listName]: list };
    });
  }

  function prependListItem(listName, item) {
    setAdminData((prev) => ({ ...prev, [listName]: [item, ...(prev[listName] || [])] }));
  }

  async function loadCacheReport() {
    setStatus('Loading cache report...');
    try {
      const response = await fetchCacheReport();
      if (!response.ok) throw new Error('Failed to load cache report');
      const rows = await response.json();
      setCacheRows(Array.isArray(rows) ? rows : []);
      setStatus('Cache report loaded');
    } catch (error) {
      setStatus(error.message || 'Failed to load cache report');
      setCacheRows([]);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'cache') {
      loadCacheReport();
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await fetchAuthMe();
        if (!auth.ok) {
          redirectTo('/auth');
          return;
        }

        const response = await fetchPanelData();
        if (!response.ok) throw new Error('Failed to load panel data');
        const data = await response.json();
        if (!active) return;

        setAdminData(normalizeAdminIncoming(data));
      } catch (error) {
        if (active) setStatus(error.message || 'Unable to load admin data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setStatus('Saving...');
    const payload = sanitizeForSave(adminData);
    try {
      validateSalaryRange(payload);
      const response = await savePanelData(payload);
      if (!response.ok) throw new Error('Save failed');
      setStatus('Saved successfully');
    } catch (error) {
      setStatus(error.message || 'Save failed');
    }
  }

  const filteredCache = useMemo(
    () =>
      cacheRows.filter((item) =>
        String(item.question || '')
          .toLowerCase()
          .includes(cacheSearch.trim().toLowerCase())
      ),
    [cacheRows, cacheSearch]
  );

  return {
    loading,
    status,
    activeTab,
    adminData,
    targetTitleInput,
    cacheSearch,
    filteredCache,
    setStatus,
    setAdminData,
    setTargetTitleInput,
    setCacheSearch,
    setProfileField,
    setValuesField,
    updateListItem,
    removeListItem,
    prependListItem,
    loadCacheReport,
    handleTabChange,
    save,
    defaultExperience,
    defaultSkill,
    defaultEducation,
    defaultCertification,
    defaultGap,
    defaultFaq,
    defaultRule,
  };
}
