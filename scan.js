const MACHINE_JOBS_STORAGE_KEY = "monitor.currentMachineJobs";

const machineSelect = document.getElementById("machineSelect");
const areaInput = document.getElementById("areaInput");
const qrInput = document.getElementById("qrInput");
const scannerInput = document.getElementById("scannerInput");
const scanForm = document.getElementById("scanForm");
const resetStorageButton = document.getElementById("resetStorageButton");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const jobList = document.getElementById("jobList");
const jobCountBadge = document.getElementById("jobCountBadge");
const startCameraButton = document.getElementById("startCameraButton");
const stopCameraButton = document.getElementById("stopCameraButton");
const cameraPreview = document.getElementById("cameraPreview");
const cameraStatus = document.getElementById("cameraStatus");
const cameraMessage = document.getElementById("cameraMessage");
const scannedDirectValue = document.getElementById("scannedDirectValue");
const scannedPartCode = document.getElementById("scannedPartCode");
const scannedPartName = document.getElementById("scannedPartName");

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
let isSubmittingScan = false;
let cameraStream;
let scanLoopId;
let barcodeDetector;
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

function cloneJobs(jobs) {
  return JSON.parse(JSON.stringify(jobs));
}

function loadJobs() {
  const savedValue = window.localStorage.getItem(MACHINE_JOBS_STORAGE_KEY);

  if (!savedValue) {
    return cloneJobs(defaultJobs);
  }

  try {
    return { ...cloneJobs(defaultJobs), ...JSON.parse(savedValue) };
  } catch (error) {
    return cloneJobs(defaultJobs);
  }
}

