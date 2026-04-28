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
const inspectorOee = document.getElementById("inspectorOee");
const inspectorOutput = document.getElementById("inspectorOutput");
const inspectorPartCode = document.getElementById("inspectorPartCode");
const inspectorPartName = document.getElementById("inspectorPartName");
const inspectorQrValue = document.getElementById("inspectorQrValue");
const inspectorService = document.getElementById("inspectorService");
const statusHistoryList = document.getElementById("statusHistoryList");
const historyCountBadge = document.getElementById("historyCountBadge");
const historyFromDate = document.getElementById("historyFromDate");
const historyToDate = document.getElementById("historyToDate");
const clearHistoryFilterButton = document.getElementById("clearHistoryFilterButton");
const exportHistoryButton = document.getElementById("exportHistoryButton");
const dataService = window.monitorDataService;

let selectedMachineId = "MC 10";
let refreshTimerId;
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
      const machineJob = getMachineJob(machine.id);
      const status = getMachineStatus(machine);
      const level = getAlertLevelFromStatus(status);
      const detail = machineJob?.detail?.trim();

      if (!level || !detail) {
        return null;
      }

      return {
        machine: machine.id,
        detail,
        level,
        minutesAgo: getMinutesAgo(machineJob?.updatedAt),
        occurredAt: machineJob?.updatedAt || null
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
    inspectorOee.textContent = "--";
    inspectorOutput.textContent = "--";
    inspectorPartCode.textContent = "--";
    inspectorPartName.textContent = "--";
    inspectorQrValue.textContent = "--";
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
  inspectorOee.textContent = `${machine.oee}%`;
  inspectorOutput.textContent = `${machine.output.toLocaleString()} ชิ้น`;
  inspectorPartCode.textContent = currentPartCode || currentPart?.entityCode || "ไม่ทราบ";
  inspectorPartName.textContent = currentPart?.entityName || "ไม่พบข้อมูลใน QR Mapping";
  inspectorQrValue.textContent = currentQr || "--";
  inspectorService.textContent = machineJob?.updatedAt ? formatLastScan(machineJob.updatedAt) : formatRelativeService(machine.service);

  document.querySelectorAll(".machine-node").forEach((node) => {
    node.classList.toggle("active", node.dataset.machineId === machine.id);
  });

  renderFocusStrip();
  renderStatusHistory();
}

function renderSummary() {
  const running = machines.filter((machine) => getMachineStatus(machine) === "running").length;
  const warning = machines.filter((machine) => getMachineStatus(machine) === "warning").length;
  const down = machines.filter((machine) => getMachineStatus(machine) === "down").length;
  const cycleMachines = machines.filter((machine) => machine.cycle > 0);
  const activeMachines = machines.filter((machine) => getMachineStatus(machine) !== "down");
  const liveAlerts = getLiveAlerts();
  const avgCycle = Math.round(cycleMachines.reduce((sum, machine) => sum + machine.cycle, 0) / cycleMachines.length);
  const avgOee = activeMachines.length
    ? activeMachines.reduce((sum, machine) => sum + machine.oee, 0) / activeMachines.length
    : 0;
  const critical = liveAlerts.find((alert) => alert.level === "critical");
  const totalOutput = machines.reduce((sum, machine) => sum + machine.output, 0);
  const criticalCount = liveAlerts.filter((alert) => alert.level === "critical").length;

  lineEfficiency.textContent = `${avgOee.toFixed(1)}%`;
  criticalAlerts.textContent = String(criticalCount).padStart(2, "0");
  unitsCompleted.textContent = formatCompactNumber(totalOutput).toLowerCase();
  onlineCount.textContent = `${running} / ${machines.length}`;
  onlineSubtext.textContent = `${warning + down} เครื่องต้องติดตาม`;
  averageCycle.textContent = `${avgCycle} วินาที`;
  cycleDelta.textContent = "-4 วินาที เทียบกับกะก่อนหน้า";
  downtimeValue.textContent = `${down * 19} นาที`;
  downtimeCause.textContent = critical ? `สาเหตุหลัก: ${critical.detail}` : "ไม่มีการหยุดเครื่องระดับวิกฤต";
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
  const allEntries = machines.flatMap((machine) =>
    getMachineHistory(machine.id).map((entry) => ({
      ...entry,
      machineId: entry.machineId || machine.id
    }))
  );
  const uniqueEntries = [];
  const seenKeys = new Set();

  allEntries.forEach((entry) => {
    const key = entry.id || `${entry.machineId}-${entry.updatedAt}-${entry.qrValue || entry.directValue || ""}-${entry.status || ""}`;

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    uniqueEntries.push(entry);
  });

  return uniqueEntries
    .filter(isHistoryEntryInDateRange)
    .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime());
}

