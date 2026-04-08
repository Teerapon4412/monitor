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

const alerts = [
  { machine: "MC 07", detail: "แรงดันไฮดรอลิกหาย ต้องให้ช่างเข้าตรวจสอบ", level: "critical" },
  { machine: "MC 13", detail: "อุณหภูมิสปินเดิลสูงต่อเนื่องมา 7 นาที", level: "warning" },
  { machine: "MC 19", detail: "อัตราการสแกนตรวจซ้ำเกินค่าที่กำหนด", level: "warning" }
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

function normalizeArea(areaValue, fallbackArea) {
  if (areaValue === "Injection" || areaValue === "Assembly") {
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

function loadMachineJobs() {
  const savedValue = window.localStorage.getItem(MACHINE_JOBS_STORAGE_KEY);

  if (!savedValue) {
    return defaultMachineJobs;
  }

  try {
    return { ...defaultMachineJobs, ...JSON.parse(savedValue) };
  } catch (error) {
    return defaultMachineJobs;
  }
}

function getMachineJob(machineId) {
  return loadMachineJobs()[machineId] || null;
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
    return;
  }

  const currentPart = getCurrentPart(machine);
  const machineJob = getMachineJob(machine.id);
  const currentQr = getMachineQrValue(machine);
  const currentPartCode = getMachinePartCode(machine);

  selectedMachineId = machine.id;

  inspectorTitle.textContent = machine.id;
  inspectorStatus.textContent = statusLabel[machine.status];
  inspectorStatus.className = `badge status-${machine.status}`;
  inspectorSummary.textContent = machine.note;
  inspectorArea.textContent = getMachineArea(machine);
  inspectorOperator.textContent = machine.operator;
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
}

function renderSummary() {
  const running = machines.filter((machine) => machine.status === "running").length;
  const warning = machines.filter((machine) => machine.status === "warning").length;
  const down = machines.filter((machine) => machine.status === "down").length;
  const cycleMachines = machines.filter((machine) => machine.cycle > 0);
  const activeMachines = machines.filter((machine) => machine.status !== "down");
  const avgCycle = Math.round(cycleMachines.reduce((sum, machine) => sum + machine.cycle, 0) / cycleMachines.length);
  const avgOee = activeMachines.length
    ? activeMachines.reduce((sum, machine) => sum + machine.oee, 0) / activeMachines.length
    : 0;
  const critical = alerts.find((alert) => alert.level === "critical");
  const totalOutput = machines.reduce((sum, machine) => sum + machine.output, 0);
  const criticalCount = alerts.filter((alert) => alert.level === "critical").length;

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

function renderMachines() {
  machineList.innerHTML = "";
  plantMap.innerHTML = "";

  machines.forEach((machine) => {
    const card = document.createElement("article");
    card.className = "machine-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${machine.id}</h3>
          <div class="machine-meta">${getMachineArea(machine)} ไลน์</div>
        </div>
        <span class="badge status-${machine.status}">${statusLabel[machine.status]}</span>
      </header>
      <div class="machine-values">
        <span>ชิ้นงานปัจจุบัน</span>
        <strong>${getMachinePartCode(machine) || getCurrentPart(machine)?.entityCode || "ไม่ทราบ"}</strong>
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
    node.className = `machine-node status-${machine.status}`;
    node.dataset.machineId = machine.id;
    node.style.left = `${machine.x}%`;
    node.style.top = `${machine.y}%`;
    node.innerHTML = `
      <h3>${machine.id}</h3>
      <p>${getMachineArea(machine)}</p>
      <small>${statusLabel[machine.status]}</small>
    `;
    node.addEventListener("click", () => {
      setSelectedMachine(machine.id);
    });
    plantMap.appendChild(node);
  });
}

function renderAlerts() {
  alerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = "alert-card";
    item.innerHTML = `
      <div class="alert-copy">
        <strong>${alert.machine}</strong>
        <span class="badge ${alert.level === "critical" ? "status-down" : "status-warning"}">${alertLevelLabel[alert.level] || alert.level}</span>
      </div>
      <p>${alert.detail}</p>
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

function refreshDashboard() {
  renderMachines();
  renderSummary();
  setSelectedMachine(selectedMachineId);
  setTimestamp();
}

renderAlerts();
renderTicker();
refreshDashboard();

refreshTimerId = window.setInterval(() => {
  refreshDashboard();
}, 30000);
