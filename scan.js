const MACHINE_JOBS_STORAGE_KEY = "monitor.currentMachineJobs";

const machineSelect = document.getElementById("machineSelect");
const areaInput = document.getElementById("areaInput");
const qrInput = document.getElementById("qrInput");
const scannerInput = document.getElementById("scannerInput");
const statusInput = document.getElementById("statusInput");
const detailInput = document.getElementById("detailInput");
const startVoiceButton = document.getElementById("startVoiceButton");
const stopVoiceButton = document.getElementById("stopVoiceButton");
const voiceStatus = document.getElementById("voiceStatus");
const scanForm = document.getElementById("scanForm");
const resetStorageButton = document.getElementById("resetStorageButton");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const jobList = document.getElementById("jobList");
const jobCountBadge = document.getElementById("jobCountBadge");
const startCameraButton = document.getElementById("startCameraButton");
const stopCameraButton = document.getElementById("stopCameraButton");
const photoInput = document.getElementById("photoInput");
const cameraPreview = document.getElementById("cameraPreview");
const cameraStatus = document.getElementById("cameraStatus");
const cameraMessage = document.getElementById("cameraMessage");
const partSelection = document.getElementById("partSelection");
const partSelectionHint = document.getElementById("partSelectionHint");
const scannedDirectValue = document.getElementById("scannedDirectValue");
const scannedPartCode = document.getElementById("scannedPartCode");
const scannedPartName = document.getElementById("scannedPartName");
const dataService = window.monitorDataService;

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
let barcodeDetector;
let currentPartCandidates = [];
let jobsState = cloneJobs(defaultJobs);
let previewObjectUrl = "";
let voiceRecorder;
let voiceStream;
let voiceChunks = [];
let voiceMimeType = "";
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
  "MC 13": "warning",
  "MC 15": "running",
  "MC 11": "running",
  "MC 07": "down",
  "MC 16": "running",
  "MC 19": "warning",
  "MC 18": "running"
};

function cloneJobs(jobs) {
  return JSON.parse(JSON.stringify(jobs));
}

