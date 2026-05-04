const machines = [
  { id: "MC 10", area: "Cutting", status: "running", output: 1280, temp: 41, x: 12, y: 15, cycle: 46, oee: 94, operator: "Anan K.", service: "2h ago", currentQr: "609551", note: "การผลิตคงที่ อุณหภูมิและแนวโน้มผลผลิตอยู่ในเกณฑ์ปกติ" },
  { id: "MC 12", area: "Cutting", status: "running", output: 1195, temp: 43, x: 31, y: 15, cycle: 47, oee: 91, operator: "Nida S.", service: "50m ago", currentQr: "610200", note: "ไลน์ตัดทำงานสมดุลและรักษารอบเวลาตามเป้าหมายได้ดี" },
  { id: "MC 13", area: "Assembly", status: "warning", output: 1082, temp: 58, x: 50, y: 15, cycle: 54, oee: 82, operator: "Preecha T.", service: "6h ago", currentQr: "FA6000036941", note: "อุณหภูมิสูงกว่าปกติ แนะนำให้ตรวจสอบการระบายความร้อนของสปินเดิล" },
  { id: "MC 15", area: "Assembly", status: "running", output: 1324, temp: 39, x: 69, y: 15, cycle: 45, oee: 96, operator: "Mali P.", service: "1h ago", currentQr: "FA6000041372", note: "เป็นเครื่องที่ทำผลงานดีที่สุดในไลน์และมีความแปรปรวนของรอบเวลาต่ำ" },
  { id: "MC 11", area: "Packing", status: "running", output: 1018, temp: 37, x: 86, y: 10, cycle: 43, oee: 93, operator: "Korn D.", service: "3h ago", currentQr: "FN6000001280", note: "คิวงานแพ็กกิ้งคงที่และอยู่ใน takt time ที่คาดไว้" },
  { id: "MC 07", area: "Packing", status: "down", output: 0, temp: 0, x: 86, y: 28, cycle: 0, oee: 0, operator: "Unassigned", service: "12h ago", currentQr: "FN6000001290", note: "แรงดันไฮดรอลิกหาย ต้องทำการ lockout และตรวจสอบก่อนเริ่มงาน" },
  { id: "MC 16", area: "Packing", status: "running", output: 990, temp: 42, x: 86, y: 47, cycle: 49, oee: 89, operator: "Suda L.", service: "4h ago", currentQr: "WK6000002080", note: "ผลผลิตต่ำกว่าเป้าเล็กน้อย แต่เครื่องยังทำงานได้อย่างเสถียร" },
  { id: "MC 19", area: "QA", status: "warning", output: 880, temp: 51, x: 86, y: 66, cycle: 57, oee: 78, operator: "Tee P.", service: "8h ago", currentQr: "WN6000002510", note: "อัตราการตรวจซ้ำสูงกว่าปกติ ควรตรวจสอบการจัดแนวของกล้องคุณภาพ" },
  { id: "MC 18", area: "Dispatch", status: "running", output: 1134, temp: 40, x: 86, y: 84, cycle: 44, oee: 92, operator: "Namfon R.", service: "90m ago", currentQr: "WP6000012090", note: "ไลน์จ่ายงานลื่นไหลและส่งต่อไปขาออกได้ตรงเวลา" }
];

const statusLabel = {
  running: "ทำงาน",
  warning: "ต้องตรวจสอบ",
  down: "หยุด"
};

const areaLabel = {
  Cutting: "ตัดแต่ง",
  Assembly: "ประกอบ",
  Packing: "แพ็กกิ้ง",
  QA: "ตรวจสอบคุณภาพ",
  Dispatch: "จ่ายงาน"
};

const alertLevelLabel = {
  critical: "วิกฤต",
  warning: "เตือน"
};

const MACHINE_JOBS_STORAGE_KEY = "monitor.currentMachineJobs";

const machineList = document.getElementById("machineList");
const plantMap = document.getElementById("plantMap");
const alertList = document.getElementById("alertList");
const alertSummaryBadge = document.getElementById("alertSummaryBadge");
const lastUpdated = document.getElementById("lastUpdated");
const tickerTrack = document.getElementById("tickerTrack");
const focusStrip = document.getElementById("focusStrip");
const lineEfficiency = document.getElementById("lineEfficiency");
const criticalAlerts = document.getElementById("criticalAlerts");
const unitsCompleted = document.getElementById("unitsCompleted");
const onlineCount = document.getElementById("onlineCount");
const onlineSubtext = document.getElementById("onlineSubtext");
const averageCycle = document.getElementById("averageCycle");
const cycleDelta = document.getElementById("cycleDelta");
const downtimeValue = document.getElementById("downtimeValue");
const downtimeCause = document.getElementById("downtimeCause");
const inspectorTitle = document.getElementById("inspectorTitle");
const inspectorStatus = document.getElementById("inspectorStatus");
const inspectorSummary = document.getElementById("inspectorSummary");
const inspectorArea = document.getElementById("inspectorArea");
const inspectorOperator = document.getElementById("inspectorOperator");
const inspectorCycle = document.getElementById("inspectorCycle");
const inspectorPartCode = document.getElementById("inspectorPartCode");
const inspectorPartName = document.getElementById("inspectorPartName");
const inspectorService = document.getElementById("inspectorService");
const statusHistoryList = document.getElementById("statusHistoryList");
const historyCountBadge = document.getElementById("historyCountBadge");
const historyFromDate = document.getElementById("historyFromDate");
const historyToDate = document.getElementById("historyToDate");
const clearHistoryFilterButton = document.getElementById("clearHistoryFilterButton");
const exportHistoryButton = document.getElementById("exportHistoryButton");
const closeCasePopup = document.getElementById("closeCasePopup");
const closeCasePopupSummary = document.getElementById("closeCasePopupSummary");
const closeCaseTimeInput = document.getElementById("closeCaseTimeInput");
const closeCaseByInput = document.getElementById("closeCaseByInput");
const closeCaseDetailInput = document.getElementById("closeCaseDetailInput");
const confirmCloseCaseButton = document.getElementById("confirmCloseCaseButton");
const cancelCloseCaseButton = document.getElementById("cancelCloseCaseButton");
const dataService = window.monitorDataService;

