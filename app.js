const STORE_KEYS = {
  pools: "pool-dose-guide:pools",
  activePool: "pool-dose-guide:active-pool",
  history: "pool-dose-guide:history",
  settings: "pool-dose-guide:settings",
  serviceM8: "pool-dose-guide:servicem8"
};

const DEFAULT_SETTINGS = {
  chlorineStrength: 12.5,
  acidMlPer10000Per01: 100,
  sodaAshGPer10000Per01: 75,
  bufferGPer1000Per10: 12,
  calciumGPer1000Per10: 14,
  phosphateMlPer10000Per100: 60,
  targetChlorine: 1,
  targetPh: 7.4,
  targetAlkalinity: 120,
  targetHardness: 180,
  targetCya: 30,
  targetSalt: 3500,
  targetPhosphate: 300
};

const COMPANY_RULES = {
  alkalinityTarget: 120,
  maxAcidMl: 2000,
  maxAlkalinityAcidMl: 1000,
  saltActionThreshold: 3500,
  nakedSaltActionThreshold: 1000
};

const CHEAT_SHEET = {
  standard: {
    freeChlorine: { min: 1, max: 3 },
    ph: { min: 7.2, max: 7.5, target: 7.4 },
    alkalinity: { min: 120, max: 180, target: 120 },
    hardness: { min: 180, max: 220, target: 180 },
    cya: { min: 30, max: 50, target: 30 },
    salt: { min: 3500, max: 4500, target: 3500 },
    phosphate: { max: 300 }
  },
  naked: {
    freeChlorine: { min: 1, max: 3 },
    ph: { min: 7.2, max: 7.5, target: 7.4 },
    alkalinity: { min: 120, max: 180, target: 120 },
    hardness: { min: 180, max: 220, target: 180 },
    salt: { min: 1000, max: 1000, target: 1000 },
    copper: { target: 0.3 },
    phosphate: { max: 300 }
  }
};