function renderStatusHistory() {
  if (!statusHistoryList || !historyCountBadge) {
    return;
  }

  const machineId = "ทุกเครื่อง";

  if (false) {
    historyCountBadge.textContent = "-- รายการ";
    statusHistoryList.innerHTML = `<p class="history-empty">เลือกเครื่องจากผังเพื่อดูประวัติอัปเดตสถานะ</p>`;
    return;
  }

  const history = getAllFilteredHistory().slice(0, 100);
  historyCountBadge.textContent = `${history.length} รายการ`;

  if (history.length === 0) {
    statusHistoryList.innerHTML = `<p class="history-empty">ยังไม่มีประวัติอัปเดตสถานะของ ${machineId}</p>`;
    return;
  }

  statusHistoryList.innerHTML = "";
  history.forEach((entry) => {
    const item = document.createElement("article");
    const entryStatus = entry.status || "running";
    const partName = resolveHistoryPartName(entry);
    item.className = `history-card history-${entryStatus}`;
    item.innerHTML = `
      <div class="history-marker"></div>
      <div class="history-body">
        <div class="history-topline">
          <strong>${entry.machineId || "--"} • ${statusLabel[entryStatus] || entryStatus}</strong>
          <span>${formatLastScan(entry.updatedAt)}</span>
        </div>
        <p>${entry.detail || "ไม่มี Detail"}</p>
        <div class="history-meta">
          <span>${entry.scannedBy || "--"}</span>
          <span>${entry.partCode || entry.qrValue || "--"}</span>
          <span>${partName || "ไม่พบชื่อชิ้นงาน"}</span>
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

  const headers = ["เครื่อง", "สถานะ", "เวลา Status", "ผู้สแกน / สถานี", "พื้นที่", "รหัสชิ้นงาน", "ชื่อชิ้นงาน", "QR", "Detail"];
  const rows = history.map((entry) => [
    entry.machineId || "",
    statusLabel[entry.status] || entry.status || "",
    entry.updatedAt || "",
    entry.scannedBy || "",
    entry.area || "",
    entry.partCode || "",
    resolveHistoryPartName(entry),
    entry.qrValue || entry.directValue || "",
    entry.detail || ""
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

function renderMachines() {
  machineList.innerHTML = "";
  plantMap.innerHTML = "";

  machines.forEach((machine) => {
    const machineStatus = getMachineStatus(machine);
    const card = document.createElement("article");
    card.className = "machine-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${machine.id}</h3>
          <div class="machine-meta">${getMachineArea(machine)} ไลน์</div>
        </div>
        <span class="badge status-${machineStatus}">${statusLabel[machineStatus]}</span>
      </header>
      <div class="machine-values">
        <span>ชิ้นงานปัจจุบัน</span>
        <strong>${getMachinePartCode(machine) || getCurrentPart(machine)?.entityCode || "ไม่ทราบ"}</strong>
      </div>
      <div class="machine-values">
        <span>Detail</span>
        <strong>${getMachineJob(machine.id)?.detail || "-"}</strong>
      </div>
      <div class="machine-values">
        <span>QR ล่าสุด</span>
        <strong>${getMachineQrValue(machine) || "--"}</strong>
      </div>
      <div class="machine-values">
        <span>ผลผลิต</span>
        <strong>${machine.output.toLocaleString()} ชิ้น</strong>
      </div>
    `;
    machineList.appendChild(card);

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

function setTimestamp() {
  const now = new Date();
  lastUpdated.textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function refreshDashboard() {
  await loadMachineJobs();
  await loadMachineHistory();
  renderMachines();
  renderAlerts();
  renderSummary();
  setSelectedMachine(selectedMachineId);
  setTimestamp();
}

async function initializeDashboard() {
  renderTicker();
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

  refreshTimerId = window.setInterval(() => {
    refreshDashboard();
  }, 5000);
}

initializeDashboard();