let selectedMachineId = "MC 10";
let refreshTimerId;
let partSettingsState = {};
let isRefreshingDashboard = false;
let closingIncidentMachineId = "";
const masterQrCodes = Array.isArray(window.masterData?.qrCodes) ? window.masterData.qrCodes : [];
const masterCatalog = Array.isArray(window.masterData?.catalog) ? window.masterData.catalog : [];
const fallbackQrMappings = Array.isArray(window.qrMappingData?.mappings) ? window.qrMappingData.mappings : [];
const qrMappings = masterQrCodes.length > 0 ? masterQrCodes : fallbackQrMappings;
const qrLookup = new Map(qrMappings.map((mapping) => [mapping.qrValue, mapping]));
const catalogLookup = new Map(
  (masterCatalog.length > 0
    ? masterCatalog
    : fallbackQrMappings.map((mapping) => ({
        entityCode: mapping.entityCode,
        entityName: mapping.entityName,
        entityType: mapping.entityType
      }))
  ).map((item) => [item.entityCode, item])
);
const defaultMachineJobs = window.currentMachineJobsData?.jobs || {};
let machineJobsState = { ...defaultMachineJobs };
let machineHistoryState = {};
let machineIncidentsState = [];

function normalizeArea(areaValue, fallbackArea) {
  if (areaValue === "Injection F1" || areaValue === "Injection" || areaValue === "Assembly") {
    return areaValue;
  }

  if (["ตัดแต่ง", "แพ็กกิ้ง", "Injection"].includes(areaValue)) {
    return "Injection";
  }

  if (["ประกอบ", "ตรวจสอบคุณภาพ", "จ่ายงาน", "Assembly"].includes(areaValue)) {
    return "Assembly";
  }

  return fallbackArea;
}

async function loadMachineJobs() {
  machineJobsState = await dataService.loadJobs(defaultMachineJobs);
  return machineJobsState;
}

async function loadMachineHistory() {
  machineHistoryState = await dataService.loadHistory();
  return machineHistoryState;
}

async function loadMachineIncidents() {
  machineIncidentsState = await dataService.loadIncidents();
  return machineIncidentsState;
}

async function loadPartSettings() {
  partSettingsState = await dataService.loadPartSettings();
  return partSettingsState;
}

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

function getMachineJob(machineId) {
  return machineJobsState[machineId] || null;
}

function getMachineQrValue(machine) {
  const machineJob = getMachineJob(machine.id);
  return machineJob?.directValue || machineJob?.qrValue || machine.currentQr || null;
}

function getMachinePartCode(machine) {
  const machineJob = getMachineJob(machine.id);
  return machineJob?.partCode || machineJob?.qrValue || machine.currentQr || null;
}

function getMachineArea(machine) {
  const fallbackArea = machine.area === "Assembly" ? "Assembly" : "Injection";
  return normalizeArea(getMachineJob(machine.id)?.area, fallbackArea);
}

function getMachineStatus(machine) {
  return getMachineJob(machine.id)?.status || machine.status;
}

function getMachineOperator(machine) {
  return getMachineJob(machine.id)?.scannedBy || machine.operator;
}

function getMachineIncidents(machineId) {
  return machineIncidentsState
    .filter((incident) => incident.machineId === machineId)
    .sort((left, right) => new Date(right.updatedAt || right.openedAt || 0).getTime() - new Date(left.updatedAt || left.openedAt || 0).getTime());
}

function getActiveIncident(machineId) {
  return getMachineIncidents(machineId).find((incident) => incident.active) || null;
}

function getMachineAlertHistory(machineId) {
  const incidentEntries = getMachineIncidents(machineId).filter((incident) => incident.openStatus && incident.issueDetail);
  const fallbackIncident = getFallbackIncidentFromJob(getMachine(machineId));

  if (!fallbackIncident) {
    return incidentEntries;
  }

  const exists = incidentEntries.some((incident) => incident.id === fallbackIncident.id || incident.openedAt === fallbackIncident.openedAt);

  return exists ? incidentEntries : [fallbackIncident, ...incidentEntries];
}

function getMachine(machineId) {
  return machines.find((machine) => machine.id === machineId);
}

function getCurrentPart(machine) {
  const machineJob = machine ? getMachineJob(machine.id) : null;
  const partCode = machine ? getMachinePartCode(machine) : null;

  if (machineJob?.partCode && machineJob?.partName) {
    return {
      entityCode: machineJob.partCode,
      entityName: machineJob.partName,
      entityType: machineJob.entityType || "PART"
    };
  }

  if (!partCode) {
    return null;
  }

  return qrLookup.get(partCode) || catalogLookup.get(partCode) || null;
}

