const partList = document.getElementById("partList");
const partQrInput = document.getElementById("partQrInput");
const partQrStatus = document.getElementById("partQrStatus");
const partSearchInput = document.getElementById("partSearchInput");
const partFilterInput = document.getElementById("partFilterInput");
const partTotal = document.getElementById("partTotal");
const configuredTotal = document.getElementById("configuredTotal");
const configuredHint = document.getElementById("configuredHint");
const averageInjectionTime = document.getElementById("averageInjectionTime");
const partDataMode = document.getElementById("partDataMode");
const partEmptyMessage = document.getElementById("partEmptyMessage");
const dataService = window.monitorDataService;

const catalogItems = Array.isArray(window.masterData?.catalog)
  ? window.masterData.catalog.filter((item) => item.entityType === "PART" && item.entityCode)
  : [];
const qrCodes = Array.isArray(window.masterData?.qrCodes) ? window.masterData.qrCodes : [];
const qrLookup = new Map(qrCodes.map((mapping) => [mapping.qrValue, mapping]));
const catalogLookup = new Map(catalogItems.map((item) => [item.entityCode, item]));

let partSettings = {};
let qrScanTimerId;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(isoString) {
  if (!isoString) {
    return "ยังไม่เคยบันทึก";
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

function getPartSetting(partCode) {
  return partSettings[partCode] || {
    partCode,
    injectionTimeSeconds: 0,
    note: "",
    updatedAt: "",
    updatedBy: ""
  };
}

function parsePartCodeFromQr(rawValue) {
  const directValue = rawValue.trim();
  const compactValue = directValue.replace(/\s+/g, "");
  const exactQrMatch = qrLookup.get(directValue) || qrLookup.get(compactValue);

  if (exactQrMatch?.entityCode) {
    return {
      directValue,
      partCode: exactQrMatch.entityCode,
      source: "qr-mapping"
    };
  }

  const partCodeMatch = compactValue.match(/[A-Z]{1,4}\d{6,}/i) || directValue.match(/[A-Z]{1,4}\d{6,}/i);
  const partCode = partCodeMatch ? partCodeMatch[0].toUpperCase() : "";

  return {
    directValue,
    partCode,
    source: partCode ? "parsed" : "unknown"
  };
}

function jumpToPart(partCode) {
  const part = catalogLookup.get(partCode);

  if (!part) {
    partQrStatus.textContent = `ไม่พบ Part Code ${partCode || "-"} ใน Master Data`;
    partQrStatus.classList.add("warning-text");
    return;
  }

  partFilterInput.value = "all";
  partSearchInput.value = partCode;
  renderPartList();

  window.requestAnimationFrame(() => {
    const row = Array.from(partList.querySelectorAll(".part-row"))
      .find((item) => item.dataset.partCode === partCode);
    const timeInput = row?.querySelector(".part-time-input");

    if (!row || !timeInput) {
      return;
    }

    row.classList.add("part-row-target");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    timeInput.focus();
    timeInput.select();
    partQrStatus.textContent = `พบ ${partCode} - ${part.entityName || ""} พร้อมแก้ไข Cycle Time`;
    partQrStatus.classList.remove("warning-text");
  });
}

function handlePartQrScan(rawValue) {
  const parsed = parsePartCodeFromQr(rawValue);

  if (!parsed.directValue) {
    return;
  }

  jumpToPart(parsed.partCode);
}

function getFilteredParts() {
  const keyword = partSearchInput.value.trim().toLowerCase();
  const filter = partFilterInput.value;

  return catalogItems.filter((item) => {
    const setting = getPartSetting(item.entityCode);
    const hasInjectionTime = Number(setting.injectionTimeSeconds || 0) > 0;
    const matchesKeyword = !keyword ||
      item.entityCode.toLowerCase().includes(keyword) ||
      (item.entityName || "").toLowerCase().includes(keyword);

    if (!matchesKeyword) {
      return false;
    }

    if (filter === "configured") {
      return hasInjectionTime;
    }

    if (filter === "missing") {
      return !hasInjectionTime;
    }

    return true;
  });
}

function renderSummary() {
  const configuredSettings = Object.values(partSettings)
    .filter((setting) => Number(setting.injectionTimeSeconds || 0) > 0);
  const totalInjectionTime = configuredSettings
    .reduce((sum, setting) => sum + Number(setting.injectionTimeSeconds || 0), 0);
  const averageTime = configuredSettings.length > 0
    ? totalInjectionTime / configuredSettings.length
    : 0;

  partTotal.textContent = catalogItems.length.toLocaleString();
  configuredTotal.textContent = configuredSettings.length.toLocaleString();
  configuredHint.textContent = `${catalogItems.length - configuredSettings.length} รายการยังไม่ตั้งค่า`;
  averageInjectionTime.textContent = averageTime > 0 ? `${averageTime.toFixed(1)} sec` : "-- sec";
  partDataMode.textContent = dataService.getModeLabel() === "supabase" ? "Supabase Sync" : "Local Mode";
}

function renderPartList() {
  const parts = getFilteredParts();
  partList.innerHTML = "";
  partEmptyMessage.hidden = parts.length > 0;

  parts.forEach((item) => {
    const setting = getPartSetting(item.entityCode);
    const injectionTime = Number(setting.injectionTimeSeconds || 0);
    const row = document.createElement("article");
    row.className = "part-row";
    row.dataset.partCode = item.entityCode;
    row.innerHTML = `
      <div class="part-code-block">
        <strong>${escapeHtml(item.entityCode)}</strong>
        <span>${escapeHtml(item.unit || "PCS")}</span>
      </div>
      <div class="part-name-block">
        <strong>${escapeHtml(item.entityName || "-")}</strong>
        <span>อัปเดตล่าสุด: ${escapeHtml(formatDateTime(setting.updatedAt))}</span>
      </div>
      <label class="part-inline-field">
        <span>Cycle Time</span>
        <input
          class="part-time-input"
          type="number"
          min="0"
          step="0.1"
          inputmode="decimal"
          value="${injectionTime > 0 ? injectionTime : ""}"
          placeholder="วินาที"
        />
      </label>
      <label class="part-inline-field">
        <span>หมายเหตุ</span>
        <input class="part-note-input" type="text" value="${escapeHtml(setting.note || "")}" placeholder="เช่น Mold A, เงื่อนไขพิเศษ" />
      </label>
      <button class="action-button primary compact-button part-save-button" type="button">บันทึก</button>
    `;
    partList.appendChild(row);
  });
}

async function savePartRow(row) {
  const partCode = row.dataset.partCode;
  const timeInput = row.querySelector(".part-time-input");
  const noteInput = row.querySelector(".part-note-input");
  const saveButton = row.querySelector(".part-save-button");
  const injectionTimeSeconds = Number(timeInput.value || 0);

  if (!partCode || Number.isNaN(injectionTimeSeconds) || injectionTimeSeconds < 0) {
    return;
  }

  saveButton.textContent = "กำลังบันทึก";
  saveButton.disabled = true;

  const savedSetting = await dataService.savePartSetting(partCode, {
    injectionTimeSeconds,
    note: noteInput.value.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: "part-page"
  });

  partSettings[partCode] = savedSetting;
  saveButton.textContent = "บันทึกแล้ว";
  renderSummary();

  window.setTimeout(() => {
    saveButton.textContent = "บันทึก";
    saveButton.disabled = false;
  }, 900);
}

partList.addEventListener("click", async (event) => {
  const saveButton = event.target.closest(".part-save-button");

  if (!saveButton) {
    return;
  }

  const row = saveButton.closest(".part-row");
  await savePartRow(row);
});

partList.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const row = event.target.closest(".part-row");

  if (!row) {
    return;
  }

  event.preventDefault();
  await savePartRow(row);
});

partSearchInput.addEventListener("input", renderPartList);
partFilterInput.addEventListener("change", renderPartList);

partQrInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  handlePartQrScan(partQrInput.value);
});

partQrInput.addEventListener("input", () => {
  window.clearTimeout(qrScanTimerId);
  qrScanTimerId = window.setTimeout(() => {
    handlePartQrScan(partQrInput.value);
  }, 500);
});

async function initializePartPage() {
  partSettings = await dataService.loadPartSettings();
  renderSummary();
  renderPartList();
  partQrInput.focus();
}

initializePartPage();