const els = {
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  resetSettingsButton: document.querySelector("#resetSettingsButton"),
  newPoolButton: document.querySelector("#newPoolButton"),
  savePoolButton: document.querySelector("#savePoolButton"),
  poolSelect: document.querySelector("#poolSelect"),
  poolName: document.querySelector("#poolName"),
  poolVolume: document.querySelector("#poolVolume"),
  poolLength: document.querySelector("#poolLength"),
  poolWidth: document.querySelector("#poolWidth"),
  poolDepth: document.querySelector("#poolDepth"),
  estimateVolumeButton: document.querySelector("#estimateVolumeButton"),
  volumeEstimateStatus: document.querySelector("#volumeEstimateStatus"),
  poolType: document.querySelector("#poolType"),
  surfaceType: document.querySelector("#surfaceType"),
  volumeConfidence: document.querySelector("#volumeConfidence"),
  poolNotes: document.querySelector("#poolNotes"),
  serviceM8ProxyUrl: document.querySelector("#serviceM8ProxyUrl"),
  serviceM8JobLookup: document.querySelector("#serviceM8JobLookup"),
  saveServiceM8SettingsButton: document.querySelector("#saveServiceM8SettingsButton"),
  loadServiceM8JobButton: document.querySelector("#loadServiceM8JobButton"),
  serviceM8Status: document.querySelector("#serviceM8Status"),
  resultPhoto: document.querySelector("#resultPhoto"),
  readPhotoButton: document.querySelector("#readPhotoButton"),
  ocrStatus: document.querySelector("#ocrStatus"),
  photoPreviewWrap: document.querySelector("#photoPreviewWrap"),
  photoPreview: document.querySelector("#photoPreview"),
  sampleButton: document.querySelector("#sampleButton"),
  calculateButton: document.querySelector("#calculateButton"),
  statusCard: document.querySelector("#statusCard"),
  recommendationList: document.querySelector("#recommendationList"),
  notesList: document.querySelector("#notesList"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton")
};

const readingIds = [
  "freeChlorine",
  "totalChlorine",
  "combinedChlorine",
  "ph",
  "alkalinity",
  "hardness",
  "cya",
  "salt",
  "phosphate",
  "copper"
];

const settingMap = {
  settingChlorine: "chlorineStrength",
  settingAcid: "acidMlPer10000Per01",
  settingSodaAsh: "sodaAshGPer10000Per01",
  settingBuffer: "bufferGPer1000Per10",
  settingCalcium: "calciumGPer1000Per10",
  settingPhosphate: "phosphateMlPer10000Per100",
  targetChlorine: "targetChlorine",
  targetPh: "targetPh",
  targetAlkalinity: "targetAlkalinity",
  targetHardness: "targetHardness",
  targetCya: "targetCya",
  targetSalt: "targetSalt"
};

let pools = loadJson(STORE_KEYS.pools, []);
let history = loadJson(STORE_KEYS.history, []);
let settings = { ...DEFAULT_SETTINGS, ...loadJson(STORE_KEYS.settings, {}) };
let serviceM8Settings = loadJson(STORE_KEYS.serviceM8, { proxyUrl: "" });
let activePoolId = localStorage.getItem(STORE_KEYS.activePool);
let selectedPhotoDataUrl = "";
let activeServiceM8Context = null;

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function numberValue(id) {
  const input = document.querySelector(`#${id}`);
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function setValue(id, value) {
  document.querySelector(`#${id}`).value = value ?? "";
}

function setServiceM8Status(message, style = "") {
  if (!els.serviceM8Status) return;
  els.serviceM8Status.className = `service-status ${style}`.trim();
  els.serviceM8Status.textContent = message;
}

function rounded(value, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function formatAmount(value, unit) {
  if (value <= 0) return `0 ${unit}`;
  if (unit === "L" && value < 1) return `${Math.round(value * 1000)} ml`;
  if (unit === "L") return `${rounded(value, 2)} L`;
  if (unit === "kg" && value < 1) return `${Math.round(value * 1000)} g`;
  if (unit === "kg") return `${rounded(value, 2)} kg`;
  if (unit === "g" && value >= 1000) return `${rounded(value / 1000, 2)} kg`;
  if (unit === "ml" && value >= 1000) return `${rounded(value / 1000, 2)} L`;
  return `${Math.round(value)} ${unit}`;
}

function getActivePool() {
  return pools.find((pool) => pool.id === activePoolId) ?? null;
}

function renderPoolOptions() {
  els.poolSelect.innerHTML = "";

  if (pools.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved pools yet";
    els.poolSelect.append(option);
    clearPoolForm();
    return;
  }

  pools.forEach((pool) => {
    const option = document.createElement("option");
    option.value = pool.id;
    option.textContent = `${pool.name} - ${Number(pool.volume).toLocaleString()} L`;
    els.poolSelect.append(option);
  });

  if (!pools.some((pool) => pool.id === activePoolId)) {
    activePoolId = pools[0].id;
  }

  els.poolSelect.value = activePoolId;
  localStorage.setItem(STORE_KEYS.activePool, activePoolId);
  fillPoolForm(getActivePool());
}

function clearPoolForm() {
  activePoolId = "";
  els.poolName.value = "";
  els.poolVolume.value = "";
  els.poolLength.value = "";
  els.poolWidth.value = "";
  els.poolDepth.value = "";
  els.poolType.value = "Salt";
  els.surfaceType.value = "Concrete";
  els.volumeConfidence.value = "Estimated";
  els.poolNotes.value = "";
  setVolumeEstimateStatus("Enter approximate size to estimate litres.");
}

function fillPoolForm(pool) {
  if (!pool) return clearPoolForm();
  els.poolName.value = pool.name;
  els.poolVolume.value = pool.volume;
  els.poolLength.value = pool.length || "";
  els.poolWidth.value = pool.width || "";
  els.poolDepth.value = pool.depth || "";
  els.poolType.value = pool.poolType;
  els.surfaceType.value = pool.surfaceType;
  els.volumeConfidence.value = pool.volumeConfidence;
  els.poolNotes.value = pool.notes;
  updateVolumeEstimateStatus();
}

function savePool() {
  const name = els.poolName.value.trim();
  const volume = Number(els.poolVolume.value);

  if (!name || !Number.isFinite(volume) || volume < 1000) {
    setStatus("Enter a site name and pool volume before saving.", "warn");
    return;
  }

  const pool = {
    id: activePoolId || createId(),
    name,
    volume,
    length: numberValue("poolLength"),
    width: numberValue("poolWidth"),
    depth: numberValue("poolDepth"),
    poolType: els.poolType.value,
    surfaceType: els.surfaceType.value,
    volumeConfidence: els.volumeConfidence.value,
    notes: els.poolNotes.value.trim(),
    serviceM8JobUuid: activeServiceM8Context?.jobUuid || null,
    serviceM8CompanyUuid: activeServiceM8Context?.companyUuid || null,
    serviceM8JobNumber: activeServiceM8Context?.jobNumber || null,
    updatedAt: new Date().toISOString()
  };

  const existingIndex = pools.findIndex((item) => item.id === pool.id);
  if (existingIndex >= 0) {
    pools[existingIndex] = pool;
  } else {
    pools.push(pool);
  }

  activePoolId = pool.id;
  saveJson(STORE_KEYS.pools, pools);
  localStorage.setItem(STORE_KEYS.activePool, activePoolId);
  renderPoolOptions();
  setStatus("Pool profile saved.", "ready");
}

function setVolumeEstimateStatus(message) {
  if (!els.volumeEstimateStatus) return;
  els.volumeEstimateStatus.textContent = message;
}

function estimateVolumeFromSize() {
  const length = numberValue("poolLength");
  const width = numberValue("poolWidth");
  const depth = numberValue("poolDepth");

  if (!length || !width || !depth) {
    setVolumeEstimateStatus("Enter length, width, and average depth to estimate litres.");
    return null;
  }

  const litres = Math.round((length * width * depth * 1000) / 500) * 500;
  setVolumeEstimateStatus(`Approximate volume: ${litres.toLocaleString()} L.`);
  return litres;
}

function updateVolumeEstimateStatus() {
  const length = numberValue("poolLength");
  const width = numberValue("poolWidth");
  const depth = numberValue("poolDepth");

  if (length && width && depth) {
    estimateVolumeFromSize();
  } else {
    setVolumeEstimateStatus("Enter approximate size to estimate litres.");
  }
}

function useEstimatedVolume() {
  const litres = estimateVolumeFromSize();
  if (!litres) return;

  els.poolVolume.value = litres;
  els.volumeConfidence.value = "Estimated";
  setStatus("Estimated pool volume added. Save the pool once the profile looks right.", "ready");
}

function openSettings() {
  Object.entries(settingMap).forEach(([inputId, key]) => {
    setValue(inputId, settings[key]);
  });
  els.settingsDialog.showModal();
}

function saveSettings() {
  Object.entries(settingMap).forEach(([inputId, key]) => {
    const value = numberValue(inputId);
    if (value !== null) settings[key] = value;
  });
  saveJson(STORE_KEYS.settings, settings);
  setStatus("Product settings saved.", "ready");
}

function resetSettings() {
  settings = { ...DEFAULT_SETTINGS };
  saveJson(STORE_KEYS.settings, settings);
  openSettings();
}

function getReadings() {
  return Object.fromEntries(readingIds.map((id) => [id, numberValue(id)]));
}

function saveServiceM8Settings() {
  serviceM8Settings = {
    proxyUrl: normalizeUrl(els.serviceM8ProxyUrl.value.trim())
  };
  saveJson(STORE_KEYS.serviceM8, serviceM8Settings);
  els.serviceM8ProxyUrl.value = serviceM8Settings.proxyUrl;
  setServiceM8Status("ServiceM8 link settings saved.", "ready");
}

function normalizeUrl(value) {
  return value.replace(/\/+$/, "");
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

async function loadServiceM8Job() {
  const proxyUrl = normalizeUrl(els.serviceM8ProxyUrl.value.trim() || serviceM8Settings.proxyUrl);
  const lookup = els.serviceM8JobLookup.value.trim();

  if (!proxyUrl) {
    setServiceM8Status("Enter and save your secure proxy URL first.", "warn");
    return;
  }

  if (!lookup) {
    setServiceM8Status("Enter a ServiceM8 job UUID or job number.", "warn");
    return;
  }

  serviceM8Settings.proxyUrl = proxyUrl;
  saveJson(STORE_KEYS.serviceM8, serviceM8Settings);
  els.loadServiceM8JobButton.disabled = true;
  setServiceM8Status("Loading ServiceM8 job...", "");

  try {
    const queryKey = isUuidLike(lookup) ? "uuid" : "jobNumber";
    const response = await fetch(`${proxyUrl}/api/job?${queryKey}=${encodeURIComponent(lookup)}`);

    if (!response.ok) {
      throw new Error(`ServiceM8 request failed: ${response.status}`);
    }

    const payload = await response.json();
    applyServiceM8Job(payload);
  } catch (error) {
    console.error(error);
    setServiceM8Status("Could not load that ServiceM8 job. Check the proxy URL, API key setup, and job number.", "warn");
  } finally {
    els.loadServiceM8JobButton.disabled = false;
  }
}

function applyServiceM8Job(payload) {
  const job = payload.job || {};
  const company = payload.company || {};
  const companyUuid = job.company_uuid || company.uuid || null;
  const jobUuid = job.uuid || payload.job_uuid || null;
  const jobNumber = job.generated_job_id || job.job_number || null;
  const existingPool = companyUuid
    ? pools.find((pool) => pool.serviceM8CompanyUuid === companyUuid)
    : null;

  activeServiceM8Context = { jobUuid, companyUuid, jobNumber };

  if (existingPool) {
    activePoolId = existingPool.id;
    localStorage.setItem(STORE_KEYS.activePool, activePoolId);
    renderPoolOptions();
  }

  els.poolName.value = company.name || company.company_name || job.company_name || job.job_address || els.poolName.value;
  if (!els.poolNotes.value && job.job_address) {
    els.poolNotes.value = `ServiceM8 address: ${job.job_address}`;
  }

  setServiceM8Status(
    existingPool
      ? "ServiceM8 job loaded and matched to saved pool profile."
      : "ServiceM8 job loaded. Enter/save pool volume to link this pool for next time.",
    "ready"
  );
}

function applyLinkParams(params) {
  const name = params.get("name") || params.get("customer") || params.get("site");
  const volume = params.get("volume") || params.get("litres");
  const poolType = params.get("pool_type") || params.get("type");
  const surface = params.get("surface");
  const notes = params.get("notes");
  const jobNumber = params.get("job_number") || params.get("job");
  const companyUuid = params.get("company_uuid") || params.get("client_uuid");

  if (companyUuid) {
    const existingPool = pools.find((pool) => pool.serviceM8CompanyUuid === companyUuid);
    if (existingPool) {
      activePoolId = existingPool.id;
      localStorage.setItem(STORE_KEYS.activePool, activePoolId);
      renderPoolOptions();
    }
  }

  if (name) els.poolName.value = name;
  if (volume) els.poolVolume.value = volume;
  if (poolType) setSelectByValueOrText(els.poolType, poolType);
  if (surface) setSelectByValueOrText(els.surfaceType, surface);
  if (notes) els.poolNotes.value = notes;

  if (jobNumber || companyUuid) {
    activeServiceM8Context = {
      jobUuid: params.get("job_uuid") || null,
      companyUuid: companyUuid || null,
      jobNumber: jobNumber || null
    };
  }

  if (name || volume || poolType || surface || notes || jobNumber || companyUuid) {
    setServiceM8Status("Link details loaded. Save the pool once the volume/profile is correct.", "ready");
  }
}

function setSelectByValueOrText(select, requestedValue) {
  const normalized = requestedValue.trim().toLowerCase();
  const option = [...select.options].find((item) =>
    item.value.toLowerCase() === normalized || item.textContent.toLowerCase() === normalized
  );

  if (option) {
    select.value = option.value;
  }
}

function isNakedPool(pool) {
  return pool?.poolType === "Naked / NKD";
}

function getTargetProfile(pool) {
  return isNakedPool(pool) ? CHEAT_SHEET.naked : CHEAT_SHEET.standard;
}

function getWorkingPool(volume) {
  return getActivePool() || {
    id: null,
    name: els.poolName.value.trim() || "Unsaved pool",
    volume,
    poolType: els.poolType.value,
    surfaceType: els.surfaceType.value,
    volumeConfidence: els.volumeConfidence.value,
    notes: els.poolNotes.value.trim()
  };
}

function stabiliserKg(volume, ppmRise) {
  return (volume / 20000) * (ppmRise / 50);
}

function hardnessKg(volume, ppmRise) {
  return 3.5 * (volume / 50000) * (ppmRise / 50);
}

function alkalinityKg(volume, ppmRise) {
  return 3 * (volume / 50000) * (ppmRise / 50);
}

function saltKg(volume, ppmRise) {
  return 20 * (volume / 50000) * (ppmRise / 500);
}

function phAcidMl(volume, currentPh, targetPh) {
  const drop = Math.max(0, currentPh - targetPh);
  return 500 * (volume / 50000) * (drop / 0.1);
}

function shockKg(volume) {
  return 3 * (volume / 50000);
}

function setSampleReadings() {
  const sample = {
    freeChlorine: 0.8,
    totalChlorine: 1.2,
    combinedChlorine: 0.4,
    ph: 7.8,
    alkalinity: 60,
    hardness: 180,
    cya: 25,
    salt: 3100,
    phosphate: 650,
    copper: 0
  };
  Object.entries(sample).forEach(([id, value]) => setValue(id, value));
}

function setOcrStatus(message, style = "") {
  if (!els.ocrStatus) return;
  els.ocrStatus.className = `ocr-status ${style}`.trim();
  els.ocrStatus.textContent = message;
}

async function extractReadingsFromPhoto() {
  if (!selectedPhotoDataUrl) {
    setOcrStatus("Take or upload a photo first.", "warn");
    return;
  }

  if (!globalThis.Tesseract) {
    setOcrStatus("Photo reading library did not load. Check internet connection, then refresh.", "warn");
    return;
  }

  els.readPhotoButton.disabled = true;
  setOcrStatus("Reading photo. This can take 10-30 seconds on a phone.", "");

  try {
    const processedImages = await prepareImagesForOcr(selectedPhotoDataUrl);
    const textParts = [];

    for (let index = 0; index < processedImages.length; index += 1) {
      const result = await Tesseract.recognize(processedImages[index], "eng", {
        logger(progress) {
          if (progress.status === "recognizing text") {
            const imageProgress = (index + progress.progress) / processedImages.length;
            setOcrStatus(`Reading photo ${Math.round(imageProgress * 100)}%`, "");
          }
        },
        tessedit_pageseg_mode: "6",
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:% "
      });
      textParts.push(result.data.text);
    }

    const extracted = parseSpinTouchText(textParts.join("\n"));
    fillExtractedReadings(extracted);

    const foundCount = Object.values(extracted).filter((value) => value !== null).length;
    if (foundCount === 0) {
      setOcrStatus("I could not find readings in that photo. Try a closer, straighter photo of just the result screen.", "warn");
      return;
    }

    setOcrStatus(`Extracted ${foundCount} readings. Check them before calculating.`, "ready");
  } catch (error) {
    console.error(error);
    setOcrStatus("Photo reading failed. Try another photo or enter the readings manually.", "warn");
  } finally {
    els.readPhotoButton.disabled = false;
  }
}

function prepareImagesForOcr(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const portrait = sourceHeight > sourceWidth;

      const crops = portrait
        ? [
            { x: sourceWidth * 0.18, y: sourceHeight * 0.37, width: sourceWidth * 0.64, height: sourceHeight * 0.28 },
            { x: sourceWidth * 0.08, y: sourceHeight * 0.30, width: sourceWidth * 0.84, height: sourceHeight * 0.46 },
            { x: 0, y: 0, width: sourceWidth, height: sourceHeight }
          ]
        : [
            { x: sourceWidth * 0.2, y: sourceHeight * 0.34, width: sourceWidth * 0.6, height: sourceHeight * 0.38 },
            { x: sourceWidth * 0.08, y: sourceHeight * 0.2, width: sourceWidth * 0.84, height: sourceHeight * 0.62 },
            { x: 0, y: 0, width: sourceWidth, height: sourceHeight }
          ];

      resolve(crops.flatMap((crop) => [
        processCrop(image, crop, "threshold"),
        processCrop(image, crop, "grey")
      ]));
    });
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

function processCrop(image, crop, mode) {
  const scale = Math.min(4, 1900 / crop.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(crop.width * scale);
      canvas.height = Math.round(crop.height * scale);

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let index = 0; index < data.length; index += 4) {
        const grey = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        if (mode === "threshold") {
          const contrast = grey < 155 ? 255 : 0;
          data[index] = contrast;
          data[index + 1] = contrast;
          data[index + 2] = contrast;
        } else {
          const lifted = Math.max(0, Math.min(255, (grey - 35) * 1.7));
          data[index] = lifted;
          data[index + 1] = lifted;
          data[index + 2] = lifted;
        }
      }

      context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function parseSpinTouchText(rawText) {
  const cleaned = rawText
    .toUpperCase()
    .replace(/,/g, ".")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ");

  return {
    freeChlorine: findReading(cleaned, ["FCL", "FC", "FREE CHLORINE"], "decimal"),
    totalChlorine: findReading(cleaned, ["TCL", "TC", "TOTAL CHLORINE"], "decimal"),
    combinedChlorine: findReading(cleaned, ["CCL", "CC", "COMBINED CHLORINE"], "decimal"),
    ph: findReading(cleaned, ["PH"], "ph"),
    alkalinity: findReading(cleaned, ["ALK", "ALKALINITY"], "integer"),
    hardness: findReading(cleaned, ["HARD", "HARDNESS"], "integer"),
    cya: findReading(cleaned, ["CYA", "STABILISER", "STABILIZER"], "integer"),
    salt: findReading(cleaned, ["SALT"], "integer"),
    phosphate: findReading(cleaned, ["PHOS", "PHOSPHATE"], "integer"),
    copper: findReading(cleaned, ["COPPER", "CU"], "decimal")
  };
}

function findReading(text, labels, kind) {
  for (const label of labels) {
    const labelPattern = label
      .replace(/O/g, "[O0]")
      .replace(/I/g, "[I1]")
      .replace(/L/g, "[L1]");
    const pattern = new RegExp(`(?:${labelPattern})\\s*[:=]?\\s*(-?\\d+(?:[\\.O]\\d+)?)`);
    const match = text.match(pattern);
    if (match) return normalizeReading(match[1], kind);
  }
  return null;
}

function normalizeReading(rawValue, kind) {
  const hadDecimal = /[.O]/.test(rawValue);
  const cleaned = rawValue.replace(/O/g, "0");
  let value = Number(cleaned);

  if (!Number.isFinite(value)) return null;

  if (kind === "decimal" && !hadDecimal && value > 20 && value < 1000) {
    value /= 100;
  }

  if (kind === "ph" && !hadDecimal && value > 14 && value < 100) {
    value /= 10;
  }

  if (kind === "decimal" || kind === "ph") {
    return rounded(value, 2);
  }

  return Math.round(value);
}

function fillExtractedReadings(extracted) {
  Object.entries(extracted).forEach(([id, value]) => {
    if (value !== null && Number.isFinite(value)) {
      setValue(id, value);
    }
  });
}

function calculateDoseGuide() {
  const savedPool = getActivePool();
  const volume = savedPool ? Number(savedPool.volume) : Number(els.poolVolume.value);

  if (!Number.isFinite(volume) || volume < 1000) {
    setStatus("Save or enter a valid pool volume first.", "warn");
    return;
  }

  const pool = getWorkingPool(volume);
  const readings = getReadings();
  const profile = getTargetProfile(pool);
  const recs = [];
  const notes = [];

  if (isNakedPool(pool)) {
    notes.push({
      type: "info",
      text: "Naked / NKD profile active: use the naked pool targets from the cheat sheet, including salt 1000 ppm and copper 0.3 ppm."
    });
  }

  if (readings.freeChlorine !== null && readings.freeChlorine < profile.freeChlorine.min) {
    recs.push({
      title: "Super chlorinate",
      amount: "Via pump",
      detail: `Free chlorine is ${readings.freeChlorine} ppm. Cheat sheet target is ${profile.freeChlorine.min}-${profile.freeChlorine.max} ppm. Super chlorinate pool via pump.`
    });
  }

  if (readings.ph !== null && readings.ph > profile.ph.max) {
    const uncappedMl = phAcidMl(volume, readings.ph, profile.ph.target);
    const ml = Math.min(uncappedMl, COMPANY_RULES.maxAcidMl);
    recs.push({
      title: "Hydrochloric acid",
      amount: formatAmount(ml, "ml"),
      detail: uncappedMl > COMPANY_RULES.maxAcidMl
        ? `Capped at ${formatAmount(COMPANY_RULES.maxAcidMl, "ml")}. Estimated full dose was ${formatAmount(uncappedMl, "ml")}; circulate and retest before adding more.`
        : `Cheat sheet acid rate: about 1 L per 50,000 L from pH 7.8 to 7.4, scaled to this pool.`
    });
  }

  if (readings.ph !== null && readings.ph < profile.ph.min) {
    notes.push({
      type: "info",
      text: `pH is below the cheat sheet range at ${readings.ph}. No pH increaser recommendation; monitor after circulation.`
    });
  }

  if (readings.alkalinity !== null && readings.alkalinity < profile.alkalinity.min) {
    const delta = profile.alkalinity.target - readings.alkalinity;
    const kg = alkalinityKg(volume, delta);
    recs.push({
      title: "Sodium bicarbonate",
      amount: formatAmount(kg, "kg"),
      detail: `Cheat sheet rate: 3 kg per 50,000 L raises alkalinity by 50 ppm. Raises toward ${profile.alkalinity.target} ppm.`
    });
  }

  if (readings.alkalinity !== null && readings.alkalinity > profile.alkalinity.max) {
    recs.push({
      title: "Lower alkalinity",
      amount: formatAmount(COMPANY_RULES.maxAlkalinityAcidMl, "ml"),
      detail: "Cheat sheet says to lower by 50 ppm with no more than 1 litre of acid. Dose carefully, circulate, and retest."
    });
  }

  if (!isNakedPool(pool) && readings.cya !== null && readings.cya < profile.cya.min) {
    const delta = profile.cya.target - readings.cya;
    const kg = stabiliserKg(volume, delta);
    recs.push({
      title: "Stabiliser / cyanuric acid",
      amount: formatAmount(kg, "kg"),
      detail: `Cheat sheet rate: 1 kg per 20,000 L raises stabiliser by 50 ppm. Raises toward ${profile.cya.target} ppm.`
    });
  }

  if (readings.hardness !== null && readings.hardness < profile.hardness.min) {
    const delta = profile.hardness.target - readings.hardness;
    const kg = hardnessKg(volume, delta);
    recs.push({
      title: "Calcium hardness increaser",
      amount: formatAmount(kg, "kg"),
      detail: "Cheat sheet rate: 3.5 kg per 50,000 L raises hardness by 50 ppm."
    });
  }

  if (readings.salt !== null && pool.poolType !== "Chlorine" && readings.salt < profile.salt.min) {
    const delta = profile.salt.target - readings.salt;
    const kg = saltKg(volume, delta);
    recs.push({
      title: isNakedPool(pool) ? "Naked pool salt/mineral" : "Pool salt",
      amount: formatAmount(kg, "kg"),
      detail: isNakedPool(pool)
        ? `Cheat sheet target is salt 1000 ppm for naked pools.`
        : `Cheat sheet rate: 20 kg per 50,000 L raises salt by 500 ppm. Raises toward ${profile.salt.target} ppm.`
    });
  }

  if (readings.phosphate !== null && readings.phosphate > profile.phosphate.max) {
    recs.push({
      title: "Phosphate remover",
      amount: "Refer to bottle",
      detail: `Phosphate is above the cheat sheet limit of ${profile.phosphate.max} ppb. Use the product label dose.`
    });
  }

  const combinedChlorine = readings.combinedChlorine !== null
    ? readings.combinedChlorine
    : readings.totalChlorine !== null && readings.freeChlorine !== null
      ? readings.totalChlorine - readings.freeChlorine
      : null;

  if (combinedChlorine !== null && combinedChlorine > 0.5) {
    recs.push({
      title: "Heavy shock",
      amount: formatAmount(shockKg(volume), "kg"),
      detail: "Cheat sheet heavy shock rate: 3 kg for a 50,000 L pool."
    });
  }

  addSafetyNotes(readings, notes, pool, profile);
  renderRecommendations(recs, notes);
  saveHistory(pool, volume, readings, recs, notes);
}

function addSafetyNotes(readings, notes, pool, profile) {
  if (isNakedPool(pool) && readings.freeChlorine !== null && readings.freeChlorine > profile.freeChlorine.max) {
    notes.push({
      type: "warning",
      text: `Free chlorine is ${readings.freeChlorine} ppm. Naked guidance is ${profile.freeChlorine.min}-${profile.freeChlorine.max} ppm, so check output/run time, covers, and recent manual chlorine additions.`
    });
  }

  if (isNakedPool(pool) && readings.cya !== null && readings.cya > 0) {
    notes.push({
      type: "warning",
      text: "CYA/stabiliser is present. The cheat sheet does not list stabiliser for naked pools, so do not add cyanuric acid."
    });
  }

  if (isNakedPool(pool) && readings.salt !== null && readings.salt > profile.salt.target) {
    notes.push({
      type: "warning",
      text: `Salt is above the naked pool target of ${profile.salt.target} ppm. Do not add salt/mineral.`
    });
  }

  if (isNakedPool(pool) && readings.copper !== null && readings.copper < profile.copper.target) {
    notes.push({
      type: "warning",
      text: `Copper is below the naked pool cheat sheet target of ${profile.copper.target} ppm. Check the NKD ioniser/copper procedure.`
    });
  }

  if (isNakedPool(pool) && readings.copper !== null && readings.copper > profile.copper.target) {
    notes.push({
      type: "warning",
      text: `Copper is above the naked pool cheat sheet target of ${profile.copper.target} ppm. Check pH first and follow NKD high-copper procedure.`
    });
  }

  if (readings.combinedChlorine === null && readings.totalChlorine !== null && readings.freeChlorine !== null) {
    const combined = readings.totalChlorine - readings.freeChlorine;
    if (combined > 0.5) {
      notes.push({
        type: "warning",
        text: `Combined chlorine appears elevated at about ${rounded(combined, 1)} ppm. Consider oxidising/shocking according to company procedure.`
      });
    }
  }

  if (readings.freeChlorine !== null && readings.freeChlorine > profile.freeChlorine.max) {
    notes.push({
      type: "warning",
      text: `Free chlorine is above the cheat sheet range of ${profile.freeChlorine.min}-${profile.freeChlorine.max} ppm. Do not add chlorine.`
    });
  }

  if (readings.ph !== null && (readings.ph < 7.2 || readings.ph > 7.8)) {
    notes.push({
      type: "warning",
      text: "pH is outside the normal operating range. Dose in stages and retest after circulation."
    });
  }

  if (!isNakedPool(pool) && readings.cya !== null && readings.cya > profile.cya.max) {
    notes.push({
      type: "warning",
      text: `Stabiliser is above the cheat sheet range of ${profile.cya.min}-${profile.cya.max} ppm. To lower, dilute with water.`
    });
  }

  if (readings.hardness !== null && readings.hardness > profile.hardness.max) {
    notes.push({
      type: "warning",
      text: `Hardness is above the cheat sheet range of ${profile.hardness.min}-${profile.hardness.max} ppm. To lower, dilute with water.`
    });
  }

  if (!isNakedPool(pool) && readings.salt !== null && readings.salt > profile.salt.max) {
    notes.push({
      type: "warning",
      text: `Salt is above the cheat sheet range of ${profile.salt.min}-${profile.salt.max} ppm. Do not add salt.`
    });
  }

  if (!isNakedPool(pool) && readings.copper !== null && readings.copper > 0.3) {
    notes.push({
      type: "warning",
      text: "Copper is above 0.3 ppm. Avoid copper-based products and consider stain/metal treatment."
    });
  }
}

function renderRecommendations(recs, notes) {
  els.recommendationList.innerHTML = "";
  els.notesList.innerHTML = "";

  if (recs.length === 0) {
    setStatus("No standard dosing required from the confirmed readings.", "ready");
  } else {
    setStatus(`${recs.length} recommended treatment${recs.length === 1 ? "" : "s"} calculated. Test history saved automatically.`, "ready");
  }

  recs.forEach((rec) => {
    const card = document.createElement("article");
    card.className = "dose-card";
    card.innerHTML = `
      <strong>${rec.title}</strong>
      <div class="dose-amount">${rec.amount}</div>
      <p>${rec.detail}</p>
    `;
    els.recommendationList.append(card);
  });

  notes.forEach((note) => {
    const card = document.createElement("article");
    card.className = `note-card ${note.type}`;
    card.innerHTML = `<p>${note.text}</p>`;
    els.notesList.append(card);
  });
}

function setStatus(message, style = "") {
  els.statusCard.className = `status-card ${style}`.trim();
  els.statusCard.textContent = message;
}

function saveHistory(pool, volume, readings, recs, notes) {
  const entry = {
    id: createId(),
    poolName: pool?.name || "Unsaved pool",
    volume,
    date: new Date().toISOString(),
    readings,
    recommendations: recs,
    notes
  };
  history = [entry, ...history].slice(0, 20);
  saveJson(STORE_KEYS.history, history);
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (history.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.innerHTML = "<p>No saved tests yet.</p>";
    els.historyList.append(empty);
    return;
  }

  history.slice(0, 6).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const date = new Date(entry.date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
    const summary = entry.recommendations.length
      ? entry.recommendations.map((rec) => `${rec.title}: ${rec.amount}`).join("; ")
      : "No standard dosing required";
    item.innerHTML = `
      <h3>${entry.poolName}</h3>
      <p>${date} - ${Number(entry.volume).toLocaleString()} L</p>
      <p>${summary}</p>
    `;
    els.historyList.append(item);
  });
}

function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedPhotoDataUrl = reader.result;
    els.photoPreview.src = selectedPhotoDataUrl;
    els.photoPreviewWrap.classList.remove("hidden");
    els.readPhotoButton.disabled = false;
    setOcrStatus("Photo loaded. Tap Read Photo to extract the readings.", "");
  });
  reader.readAsDataURL(file);
}