async function loadJobs() {
  jobsState = await dataService.loadJobs(defaultJobs);
  return jobsState;
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

function parseScannedQr(rawValue) {
  const directValue = rawValue.trim();
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
  return defaultJobs[machineId]?.area || defaultMachineAreas[machineId] || "";
}

function getDefaultStatus(machineId) {
  return defaultJobs[machineId]?.status || defaultMachineStatuses[machineId] || "running";
}

function getDefaultDetail(machineId) {
  return jobsState[machineId]?.detail || defaultJobs[machineId]?.detail || "";
}

function renderMachineOptions() {
  machineSelect.innerHTML = machineIds
    .map((machineId) => `<option value="${machineId}">${machineId}</option>`)
    .join("");
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
  areaInput.value = getDefaultArea(machineSelect.value);
}

function syncStatusInput() {
  statusInput.value = jobsState[machineSelect.value]?.status || getDefaultStatus(machineSelect.value);
}

function syncDetailInput() {
  detailInput.value = getDefaultDetail(machineSelect.value);
}

function renderJobList() {
  jobCountBadge.textContent = `${machineIds.length} เครื่อง`;
  jobList.innerHTML = "";

  machineIds.forEach((machineId) => {
    const job = jobsState[machineId];
    const lookup = getQrLookup(job?.directValue || job?.partCode || job?.qrValue || "");
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
    `;
    jobList.appendChild(card);
  });
}

function showResult(title, message) {
  resultTitle.textContent = title;
  resultMessage.textContent = message;
}

function renderScanReadout(rawValue = "", selectedPart = null) {
  const lookup = getQrLookup(rawValue);

  scannedDirectValue.textContent = lookup.parsed.directValue || "--";
  scannedPartCode.textContent = lookup.parsed.partCode || "--";
  scannedPartName.textContent = selectedPart?.entityName || lookup.entityName || "--";
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

function setCameraState(statusText, messageText) {
  cameraStatus.textContent = statusText;
  cameraMessage.textContent = messageText;
}

function setVoiceStatus(message) {
  voiceStatus.textContent = message;
}

function getSupabaseFunctionUrl(functionName) {
  const baseUrl = window.monitorConfig?.supabase?.url?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    return "";
  }

  return `${baseUrl}/functions/v1/${functionName}`;
}

function getSupabaseFunctionHeaders() {
  const anonKey = window.monitorConfig?.supabase?.anonKey?.trim();

  if (!anonKey) {
    return {};
  }

  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`
  };
}

function stopVoiceInput() {
  if (voiceRecorder && voiceRecorder.state !== "inactive") {
    voiceRecorder.stop();
  }

  if (voiceStream) {
    voiceStream.getTracks().forEach((track) => track.stop());
    voiceStream = null;
  }
}

async function transcribeVoiceDetail(audioBlob) {
  const functionUrl = getSupabaseFunctionUrl("transcribe-detail");

  if (!functionUrl) {
    setVoiceStatus("ยังไม่ได้ตั้งค่า Supabase สำหรับถอดเสียง กรุณาตั้งค่า backend ก่อน");
    return;
  }

  const extensionMap = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg"
  };
  const extension = extensionMap[voiceMimeType] || "webm";
  const formData = new FormData();
  formData.append("file", new File([audioBlob], `detail-note.${extension}`, { type: voiceMimeType || audioBlob.type || "audio/webm" }));

  setVoiceStatus("กำลังส่งเสียงไปถอดข้อความ...");

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: getSupabaseFunctionHeaders(),
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Transcription request failed: ${response.status}`);
  }

  const payload = await response.json();
  const transcript = typeof payload?.text === "string" ? payload.text.trim() : "";

  if (!transcript) {
    throw new Error("Transcription returned empty text");
  }

  detailInput.value = transcript;
  setVoiceStatus("ถอดเสียงสำเร็จแล้ว สามารถแก้ไขข้อความต่อก่อนบันทึกได้");
}

function getPreferredVoiceMimeType() {
  if (!("MediaRecorder" in window)) {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg"
  ];

  for (const candidate of candidates) {
    if (window.MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function startVoiceInput() {
  if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
    setVoiceStatus("เบราว์เซอร์นี้ยังไม่รองรับการอัดเสียง กรุณาพิมพ์ Detail เอง");
    return;
  }

  try {
    stopVoiceInput();
    voiceChunks = [];
    voiceMimeType = getPreferredVoiceMimeType();
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceRecorder = voiceMimeType
      ? new MediaRecorder(voiceStream, { mimeType: voiceMimeType })
      : new MediaRecorder(voiceStream);

    voiceMimeType = voiceRecorder.mimeType || voiceMimeType || "audio/webm";

    voiceRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        voiceChunks.push(event.data);
      }
    };

    voiceRecorder.onstart = () => {
      setVoiceStatus("กำลังอัดเสียง... พูดรายละเอียดสถานะเครื่องได้เลย แล้วกดหยุดอัดเสียง");
    };

    voiceRecorder.onerror = () => {
      setVoiceStatus("อัดเสียงไม่สำเร็จ กรุณาอนุญาตไมค์หรือพิมพ์ Detail เอง");
    };

    voiceRecorder.onstop = async () => {
      const audioBlob = new Blob(voiceChunks, { type: voiceMimeType || "audio/webm" });
      voiceChunks = [];

      if (voiceStream) {
        voiceStream.getTracks().forEach((track) => track.stop());
        voiceStream = null;
      }

      if (!audioBlob.size) {
        setVoiceStatus("ยังไม่มีเสียงที่ใช้งานได้ กรุณาลองอัดใหม่");
        voiceRecorder = null;
        return;
      }

      try {
        await transcribeVoiceDetail(audioBlob);
      } catch (error) {
        setVoiceStatus("ถอดเสียงไม่สำเร็จ กรุณาลองใหม่หรือพิมพ์ Detail เอง");
      } finally {
        voiceRecorder = null;
      }
    };

    voiceRecorder.start();
  } catch (error) {
    setVoiceStatus("เปิดไมค์ไม่ได้ กรุณาอนุญาตการใช้ไมค์หรือพิมพ์ Detail เอง");
  }
}

function resetPhotoPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  }

  cameraPreview.removeAttribute("src");
  photoInput.value = "";
  setCameraState("ยังไม่มีรูป", "กดถ่ายรูป QR หรือเลือกรูปจากมือถือ แล้วระบบจะอ่านข้อมูลจากรูป");
}

async function scanPhotoFile(file) {
  if (!file) {
    return;
  }

  if (!("BarcodeDetector" in window)) {
    setCameraState("ไม่รองรับ", "เบราว์เซอร์นี้ยังไม่รองรับการอ่าน QR จากรูป กรุณาพิมพ์หรือใช้เบราว์เซอร์รุ่นใหม่");
    return;
  }

  barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });

  try {
    resetPhotoPreview();
    previewObjectUrl = URL.createObjectURL(file);
    cameraPreview.src = previewObjectUrl;
    setCameraState("กำลังอ่านรูป", "ระบบกำลังถอดรหัส QR จากรูปที่เลือก");

    const imageBitmap = await createImageBitmap(file);
    const barcodes = await barcodeDetector.detect(imageBitmap);
    imageBitmap.close();

    if (!barcodes.length) {
      setCameraState("ไม่พบ QR", "ระบบเปิดรูปได้ แต่ยังไม่พบ QR ในภาพนี้ ลองถ่ายให้ชัดขึ้นหรือขยับใกล้อีกนิด");
      return;
    }

    const qrValue = barcodes[0].rawValue?.trim();

    if (!qrValue) {
      setCameraState("อ่านไม่สำเร็จ", "พบ QR ในรูป แต่ยังอ่านค่าไม่ได้");
      return;
    }

    qrInput.value = qrValue;
    const lookup = renderPartSelection(qrValue);
    renderScanReadout(lookup.qrValue, getSelectedPartCandidate());
    setCameraState("พบ QR แล้ว", `อ่านค่า ${qrValue} จากรูปแล้ว กำลังบันทึกให้อัตโนมัติ`);
    submitScan();
  } catch (error) {
    setCameraState("เปิดรูปไม่ได้", "ไม่สามารถอ่านรูปนี้ได้ กรุณาลองถ่ายใหม่หรือเลือกไฟล์รูปอื่น");
  }
}

function startCamera() {
  photoInput.click();
}

scanForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const machineId = machineSelect.value;
  const area = areaInput.value.trim();
  const status = statusInput.value;
  const detail = detailInput.value.trim();
  const lookup = getQrLookup(qrInput.value);
  const scannedBy = scannerInput.value.trim() || "station-01";
  const selectedPart = getSelectedPartCandidate();
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

  if (!selectedPart) {
    showResult("ไม่สามารถบันทึกได้", "กรุณาเลือกชื่อชิ้นงานจาก Master Data ก่อนบันทึก");
    partSelection.focus();
    return;
  }

  const jobs = await loadJobs();
  jobs[machineId] = {
    area,
    directValue: lookup.parsed.directValue,
    partCode: selectedPart.entityCode || lookup.entityCode || lookup.parsed.partCode,
    partName: selectedPart.entityName || lookup.entityName || null,
    entityType: selectedPart.entityType || lookup.entityType || "PART",
    qrValue: lookup.qrValue,
    status,
    detail,
    updatedAt: new Date().toISOString(),
    scannedBy
  };

  await saveJobs(jobs);
  renderJobList();
  showResult(
    `บันทึก ${machineId} เรียบร้อย`,
    `${machineId} ในพื้นที่ ${area} กำลังผลิต ${selectedPart.entityCode} - ${selectedPart.entityName} จาก QR ${lookup.qrValue}`
  );
  qrInput.value = lookup.parsed.partCode || lookup.qrValue;
  renderScanReadout(lookup.qrValue, selectedPart);
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

  submitScan();
});

qrInput.addEventListener("input", () => {
  const lookup = renderPartSelection(qrInput.value);
  renderScanReadout(lookup.qrValue, getSelectedPartCandidate());
});

partSelection.addEventListener("change", () => {
  renderScanReadout(qrInput.value, getSelectedPartCandidate());
  focusQrInput();
});

resetStorageButton.addEventListener("click", async () => {
  jobsState = await dataService.resetJobs(defaultJobs);
  renderJobList();
  showResult("รีเซ็ตข้อมูลแล้ว", "สถานะเครื่องจักรถูกคืนกลับเป็นค่าเริ่มต้นจากไฟล์ตั้งต้น");
  qrInput.value = "";
  detailInput.value = "";
  renderPartSelection("");
  renderScanReadout("");
  setVoiceStatus("พิมพ์ข้อความได้ตามปกติ หรือกดเริ่มอัดเสียงเพื่อพูดใส่ Detail บนมือถือ");
  focusQrInput();
});

startCameraButton.addEventListener("click", async () => {
  startCamera();
});

stopCameraButton.addEventListener("click", () => {
  resetPhotoPreview();
  focusQrInput();
});

startVoiceButton.addEventListener("click", () => {
  startVoiceInput();
});

stopVoiceButton.addEventListener("click", () => {
  stopVoiceInput();
  setVoiceStatus("หยุดอัดเสียงแล้ว ระบบจะเริ่มถอดข้อความให้");
});

photoInput.addEventListener("change", async () => {
  const [file] = photoInput.files || [];
  await scanPhotoFile(file);
});

machineSelect.addEventListener("change", () => {
  syncAreaInput();
  syncStatusInput();
  syncDetailInput();
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
  await loadJobs();
  renderMachineOptions();
  renderScannerOptions();
  syncAreaInput();
  syncStatusInput();
  syncDetailInput();
  renderJobList();
  renderPartSelection("");
  renderScanReadout("");
  focusQrInput();
}

initializeScanPage();

window.addEventListener("beforeunload", () => {
  resetPhotoPreview();
  stopVoiceInput();
});
