const MACHINE_JOBS_STORAGE_KEY = "monitor.currentMachineJobs";

const machineSelect = document.getElementById("machineSelect");
const areaInput = document.getElementById("areaInput");
const qrInput = document.getElementById("qrInput");
const scannerInput = document.getElementById("scannerInput");
const quickCloseCard = document.getElementById("quickCloseCard");
const quickCloseTitle = document.getElementById("quickCloseTitle");
const quickCloseMessage = document.getElementById("quickCloseMessage");
const quickCloseMeta = document.getElementById("quickCloseMeta");
const quickCloseButton = document.getElementById("quickCloseButton");
const statusInput = document.getElementById("statusInput");
const statusTimeInput = document.getElementById("statusTimeInput");
const detailInput = document.getElementById("detailInput");
const detailInputHint = document.getElementById("detailInputHint");
const statusFlowHint = document.getElementById("statusFlowHint");
const scanForm = document.getElementById("scanForm");
const resetStorageButton = document.getElementById("resetStorageButton");
const useCurrentTimeButton = document.getElementById("useCurrentTimeButton");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const jobList = document.getElementById("jobList");
const jobCountBadge = document.getElementById("jobCountBadge");
const successPopup = document.getElementById("successPopup");
const successPopupMessage = document.getElementById("successPopupMessage");
const successPopupConfirmButton = document.getElementById("successPopupConfirmButton");
const scannerOverlay = document.getElementById("scannerOverlay");
const scannerOverlayMessage = document.getElementById("scannerOverlayMessage");
const scannerVideo = document.getElementById("scannerVideo");
const closeScannerOverlayButton = document.getElementById("closeScannerOverlayButton");
const cancelScannerOverlayButton = document.getElementById("cancelScannerOverlayButton");
const openScannerPhotoButton = document.getElementById("openScannerPhotoButton");
const startCameraButton = document.getElementById("startCameraButton");
const stopCameraButton = document.getElementById("stopCameraButton");
const photoInput = document.getElementById("photoInput");
const cameraPreview = document.getElementById("cameraPreview");
const cameraStatus = document.getElementById("cameraStatus");
const cameraMessage = document.getElementById("cameraMessage");
const partCodeFallbackInput = document.getElementById("partCodeFallbackInput");
const applyPartCodeFallbackButton = document.getElementById("applyPartCodeFallbackButton");
const partCodeFallbackHint = document.getElementById("partCodeFallbackHint");
const partSelection = document.getElementById("partSelection");
const partSelectionHint = document.getElementById("partSelectionHint");
const scannedDirectValue = document.getElementById("scannedDirectValue");
const scannedPartCode = document.getElementById("scannedPartCode");
const scannedPartName = document.getElementById("scannedPartName");
const dataService = window.monitorDataService;
const FIXED_DISPLAY_AREA = "Injection F1";

const masterQrCodes = Array.isArray(window.masterData?.qrCodes) ? window.masterData.qrCodes : [];
const masterCatalog = Array.isArray(window.masterData?.catalog) ? window.masterData.catalog : [];
const fallbackQrMappings = Array.isArray(window.qrMappingData?.mappings) ? window.qrMappingData.mappings : [];
const qrCodes = masterQrCodes.length > 0 ? masterQrCodes : fallbackQrMappings;
const catalogItems = masterCatalog.length > 0
  ? masterCatalog
  : fallbackQrMappings.map((mapping) => ({
      id: mapping.entityId,
      entityType: mapping.entityType,
      entityCode: mapping.entityCode,
      entityName: mapping.entityName
    }));
const qrLookup = new Map(qrCodes.map((mapping) => [mapping.qrValue, mapping]));
const catalogLookup = new Map(catalogItems.map((item) => [item.entityCode, item]));
const defaultJobs = window.currentMachineJobsData?.jobs || {};
const machineIds = Object.keys(defaultJobs);
const activeEmployees = Array.isArray(window.employeesData?.employees) ? window.employeesData.employees : [];
let isSubmittingScan = false;
let currentPartCandidates = [];
let jobsState = cloneJobs(defaultJobs);
let incidentsState = [];
let previewObjectUrl = "";
let scannerInputTimerId;
let scannerLastSubmittedValue = "";
let closeSuccessPopupResolver = null;
let cameraStream = null;
let liveDetector = null;
let liveScanFrameId = 0;
let liveScanActive = false;
const defaultMachineAreas = {
  "MC 10": "Injection",
  "MC 12": "Injection",
  "MC 13": "Assembly",
  "MC 15": "Assembly",
  "MC 11": "Injection",
  "MC 07": "Injection",
  "MC 16": "Injection",
  "MC 19": "Assembly",
  "MC 18": "Assembly"
};
const defaultMachineStatuses = {
  "MC 10": "running",
  "MC 12": "running",
  "MC 13": "down",
  "MC 15": "running",
  "MC 11": "running",
  "MC 07": "down",
  "MC 16": "running",
  "MC 19": "down",
  "MC 18": "running"
};