function getCurrentCycleTime(machine) {
  if (!machine) {
    return null;
  }

  const currentPart = getCurrentPart(machine);
  const partCode = getMachinePartCode(machine) || currentPart?.entityCode || null;
  const partSetting = partCode ? partSettingsState[partCode] : null;
  const configuredCycleTime = Number(partSetting?.injectionTimeSeconds);

  if (Number.isFinite(configuredCycleTime) && configuredCycleTime > 0) {
    return configuredCycleTime;
  }

  return Number.isFinite(machine.cycle) && machine.cycle > 0 ? machine.cycle : null;
}

function resolveHistoryPartName(entry) {
  if (entry.partName) {
    return entry.partName;
  }

  if (entry.partCode && catalogLookup.has(entry.partCode)) {
    return catalogLookup.get(entry.partCode).entityName || "";
  }

  if (entry.qrValue && qrLookup.has(entry.qrValue)) {
    return qrLookup.get(entry.qrValue).entityName || "";
  }

  return "";
}

function getFallbackMachine() {
  return getMachine(selectedMachineId) || machines[0] || null;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatRelativeService(serviceValue) {
  if (!serviceValue) {
    return "--";
  }

  const match = serviceValue.match(/^(\d+)([hm]) ago$/);

  if (!match) {
    return serviceValue;
  }

  const [, amount, unit] = match;
  return unit === "h" ? `${amount} ชั่วโมงก่อน` : `${amount} นาทีที่แล้ว`;
}

function formatLastScan(isoString) {
  if (!isoString) {
    return "ไม่มีข้อมูล";
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

function formatDurationMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return "--";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} นาที`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
}

function getIncidentDurationMinutes(incident) {
  const openedAt = new Date(incident.openedAt || incident.updatedAt || 0).getTime();
  const closedAt = new Date(incident.closedAt || Date.now()).getTime();

  if (Number.isNaN(openedAt) || Number.isNaN(closedAt) || closedAt < openedAt) {
    return null;
  }

  return Math.max(0, Math.round((closedAt - openedAt) / 60000));
}

function getIncidentDurationLabel(incident) {
  const totalMinutes = getIncidentDurationMinutes(incident);
  return formatDurationMinutes(totalMinutes);
}

function getCurrentMonthRange(dateValue = new Date()) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return {
    monthStart,
    nextMonthStart
  };
}

function getIncidentDurationMinutesInMonth(incident, referenceDate = new Date()) {
  const { monthStart, nextMonthStart } = getCurrentMonthRange(referenceDate);
  const openedAt = new Date(incident.openedAt || incident.updatedAt || 0);
  const closedAt = new Date(incident.closedAt || Date.now());

  if (Number.isNaN(openedAt.getTime()) || Number.isNaN(closedAt.getTime()) || closedAt < openedAt) {
    return 0;
  }

  const effectiveStart = openedAt > monthStart ? openedAt : monthStart;
  const effectiveEnd = closedAt < nextMonthStart ? closedAt : nextMonthStart;

  if (effectiveEnd <= effectiveStart) {
    return 0;
  }

  return Math.max(0, Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000));
}

function getMonthlyDowntimeMinutes(referenceDate = new Date()) {
  return getAllIncidentEntries().reduce((sum, incident) => {
    if (incident.openStatus !== "down") {
      return sum;
    }

    return sum + getIncidentDurationMinutesInMonth(incident, referenceDate);
  }, 0);
}

function getFallbackIncidentFromJob(machine) {
  const job = getMachineJob(machine.id);
  const status = getMachineStatus(machine);
  const level = getAlertLevelFromStatus(status);

  if (!job || !level || !job.detail) {
    return null;
  }

  if (getActiveIncident(machine.id)) {
    return null;
  }

  return {
    id: `${machine.id}-job-fallback`,
    machineId: machine.id,
    area: getMachineArea(machine),
    directValue: job.directValue || "",
    partCode: job.partCode || "",
    partName: job.partName || "",
    entityType: job.entityType || "PART",
    qrValue: job.qrValue || "",
    openStatus: status,
    closeStatus: "",
    issueDetail: job.detail || "",
    resolutionDetail: "",
    openedAt: job.updatedAt || "",
    closedAt: "",
    openedBy: job.scannedBy || "",
    closedBy: "",
    active: status !== "running",
    createdAt: job.updatedAt || "",
    updatedAt: job.updatedAt || ""
  };
}

function getAlertTimestampLabel(alert) {
  if (alert.occurredAt) {
    return formatLastScan(alert.occurredAt);
  }

  if (typeof alert.minutesAgo === "number") {
    if (alert.minutesAgo < 60) {
      return `${alert.minutesAgo} นาทีที่แล้ว`;
    }

    const hours = Math.floor(alert.minutesAgo / 60);
    const minutes = alert.minutesAgo % 60;
    return minutes > 0 ? `${hours} ชม. ${minutes} นาทีที่แล้ว` : `${hours} ชม.ที่แล้ว`;
  }

  return "เพิ่งแจ้งเตือน";
}

function getAlertLevelFromStatus(status) {
  if (status === "down") {
    return "critical";
  }

  if (status === "warning") {
    return "warning";
  }

  return null;
}

function getMinutesAgo(isoString) {
  if (!isoString) {
    return null;
  }

  const timestamp = new Date(isoString).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function getLiveAlerts() {
  return machines
    .map((machine) => {
      const incident = getActiveIncident(machine.id) || getFallbackIncidentFromJob(machine);
      const level = getAlertLevelFromStatus(incident?.openStatus);
      const detail = incident?.issueDetail?.trim();

      if (!incident || !level || !detail) {
        return null;
      }

      return {
        machine: machine.id,
        detail,
        level,
        minutesAgo: getMinutesAgo(incident.openedAt),
        occurredAt: incident.openedAt || null
      };
    })
    .filter(Boolean);
}

function getSortedAlerts() {
  const priority = {
    critical: 0,
    warning: 1
  };

  return getLiveAlerts().sort((left, right) => {
    const levelDiff = (priority[left.level] ?? 99) - (priority[right.level] ?? 99);

    if (levelDiff !== 0) {
      return levelDiff;
    }

    const leftMinutes = typeof left.minutesAgo === "number" ? left.minutesAgo : Number.MAX_SAFE_INTEGER;
    const rightMinutes = typeof right.minutesAgo === "number" ? right.minutesAgo : Number.MAX_SAFE_INTEGER;
    return leftMinutes - rightMinutes;
  });
}

function setSelectedMachine(machineId) {
  const machine = getMachine(machineId) || getFallbackMachine();

  if (!machine) {
    inspectorTitle.textContent = "ไม่พบเครื่อง";
    inspectorStatus.textContent = "ไม่มีข้อมูล";
    inspectorStatus.className = "badge neutral";
    inspectorSummary.textContent = "ขณะนี้ไม่มีข้อมูลเครื่องจักร";
    inspectorArea.textContent = "--";
    inspectorOperator.textContent = "--";
    inspectorCycle.textContent = "--";
    inspectorPartCode.textContent = "--";
    inspectorPartName.textContent = "--";
    inspectorService.textContent = "--";
    focusStrip.innerHTML = "";
    renderStatusHistory();
    return;
  }

  const currentPart = getCurrentPart(machine);
  const machineJob = getMachineJob(machine.id);
  const currentQr = getMachineQrValue(machine);
  const currentPartCode = getMachinePartCode(machine);
  const machineStatus = getMachineStatus(machine);

  selectedMachineId = machine.id;

  inspectorTitle.textContent = machine.id;
  inspectorStatus.textContent = statusLabel[machineStatus];
  inspectorStatus.className = `badge status-${machineStatus}`;
  inspectorSummary.textContent = machineJob?.detail || "ยังไม่มี Detail จากหน้า Scan QR";
  inspectorArea.textContent = getMachineArea(machine);
  inspectorOperator.textContent = getMachineOperator(machine);
  inspectorCycle.textContent = `${machine.cycle} วินาที`;
  inspectorPartCode.textContent = currentPartCode || currentPart?.entityCode || "ไม่ทราบ";
  inspectorPartName.textContent = currentPart?.entityName || "ไม่พบข้อมูลใน QR Mapping";
  inspectorService.textContent = machineJob?.updatedAt ? formatLastScan(machineJob.updatedAt) : formatRelativeService(machine.service);

  document.querySelectorAll(".machine-node").forEach((node) => {
    node.classList.toggle("active", node.dataset.machineId === machine.id);
  });

  renderFocusStrip();
  renderSelectedMachineAlertHistory(machine.id);
  renderStatusHistory();
}

function renderSummary() {
  const now = new Date();
  const running = machines.filter((machine) => getMachineStatus(machine) === "running").length;
  const warning = machines.filter((machine) => getMachineStatus(machine) === "warning").length;
  const down = machines.filter((machine) => getMachineStatus(machine) === "down").length;
  const cycleMachines = machines.filter((machine) => machine.cycle > 0);
  const activeMachines = machines.filter((machine) => getMachineStatus(machine) !== "down");
  const liveAlerts = getLiveAlerts();
  const monthlyDowntimeMinutes = getMonthlyDowntimeMinutes(now);
  const avgCycle = Math.round(cycleMachines.reduce((sum, machine) => sum + machine.cycle, 0) / cycleMachines.length);
  const avgOee = activeMachines.length
    ? activeMachines.reduce((sum, machine) => sum + machine.oee, 0) / activeMachines.length
    : 0;
  const totalIncidentCount = getAllIncidentEntries().length;
  const criticalCount = liveAlerts.filter((alert) => alert.level === "critical").length;

  lineEfficiency.textContent = `${avgOee.toFixed(1)}%`;
  criticalAlerts.textContent = String(criticalCount).padStart(2, "0");
  unitsCompleted.textContent = formatCompactNumber(totalIncidentCount).toLowerCase();
  onlineCount.textContent = `${running} / ${machines.length}`;
  onlineSubtext.textContent = `${warning + down} เครื่องต้องติดตาม`;
  averageCycle.textContent = `${avgCycle} วินาที`;
  cycleDelta.textContent = "-4 วินาที เทียบกับกะก่อนหน้า";
  downtimeValue.textContent = formatDurationMinutes(monthlyDowntimeMinutes);
  downtimeCause.textContent = `${now.toLocaleDateString("th-TH", { month: "long", year: "numeric" })} | เหตุวิกฤตค้างอยู่ ${criticalCount} เคส`;
}

function renderTicker() {
  const items = [
    { title: "ผลผลิตในกะ", detail: "ผลิตได้ 11,234 ชิ้นในช่วง 8 ชั่วโมงล่าสุด" },
    { title: "คิวซ่อมบำรุง", detail: "มีช่าง 1 คนที่ MC 07 และมี 2 รายการรอตรวจสอบ" },
    { title: "การใช้พลังงาน", detail: "เครื่องที่เดินงานใช้พลังงาน 84 เปอร์เซ็นต์ของค่ามาตรฐาน" }
  ];

  items.forEach((item) => {
    const tickerItem = document.createElement("article");
    tickerItem.className = "ticker-item";
    tickerItem.innerHTML = `
      <strong>${item.title}</strong>
      <span>${item.detail}</span>
    `;
    tickerTrack.appendChild(tickerItem);
  });
}

function renderFocusStrip() {
  const selected = getMachine(selectedMachineId);
  const currentPart = getCurrentPart(selected);

  if (!selected) {
    focusStrip.innerHTML = "";
    return;
  }

  const cards = [
    { label: "เครื่องที่เลือก", value: selected.id },
    { label: "ชิ้นงานปัจจุบัน", value: currentPart?.entityCode || "ไม่ทราบ" },
    { label: "อุณหภูมิปัจจุบัน", value: `${selected.temp} องศาเซลเซียส` },
    { label: "OEE ปัจจุบัน", value: `${selected.oee}%` }
  ];

  focusStrip.innerHTML = "";
  cards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "focus-card";
    item.innerHTML = `
      <span>${card.label}</span>
      <strong>${card.value}</strong>
    `;
    focusStrip.appendChild(item);
  });
}

renderFocusStrip = function renderFocusStripCurrentJob() {
  const selected = getMachine(selectedMachineId);
  const currentPart = getCurrentPart(selected);
  const currentCycleTime = getCurrentCycleTime(selected);
  const machineStatus = selected ? getMachineStatus(selected) : null;

  if (!selected) {
    focusStrip.innerHTML = "";
    return;
  }

  const cards = [
    { label: "เครื่องที่เลือก", value: selected.id },
    { label: "ชิ้นงานปัจจุบัน", value: currentPart?.entityCode || "ไม่ทราบ" },
    { label: "Cycle Time", value: currentCycleTime ? `${currentCycleTime} วินาที` : "--" },
    { label: "สถานะ", value: statusLabel[machineStatus] || "--" }
  ];

  focusStrip.innerHTML = "";
  cards.forEach((card) => {
    const item = document.createElement("article");
    item.className = "focus-card";
    item.innerHTML = `
      <span>${card.label}</span>
      <strong>${card.value}</strong>
    `;
    focusStrip.appendChild(item);
  });
};

function getMachineHistory(machineId) {
  const savedHistory = Array.isArray(machineHistoryState[machineId]) ? machineHistoryState[machineId] : [];
  const currentJob = getMachineJob(machineId);
  const hasCurrentInHistory = savedHistory.some((entry) => entry.updatedAt === currentJob?.updatedAt);

  if (!currentJob || hasCurrentInHistory) {
    return savedHistory;
  }

  return [
    {
      ...currentJob,
      machineId,
      id: `${machineId}-current`
    },
    ...savedHistory
  ];
}

function isHistoryEntryInDateRange(entry) {
  if (!entry.updatedAt) {
    return true;
  }

  const timestamp = new Date(entry.updatedAt).getTime();

  if (Number.isNaN(timestamp)) {
    return true;
  }

  if (historyFromDate?.value) {
    const fromTimestamp = new Date(`${historyFromDate.value}T00:00:00`).getTime();

    if (!Number.isNaN(fromTimestamp) && timestamp < fromTimestamp) {
      return false;
    }
  }

  if (historyToDate?.value) {
    const toTimestamp = new Date(`${historyToDate.value}T23:59:59`).getTime();

    if (!Number.isNaN(toTimestamp) && timestamp > toTimestamp) {
      return false;
    }
  }

  return true;
}

function getFilteredMachineHistory(machineId) {
  return getMachineHistory(machineId).filter(isHistoryEntryInDateRange);
}

function getAllFilteredHistory() {
  const allEntries = [
    ...machineIncidentsState,
    ...machines.map((machine) => getFallbackIncidentFromJob(machine)).filter(Boolean)
  ].map((entry) => ({
    ...entry,
    machineId: entry.machineId || ""
  }));
  const uniqueEntries = [];
  const seenKeys = new Set();

  allEntries.forEach((entry) => {
    const key = entry.id || `${entry.machineId}-${entry.openedAt || entry.updatedAt}-${entry.qrValue || entry.directValue || ""}-${entry.openStatus || ""}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    uniqueEntries.push(entry);
  });

  return uniqueEntries
    .filter((entry) => isHistoryEntryInDateRange({ updatedAt: entry.openedAt || entry.updatedAt }))
    .sort((left, right) => new Date(right.updatedAt || right.openedAt || 0).getTime() - new Date(left.updatedAt || left.openedAt || 0).getTime());
}

