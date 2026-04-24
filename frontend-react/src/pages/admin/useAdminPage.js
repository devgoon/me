import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  CACHE_API_OPTIONS,
  PANEL_API_OPTIONS,
  SAVE_API_OPTIONS,
  fetchAuthMe,
  fetchCacheReport,
  fetchPanelData,
  savePanelData,
} from './adminService.js';
import { ApiHttpError, tanstackRetryOptions } from '../../lib/tanstackApi.js';

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

  const bootstrapQuery = useQuery({
    queryKey: ['admin', 'bootstrap'],
    queryFn: async () => {
      const auth = await fetchAuthMe();
      if (!auth.ok) {
        return { unauthorized: true, data: null };
      }

      const response = await fetchPanelData();
      if (!response.ok) throw new Error('Failed to load panel data');
      const data = await response.json();
      return { unauthorized: false, data };
    },
    ...tanstackRetryOptions(PANEL_API_OPTIONS),
  });

  const cacheReportQuery = useQuery({
    queryKey: ['admin', 'cache-report'],
    enabled: activeTab === 'cache',
    queryFn: async () => {
      const response = await fetchCacheReport();
      if (!response.ok) throw new Error('Failed to load cache report');
      const rows = await response.json();
      return Array.isArray(rows) ? rows : [];
    },
    ...tanstackRetryOptions(CACHE_API_OPTIONS),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await savePanelData(payload);
      if (!response.ok) throw new ApiHttpError(response, 'Save failed');
      return response;
    },
    ...tanstackRetryOptions(SAVE_API_OPTIONS),
  });

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
      const rows = await cacheReportQuery.refetch();
      if (rows.error) throw rows.error;
      setCacheRows(Array.isArray(rows.data) ? rows.data : []);
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
    if (bootstrapQuery.isPending) {
      setLoading(true);
      return;
    }

    if (bootstrapQuery.isError) {
      setStatus(bootstrapQuery.error?.message || 'Unable to load admin data');
      setLoading(false);
      return;
    }

    if (bootstrapQuery.data?.unauthorized) {
      redirectTo('/auth');
      setLoading(false);
      return;
    }

    if (bootstrapQuery.data?.data) {
      setAdminData(normalizeAdminIncoming(bootstrapQuery.data.data));
    }
    setLoading(false);
  }, [bootstrapQuery.data, bootstrapQuery.error, bootstrapQuery.isError, bootstrapQuery.isPending]);

  useEffect(() => {
    if (activeTab !== 'cache') return;
    if (cacheReportQuery.isFetching) return;
    if (cacheReportQuery.isError) {
      setStatus(cacheReportQuery.error?.message || 'Failed to load cache report');
      setCacheRows([]);
      return;
    }
    if (cacheReportQuery.data) {
      setCacheRows(cacheReportQuery.data);
      setStatus('Cache report loaded');
    }
  }, [
    activeTab,
    cacheReportQuery.data,
    cacheReportQuery.error,
    cacheReportQuery.isError,
    cacheReportQuery.isFetching,
  ]);

  async function save() {
    setStatus('Saving...');
    const payload = sanitizeForSave(adminData);
    try {
      validateSalaryRange(payload);
      await saveMutation.mutateAsync(payload);
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
