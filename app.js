const STORE_KEYS = {
  pools: "pool-dose-guide:pools",
  activePool: "pool-dose-guide:active-pool",
  history: "pool-dose-guide:history",
  settings: "pool-dose-guide:settings"
};

const DEFAULT_SETTINGS = {
  chlorineStrength: 12.5,
  acidMlPer10000Per01: 75,
  sodaAshGPer10000Per01: 75,
  bufferGPer1000Per10: 17,
  calciumGPer1000Per10: 15,
  phosphateMlPer10000Per100: 60,
  targetChlorine: 3,
  targetPh: 7.4,
  targetAlkalinity: 90,
  targetHardness: 250,
  targetCya: 40,
  targetSalt: 4000,
  targetPhosphate: 200
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
  poolType: document.querySelector("#poolType"),
  surfaceType: document.querySelector("#surfaceType"),
  volumeConfidence: document.querySelector("#volumeConfidence"),
  poolNotes: document.querySelector("#poolNotes"),
  resultPhoto: document.querySelector("#resultPhoto"),
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
let activePoolId = localStorage.getItem(STORE_KEYS.activePool);

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
  els.poolType.value = "Salt";
  els.surfaceType.value = "Concrete";
  els.volumeConfidence.value = "Estimated";
  els.poolNotes.value = "";
}

