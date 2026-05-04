const closeMachineSelect = document.getElementById("closeMachineSelect");
const closeScannerInput = document.getElementById("closeScannerInput");
const closeStatusTimeInput = document.getElementById("closeStatusTimeInput");
const closeUseCurrentTimeButton = document.getElementById("closeUseCurrentTimeButton");
const closeDetailInput = document.getElementById("closeDetailInput");
const closeResetButton = document.getElementById("closeResetButton");
const closeCaseForm = document.getElementById("closeCaseForm");
const closeCaseResult = document.getElementById("closeCaseResult");
const closeCaseResultTitle = document.getElementById("closeCaseResultTitle");
const closeCaseResultMessage = document.getElementById("closeCaseResultMessage");
const closeCaseBadge = document.getElementById("closeCaseBadge");
const closeCaseSummaryTitle = document.getElementById("closeCaseSummaryTitle");
const closeCaseSummaryMessage = document.getElementById("closeCaseSummaryMessage");
const closeCaseSummaryMeta = document.getElementById("closeCaseSummaryMeta");
const closeCaseSuccessPopup = document.getElementById("closeCaseSuccessPopup");
const closeCaseSuccessMessage = document.getElementById("closeCaseSuccessMessage");
const closeCaseSuccessConfirmButton = document.getElementById("closeCaseSuccessConfirmButton");
const dataService = window.monitorDataService;

const activeEmployees = Array.isArray(window.employeesData?.employees) ? window.employeesData.employees : [];
const defaultJobs = window.currentMachineJobsData?.jobs || {};
let jobsState = { ...defaultJobs };
let incidentsState = [];
let closePopupResolver = null;

