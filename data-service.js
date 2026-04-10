(function () {
  const STORAGE_KEY = "monitor.currentMachineJobs";
  const HISTORY_STORAGE_KEY = "monitor.machineJobHistory";
  const PART_SETTINGS_STORAGE_KEY = "monitor.partSettings";

  function cloneJobs(jobs) {
    return JSON.parse(JSON.stringify(jobs || {}));
  }

  function getSupabaseConfig() {
    const config = window.monitorConfig?.supabase || {};
    const url = typeof config.url === "string" ? config.url.trim().replace(/\/+$/, "") : "";
    const anonKey = typeof config.anonKey === "string" ? config.anonKey.trim() : "";

    return {
      url,
      anonKey,
      enabled: Boolean(url && anonKey)
    };
  }

  function getHeaders(includeJson = false) {
    const config = getSupabaseConfig();
    const headers = {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    };

    if (includeJson) {
      headers["Content-Type"] = "application/json";
      headers.Prefer = "resolution=merge-duplicates,return=representation";
    }

    return headers;
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

  async function fetchCloudJobs(defaultJobs) {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return loadLocalJobs(defaultJobs);
    }

    const response = await fetch(
      `${config.url}/rest/v1/machine_jobs?select=machine_id,area,direct_value,part_code,part_name,entity_type,qr_value,status,detail,updated_at,scanned_by`,
      {
        method: "GET",
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase load failed: ${response.status}`);
    }

    const rows = await response.json();
    const jobs = cloneJobs(defaultJobs);

    rows.forEach((row) => {
      jobs[row.machine_id] = rowToJob(row);
    });

    saveLocalJobs(jobs);
    return jobs;
  }

  async function upsertCloudRows(rows) {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return;
    }

    const response = await fetch(
      `${config.url}/rest/v1/machine_jobs?on_conflict=machine_id`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(rows)
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase save failed: ${response.status}`);
    }
  }

  async function insertCloudHistory(machineId, job) {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return;
    }

    const response = await fetch(
      `${config.url}/rest/v1/machine_job_history`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify([jobToHistoryRow(machineId, job)])
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase history save failed: ${response.status}`);
    }
  }

  async function fetchCloudHistory() {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return loadLocalHistory();
    }

    const response = await fetch(
      `${config.url}/rest/v1/machine_job_history?select=id,machine_id,area,direct_value,part_code,part_name,entity_type,qr_value,status,detail,updated_at,scanned_by,created_at&order=updated_at.desc&limit=300`,
      {
        method: "GET",
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase history load failed: ${response.status}`);
    }

    const rows = await response.json();
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

    saveLocalHistory(history);
    return history;
  }

  async function fetchCloudPartSettings() {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return loadLocalPartSettings();
    }

    const response = await fetch(
      `${config.url}/rest/v1/part_settings?select=part_code,injection_time_seconds,note,updated_at,updated_by&order=part_code.asc`,
      {
        method: "GET",
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase part settings load failed: ${response.status}`);
    }

    const rows = await response.json();
    const settings = {};

    rows.forEach((row) => {
      const setting = rowToPartSetting(row);

      if (setting.partCode) {
        settings[setting.partCode] = setting;
      }
    });

    saveLocalPartSettings(settings);
    return settings;
  }

  async function upsertCloudPartSetting(partCode, setting) {
    const config = getSupabaseConfig();

    if (!config.enabled) {
      return;
    }

    const response = await fetch(
      `${config.url}/rest/v1/part_settings?on_conflict=part_code`,
      {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify([partSettingToRow(partCode, setting)])
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase part settings save failed: ${response.status}`);
    }
  }

  async function loadJobs(defaultJobs) {
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

    try {
      await upsertCloudRows([jobToRow(machineId, jobs[machineId])]);
    } catch (error) {
      // Fall back to local cache when cloud is unavailable.
    }

    return jobs;
  }

  async function saveAllJobs(jobs) {
    const clonedJobs = cloneJobs(jobs);
    saveLocalJobs(clonedJobs);

    try {
      const rows = Object.entries(clonedJobs).map(([machineId, job]) => jobToRow(machineId, job));
      await upsertCloudRows(rows);
    } catch (error) {
      // Fall back to local cache when cloud is unavailable.
    }

    return clonedJobs;
  }

  async function resetJobs(defaultJobs) {
    return saveAllJobs(defaultJobs);
  }

  async function recordHistory(machineId, job) {
    appendLocalHistory(machineId, job);

    try {
      await insertCloudHistory(machineId, job);
    } catch (error) {
      // Keep local history when cloud history is unavailable.
    }
  }

  async function loadHistory() {
    try {
      return await fetchCloudHistory();
    } catch (error) {
      return loadLocalHistory();
    }
  }

  async function loadPartSettings() {
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
    } catch (error) {
      nextSetting.syncStatus = "local";
      nextSetting.syncError = error.message || "Cloud sync unavailable";
    }

    return nextSetting;
  }

  function getModeLabel() {
    return getSupabaseConfig().enabled ? "supabase" : "local";
  }

  window.monitorDataService = {
    loadJobs,
    saveJob,
    saveAllJobs,
    resetJobs,
    recordHistory,
    loadHistory,
    loadPartSettings,
    savePartSetting,
    getModeLabel
  };
})();
