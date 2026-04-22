(function () {
  const STORAGE_KEY = "monitor.currentMachineJobs";
  const HISTORY_STORAGE_KEY = "monitor.machineJobHistory";
  const PART_SETTINGS_STORAGE_KEY = "monitor.partSettings";
  const PENDING_SYNC_KEY = "monitor.pendingSyncQueue";

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cloneJobs(jobs) {
    return cloneJson(jobs || {});
  }

  function getApiBaseUrl() {
    if (!window.location || window.location.protocol === "file:") {
      return "";
    }

    return `${window.location.origin}/api`;
  }

  function isApiEnabled() {
    return Boolean(getApiBaseUrl());
  }

  async function apiRequest(pathname, options = {}) {
    const baseUrl = getApiBaseUrl();

    if (!baseUrl) {
      throw new Error("Render proxy unavailable");
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      let message = `Render proxy failed: ${response.status}`;

      try {
        const errorBody = await response.json();
        message = errorBody?.error || errorBody?.message || message;
      } catch (error) {
        // Keep default message when error payload is not JSON.
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function rowToJob(row) {
    return {
      area: row.area || "",
      directValue: row.direct_value || "",
      partCode: row.part_code || "",
      partName: row.part_name || "",
      entityType: row.entity_type || "PART",
      qrValue: row.qr_value || "",
      status: row.status || "",
      detail: row.detail || "",
      updatedAt: row.updated_at || "",
      scannedBy: row.scanned_by || ""
    };
  }

  function jobToRow(machineId, job) {
    return {
      machine_id: machineId,
      area: job.area || "",
      direct_value: job.directValue || "",
      part_code: job.partCode || "",
      part_name: job.partName || "",
      entity_type: job.entityType || "PART",
      qr_value: job.qrValue || "",
      status: job.status || "",
      detail: job.detail || "",
      updated_at: job.updatedAt || new Date().toISOString(),
      scanned_by: job.scannedBy || ""
    };
  }

  function rowToHistory(row) {
    return {
      id: row.id || "",
      machineId: row.machine_id || "",
      area: row.area || "",
      directValue: row.direct_value || "",
      partCode: row.part_code || "",
      partName: row.part_name || "",
      entityType: row.entity_type || "PART",
      qrValue: row.qr_value || "",
      status: row.status || "",
      detail: row.detail || "",
      updatedAt: row.updated_at || "",
      scannedBy: row.scanned_by || "",
      createdAt: row.created_at || ""
    };
  }

  function jobToHistoryRow(machineId, job) {
    return {
      machine_id: machineId,
      area: job.area || "",
      direct_value: job.directValue || "",
      part_code: job.partCode || "",
      part_name: job.partName || "",
      entity_type: job.entityType || "PART",
      qr_value: job.qrValue || "",
      status: job.status || "",
      detail: job.detail || "",
      updated_at: job.updatedAt || new Date().toISOString(),
      scanned_by: job.scannedBy || ""
    };
  }

  function rowToPartSetting(row) {
    return {
      partCode: row.part_code || "",
      injectionTimeSeconds: Number(row.injection_time_seconds || 0),
      note: row.note || "",
      updatedAt: row.updated_at || "",
      updatedBy: row.updated_by || ""
    };
  }

  function partSettingToRow(partCode, setting) {
    return {
      part_code: partCode,
      injection_time_seconds: Number(setting.injectionTimeSeconds || 0),
      note: setting.note || "",
      updated_at: setting.updatedAt || new Date().toISOString(),
      updated_by: setting.updatedBy || ""
    };
  }

  function loadLocalJobs(defaultJobs) {
    const savedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!savedValue) {
      return cloneJobs(defaultJobs);
    }

    try {
      return { ...cloneJobs(defaultJobs), ...JSON.parse(savedValue) };
    } catch (error) {
      return cloneJobs(defaultJobs);
    }
  }

  function saveLocalJobs(jobs) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }

  function loadLocalHistory() {
    const savedValue = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    if (!savedValue) {
      return {};
    }

    try {
      return JSON.parse(savedValue);
    } catch (error) {
      return {};
    }
  }

  function saveLocalHistory(history) {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }

  function appendLocalHistory(machineId, job) {
    const history = loadLocalHistory();
    const entry = {
      ...cloneJobs(job),
      id: `${machineId}-${Date.now()}`,
      machineId,
      createdAt: new Date().toISOString()
    };
    const machineHistory = Array.isArray(history[machineId]) ? history[machineId] : [];

    history[machineId] = [entry, ...machineHistory].slice(0, 30);
    saveLocalHistory(history);
    return history[machineId];
  }

  function loadLocalPartSettings() {
    const savedValue = window.localStorage.getItem(PART_SETTINGS_STORAGE_KEY);

    if (!savedValue) {
      return {};
    }

    try {
      return JSON.parse(savedValue);
    } catch (error) {
      return {};
    }
  }

  function saveLocalPartSettings(settings) {
    window.localStorage.setItem(PART_SETTINGS_STORAGE_KEY, JSON.stringify(settings || {}));
  }

  function loadPendingSyncQueue() {
    const savedValue = window.localStorage.getItem(PENDING_SYNC_KEY);

    if (!savedValue) {
      return [];
    }

    try {
      const queue = JSON.parse(savedValue);
      return Array.isArray(queue) ? queue : [];
    } catch (error) {
      return [];
    }
  }

  function savePendingSyncQueue(queue) {
    window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
  }

  function enqueueSyncOperation(operation) {
    const queue = loadPendingSyncQueue().filter((item) => {
      if (operation.type === "jobs_bulk") {
        return item.type !== "jobs_bulk";
      }

      if (operation.type === "part_setting_upsert") {
        return !(item.type === "part_setting_upsert" && item.key === operation.key);
      }

      return true;
    });

    queue.push({
      id: `${operation.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...operation
    });
    savePendingSyncQueue(queue);
    return queue;
  }

  async function sendSyncOperation(operation) {
    if (operation.type === "jobs_bulk") {
      await apiRequest("/jobs/bulk", { method: "POST", body: { rows: operation.rows } });
      return;
    }

    if (operation.type === "history_insert") {
      await apiRequest("/history", { method: "POST", body: { row: operation.row } });
      return;
    }

    if (operation.type === "part_setting_upsert") {
      await apiRequest("/part-settings", { method: "POST", body: { row: operation.row } });
      return;
    }

    throw new Error(`Unknown sync operation: ${operation.type}`);
  }

  async function flushPendingSyncQueue() {
    if (!isApiEnabled()) {
      return { success: false, pendingCount: loadPendingSyncQueue().length, error: "Render proxy unavailable" };
    }

    const queue = loadPendingSyncQueue();

    if (queue.length === 0) {
      return { success: true, pendingCount: 0 };
    }

    const remaining = [];

    for (const operation of queue) {
      try {
        await sendSyncOperation(operation);
      } catch (error) {
        remaining.push(operation, ...queue.slice(queue.indexOf(operation) + 1));
        savePendingSyncQueue(remaining);
        return {
          success: false,
          pendingCount: remaining.length,
          error: error.message || "Sync failed"
        };
      }
    }

    savePendingSyncQueue([]);
    return { success: true, pendingCount: 0 };
  }

  function hasPendingOperations(type) {
    const queue = loadPendingSyncQueue();
    return type ? queue.some((item) => item.type === type) : queue.length > 0;
  }

  async function fetchCloudJobs(defaultJobs) {
    if (!isApiEnabled()) {
      return loadLocalJobs(defaultJobs);
    }

    const rows = await apiRequest("/jobs");
    const jobs = cloneJobs(defaultJobs);

    rows.forEach((row) => {
      jobs[row.machine_id] = rowToJob(row);
    });

    if (hasPendingOperations("jobs_bulk")) {
      Object.assign(jobs, loadLocalJobs(defaultJobs));
    }

    saveLocalJobs(jobs);
    return jobs;
  }

  async function upsertCloudRows(rows) {
    if (!isApiEnabled()) {
      throw new Error("Render proxy unavailable");
    }

    await apiRequest("/jobs/bulk", { method: "POST", body: { rows } });
  }

  async function insertCloudHistory(machineId, job) {
    if (!isApiEnabled()) {
      throw new Error("Render proxy unavailable");
    }

    await apiRequest("/history", {
      method: "POST",
      body: { row: jobToHistoryRow(machineId, job) }
    });
  }

  async function fetchCloudHistory() {
    if (!isApiEnabled()) {
      return loadLocalHistory();
    }

    const rows = await apiRequest("/history");
    const history = {};

    rows.forEach((row) => {
      const entry = rowToHistory(row);

      if (!entry.machineId) {
        return;
      }

      if (!Array.isArray(history[entry.machineId])) {
        history[entry.machineId] = [];
      }

      if (history[entry.machineId].length < 30) {
        history[entry.machineId].push(entry);
      }
    });

    if (hasPendingOperations("history_insert")) {
      const localHistory = loadLocalHistory();

      Object.entries(localHistory).forEach(([machineId, entries]) => {
        if (!Array.isArray(history[machineId])) {
          history[machineId] = [];
        }

        entries.forEach((entry) => {
          const exists = history[machineId].some((item) => item.id === entry.id);

          if (!exists && history[machineId].length < 30) {
            history[machineId].push(entry);
          }
        });
      });
    }

    saveLocalHistory(history);
    return history;
  }

  async function fetchCloudPartSettings() {
    if (!isApiEnabled()) {
      return loadLocalPartSettings();
    }

    const rows = await apiRequest("/part-settings");
    const settings = {};

    rows.forEach((row) => {
      const setting = rowToPartSetting(row);

      if (setting.partCode) {
        settings[setting.partCode] = setting;
      }
    });

    if (hasPendingOperations("part_setting_upsert")) {
      Object.assign(settings, loadLocalPartSettings());
    }

    saveLocalPartSettings(settings);
    return settings;
  }

  async function upsertCloudPartSetting(partCode, setting) {
    if (!isApiEnabled()) {
      throw new Error("Render proxy unavailable");
    }

    await apiRequest("/part-settings", {
      method: "POST",
      body: { row: partSettingToRow(partCode, setting) }
    });
  }

  async function loadJobs(defaultJobs) {
    await flushPendingSyncQueue();

    try {
      return await fetchCloudJobs(defaultJobs);
    } catch (error) {
      return loadLocalJobs(defaultJobs);
    }
  }

  async function saveJob(machineId, job, defaultJobs) {
    const jobs = await loadJobs(defaultJobs);
    jobs[machineId] = cloneJobs(job);

    saveLocalJobs(jobs);

    const rows = [jobToRow(machineId, jobs[machineId])];

    try {
      await upsertCloudRows(rows);
    } catch (error) {
      enqueueSyncOperation({ type: "jobs_bulk", rows });
    }

    return jobs;
  }

  async function saveAllJobs(jobs) {
    const clonedJobs = cloneJobs(jobs);
    saveLocalJobs(clonedJobs);

    const rows = Object.entries(clonedJobs).map(([machineId, job]) => jobToRow(machineId, job));

    try {
      await upsertCloudRows(rows);
    } catch (error) {
      enqueueSyncOperation({ type: "jobs_bulk", rows });
    }

    return clonedJobs;
  }

  async function resetJobs(defaultJobs) {
    return saveAllJobs(defaultJobs);
  }

  async function recordHistory(machineId, job) {
    appendLocalHistory(machineId, job);
    const row = jobToHistoryRow(machineId, job);

    try {
      await apiRequest("/history", { method: "POST", body: { row } });
    } catch (error) {
      enqueueSyncOperation({ type: "history_insert", row });
    }
  }

  async function loadHistory() {
    await flushPendingSyncQueue();

    try {
      return await fetchCloudHistory();
    } catch (error) {
      return loadLocalHistory();
    }
  }

  async function loadPartSettings() {
    await flushPendingSyncQueue();

    try {
      return await fetchCloudPartSettings();
    } catch (error) {
      return loadLocalPartSettings();
    }
  }

  async function savePartSetting(partCode, setting) {
    const settings = loadLocalPartSettings();
    const nextSetting = {
      partCode,
      injectionTimeSeconds: Number(setting.injectionTimeSeconds || 0),
      note: setting.note || "",
      updatedAt: setting.updatedAt || new Date().toISOString(),
      updatedBy: setting.updatedBy || ""
    };

    settings[partCode] = nextSetting;
    saveLocalPartSettings(settings);

    try {
      await upsertCloudPartSetting(partCode, nextSetting);
      nextSetting.syncStatus = "cloud";
      await flushPendingSyncQueue();
    } catch (error) {
      nextSetting.syncStatus = "queued";
      nextSetting.syncError = error.message || "Queued for later sync";
      enqueueSyncOperation({
        type: "part_setting_upsert",
        key: partCode,
        row: partSettingToRow(partCode, nextSetting)
      });
    }

    return nextSetting;
  }

  function getModeLabel() {
    return isApiEnabled() ? "render-proxy" : "local";
  }

  function getPendingSyncCount() {
    return loadPendingSyncQueue().length;
  }

  window.addEventListener("online", () => {
    flushPendingSyncQueue();
  });

  window.monitorDataService = {
    loadJobs,
    saveJob,
    saveAllJobs,
    resetJobs,
    recordHistory,
    loadHistory,
    loadPartSettings,
    savePartSetting,
    flushPendingSyncQueue,
    getPendingSyncCount,
    getModeLabel
  };
})();
