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

const qrMappings = Array.isArray(window.qrMappingData?.mappings) ? window.qrMappingData.mappings : [];
const qrLookup = new Map(qrMappings.map((mapping) => [mapping.qrValue, mapping]));
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

function getPartFromQr(qrValue) {
  return qrLookup.get(qrValue) || null;
}

function parseQrPayload(rawValue) {
  const directValue = rawValue.trim();
  const [partCode = ""] = directValue.split("-");

  return {
    directValue,
    partCode
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
    const part = getPartFromQr(job?.partCode || job?.qrValue);
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
        <strong>${job?.partCode || part?.entityCode || "ไม่พบใน Mapping"}</strong>
      </div>
      <div class="machine-values">
        <span>ชื่อชิ้นงาน</span>
        <strong>${part?.entityName || "-"}</strong>
      </div>
    `;
    jobList.appendChild(card);
  });
}

function showResult(title, message) {
  resultTitle.textContent = title;
  resultMessage.textContent = message;
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
  const qrPayload = parseQrPayload(qrInput.value);
  const scannedBy = scannerInput.value.trim() || "station-01";
  const part = getPartFromQr(qrPayload.partCode);

  if (!area) {
    showResult("ไม่สามารถบันทึกได้", "กรุณาระบุพื้นที่หรือกระบวนการของเครื่องก่อนบันทึก");
    areaInput.focus();
    return;
  }

  if (!part) {
    showResult("ไม่สามารถบันทึกได้", `ไม่พบ partCode ${qrPayload.partCode || "-"} ใน master mapping กรุณาตรวจสอบ Part Tag`);
    focusQrInput(true);
    return;
  }

  const jobs = loadJobs();
  jobs[machineId] = {
    area,
    directValue: qrPayload.directValue,
    partCode: qrPayload.partCode,
    qrValue: qrPayload.directValue,
    updatedAt: new Date().toISOString(),
    scannedBy
  };

  saveJobs(jobs);
  renderJobList();
  showResult(
    `บันทึก ${machineId} เรียบร้อย`,
    `${machineId} ในพื้นที่ ${area} กำลังผลิต ${part.entityCode} - ${part.entityName} จาก QR ${qrPayload.directValue}`
  );
  qrInput.value = "";
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
focusQrInput();

window.addEventListener("beforeunload", () => {
  stopCamera();
});