const thaiKeyboardToEnglish = {
  "ๅ": "1",
  "/": "2",
  "-": "3",
  "ภ": "4",
  "ถ": "5",
  "ุ": "6",
  "ึ": "7",
  "ค": "8",
  "ต": "9",
  "จ": "0",
  "ข": "-",
  "ช": "=",
  "ๆ": "q",
  "ไ": "w",
  "ำ": "e",
  "พ": "r",
  "ะ": "t",
  "ั": "y",
  "ี": "u",
  "ร": "i",
  "น": "o",
  "ย": "p",
  "บ": "[",
  "ล": "]",
  "ฃ": "\\",
  "ฟ": "a",
  "ห": "s",
  "ก": "d",
  "ด": "f",
  "เ": "g",
  "้": "h",
  "่": "j",
  "า": "k",
  "ส": "l",
  "ว": ";",
  "ง": "'",
  "ผ": "z",
  "ป": "x",
  "แ": "c",
  "อ": "v",
  "ิ": "b",
  "ื": "n",
  "ท": "m",
  "ม": ",",
  "ใ": ".",
  "ฝ": "/",
  "%": "~",
  "+": "!",
  "๑": "@",
  "๒": "#",
  "๓": "$",
  "๔": "%",
  "ู": "^",
  "฿": "&",
  "๕": "*",
  "๖": "(",
  "๗": ")",
  "๘": "_",
  "๙": "+",
  "๐": "Q",
  "\"": "W",
  "ฎ": "E",
  "ฑ": "R",
  "ธ": "T",
  "ํ": "Y",
  "๊": "U",
  "ณ": "I",
  "ฯ": "O",
  "ญ": "P",
  "ฐ": "{",
  ",": "}",
  "ฅ": "|",
  "ฤ": "A",
  "ฆ": "S",
  "ฏ": "D",
  "โ": "F",
  "ฌ": "G",
  "็": "H",
  "๋": "J",
  "ษ": "K",
  "ศ": "L",
  "ซ": ":",
  ".": "\"",
  "(": "Z",
  ")": "X",
  "ฉ": "C",
  "ฮ": "V",
  "ฺ": "B",
  "์": "N",
  "?": "M",
  "ฒ": "<",
  "ฬ": ">",
  "ฦ": "?"
};

function cloneJobs(jobs) {
  return JSON.parse(JSON.stringify(jobs));
}

async function loadJobs() {
  jobsState = await dataService.loadJobs(defaultJobs);
  return jobsState;
}

async function loadIncidents() {
  incidentsState = await dataService.loadIncidents();
  return incidentsState;
}