function fillPoolForm(pool) {
  if (!pool) return clearPoolForm();
  els.poolName.value = pool.name;
  els.poolVolume.value = pool.volume;
  els.poolType.value = pool.poolType;
  els.surfaceType.value = pool.surfaceType;
  els.volumeConfidence.value = pool.volumeConfidence;
  els.poolNotes.value = pool.notes;
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
    poolType: els.poolType.value,
    surfaceType: els.surfaceType.value,
    volumeConfidence: els.volumeConfidence.value,
    notes: els.poolNotes.value.trim(),
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

function setSampleReadings() {
  const sample = {
    freeChlorine: 0.8,
    totalChlorine: 1.2,
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

function calculateDoseGuide() {
  const pool = getActivePool();
  const volume = pool ? Number(pool.volume) : Number(els.poolVolume.value);

  if (!Number.isFinite(volume) || volume < 1000) {
    setStatus("Save or enter a valid pool volume first.", "warn");
    return;
  }

  const readings = getReadings();
  const recs = [];
  const notes = [];

  if (readings.freeChlorine !== null && readings.freeChlorine < settings.targetChlorine) {
    const delta = settings.targetChlorine - readings.freeChlorine;
    const gramsNeeded = (delta * volume) / 1000;
    const gramsPerLitre = settings.chlorineStrength * 10;
    const litres = gramsNeeded / gramsPerLitre;
    recs.push({
      title: "Liquid chlorine",
      amount: formatAmount(litres, "L"),
      detail: `Raises free chlorine by about ${rounded(delta, 1)} ppm to target ${settings.targetChlorine} ppm.`
    });
  }

  if (readings.ph !== null && readings.ph > settings.targetPh + 0.05) {
    const steps = (readings.ph - settings.targetPh) / 0.1;
    const ml = settings.acidMlPer10000Per01 * (volume / 10000) * steps;
    recs.push({
      title: "Hydrochloric acid",
      amount: formatAmount(ml, "ml"),
      detail: `Estimated dose to lower pH from ${readings.ph} toward ${settings.targetPh}. Add carefully and circulate.`
    });
  }

  if (readings.ph !== null && readings.ph < settings.targetPh - 0.05) {
    const steps = (settings.targetPh - readings.ph) / 0.1;
    const grams = settings.sodaAshGPer10000Per01 * (volume / 10000) * steps;
    recs.push({
      title: "pH increaser / soda ash",
      amount: formatAmount(grams, "g"),
      detail: `Estimated dose to lift pH from ${readings.ph} toward ${settings.targetPh}.`
    });
  }

  if (readings.alkalinity !== null && readings.alkalinity < settings.targetAlkalinity) {
    const delta = settings.targetAlkalinity - readings.alkalinity;
    const grams = settings.bufferGPer1000Per10 * (volume / 1000) * (delta / 10);
    recs.push({
      title: "Alkalinity increaser / buffer",
      amount: formatAmount(grams, "g"),
      detail: `Raises total alkalinity by about ${Math.round(delta)} ppm.`
    });
  }

  if (readings.hardness !== null && readings.hardness < settings.targetHardness) {
    const delta = settings.targetHardness - readings.hardness;
    const grams = settings.calciumGPer1000Per10 * (volume / 1000) * (delta / 10);
    recs.push({
      title: "Calcium hardness increaser",
      amount: formatAmount(grams, "g"),
      detail: `Raises calcium hardness by about ${Math.round(delta)} ppm.`
    });
  }

  if (readings.cya !== null && readings.cya < settings.targetCya) {
    const delta = settings.targetCya - readings.cya;
    const kg = (delta * volume) / 1000000;
    recs.push({
      title: "Stabiliser / cyanuric acid",
      amount: formatAmount(kg, "kg"),
      detail: `Raises stabiliser by about ${Math.round(delta)} ppm.`
    });
  }

  if (readings.salt !== null && pool?.poolType !== "Chlorine" && readings.salt < settings.targetSalt) {
    const delta = settings.targetSalt - readings.salt;
    const kg = (delta * volume) / 1000000;
    recs.push({
      title: "Pool salt",
      amount: formatAmount(kg, "kg"),
      detail: `Raises salt by about ${Math.round(delta)} ppm. Check chlorinator target before adding.`
    });
  }

  if (readings.phosphate !== null && readings.phosphate > settings.targetPhosphate) {
    const delta = readings.phosphate - settings.targetPhosphate;
    const ml = settings.phosphateMlPer10000Per100 * (volume / 10000) * (delta / 100);
    recs.push({
      title: "Phosphate remover",
      amount: formatAmount(ml, "ml"),
      detail: `Treats phosphate above ${settings.targetPhosphate} ppb. Follow product instructions for filtration and cleaning.`
    });
  }

  addSafetyNotes(readings, notes);
  renderRecommendations(recs, notes);
  saveHistory(pool, volume, readings, recs, notes);
}

function addSafetyNotes(readings, notes) {
  if (readings.totalChlorine !== null && readings.freeChlorine !== null) {
    const combined = readings.totalChlorine - readings.freeChlorine;
    if (combined > 0.5) {
      notes.push({
        type: "warning",
        text: `Combined chlorine appears elevated at about ${rounded(combined, 1)} ppm. Consider oxidising/shocking according to company procedure.`
      });
    }
  }

  if (readings.ph !== null && (readings.ph < 7 || readings.ph > 8)) {
    notes.push({
      type: "warning",
      text: "pH is outside the normal operating range. Dose in stages and retest after circulation."
    });
  }

  if (readings.cya !== null && readings.cya > 80) {
    notes.push({
      type: "warning",
      text: "Stabiliser is high. Avoid adding more CYA and consider dilution advice."
    });
  }

  if (readings.copper !== null && readings.copper > 0.3) {
    notes.push({
      type: "warning",
      text: "Copper is elevated. Avoid copper-based products and consider stain/metal treatment."
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
    els.photoPreview.src = reader.result;
    els.photoPreviewWrap.classList.remove("hidden");
  });
  reader.readAsDataURL(file);
}

els.settingsButton.addEventListener("click", openSettings);
els.saveSettingsButton.addEventListener("click", saveSettings);
els.resetSettingsButton.addEventListener("click", resetSettings);
els.newPoolButton.addEventListener("click", () => {
  clearPoolForm();
  setStatus("New pool ready. Save it once the volume is entered.", "");
});
els.savePoolButton.addEventListener("click", savePool);
els.poolSelect.addEventListener("change", (event) => {
  activePoolId = event.target.value;
  localStorage.setItem(STORE_KEYS.activePool, activePoolId);
  fillPoolForm(getActivePool());
});
els.resultPhoto.addEventListener("change", handlePhotoUpload);
els.sampleButton.addEventListener("click", setSampleReadings);
els.calculateButton.addEventListener("click", calculateDoseGuide);
els.clearHistoryButton.addEventListener("click", () => {
  history = [];
  saveJson(STORE_KEYS.history, history);
  renderHistory();
});

renderPoolOptions();
renderHistory();