function toDateTimeLocalValue(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getDateTimeLocalIso(inputValue) {
  if (!inputValue) {
    return new Date().toISOString();
  }

  const selectedDate = new Date(inputValue);
  return Number.isNaN(selectedDate.getTime()) ? new Date().toISOString() : selectedDate.toISOString();
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "--";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

function getEmployeeOptionValue(employee) {
  return employee.employeeCode || employee.username || employee.fullName || employee.id;
}

function getEmployeeOptionLabel(employee) {
  const code = employee.employeeCode || employee.username || "-";
  const fullName = employee.fullName || code;
  return `${code} - ${fullName}`;
}

function getIncidentSortTime(incident) {
  return new Date(incident.updatedAt || incident.closedAt || incident.openedAt || 0).getTime();
}

function getActiveIncidents() {
  return incidentsState
    .filter((incident) => incident.active)
    .sort((left, right) => getIncidentSortTime(right) - getIncidentSortTime(left));
}

function getActiveIncident(machineId) {
  return getActiveIncidents().find((incident) => incident.machineId === machineId) || null;
}

function renderMachineOptions(preferredMachineId = "") {
  const incidents = getActiveIncidents();

  if (incidents.length === 0) {
    closeMachineSelect.innerHTML = `<option value="">ไม่มีเคสค้าง</option>`;
    closeMachineSelect.value = "";
    closeMachineSelect.disabled = true;
    return;
  }

  closeMachineSelect.disabled = false;
  closeMachineSelect.innerHTML = incidents
    .map((incident) => `<option value="${incident.machineId}">${incident.machineId}</option>`)
    .join("");

  const targetMachine = incidents.find((incident) => incident.machineId === preferredMachineId)?.machineId || incidents[0].machineId;
  closeMachineSelect.value = targetMachine;
}

function renderScannerOptions() {
  if (activeEmployees.length === 0) {
    closeScannerInput.innerHTML = `<option value="station-01">station-01</option>`;
    closeScannerInput.value = "station-01";
    return;
  }

  closeScannerInput.innerHTML = activeEmployees
    .map((employee) => `<option value="${getEmployeeOptionValue(employee)}">${getEmployeeOptionLabel(employee)}</option>`)
    .join("");

  const defaultEmployee =
    activeEmployees.find((employee) => (employee.employeeCode || "").toUpperCase() === "225001") ||
    activeEmployees[0];

  closeScannerInput.value = getEmployeeOptionValue(defaultEmployee);
}

function renderSummary() {
  const machineId = closeMachineSelect.value;
  const activeIncident = getActiveIncident(machineId);

  if (!activeIncident) {
    closeCaseBadge.textContent = "ไม่มีเคสค้าง";
    closeCaseBadge.className = "badge neutral";
    closeCaseSummaryTitle.textContent = "ไม่พบเคสค้างของเครื่องนี้";
    closeCaseSummaryMessage.textContent = "เลือกเครื่องอื่นที่ยังมีเหตุค้าง หรือกลับไปหน้า Scan เพื่ออัปเดตงานต่อ";
    closeCaseSummaryMeta.innerHTML = "";
    return;
  }

  closeCaseBadge.textContent = "พร้อมปิดเคส";
  closeCaseBadge.className = "badge status-down";
  closeCaseSummaryTitle.textContent = `${machineId} มีเคสค้างอยู่`;
  closeCaseSummaryMessage.textContent = activeIncident.issueDetail || "ไม่มีรายละเอียดอาการที่แจ้งไว้";
  closeCaseSummaryMeta.innerHTML = [
    `เริ่มเหตุ ${formatDateTime(activeIncident.openedAt)}`,
    `ผู้แจ้ง ${activeIncident.openedBy || "--"}`,
    `Part ${activeIncident.partCode || "--"}`,
    `พื้นที่ ${activeIncident.area || "--"}`
  ]
    .map((item) => `<span>${item}</span>`)
    .join("");
}

function showResult(title, message) {
  closeCaseResult.hidden = false;
  closeCaseResultTitle.textContent = title;
  closeCaseResultMessage.textContent = message;
}

function closeSuccessPopup() {
  if (!closeCaseSuccessPopup || closeCaseSuccessPopup.hidden) {
    return;
  }

  closeCaseSuccessPopup.hidden = true;

  if (typeof closePopupResolver === "function") {
    const resolver = closePopupResolver;
    closePopupResolver = null;
    resolver();
  }
}

function showSuccessPopup(message) {
  if (!closeCaseSuccessPopup || !closeCaseSuccessMessage) {
    return Promise.resolve();
  }

  closeCaseSuccessMessage.textContent = message;
  closeCaseSuccessPopup.hidden = false;

  return new Promise((resolve) => {
    closePopupResolver = resolve;
    window.setTimeout(() => {
      closeCaseSuccessConfirmButton?.focus();
    }, 0);
  });
}

async function loadJobs() {
  jobsState = await dataService.loadJobs(defaultJobs);
  return jobsState;
}

async function loadIncidents() {
  incidentsState = await dataService.loadIncidents();
  return incidentsState;
}

function resetFormValues() {
  closeStatusTimeInput.value = toDateTimeLocalValue();
  closeDetailInput.value = "";
}

async function closeIncident() {
  const machineId = closeMachineSelect.value;
  const activeIncident = getActiveIncident(machineId);

  if (!activeIncident) {
    showResult("ไม่พบเคสค้าง", "เครื่องที่เลือกไม่มีเคสค้างสำหรับปิดในขณะนี้");
    renderSummary();
    return;
  }

  const closedAtIso = getDateTimeLocalIso(closeStatusTimeInput.value);
  const closedBy = closeScannerInput.value.trim() || "station-01";
  const resolutionDetail = closeDetailInput.value.trim();

  if (!resolutionDetail) {
    closeDetailInput.focus();
    showResult("ยังไม่สามารถปิดเคสได้", "กรุณากรอกรายละเอียดการแก้ไขก่อนกดยืนยันปิดเคส");
    return;
  }

  const currentJob = jobsState[machineId] || defaultJobs[machineId] || {};
  const nextJob = {
    ...currentJob,
    area: currentJob.area || activeIncident.area || "Injection F1",
    directValue: currentJob.directValue || currentJob.qrValue || activeIncident.directValue || activeIncident.qrValue || "",
    partCode: currentJob.partCode || activeIncident.partCode || "",
    partName: currentJob.partName || activeIncident.partName || "",
    entityType: currentJob.entityType || activeIncident.entityType || "PART",
    qrValue: currentJob.qrValue || currentJob.directValue || activeIncident.qrValue || activeIncident.directValue || "",
    status: "running",
    detail: resolutionDetail,
    updatedAt: closedAtIso,
    scannedBy: closedBy
  };

  jobsState = await dataService.saveJob(machineId, nextJob, defaultJobs);
  await dataService.recordHistory(machineId, nextJob);

  const savedIncident = await dataService.saveIncident({
    ...activeIncident,
    area: nextJob.area,
    directValue: nextJob.directValue,
    partCode: nextJob.partCode,
    partName: nextJob.partName,
    entityType: nextJob.entityType,
    qrValue: nextJob.qrValue,
    closeStatus: "running",
    resolutionDetail,
    closedAt: closedAtIso,
    closedBy,
    active: false,
    updatedAt: closedAtIso
  });

  const incidentIndex = incidentsState.findIndex((incident) => incident.id === savedIncident.id);
  if (incidentIndex >= 0) {
    incidentsState[incidentIndex] = savedIncident;
  } else {
    incidentsState.unshift(savedIncident);
  }

  showResult("ปิดเคสเรียบร้อย", `${machineId} กลับมาเป็นสถานะทำงานแล้ว เวลา ${formatDateTime(closedAtIso)}`);
  await showSuccessPopup(`ปิดเคส ${machineId} เรียบร้อยแล้ว`);
  renderMachineOptions();
  renderSummary();
  resetFormValues();
}

function getRequestedMachine() {
  const params = new URLSearchParams(window.location.search);
  return params.get("machine") || "";
}

closeCaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await closeIncident();
});

closeUseCurrentTimeButton?.addEventListener("click", () => {
  closeStatusTimeInput.value = toDateTimeLocalValue();
});

closeResetButton?.addEventListener("click", () => {
  resetFormValues();
  renderSummary();
});

closeMachineSelect?.addEventListener("change", () => {
  renderSummary();
});

closeCaseSuccessConfirmButton?.addEventListener("click", () => {
  closeSuccessPopup();
});

closeCaseSuccessPopup?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.classList.contains("success-popup-backdrop")) {
    closeSuccessPopup();
  }
});

async function initializeCloseCasePage() {
  dataService.flushPendingSyncQueue?.();
  await Promise.all([loadJobs(), loadIncidents()]);
  renderScannerOptions();
  renderMachineOptions(getRequestedMachine());
  resetFormValues();
  renderSummary();
}

initializeCloseCasePage();