async function saveJobs(jobs) {
  jobsState = await dataService.saveAllJobs(jobs);
  return jobsState;
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "--";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function toDateTimeLocalValue(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getStatusTimeIso() {
  if (!statusTimeInput.value) {
    return new Date().toISOString();
  }

  const selectedDate = new Date(statusTimeInput.value);

  if (Number.isNaN(selectedDate.getTime())) {
    return null;
  }

  return selectedDate.toISOString();
}

function getIncidentSortTime(incident) {
  return new Date(incident.updatedAt || incident.closedAt || incident.openedAt || 0).getTime();
}

function getActiveIncident(machineId) {
  return incidentsState
    .filter((incident) => incident.machineId === machineId && incident.active)
    .sort((left, right) => getIncidentSortTime(right) - getIncidentSortTime(left))[0] || null;
}

function getResolvedIncidentStatus(machineId, nextStatus) {
  if (nextStatus) {
    return nextStatus;
  }

  return jobsState[machineId]?.status || getDefaultStatus(machineId);
}

function normalizeScannerText(rawValue) {
  const value = rawValue.trim();

  if (!/[ก-๙]/.test(value)) {
    return value;
  }

  const convertedValue = Array.from(value)
    .map((character) => thaiKeyboardToEnglish[character] || character)
    .join("");

  return convertedValue.trim();
}

function parseScannedQr(rawValue) {
  const directValue = normalizeScannerText(rawValue);
  const compactValue = directValue.replace(/\s+/g, "");
  const partCodeMatch = compactValue.match(/^[A-Z]{1,4}\d{6,}/i) || directValue.match(/[A-Z]{1,4}\d{6,}/i);
  const partCode = partCodeMatch ? partCodeMatch[0].toUpperCase() : null;
  const referenceMatch = compactValue.match(/^[A-Z]{1,4}\d{6,}-?(\d{8,})/i);
  const referenceNo = referenceMatch ? `${partCode}-${referenceMatch[1]}` : null;
  const workOrderMatch = compactValue.match(/WO\d+/i);
  const workOrderNo = workOrderMatch ? workOrderMatch[0].toUpperCase() : null;
  const dateMatch = compactValue.match(/\d{4}\/\d{2}\/\d{2}/);
  const processMatch = compactValue.match(/(INJECTION|ASSEMBLY)/i);
  let model = null;

  if (processMatch) {
    const processIndex = compactValue.indexOf(processMatch[0]);
    const suffixValue = compactValue.slice(processIndex + processMatch[0].length);
    const modelMatch = suffixValue.match(/^[A-Z]{2,}\d{2,}[A-Z0-9-]*/i);
    model = modelMatch ? modelMatch[0].toUpperCase() : null;
  }

  const qtySegment = directValue.match(/qty[:=]?\s*(\d+)/i);
  const qty = qtySegment ? Number(qtySegment[1]) : null;

  return {
    directValue,
    referenceNo,
    partCode: partCode || directValue.toUpperCase(),
    workOrderNo,
    qty,
    dateCode: dateMatch ? dateMatch[0] : null,
    process: processMatch ? processMatch[0].toUpperCase() : null,
    model
  };
}

function resolveLookupKeys(parsed) {
  return [parsed.directValue, parsed.referenceNo, parsed.partCode]
    .map((value) => (typeof value === "string" ? value.trim() : value))
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

function getQrLookup(rawValue) {
  const parsed = typeof rawValue === "string" ? parseScannedQr(rawValue) : rawValue;
  const candidateKeys = resolveLookupKeys(parsed);

  for (const key of candidateKeys) {
    const qrMatch = qrLookup.get(key);

    if (qrMatch) {
      return {
        found: true,
        qrValue: parsed.directValue,
        matchedQrValue: key,
        entityType: qrMatch.entityType,
        entityCode: qrMatch.entityCode || (catalogLookup.get(qrMatch.entityCode)?.entityCode),
        entityName: qrMatch.entityName || (catalogLookup.get(qrMatch.entityCode)?.entityName),
        catalogItem: catalogLookup.get(qrMatch.entityCode) || null,
        parsed
      };
    }
  }

  const catalogItem = parsed.partCode ? catalogLookup.get(parsed.partCode) : null;

  if (catalogItem) {
    return {
      found: true,
      qrValue: parsed.directValue,
      matchedQrValue: parsed.partCode,
      entityType: catalogItem.entityType,
      entityCode: catalogItem.entityCode,
      entityName: catalogItem.entityName,
      catalogItem,
      parsed
    };
  }

  return {
    found: false,
    qrValue: parsed.directValue,
    matchedQrValue: null,
    entityType: null,
    entityCode: parsed.partCode || null,
    entityName: null,
    catalogItem: null,
    parsed
  };
}

function buildCandidateKey(entityCode, entityName) {
  return [entityCode || "", entityName || ""].join("::");
}

function buildPartCandidates(rawValue) {
  const lookup = getQrLookup(rawValue);
  const candidateMap = new Map();

  function addCandidate(item, source, matchedQrValue = null) {
    if (!item?.entityCode || !item?.entityName) {
      return;
    }

    const key = buildCandidateKey(item.entityCode, item.entityName);

    if (candidateMap.has(key)) {
      return;
    }

    candidateMap.set(key, {
      entityCode: item.entityCode,
      entityName: item.entityName,
      entityType: item.entityType || "PART",
      source,
      matchedQrValue
    });
  }

  const candidateKeys = resolveLookupKeys(lookup.parsed);

  candidateKeys.forEach((key) => {
    const qrMatch = qrLookup.get(key);

    if (!qrMatch) {
      return;
    }

    addCandidate(
      {
        entityCode: qrMatch.entityCode || catalogLookup.get(qrMatch.entityCode)?.entityCode,
        entityName: qrMatch.entityName || catalogLookup.get(qrMatch.entityCode)?.entityName,
        entityType: qrMatch.entityType
      },
      "qr_codes",
      key
    );
  });

  if (lookup.catalogItem) {
    addCandidate(lookup.catalogItem, "catalog", lookup.matchedQrValue);
  }

  if (lookup.parsed.partCode) {
    const normalizedPartCode = lookup.parsed.partCode.toUpperCase();

    catalogItems
      .filter((item) => item.entityCode && item.entityCode.toUpperCase().startsWith(normalizedPartCode))
      .slice(0, 20)
      .forEach((item) => {
        addCandidate(item, "catalog", normalizedPartCode);
      });
  }

  return {
    lookup,
    candidates: Array.from(candidateMap.values())
  };
}

function renderPartSelection(rawValue = "") {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    currentPartCandidates = [];
    partSelection.innerHTML = `<option value="">รอสแกน QR ก่อน</option>`;
    partSelection.value = "";
    partSelectionHint.textContent = "เมื่อสแกน QR แล้ว ระบบจะเติมตัวเลือกจาก Master Data ให้อัตโนมัติ";
    return getQrLookup("");
  }

  const { lookup, candidates } = buildPartCandidates(trimmedValue);
  currentPartCandidates = candidates;

  if (candidates.length === 0) {
    partSelection.innerHTML = `<option value="">ไม่พบชื่อชิ้นงานใน Master Data</option>`;
    partSelection.value = "";
    partSelectionHint.textContent = "ไม่พบ candidate ที่เลือกได้จาก Master Data กรุณาตรวจสอบ QR หรือ Master Data";
    return lookup;
  }

  partSelection.innerHTML = candidates
    .map((candidate, index) => {
      const suffix = candidate.source === "qr_codes" ? "ตรงจาก QR" : "จาก Catalog";
      return `<option value="${index}">${candidate.entityCode} - ${candidate.entityName} (${suffix})</option>`;
    })
    .join("");

  const preferredIndex = candidates.findIndex(
    (candidate) => candidate.entityCode === lookup.entityCode && candidate.entityName === lookup.entityName
  );
  partSelection.value = String(preferredIndex >= 0 ? preferredIndex : 0);
  partSelectionHint.textContent = `พบ ${candidates.length} ตัวเลือกจาก Master Data กรุณายืนยันชื่อชิ้นงานก่อนบันทึก`;
  return lookup;
}

function getSelectedPartCandidate() {
  const index = Number(partSelection.value);

  if (!Number.isInteger(index) || index < 0 || index >= currentPartCandidates.length) {
    return null;
  }

  return currentPartCandidates[index];
}

function getDefaultArea(machineId) {
  return FIXED_DISPLAY_AREA;
}

function getDefaultStatus(machineId) {
  const status = defaultJobs[machineId]?.status || defaultMachineStatuses[machineId] || "running";
  return status === "warning" ? "down" : status;
}

function getDefaultDetail(machineId) {
  return jobsState[machineId]?.detail || defaultJobs[machineId]?.detail || "";
}

function renderMachineOptions() {
  machineSelect.innerHTML = machineIds
    .map((machineId) => `<option value="${machineId}">${machineId}</option>`)
    .join("");
}

function syncPartCodeFallbackInput() {
  const machineJob = jobsState[machineSelect.value];
  const fallbackValue = machineJob?.partCode || "";

  if (partCodeFallbackInput) {
    partCodeFallbackInput.value = fallbackValue;
  }
}

function getEmployeeOptionValue(employee) {
  return employee.employeeCode || employee.username || employee.fullName || employee.id;
}

function getEmployeeOptionLabel(employee) {
  const code = employee.employeeCode || employee.username || "-";
  const fullName = employee.fullName || code;
  return `${code} - ${fullName}`;
}

function renderScannerOptions() {
  if (activeEmployees.length === 0) {
    scannerInput.innerHTML = `<option value="station-01">station-01</option>`;
    scannerInput.value = "station-01";
    return;
  }

  scannerInput.innerHTML = activeEmployees
    .map((employee) => `<option value="${getEmployeeOptionValue(employee)}">${getEmployeeOptionLabel(employee)}</option>`)
    .join("");

  const defaultEmployee =
    activeEmployees.find((employee) => (employee.employeeCode || "").toUpperCase() === "SD078") ||
    activeEmployees[0];

  scannerInput.value = getEmployeeOptionValue(defaultEmployee);
}

function syncAreaInput() {
  areaInput.value = FIXED_DISPLAY_AREA;
}

function syncStatusInput() {
  const status = jobsState[machineSelect.value]?.status || getDefaultStatus(machineSelect.value);
  statusInput.value = status === "warning" ? "down" : status;
}

function syncStatusTimeInput() {
  const savedTime = jobsState[machineSelect.value]?.updatedAt;
  statusTimeInput.value = toDateTimeLocalValue(savedTime || new Date());
}

function syncDetailInput() {
  detailInput.value = getDefaultDetail(machineSelect.value);
}

function syncIncidentHints() {
  const machineId = machineSelect.value;
  const status = statusInput.value;
  const activeIncident = getActiveIncident(machineId);

  if (status === "running" && activeIncident) {
    if (statusFlowHint) {
      statusFlowHint.textContent = `เครื่อง ${machineId} มีเหตุค้างอยู่ เมื่อบันทึกสถานะทำงาน ระบบจะปิดเหตุและใช้เวลานี้เป็นเวลาแก้เสร็จ`;
    }

    if (detailInputHint) {
      detailInputHint.textContent = "กรอกรายละเอียดการแก้ไขหรือผลการดำเนินการ เช่น เปลี่ยนอะไหล่แล้ว ทดสอบเดินเครื่องผ่าน";
    }

    return;
  }

  if (status === "down") {
    if (statusFlowHint) {
      statusFlowHint.textContent = `เมื่อบันทึก ${machineId} เป็นสถานะนี้ ระบบจะเปิดเหตุและเริ่มนับเวลาตั้งแต่เวลา Status ที่ระบุ`;
    }

    if (detailInputHint) {
      detailInputHint.textContent = "กรอกรายละเอียดอาการที่พบหรือสาเหตุเบื้องต้น เพื่อให้ Monitor และประวัติแจ้งเหตุแสดงตรงกัน";
    }

    return;
  }

  if (statusFlowHint) {
    statusFlowHint.textContent = "ถ้าเลือกหยุด ระบบจะเปิดเหตุให้อัตโนมัติ และถ้าเลือกทำงานในเครื่องที่มีเหตุค้าง ระบบจะปิดเหตุพร้อมบันทึกเวลาแก้เสร็จ";
  }

  if (detailInputHint) {
    detailInputHint.textContent = "เมื่อเปิดเหตุ ให้ใส่อาการที่พบ และเมื่อปิดเหตุให้ใส่วิธีแก้ไขหรือผลการดำเนินการ";
  }
}

function renderQuickClosePanel() {
  if (!quickCloseCard) {
    return;
  }

  const machineId = machineSelect.value;
  const activeIncident = getActiveIncident(machineId);

  if (!activeIncident) {
    quickCloseCard.hidden = true;
    return;
  }

  quickCloseCard.hidden = false;

  if (quickCloseTitle) {
    quickCloseTitle.textContent = `${machineId} มีเคสค้างอยู่`;
  }

  if (quickCloseMessage) {
    quickCloseMessage.textContent = activeIncident.issueDetail
      ? `อาการที่แจ้งไว้: ${activeIncident.issueDetail}`
      : "เครื่องนี้มีเหตุค้างอยู่ สามารถปิดเคสได้ทันทีโดยไม่ต้องสแกน QR ซ้ำ";
  }

  if (quickCloseMeta) {
    const meta = [
      `เริ่มเหตุ ${formatDateTime(activeIncident.openedAt)}`,
      `ผู้แจ้ง ${activeIncident.openedBy || "--"}`,
      `สถานะ ${activeIncident.openStatus === "down" ? "หยุด" : "เปิดเหตุ"}`
    ];
    quickCloseMeta.innerHTML = meta.map((item) => `<span>${item}</span>`).join("");
  }
}

function openCloseCasePage(machineId = machineSelect.value) {
  const targetMachineId = machineId || machineSelect.value || "";
  const query = targetMachineId ? `?machine=${encodeURIComponent(targetMachineId)}` : "";
  window.location.href = `./close-case.html${query}`;
}

async function closeSelectedMachineIncidentQuick() {
  const machineId = machineSelect.value;
  const activeIncident = getActiveIncident(machineId);

  if (!activeIncident) {
    showResult("ไม่พบเคสค้าง", `${machineId} ไม่มีเหตุค้างให้ปิดในขณะนี้`);
    return;
  }

  const statusTimeIso = getStatusTimeIso() || new Date().toISOString();
  const scannedBy = scannerInput.value.trim() || "station-01";
  const detail = detailInput.value.trim();
  const currentJob = jobsState[machineId] || defaultJobs[machineId] || {};
  const nextDetail = detail || activeIncident.resolutionDetail || activeIncident.issueDetail || currentJob.detail || "";
  const nextJob = {
    ...currentJob,
    area: currentJob.area || FIXED_DISPLAY_AREA,
    directValue: currentJob.directValue || currentJob.qrValue || "",
    partCode: currentJob.partCode || "",
    partName: currentJob.partName || "",
    entityType: currentJob.entityType || "PART",
    qrValue: currentJob.qrValue || currentJob.directValue || "",
    status: "running",
    detail: nextDetail,
    updatedAt: statusTimeIso,
    scannedBy
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
    resolutionDetail: nextDetail,
    closedAt: statusTimeIso,
    closedBy: scannedBy,
    active: false,
    updatedAt: statusTimeIso
  });

  upsertIncidentState(savedIncident);
  syncStatusInput();
  syncStatusTimeInput();
  syncDetailInput();
  syncIncidentHints();
  renderQuickClosePanel();
  renderJobList();
  showResult("ปิดเคสเรียบร้อย", `${machineId} กลับมาเป็นสถานะทำงานแล้ว เวลา ${formatDateTime(statusTimeIso)}`);
  await showSuccessPopup(`ปิดเคส ${machineId} เรียบร้อยแล้ว`);
  resetScanEntryFields();
  syncStatusInput();
  syncIncidentHints();
  renderQuickClosePanel();
  setCameraState("ปิดเคสสำเร็จ", `ปิดเคส ${machineId} เรียบร้อยแล้ว พร้อมสแกนรายการถัดไป`);
  focusQrInput(true);
}

function renderJobList() {
  if (!jobList || !jobCountBadge) {
    return;
  }
  jobCountBadge.textContent = `${machineIds.length} เครื่อง`;
  jobList.innerHTML = "";

  machineIds.forEach((machineId) => {
    const job = jobsState[machineId];
    const lookup = getQrLookup(job?.directValue || job?.partCode || job?.qrValue || "");
    const activeIncident = getActiveIncident(machineId);
    const incidentSummary = activeIncident
      ? `${activeIncident.openStatus === "down" ? "เหตุหยุด" : "เหตุเตือน"} เริ่ม ${formatDateTime(activeIncident.openedAt)}`
      : "ไม่มีเหตุค้าง";
    const card = document.createElement("article");
    card.className = "machine-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${machineId}</h3>
          <div class="machine-meta">อัปเดตล่าสุด ${formatDateTime(job?.updatedAt)}</div>
        </div>
        <span class="badge status-${job?.status || getDefaultStatus(machineId)}">${job?.scannedBy || "--"}</span>
      </header>
      <div class="machine-values">
        <span>พื้นที่ / กระบวนการ</span>
        <strong>${job?.area || getDefaultArea(machineId) || "-"}</strong>
      </div>
      <div class="machine-values">
        <span>QR ปัจจุบัน</span>
        <strong>${job?.directValue || job?.qrValue || "--"}</strong>
      </div>
      <div class="machine-values">
        <span>ชิ้นงานปัจจุบัน</span>
        <strong>${job?.partCode || lookup.entityCode || "ไม่พบใน Mapping"}</strong>
      </div>
      <div class="machine-values">
        <span>ชื่อชิ้นงาน</span>
        <strong>${job?.partName || lookup.entityName || "-"}</strong>
      </div>
      <div class="machine-values">
        <span>สถานะเหตุล่าสุด</span>
        <strong>${incidentSummary}</strong>
      </div>
    `;
    jobList.appendChild(card);
  });
}

function showResult(title, message) {
  resultTitle.textContent = title;
  resultMessage.textContent = message;
}

function closeSuccessPopup() {
  if (!successPopup || successPopup.hidden) {
    return;
  }

  successPopup.hidden = true;

  if (typeof closeSuccessPopupResolver === "function") {
    const resolver = closeSuccessPopupResolver;
    closeSuccessPopupResolver = null;
    resolver();
  }
}

function showSuccessPopup(message) {
  if (!successPopup || !successPopupMessage) {
    return Promise.resolve();
  }

  successPopupMessage.textContent = message;
  successPopup.hidden = false;

  return new Promise((resolve) => {
    closeSuccessPopupResolver = resolve;
    window.setTimeout(() => {
      successPopupConfirmButton?.focus();
    }, 0);
  });
}

function setScannerOverlayMessage(message) {
  if (scannerOverlayMessage) {
    scannerOverlayMessage.textContent = message;
  }
}

function supportsLiveCameraScan() {
  return Boolean(
    scannerVideo &&
    navigator.mediaDevices?.getUserMedia &&
    "BarcodeDetector" in window
  );
}

async function ensureLiveDetector() {
  if (liveDetector) {
    return liveDetector;
  }

  const supportedFormats = typeof window.BarcodeDetector?.getSupportedFormats === "function"
    ? await window.BarcodeDetector.getSupportedFormats()
    : ["qr_code"];
  const preferredFormats = ["qr_code", "data_matrix", "aztec", "pdf417"];
  const formats = preferredFormats.filter((format) => supportedFormats.includes(format));
  liveDetector = new window.BarcodeDetector({ formats: formats.length ? formats : ["qr_code"] });
  return liveDetector;
}

function stopLiveCameraScan() {
  liveScanActive = false;

  if (liveScanFrameId) {
    window.cancelAnimationFrame(liveScanFrameId);
    liveScanFrameId = 0;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (scannerVideo) {
    scannerVideo.pause();
    scannerVideo.srcObject = null;
  }
}

function closeScannerOverlay() {
  stopLiveCameraScan();

  if (scannerOverlay) {
    scannerOverlay.hidden = true;
  }
}

async function processLiveVideoFrame() {
  if (!liveScanActive || !scannerVideo || scannerVideo.readyState < 2) {
    if (liveScanActive) {
      liveScanFrameId = window.requestAnimationFrame(processLiveVideoFrame);
    }
    return;
  }

  try {
    const detector = await ensureLiveDetector();
    const barcodes = await detector.detect(scannerVideo);
    const qrValue = barcodes?.[0]?.rawValue?.trim();

    if (qrValue) {
      qrInput.value = qrValue;
      updateQrPreview(qrValue, "กล้องสด");
      setScannerOverlayMessage(`พบ QR แล้ว: ${qrValue} กำลังบันทึกให้อัตโนมัติ`);
      closeScannerOverlay();
      focusQrInput(true, { allowOnTouch: true });
      return;
    }
  } catch (error) {
    setScannerOverlayMessage(`ยังสแกนไม่สำเร็จ ลองขยับให้ QR อยู่ในกรอบให้ชัดขึ้น (${error.message || "camera"})`);
  }

  if (liveScanActive) {
    liveScanFrameId = window.requestAnimationFrame(processLiveVideoFrame);
  }
}

async function openLiveCameraScanner() {
  if (!scannerOverlay) {
    photoInput.click();
    return;
  }

  scannerOverlay.hidden = false;
  setScannerOverlayMessage("วาง QR ของ Part Tag ให้อยู่ในกรอบ ระบบจะอ่านให้อัตโนมัติ");

  if (!supportsLiveCameraScan()) {
    setScannerOverlayMessage("อุปกรณ์นี้ยังไม่รองรับกล้องสดในเบราว์เซอร์ กรุณากด ถ่ายรูปแทน");
    return;
  }

  try {
    stopLiveCameraScan();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    scannerVideo.srcObject = cameraStream;
    await scannerVideo.play();
    liveScanActive = true;
    setScannerOverlayMessage("วาง QR ของ Part Tag ให้อยู่ในกรอบ ระบบจะอ่านให้อัตโนมัติ");
    liveScanFrameId = window.requestAnimationFrame(processLiveVideoFrame);
  } catch (error) {
    setScannerOverlayMessage(`เปิดกล้องไม่สำเร็จ กรุณากด ถ่ายรูปแทน หรืออนุญาตการใช้กล้อง (${error.message || "camera"})`);
  }
}

successPopupConfirmButton?.addEventListener("click", () => {
  closeSuccessPopup();
});

successPopup?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.classList.contains("success-popup-backdrop")) {
    closeSuccessPopup();
  }
});

closeScannerOverlayButton?.addEventListener("click", () => {
  closeScannerOverlay();
});

cancelScannerOverlayButton?.addEventListener("click", () => {
  closeScannerOverlay();
});

openScannerPhotoButton?.addEventListener("click", () => {
  photoInput.click();
});

scannerOverlay?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.classList.contains("scanner-overlay-backdrop")) {
    closeScannerOverlay();
  }
});

function renderScanReadout(rawValue = "", selectedPart = null) {
  const lookup = getQrLookup(rawValue);

  scannedDirectValue.textContent = lookup.parsed.directValue || "--";
  scannedPartCode.textContent = lookup.parsed.partCode || "--";
  scannedPartName.textContent = selectedPart?.entityName || lookup.entityName || "--";
}

function applyPartCodeFallback(rawValue) {
  const normalizedValue = normalizeScannerText(rawValue || "").trim().toUpperCase();

  if (!normalizedValue) {
    if (partCodeFallbackHint) {
      partCodeFallbackHint.textContent = "กรุณาระบุ Part Code จากข้อความบนป้ายก่อน";
    }
    return false;
  }

  qrInput.value = normalizedValue;
  const lookup = updateQrPreview(normalizedValue, "ข้อความบนป้าย");
  const selectedPart = getSelectedPartCandidate();

  if (!selectedPart) {
    if (partCodeFallbackHint) {
      partCodeFallbackHint.textContent = `ยังไม่พบ ${normalizedValue} ใน Master Data กรุณาตรวจสอบ Part Code บนป้ายอีกครั้ง`;
    }
    return false;
  }

  if (partCodeFallbackInput) {
    partCodeFallbackInput.value = normalizedValue;
  }

  if (partCodeFallbackHint) {
    partCodeFallbackHint.textContent = `เลือก ${selectedPart.entityCode} - ${selectedPart.entityName} จาก Master Data แล้ว พร้อมบันทึกต่อได้ทันที`;
  }

  renderScanReadout(lookup.qrValue, selectedPart);
  setCameraState("ใช้ Part จากป้ายแล้ว", `เลือก ${selectedPart.entityCode} จากข้อความบนป้ายแล้ว สามารถบันทึกงานต่อได้ทันที`);
  return true;
}

function upsertIncidentState(incident) {
  const nextIncident = JSON.parse(JSON.stringify(incident));
  const existingIndex = incidentsState.findIndex((item) => item.id === nextIncident.id);

  if (existingIndex >= 0) {
    incidentsState[existingIndex] = nextIncident;
    return;
  }

  incidentsState.unshift(nextIncident);
}

function resetScanEntryFields() {
  qrInput.value = "";
  detailInput.value = "";
  scannerLastSubmittedValue = "";
  currentPartCandidates = [];
  statusTimeInput.value = toDateTimeLocalValue();

  if (partCodeFallbackInput) {
    partCodeFallbackInput.value = "";
  }

  renderPartSelection("");
  renderScanReadout("");
  resetPhotoPreview();
  renderQuickClosePanel();

  if (partCodeFallbackHint) {
    partCodeFallbackHint.textContent = "ถ้าถ่ายรูป QR ไม่สำเร็จ ให้ดูรหัส Part จากข้อความบนป้ายแล้วพิมพ์ที่นี่ ระบบจะค้นชื่อชิ้นงานจาก Master Data ให้ทันที";
  }
}

function isTouchLikeDevice() {
  return window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches;
}

function focusQrInput(selectValue = false, options = {}) {
  const { allowOnTouch = false } = options;

  if (isTouchLikeDevice() && !allowOnTouch) {
    return;
  }

  window.setTimeout(() => {
    qrInput.focus();
    if (selectValue && qrInput.value) {
      qrInput.select();
    }
  }, 0);
}

function submitScan() {
  if (isSubmittingScan) {
    return;
  }

  isSubmittingScan = true;
  scanForm.requestSubmit();
  window.setTimeout(() => {
    isSubmittingScan = false;
  }, 150);
}

function setScannerReadyState(statusText = "พร้อมรับ Scanner", messageText = "ยิงสแกนเนอร์เข้าช่อง QR หรือถ่ายรูป QR จากมือถือได้ทันที") {
  setCameraState(statusText, messageText);
}

function updateQrPreview(rawValue, sourceLabel = "Scanner") {
  const normalizedValue = normalizeScannerText(rawValue);

  if (rawValue !== normalizedValue && qrInput.value === rawValue) {
    qrInput.value = normalizedValue;
  }

  const lookup = renderPartSelection(normalizedValue);
  renderScanReadout(lookup.qrValue, getSelectedPartCandidate());

  if (normalizedValue.trim()) {
    const partCode = lookup.parsed.partCode || normalizedValue.trim();
    setCameraState(
      `รับข้อมูลจาก ${sourceLabel}`,
      `อ่านค่า ${partCode} แล้ว ${lookup.found ? "พบข้อมูลใน Master Data" : "ยังไม่พบใน Master Data"}`
    );
  }

  return lookup;
}

function scheduleScannerSubmit(sourceLabel = "Scanner") {
  window.clearTimeout(scannerInputTimerId);

  scannerInputTimerId = window.setTimeout(() => {
    const scannedValue = qrInput.value.trim();

    if (!scannedValue || scannedValue === scannerLastSubmittedValue) {
      return;
    }

    scannerLastSubmittedValue = scannedValue;
    updateQrPreview(scannedValue, sourceLabel);
    submitScan();
  }, 450);
}

function setCameraState(statusText, messageText) {
  cameraStatus.textContent = statusText;
  cameraMessage.textContent = messageText;
}

function resetPhotoPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }

  cameraPreview.removeAttribute("src");
  photoInput.value = "";
  setScannerReadyState("พร้อมรับ Scanner", "ยิงสแกนเนอร์เข้าช่อง QR หรือกดถ่ายรูป QR จากมือถือ แล้วระบบจะอ่านข้อมูลให้อัตโนมัติ");
}

async function scanPhotoFile(file) {
  if (!file) {
    return;
  }

  if (!window.monitorQrImageDecoder?.decodeQrFromImageFile) {
    setCameraState("ไม่รองรับ", "เบราว์เซอร์นี้ยังไม่รองรับการอ่าน QR จากรูป กรุณาพิมพ์หรือใช้เครื่องสแกนแทน");
    return;
  }

  try {
    resetPhotoPreview();
    previewObjectUrl = URL.createObjectURL(file);
    cameraPreview.src = previewObjectUrl;
    setCameraState("กำลังอ่านรูป", "ระบบกำลังถอดรหัส QR จากรูปที่เลือก");

    const decodedResult = await window.monitorQrImageDecoder.decodeQrFromImageFile(file);

    if (!decodedResult?.value) {
      const errorDetail = decodedResult?.error ? ` รายละเอียด: ${decodedResult.error}` : "";
      setCameraState("ไม่พบ QR", `ระบบเปิดรูปได้ แต่ยังไม่พบ QR ในภาพนี้ ลองถ่ายให้ชัดขึ้นหรือขยับใกล้อีกนิด${errorDetail}`);
      return;
    }

    const qrValue = decodedResult.value;

    if (!qrValue) {
      setCameraState("อ่านไม่สำเร็จ", "พบ QR ในรูป แต่ยังอ่านค่าไม่ได้");
      return;
    }

    qrInput.value = qrValue;
    const lookup = updateQrPreview(qrValue, "รูป QR");
    setCameraState("พบ QR แล้ว", `อ่านค่า ${qrValue} จากรูปแล้วด้วย ${decodedResult.source} กำลังบันทึกให้อัตโนมัติ`);
    focusQrInput(true, { allowOnTouch: true });
  } catch (error) {
    const isHeicLike = /heic|heif/i.test(file?.type || "") || /\.(heic|heif)$/i.test(file?.name || "");
    const errorDetail = error?.message ? ` รายละเอียด: ${error.message}` : "";
    setCameraState(
      "เปิดรูปไม่ได้",
      isHeicLike
        ? `ไม่สามารถเปิดรูป HEIC นี้ได้ กรุณาลองถ่ายใหม่ หรือปรับ iPhone เป็น Most Compatible${errorDetail}`
        : `ไม่สามารถอ่านรูปนี้ได้ กรุณาลองถ่ายใหม่หรือเลือกไฟล์รูปอื่น${errorDetail}`
    );
    if (partCodeFallbackHint) {
      partCodeFallbackHint.textContent = "ถ้า iPhone อ่านรูปไม่สำเร็จ ให้พิมพ์ Part Code จากข้อความบนป้ายในช่องสำรองด้านล่าง แล้วกด ใช้ Part นี้";
    }
  }
}

function startCamera() {
  openLiveCameraScanner();
}

scanForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const machineId = machineSelect.value;
  const area = FIXED_DISPLAY_AREA;
  const status = statusInput.value;
  const detail = detailInput.value.trim();
  const statusTimeIso = getStatusTimeIso();
  const lookup = getQrLookup(qrInput.value);
  const scannedBy = scannerInput.value.trim() || "station-01";
  const selectedPart = getSelectedPartCandidate();
  const partCode = selectedPart.entityCode || lookup.entityCode || lookup.parsed.partCode;
  const partName = selectedPart.entityName || lookup.entityName || "";
  renderScanReadout(lookup.qrValue, selectedPart);

  if (!area) {
    showResult("ไม่สามารถบันทึกได้", "กรุณาระบุพื้นที่หรือกระบวนการของเครื่องก่อนบันทึก");
    areaInput.focus();
    return;
  }

  if (!lookup.found) {
    showResult("ไม่สามารถบันทึกได้", `ไม่พบ partCode ${lookup.parsed.partCode || "-"} ใน master mapping กรุณาตรวจสอบ Part Tag`);
    focusQrInput(true);
    return;
  }

  if (!statusTimeIso) {
    showResult("ไม่สามารถบันทึกได้", "กรุณาระบุเวลา Status ให้ถูกต้อง หรือกดใช้เวลาปัจจุบัน");
    statusTimeInput.focus();
    return;
  }

  if (!selectedPart) {
    showResult("ไม่สามารถบันทึกได้", "กรุณาเลือกชื่อชิ้นงานจาก Master Data ก่อนบันทึก");
    partSelection.focus();
    return;
  }

  const jobs = cloneJobs(jobsState);
  const activeIncident = getActiveIncident(machineId);
  jobs[machineId] = {
    area,
    directValue: lookup.parsed.directValue,
    partCode,
    partName,
    entityType: selectedPart.entityType || lookup.entityType || "PART",
    qrValue: lookup.qrValue,
    status,
    detail,
    updatedAt: statusTimeIso,
    scannedBy
  };

  jobsState = await dataService.saveJob(machineId, jobs[machineId], defaultJobs);
  await dataService.recordHistory(machineId, jobs[machineId]);
  let incidentMessage = "";

  if (status === "down") {
    const incidentPayload = activeIncident
      ? {
          ...activeIncident,
          area,
          directValue: lookup.parsed.directValue,
          partCode,
          partName,
          entityType: selectedPart.entityType || lookup.entityType || "PART",
          qrValue: lookup.qrValue,
          openStatus: status,
          issueDetail: detail || activeIncident.issueDetail,
          active: true,
          updatedAt: statusTimeIso
        }
      : {
          machineId,
          area,
          directValue: lookup.parsed.directValue,
          partCode,
          partName,
          entityType: selectedPart.entityType || lookup.entityType || "PART",
          qrValue: lookup.qrValue,
          openStatus: status,
          closeStatus: "",
          issueDetail: detail,
          resolutionDetail: "",
          openedAt: statusTimeIso,
          closedAt: "",
          openedBy: scannedBy,
          closedBy: "",
          active: true,
          updatedAt: statusTimeIso
        };

    const savedIncident = await dataService.saveIncident(incidentPayload);
    upsertIncidentState(savedIncident);
    incidentMessage = activeIncident
      ? `อัปเดตเหตุค้างของ ${machineId} ต่อเนื่องตั้งแต่ ${formatDateTime(activeIncident.openedAt)}`
      : `เปิดเหตุของ ${machineId} เวลา ${formatDateTime(statusTimeIso)}`;
  } else if (status === "running" && activeIncident) {
    const savedIncident = await dataService.saveIncident({
      ...activeIncident,
      area,
      directValue: lookup.parsed.directValue,
      partCode,
      partName,
      entityType: selectedPart.entityType || lookup.entityType || "PART",
      qrValue: lookup.qrValue,
      closeStatus: "running",
      resolutionDetail: detail,
      closedAt: statusTimeIso,
      closedBy: scannedBy,
      active: false,
      updatedAt: statusTimeIso
    });
    upsertIncidentState(savedIncident);
    incidentMessage = `ปิดเหตุของ ${machineId} เวลา ${formatDateTime(statusTimeIso)}`;
  }

  renderJobList();
  syncIncidentHints();
  renderQuickClosePanel();
  showResult(
    `บันทึก ${machineId} เรียบร้อย`,
    `${machineId} ในพื้นที่ ${area} กำลังผลิต ${selectedPart.entityCode} - ${selectedPart.entityName} จาก QR ${lookup.qrValue}${incidentMessage ? ` | ${incidentMessage}` : ""}`
  );
  await showSuccessPopup(`อัปเดต ${machineId} เรียบร้อยแล้ว`);
  resetScanEntryFields();
  setCameraState("บันทึกสำเร็จ", `บันทึก ${selectedPart.entityCode} ให้ ${machineId} แล้ว พร้อมสแกนรายการถัดไป`);
  focusQrInput(true);
});

qrInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  if (!qrInput.value.trim()) {
    return;
  }

  scannerLastSubmittedValue = qrInput.value.trim();
  updateQrPreview(qrInput.value, "Scanner");
  submitScan();
});

qrInput.addEventListener("input", () => {
  updateQrPreview(qrInput.value, "Scanner");

  if (!isTouchLikeDevice()) {
    scheduleScannerSubmit("Scanner");
  }
});

qrInput.addEventListener("paste", () => {
  window.setTimeout(() => {
    updateQrPreview(qrInput.value, "Scanner");
    scheduleScannerSubmit("Scanner");
  }, 0);
});

partSelection.addEventListener("change", () => {
  renderScanReadout(qrInput.value, getSelectedPartCandidate());
  focusQrInput();
});

applyPartCodeFallbackButton?.addEventListener("click", () => {
  applyPartCodeFallback(partCodeFallbackInput?.value || "");
});

quickCloseButton?.addEventListener("click", async () => {
  openCloseCasePage();
});

partCodeFallbackInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  applyPartCodeFallback(partCodeFallbackInput.value);
});

resetStorageButton.addEventListener("click", async () => {
  jobsState = await dataService.resetJobs(defaultJobs);
  renderJobList();
  showResult("รีเซ็ตข้อมูลแล้ว", "สถานะเครื่องจักรถูกคืนกลับเป็นค่าเริ่มต้นจากไฟล์ตั้งต้น");
  qrInput.value = "";
  if (partCodeFallbackInput) {
    partCodeFallbackInput.value = "";
  }
  scannerLastSubmittedValue = "";
  detailInput.value = "";
  statusTimeInput.value = toDateTimeLocalValue();
  renderPartSelection("");
  renderScanReadout("");
  setScannerReadyState();
  renderQuickClosePanel();
  if (partCodeFallbackHint) {
    partCodeFallbackHint.textContent = "ถ้าถ่ายรูป QR ไม่สำเร็จ ให้ดูรหัส Part จากข้อความบนป้ายแล้วพิมพ์ที่นี่ ระบบจะค้นชื่อชิ้นงานจาก Master Data ให้ทันที";
  }
  focusQrInput();
});

startCameraButton.addEventListener("click", async () => {
  startCamera();
});

stopCameraButton.addEventListener("click", () => {
  resetPhotoPreview();
  focusQrInput();
});

photoInput.addEventListener("change", async () => {
  const [file] = photoInput.files || [];
  closeScannerOverlay();
  await scanPhotoFile(file);
});

machineSelect.addEventListener("change", () => {
  syncAreaInput();
  syncStatusInput();
  syncStatusTimeInput();
  syncDetailInput();
  syncPartCodeFallbackInput();
  syncIncidentHints();
  renderQuickClosePanel();
  focusQrInput();
});

statusInput.addEventListener("change", () => {
  syncIncidentHints();
  renderQuickClosePanel();
});

useCurrentTimeButton.addEventListener("click", () => {
  statusTimeInput.value = toDateTimeLocalValue();
  focusQrInput();
});

areaInput.addEventListener("change", () => {
  focusQrInput();
});

document.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.closest(".scan-form, .scan-result")) {
    return;
  }

  focusQrInput();
});

async function initializeScanPage() {
  dataService.flushPendingSyncQueue?.();
  const [jobs, incidents] = await Promise.all([loadJobs(), loadIncidents()]);
  jobsState = jobs;
  incidentsState = incidents;
  renderMachineOptions();
  renderScannerOptions();
  syncAreaInput();
  syncStatusInput();
  syncStatusTimeInput();
  syncDetailInput();
  syncPartCodeFallbackInput();
  syncIncidentHints();
  renderQuickClosePanel();
  renderJobList();
  renderPartSelection("");
  renderScanReadout("");
  setScannerReadyState();
  focusQrInput();
}

initializeScanPage();

window.addEventListener("beforeunload", () => {
  closeScannerOverlay();
  resetPhotoPreview();
});