els.settingsButton.addEventListener("click", openSettings);
els.saveSettingsButton.addEventListener("click", saveSettings);
els.resetSettingsButton.addEventListener("click", resetSettings);
els.serviceM8ProxyUrl.value = serviceM8Settings.proxyUrl || "";
els.saveServiceM8SettingsButton.addEventListener("click", saveServiceM8Settings);
els.loadServiceM8JobButton.addEventListener("click", loadServiceM8Job);
els.newPoolButton.addEventListener("click", () => {
  clearPoolForm();
  activeServiceM8Context = null;
  setStatus("New pool ready. Save it once the volume is entered.", "");
});
els.savePoolButton.addEventListener("click", savePool);
els.estimateVolumeButton.addEventListener("click", useEstimatedVolume);
[els.poolLength, els.poolWidth, els.poolDepth].forEach((input) => {
  input.addEventListener("input", updateVolumeEstimateStatus);
});
els.poolSelect.addEventListener("change", (event) => {
  activePoolId = event.target.value;
  localStorage.setItem(STORE_KEYS.activePool, activePoolId);
  fillPoolForm(getActivePool());
});
els.resultPhoto.addEventListener("change", handlePhotoUpload);
els.readPhotoButton.addEventListener("click", extractReadingsFromPhoto);
els.sampleButton.addEventListener("click", setSampleReadings);
els.calculateButton.addEventListener("click", calculateDoseGuide);
els.clearHistoryButton.addEventListener("click", () => {
  history = [];
  saveJson(STORE_KEYS.history, history);
  renderHistory();
});

renderPoolOptions();
renderHistory();

const queryParams = new URLSearchParams(location.search);
applyLinkParams(queryParams);
const serviceM8JobParam = queryParams.get("job_uuid") || queryParams.get("job") || queryParams.get("job_number");
if (serviceM8JobParam) {
  els.serviceM8JobLookup.value = serviceM8JobParam;
  if (serviceM8Settings.proxyUrl) {
    loadServiceM8Job();
  } else {
    setServiceM8Status("ServiceM8 job was provided in the URL. Add your secure proxy URL to load it.", "warn");
  }
}