function saveJobs(jobs) {
  window.localStorage.setItem(MACHINE_JOBS_STORAGE_KEY, JSON.stringify(jobs));
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

function parseScannedQr(rawValue) {
  const directValue = rawValue.trim();
  const segments = directValue.split("-").filter(Boolean);
  const primarySegment = segments[0] || directValue;
  const trailingSegments = segments.slice(1);
  const referenceNo = trailingSegments.length > 0 ? trailingSegments.join("-") : null;
  const workOrderNo = trailingSegments.find((segment) => /^(wo|mo|job)\w+/i.test(segment)) || null;
  const qtySegment = trailingSegments.find((segment) => /^qty[:=]?\d+$/i.test(segment));
  const qty = qtySegment ? Number(qtySegment.replace(/[^\d]/g, "")) : null;
  const partCodeMatch = primarySegment.match(/[A-Z]{1,4}\d{6,}|\d{6,}/i);
  const partCode = partCodeMatch ? partCodeMatch[0].toUpperCase() : primarySegment.toUpperCase();

  return {
    directValue,
    referenceNo,
    partCode,
    workOrderNo,
    qty
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

function getDefaultArea(machineId) {
  return defaultJobs[machineId]?.area || defaultMachineAreas[machineId] || "";
}

function renderMachineOptions() {
  machineSelect.innerHTML = machineIds
    .map((machineId) => `<option value="${machineId}">${machineId}</option>`)
    .join("");
}

function syncAreaInput() {
  areaInput.value = getDefaultArea(machineSelect.value);
}

function renderJobList() {
  const jobs = loadJobs();
  jobCountBadge.textContent = `${machineIds.length} เครื่อง`;
  jobList.innerHTML = "";

  machineIds.forEach((machineId) => {
    const job = jobs[machineId];
    const lookup = getQrLookup(job?.directValue || job?.partCode || job?.qrValue || "");
    const card = document.createElement("article");
    card.className = "machine-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${machineId}</h3>
          <div class="machine-meta">อัปเดตล่าสุด ${formatDateTime(job?.updatedAt)}</div>
        </div>
        <span class="badge live">${job?.scannedBy || "--"}</span>
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
        <strong>${lookup.entityName || "-"}</strong>
      </div>
    `;
    jobList.appendChild(card);
  });
}

function showResult(title, message) {
  resultTitle.textContent = title;
  resultMessage.textContent = message;
}

function renderScanReadout(rawValue = "") {
  const lookup = getQrLookup(rawValue);

  scannedDirectValue.textContent = lookup.parsed.directValue || "--";
  scannedPartCode.textContent = lookup.parsed.partCode || "--";
  scannedPartName.textContent = lookup.entityName || "--";
}

function focusQrInput(selectValue = false) {
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

function setCameraState(statusText, messageText) {
  cameraStatus.textContent = statusText;
  cameraMessage.textContent = messageText;
}

function stopCamera() {
  if (scanLoopId) {
    window.cancelAnimationFrame(scanLoopId);
    scanLoopId = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  cameraPreview.srcObject = null;
  setCameraState("ปิดกล้อง", "บนมือถือกดเปิดกล้อง แล้วเล็ง Part Tag ให้ QR อยู่กลางกรอบ");
}

async function scanFrame() {
  if (!cameraStream || !barcodeDetector) {
    return;
  }

  try {
    const barcodes = await barcodeDetector.detect(cameraPreview);

    if (barcodes.length > 0) {
      const qrValue = barcodes[0].rawValue?.trim();

      if (qrValue) {
        qrInput.value = qrValue;
        renderScanReadout(qrValue);
        setCameraState("พบ QR แล้ว", `อ่านค่า ${qrValue} แล้ว กำลังบันทึกให้อัตโนมัติ`);
        stopCamera();
        submitScan();
        return;
      }
    }
  } catch (error) {
    setCameraState("สแกนไม่สำเร็จ", "กล้องเปิดอยู่ แต่ยังอ่าน QR ไม่ได้ ลองขยับระยะหรือแสง");
  }

  scanLoopId = window.requestAnimationFrame(scanFrame);
}

async function startCamera() {
  if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
    setCameraState("ไม่รองรับ", "เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องสำหรับสแกน");
    return;
  }

  if (!("BarcodeDetector" in window)) {
    setCameraState("ไม่รองรับ", "เบราว์เซอร์นี้ยังไม่รองรับการอ่าน QR อัตโนมัติ ให้พิมพ์หรือใช้เครื่องสแกนแทน");
    return;
  }

  barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });

  try {
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });
    cameraPreview.srcObject = cameraStream;
    await cameraPreview.play();
    setCameraState("เปิดกล้องแล้ว", "เล็ง QR จาก Part Tag ให้เต็มกรอบ กล้องจะอ่านและบันทึกอัตโนมัติ");
    scanLoopId = window.requestAnimationFrame(scanFrame);
  } catch (error) {
    setCameraState("เปิดกล้องไม่ได้", "กรุณาอนุญาตการใช้กล้อง หรือเปิดผ่าน HTTPS บนมือถือ");
  }
}

scanForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const machineId = machineSelect.value;
  const area = areaInput.value.trim();
  const lookup = getQrLookup(qrInput.value);
  const scannedBy = scannerInput.value.trim() || "station-01";
  renderScanReadout(lookup.qrValue);

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

  const jobs = loadJobs();
  jobs[machineId] = {
    area,
    directValue: lookup.parsed.directValue,
    partCode: lookup.entityCode || lookup.parsed.partCode,
    qrValue: lookup.qrValue,
    updatedAt: new Date().toISOString(),
    scannedBy
  };

  saveJobs(jobs);
  renderJobList();
  showResult(
    `บันทึก ${machineId} เรียบร้อย`,
    `${machineId} ในพื้นที่ ${area} กำลังผลิต ${lookup.entityCode} - ${lookup.entityName} จาก QR ${lookup.qrValue}`
  );
  qrInput.value = "";
  renderScanReadout("");
  focusQrInput();
});

qrInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();

  if (!qrInput.value.trim()) {
    return;
  }

  submitScan();
});

qrInput.addEventListener("input", () => {
  renderScanReadout(qrInput.value);
});

resetStorageButton.addEventListener("click", () => {
  window.localStorage.removeItem(MACHINE_JOBS_STORAGE_KEY);
  renderJobList();
  showResult("รีเซ็ตข้อมูลแล้ว", "สถานะเครื่องจักรถูกคืนกลับเป็นค่าเริ่มต้นจากไฟล์ตั้งต้น");
  focusQrInput();
});

startCameraButton.addEventListener("click", async () => {
  await startCamera();
});

stopCameraButton.addEventListener("click", () => {
  stopCamera();
  focusQrInput();
});

machineSelect.addEventListener("change", () => {
  syncAreaInput();
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

renderMachineOptions();
syncAreaInput();
renderJobList();
renderScanReadout("");
focusQrInput();

window.addEventListener("beforeunload", () => {
  stopCamera();
});