function getAllIncidentEntries() {
  const allEntries = [
    ...machineIncidentsState,
    ...machines.map((machine) => getFallbackIncidentFromJob(machine)).filter(Boolean)
  ];
  const uniqueEntries = [];
  const seenKeys = new Set();

  allEntries.forEach((entry) => {
    const key = entry.id || `${entry.machineId}-${entry.openedAt || entry.updatedAt}-${entry.qrValue || entry.directValue || ""}-${entry.openStatus || ""}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    uniqueEntries.push(entry);
  });

  return uniqueEntries;
}

function renderStatusHistory() {
  if (!statusHistoryList || !historyCountBadge) {
    return;
  }

  const history = getAllFilteredHistory().slice(0, 100);
  historyCountBadge.textContent = `${history.length} รายการ`;

  if (history.length === 0) {
    statusHistoryList.innerHTML = `<p class="history-empty">ยังไม่มีประวัติแจ้งสถานะเครื่อง</p>`;
    return;
  }

  statusHistoryList.innerHTML = "";
  history.forEach((entry) => {
    const item = document.createElement("article");
    const entryStatus = entry.openStatus || entry.status || "running";
    const partName = resolveHistoryPartName(entry);
    const openedLabel = formatLastScan(entry.openedAt || entry.updatedAt);
    const closedLabel = entry.closedAt ? formatLastScan(entry.closedAt) : "กำลังดำเนินการ";
    const durationLabel = getIncidentDurationLabel(entry);
    const ownerLabel = entry.active ? (entry.openedBy || entry.scannedBy || "--") : `${entry.openedBy || entry.scannedBy || "--"} / ${entry.closedBy || "--"}`;
    item.className = `history-card history-${entryStatus}`;
    item.innerHTML = `
      <div class="history-marker"></div>
      <div class="history-body">
        <div class="history-topline">
          <strong>${entry.machineId || "--"} - ${statusLabel[entryStatus] || entryStatus}</strong>
          <span>${entry.active ? "เปิดเหตุอยู่" : "ปิดเหตุแล้ว"}</span>
        </div>
        <p>${entry.issueDetail || entry.detail || "ไม่มี Detail"}</p>
        ${entry.resolutionDetail ? `<p class="history-resolution">การแก้ไข: ${entry.resolutionDetail}</p>` : ""}
        <div class="history-timeline">
          <span>เริ่ม ${openedLabel}</span>
          <span>จบ ${closedLabel}</span>
          <span>ใช้เวลา ${durationLabel}</span>
        </div>
        <div class="history-meta">
          <span>${ownerLabel}</span>
          <span>${entry.partCode || entry.qrValue || "--"}</span>
          <span class="history-part-name">${partName || "ไม่พบชื่อชิ้นงาน"}</span>
          <span>${entry.area || "--"}</span>
        </div>
      </div>
    `;
    statusHistoryList.appendChild(item);
  });
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportSelectedMachineHistory() {
  const history = getAllFilteredHistory();

  if (history.length === 0) {
    return;
  }

  const headers = ["เครื่อง", "สถานะเปิดเหตุ", "เวลาเริ่มเหตุ", "เวลาปิดเหตุ", "ระยะเวลา", "ผู้เปิด / ผู้ปิด", "พื้นที่", "รหัสชิ้นงาน", "ชื่อชิ้นงาน", "QR", "อาการที่พบ", "การแก้ไข", "สถานะเหตุ"];
  const rows = history.map((entry) => [
    entry.machineId || "",
    statusLabel[entry.openStatus] || entry.openStatus || statusLabel[entry.status] || entry.status || "",
    entry.openedAt || entry.updatedAt || "",
    entry.closedAt || "",
    getIncidentDurationLabel(entry),
    entry.active ? (entry.openedBy || entry.scannedBy || "") : `${entry.openedBy || entry.scannedBy || ""} / ${entry.closedBy || ""}`,
    entry.area || "",
    entry.partCode || "",
    resolveHistoryPartName(entry),
    entry.qrValue || entry.directValue || "",
    entry.issueDetail || entry.detail || "",
    entry.resolutionDetail || "",
    entry.active ? "เปิดเหตุอยู่" : "ปิดเหตุแล้ว"
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `all-machine-status-history.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

exportSelectedMachineHistory = function exportSelectedMachineHistoryFormatted() {
  const history = getAllFilteredHistory();

  if (history.length === 0) {
    return;
  }

  const headers = ["เครื่อง", "สถานะเปิดเหตุ", "เวลาเริ่มเหตุ", "เวลาปิดเหตุ", "ระยะเวลา (นาที)", "ผู้เปิด / ผู้ปิด", "พื้นที่", "รหัสชิ้นงาน", "ชื่อชิ้นงาน", "QR", "อาการที่พบ", "การแก้ไข", "สถานะเหตุ"];
  const rows = history.map((entry) => [
    entry.machineId || "",
    statusLabel[entry.openStatus] || entry.openStatus || statusLabel[entry.status] || entry.status || "",
    formatLastScan(entry.openedAt || entry.updatedAt),
    entry.closedAt ? formatLastScan(entry.closedAt) : "",
    getIncidentDurationMinutes(entry) ?? "",
    entry.active ? (entry.openedBy || entry.scannedBy || "") : `${entry.openedBy || entry.scannedBy || ""} / ${entry.closedBy || ""}`,
    entry.area || "",
    entry.partCode || "",
    resolveHistoryPartName(entry),
    entry.qrValue || entry.directValue || "",
    entry.issueDetail || entry.detail || "",
    entry.resolutionDetail || "",
    entry.active ? "เปิดเหตุอยู่" : "ปิดเหตุแล้ว"
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "all-machine-status-history.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function renderMachines() {
  plantMap.innerHTML = "";

  machines.forEach((machine) => {
    const machineStatus = getMachineStatus(machine);
    const node = document.createElement("button");
    node.type = "button";
    node.className = `machine-node status-${machineStatus}`;
    node.dataset.machineId = machine.id;
    node.style.left = `${machine.x}%`;
    node.style.top = `${machine.y}%`;
    node.innerHTML = `
      <h3>${machine.id}</h3>
      <p>${getMachineArea(machine)}</p>
      <small>${statusLabel[machineStatus]}</small>
    `;
    node.addEventListener("click", () => {
      setSelectedMachine(machine.id);
    });
    plantMap.appendChild(node);
  });
}

function closeCloseCasePopup() {
  if (!closeCasePopup) {
    return;
  }

  closeCasePopup.hidden = true;
  closingIncidentMachineId = "";
}

function openCloseCasePage(machineId) {
  const query = machineId ? `?machine=${encodeURIComponent(machineId)}` : "";
  window.location.href = `./close-case.html${query}`;
}

function openCloseCasePopup(machineId) {
  const machine = getMachine(machineId);
  const activeIncident = getActiveIncident(machineId);

  if (!closeCasePopup || !machine || !activeIncident) {
    return;
  }

  closingIncidentMachineId = machineId;
  closeCasePopup.hidden = false;

  if (closeCasePopupSummary) {
    closeCasePopupSummary.textContent = `${machineId} แจ้งเหตุเมื่อ ${formatLastScan(activeIncident.openedAt || activeIncident.updatedAt)}${activeIncident.issueDetail ? ` | ${activeIncident.issueDetail}` : ""}`;
  }

  if (closeCaseTimeInput) {
    closeCaseTimeInput.value = toDateTimeLocalValue();
  }

  if (closeCaseByInput) {
    closeCaseByInput.value = getMachineJob(machineId)?.scannedBy || getMachineOperator(machine) || "Monitor";
  }

  if (closeCaseDetailInput) {
    closeCaseDetailInput.value = "";
  }

  window.setTimeout(() => {
    closeCaseDetailInput?.focus();
  }, 0);
}

async function quickCloseIncidentFromMonitor(machineId) {
  const machine = getMachine(machineId);
  const activeIncident = getActiveIncident(machineId);

  if (!machine || !activeIncident) {
    return;
  }

  const closedAtIso = getDateTimeLocalIso(closeCaseTimeInput?.value);
  const closedBy = (closeCaseByInput?.value || "").trim() || getMachineJob(machineId)?.scannedBy || getMachineOperator(machine) || "Monitor";
  const resolutionDetail = (closeCaseDetailInput?.value || "").trim() || activeIncident.issueDetail || "ปิดเคสจาก Monitor";
  const currentJob = getMachineJob(machineId) || defaultMachineJobs[machineId] || {};
  const nextJob = {
    ...currentJob,
    area: currentJob.area || getMachineArea(machine),
    directValue: currentJob.directValue || currentJob.qrValue || getMachineQrValue(machine) || "",
    partCode: currentJob.partCode || getMachinePartCode(machine) || "",
    partName: currentJob.partName || getCurrentPart(machine)?.entityName || "",
    entityType: currentJob.entityType || getCurrentPart(machine)?.entityType || "PART",
    qrValue: currentJob.qrValue || currentJob.directValue || getMachineQrValue(machine) || "",
    status: "running",
    detail: resolutionDetail,
    updatedAt: closedAtIso,
    scannedBy: closedBy
  };

  machineJobsState = await dataService.saveJob(machineId, nextJob, defaultMachineJobs);
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

  const incidentIndex = machineIncidentsState.findIndex((incident) => incident.id === savedIncident.id);
  if (incidentIndex >= 0) {
    machineIncidentsState[incidentIndex] = savedIncident;
  } else {
    machineIncidentsState.unshift(savedIncident);
  }

  closeCloseCasePopup();
  renderMachines();
  renderAlerts();
  renderSummary();
  setSelectedMachine(machineId);
  setTimestamp();
}

function renderSelectedMachineAlertHistory(machineId) {
  if (!machineList) {
    return;
  }

  const machine = getMachine(machineId) || getFallbackMachine();

  if (!machine) {
    machineList.innerHTML = `<p class="machine-list-empty">ยังไม่มีข้อมูลเครื่องที่เลือก</p>`;
    return;
  }

  const incidents = getMachineAlertHistory(machine.id);

  if (incidents.length === 0) {
    machineList.innerHTML = `<p class="machine-list-empty">${machine.id} ยังไม่มีประวัติการแจ้งเตือน</p>`;
    return;
  }

  machineList.innerHTML = "";
  incidents.forEach((incident) => {
    const status = incident.openStatus || "warning";
    const article = document.createElement("article");
    const durationLabel = getIncidentDurationLabel(incident);
    const closedLabel = incident.closedAt ? formatLastScan(incident.closedAt) : "กำลังดำเนินการ";
    article.className = "machine-card machine-alert-card";
    article.innerHTML = `
      <header>
        <div>
          <h3>${machine.id}</h3>
          <div class="machine-meta">${getMachineArea(machine)} ไลน์</div>
        </div>
        <span class="badge status-${status}">${incident.active ? "เปิดเหตุอยู่" : "ปิดเหตุแล้ว"}</span>
      </header>
      <div class="machine-values">
        <span>สถานะที่แจ้ง</span>
        <strong>${statusLabel[status] || status}</strong>
      </div>
      <div class="machine-values">
        <span>เริ่มแจ้ง</span>
        <strong>${formatLastScan(incident.openedAt || incident.updatedAt)}</strong>
      </div>
      <div class="machine-values">
        <span>ปิดเหตุ</span>
        <strong>${closedLabel}</strong>
      </div>
      <div class="machine-values">
        <span>ใช้เวลา</span>
        <strong>${durationLabel}</strong>
      </div>
      <div class="machine-values">
        <span>อาการที่แจ้ง</span>
        <strong>${incident.issueDetail || "-"}</strong>
      </div>
      <div class="machine-values">
        <span>การแก้ไข</span>
        <strong>${incident.resolutionDetail || "-"}</strong>
      </div>
      <div class="machine-values">
        <span>ผู้แจ้ง / ผู้ปิด</span>
        <strong>${incident.active ? (incident.openedBy || "--") : `${incident.openedBy || "--"} / ${incident.closedBy || "--"}`}</strong>
      </div>
    `;

    if (incident.active) {
      const actionWrap = document.createElement("div");
      actionWrap.className = "machine-card-actions";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "alert-close-button";
      closeButton.textContent = "ปิดเคสนี้";
      closeButton.addEventListener("click", () => {
        openCloseCasePage(machine.id);
      });
      actionWrap.appendChild(closeButton);
      article.appendChild(actionWrap);
    }

    machineList.appendChild(article);
  });
}

function renderAlerts() {
  const sortedAlerts = getSortedAlerts();
  const criticalCount = sortedAlerts.filter((alert) => alert.level === "critical").length;
  const warningCount = sortedAlerts.filter((alert) => alert.level === "warning").length;

  alertList.innerHTML = "";

  if (alertSummaryBadge) {
    if (criticalCount > 0) {
      alertSummaryBadge.className = "badge warning";
      alertSummaryBadge.textContent = `วิกฤต ${criticalCount} | เตือน ${warningCount}`;
    } else if (warningCount > 0) {
      alertSummaryBadge.className = "badge warning";
      alertSummaryBadge.textContent = `เตือน ${warningCount}`;
    } else {
      alertSummaryBadge.textContent = "ไม่มีแจ้งเตือน";
      alertSummaryBadge.className = "badge neutral";
    }
  }

  sortedAlerts.forEach((alert) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `alert-card alert-${alert.level}`;
    item.setAttribute("aria-label", `ดูรายละเอียด ${alert.machine}`);
    item.addEventListener("click", () => {
      setSelectedMachine(alert.machine);
    });

    const severityBadgeClass = alert.level === "critical" ? "status-down" : "status-warning";
    item.innerHTML = `
      <div class="alert-header">
        <div class="alert-copy">
          <strong>${alert.machine}</strong>
          <span class="badge ${severityBadgeClass}">${alertLevelLabel[alert.level] || alert.level}</span>
        </div>
        <span class="alert-time">${getAlertTimestampLabel(alert)}</span>
      </div>
      <p class="alert-detail">${alert.detail}</p>
    `;
    alertList.appendChild(item);
  });
}

function renderAlerts() {
  const sortedAlerts = getSortedAlerts();
  const criticalCount = sortedAlerts.filter((alert) => alert.level === "critical").length;
  const warningCount = sortedAlerts.filter((alert) => alert.level === "warning").length;

  alertList.innerHTML = "";

  if (alertSummaryBadge) {
    if (criticalCount > 0) {
      alertSummaryBadge.className = "badge warning";
      alertSummaryBadge.textContent = `วิกฤต ${criticalCount} | เตือน ${warningCount}`;
    } else if (warningCount > 0) {
      alertSummaryBadge.className = "badge warning";
      alertSummaryBadge.textContent = `เตือน ${warningCount}`;
    } else {
      alertSummaryBadge.textContent = "ไม่มีแจ้งเตือน";
      alertSummaryBadge.className = "badge neutral";
    }
  }

  sortedAlerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = `alert-card alert-${alert.level}`;

    const severityBadgeClass = alert.level === "critical" ? "status-down" : "status-warning";
    item.innerHTML = `
      <div class="alert-card-inner">
        <button type="button" class="alert-header" aria-label="ดูรายละเอียด ${alert.machine}">
          <div class="alert-copy">
            <strong>${alert.machine}</strong>
            <span class="badge ${severityBadgeClass}">${alertLevelLabel[alert.level] || alert.level}</span>
          </div>
          <span class="alert-time">${getAlertTimestampLabel(alert)}</span>
        </button>
        <p class="alert-detail">${alert.detail}</p>
        <div class="alert-card-actions">
          <button type="button" class="alert-close-button">ปิดเคส</button>
        </div>
      </div>
    `;

    item.querySelector(".alert-header")?.addEventListener("click", () => {
      setSelectedMachine(alert.machine);
    });
    item.querySelector(".alert-close-button")?.addEventListener("click", () => {
      openCloseCasePage(alert.machine);
    });
    alertList.appendChild(item);
  });
}

function setTimestamp() {
  const now = new Date();
  lastUpdated.textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function refreshDashboard() {
  if (isRefreshingDashboard) {
    return;
  }

  isRefreshingDashboard = true;

  try {
    const [jobs, history, incidents, partSettings] = await Promise.all([
      loadMachineJobs(),
      loadMachineHistory(),
      loadMachineIncidents(),
      loadPartSettings()
    ]);

    machineJobsState = jobs;
    machineHistoryState = history;
    machineIncidentsState = incidents;
    partSettingsState = partSettings;

    renderMachines();
    renderAlerts();
    renderSummary();
    setSelectedMachine(selectedMachineId);
    setTimestamp();
  } finally {
    isRefreshingDashboard = false;
  }
}

async function initializeDashboard() {
  renderTicker();
  dataService.flushPendingSyncQueue?.();
  await refreshDashboard();

  [historyFromDate, historyToDate].forEach((input) => {
    input?.addEventListener("change", () => {
      renderStatusHistory();
    });
  });

  clearHistoryFilterButton?.addEventListener("click", () => {
    historyFromDate.value = "";
    historyToDate.value = "";
    renderStatusHistory();
  });

  exportHistoryButton?.addEventListener("click", exportSelectedMachineHistory);

  cancelCloseCaseButton?.addEventListener("click", () => {
    closeCloseCasePopup();
  });

  confirmCloseCaseButton?.addEventListener("click", async () => {
    if (!closingIncidentMachineId) {
      closeCloseCasePopup();
      return;
    }

    await quickCloseIncidentFromMonitor(closingIncidentMachineId);
  });

  closeCasePopup?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.classList.contains("success-popup-backdrop")) {
      closeCloseCasePopup();
    }
  });

  refreshTimerId = window.setInterval(() => {
    refreshDashboard();
  }, 5000);
}

initializeDashboard();
