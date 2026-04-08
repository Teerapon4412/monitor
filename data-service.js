(function () {
  const STORAGE_KEY = "monitor.currentMachineJobs";

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

  function getModeLabel() {
    return getSupabaseConfig().enabled ? "supabase" : "local";
  }

  window.monitorDataService = {
    loadJobs,
    saveJob,
    saveAllJobs,
    resetJobs,
    getModeLabel
  };
})();
