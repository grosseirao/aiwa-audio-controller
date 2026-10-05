import { AiwaBluetooth } from "./bluetooth.mjs";
import { EQ_PRESETS, LIGHT_MODES, UUID, decodeBatteryLevel, decodeEqBand, eqBandCommand, rgbCommand } from "./protocol.mjs";

const bluetooth = new AiwaBluetooth();
const EQ_STORAGE_KEY = "aiwa-pb06-equalizer-v1";
const DEVICE_STORAGE_KEY = "aiwa-pb06-device-id-v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const controls = $$('[data-control]');
const logElement = $("#log");
const toastElement = $("#toast");
let toastTimer;
let playing = false;
let colorTimer;
let intensityTimer;

function log(message, kind = "info") {
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  const line = document.createElement("div");
  line.textContent = `${time}  ${kind === "error" ? "ERRO  " : ""}${message}`;
  logElement.prepend(line);
}

function toast(message, error = false) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.className = `toast show${error ? " error" : ""}`;
  toastTimer = setTimeout(() => (toastElement.className = "toast"), 3200);
}

function setConnected(connected) {
  $("#connectionDot").classList.toggle("connected", connected);
  $("#connectionText").textContent = connected ? "Conectada" : "Desconectada";
  $("#deviceStatus").textContent = connected ? "Online" : "Aguardando";
  $("#connectButton").textContent = connected ? "Desconectar" : "Conectar caixa";
  controls.forEach((control) => (control.disabled = !connected));
}

async function command(label, callback) {
  if (!bluetooth.connected) return toast("Conecte a PB-06 primeiro.", true);
  try {
    await callback();
    log(label);
  } catch (error) {
    log(error.message, "error");
    toast(error.message, true);
  }
}

function fillOptions() {
  $("#eqPreset").innerHTML = EQ_PRESETS.map((preset) => `<option value="${preset.value}">${preset.name}</option>`).join("");
  $("#lightMode").innerHTML = LIGHT_MODES.map((mode, index) => `<option value="${index}">${mode}</option>`).join("");
}

function updateEqUi(bands) {
  ["bass", "mid", "treble"].forEach((id, index) => {
    $(`#${id}`).value = bands[index];
    $(`#${id}Output`).value = bands[index] > 0 ? `+${bands[index]}` : bands[index];
  });
}

function currentEqBands() {
  return ["bass", "mid", "treble"].map((id) => Number($(`#${id}`).value));
}

function loadSavedEq() {
  try {
    const saved = JSON.parse(localStorage.getItem(EQ_STORAGE_KEY));
    if (!saved || !Number.isInteger(saved.preset) || !Array.isArray(saved.bands) || saved.bands.length !== 3) return null;
    return {
      preset: Math.min(6, Math.max(0, saved.preset)),
      bands: saved.bands.map((value) => Math.min(9, Math.max(-9, Number(value) || 0))),
    };
  } catch {
    return null;
  }
}

function saveEq(preset = Number($("#eqPreset").value), bands = currentEqBands()) {
  try {
    localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({ preset, bands }));
  } catch (error) {
    log(`Não foi possível salvar o equalizador: ${error.message}`, "error");
  }
}

async function restoreSavedEq() {
  const saved = loadSavedEq();
  if (!saved) return false;
  $("#eqPreset").value = String(saved.preset);
  updateEqUi(saved.bands);
  await bluetooth.write(UUID.eqPreset, [saved.preset]);
  if (saved.preset === 6) {
    for (let band = 1; band <= 3; band += 1) {
      await bluetooth.write(UUID.customEq, eqBandCommand(band, saved.bands[band - 1]));
    }
  }
  log(`Equalizador restaurado do navegador · ${saved.bands.join(" / ")} dB`);
  return true;
}

function applyCustomEq(bytes) {
  const decoded = decodeEqBand(bytes);
  if (!decoded) return false;
  const ids = ["bass", "mid", "treble"];
  const id = ids[decoded.band - 1];
  $(`#${id}`).value = decoded.gain;
  $(`#${id}Output`).value = decoded.gain > 0 ? `+${decoded.gain}` : decoded.gain;
  $("#eqPreset").value = "6";
  log(`Equalizador sincronizado · ${id}: ${decoded.gain} dB`);
  return true;
}

function applyBattery(rawValue) {
  const battery = decodeBatteryLevel(rawValue);
  $("#batteryValue").textContent = `${battery}%`;
  log(`Bateria sincronizada · bruto ${rawValue}, convertido ${battery}%`);
}

function applyLiveState(bytes) {
  if (!bytes || bytes.length < 6) return;
  $("#source").value = bytes[0];
  $("#repeat").value = bytes[1];
  $("#lightsPower").checked = bytes[2] === 0;
  $("#lightMode").value = bytes[3];
  $("#lightModeLabel").textContent = LIGHT_MODES[bytes[3]] || `Efeito ${bytes[3] + 1}`;
  const preset = bytes[9];
  if (preset >= 0 && preset < EQ_PRESETS.length) {
    $("#eqPreset").value = String(preset);
    if (preset !== 6) updateEqUi(EQ_PRESETS[preset].bands);
  }
}

function updateLightPreview() {
  const color = $("#lightColor").value;
  const intensity = $("#lightIntensity").value;
  $("#lightPreview").style.setProperty("--light-color", color);
  $("#lightPreview").style.setProperty("--light-intensity", intensity);
  $("#intensityOutput").textContent = `${intensity}%`;
}

async function connect() {
  if (bluetooth.connected) {
    bluetooth.disconnect();
    return;
  }
  $("#connectButton").disabled = true;
  $("#connectButton").textContent = "Procurando…";
  try {
    const state = await bluetooth.connect();
    await finishConnection(state, false);
  } catch (error) {
    setConnected(false);
    log(error.message, "error");
    toast(error.name === "NotFoundError" ? "Seleção cancelada." : error.message, true);
  } finally {
    $("#connectButton").disabled = false;
  }
}

async function finishConnection(state, automatic) {
  $("#deviceName").textContent = state.name || bluetooth.deviceName;
  $("#batteryValue").textContent = Number.isFinite(state.battery) ? `${state.battery}%` : "—";
  if (Number.isFinite(state.batteryRaw)) log(`Bateria sincronizada · bruto ${state.batteryRaw}, convertido ${state.battery}%`);
  $("#hardwareValue").textContent = Number.isFinite(state.hardware) ? `v${state.hardware}` : "—";
  $("#boost").checked = Boolean(state.boost);
  if (state.lights?.length) {
    $("#lightsPower").checked = state.lights[0] === 0;
    $("#lightMode").value = state.lights[1] ?? 0;
    $("#lightModeLabel").textContent = LIGHT_MODES[state.lights[1]] || LIGHT_MODES[0];
    $("#source").value = state.lights[8] ?? 0;
    playing = state.lights[9] === 1;
    $("#playButton").textContent = playing ? "❚❚" : "▶";
  }
  applyLiveState(state.liveLights);
  applyCustomEq(state.customEq);
  setConnected(true);
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, bluetooth.deviceId);
  } catch {
    // A conexão continua funcional quando o armazenamento está bloqueado.
  }
  try {
    await restoreSavedEq();
  } catch (error) {
    log(`A caixa conectou, mas o equalizador salvo não pôde ser restaurado: ${error.message}`, "error");
  }
  toast(automatic ? "PB-06 reconectada automaticamente." : "PB-06 conectada com sucesso.");
  log(`${automatic ? "Reconectada" : "Conectada"} a ${state.name || bluetooth.deviceName}`);
}

async function reconnectSavedDevice() {
  let deviceId;
  try {
    deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    return;
  }
  if (!deviceId || typeof navigator.bluetooth?.getDevices !== "function") return;

  $("#connectButton").disabled = true;
  $("#connectButton").textContent = "Reconectando…";
  $("#deviceStatus").textContent = "Reconectando";
  try {
    const state = await bluetooth.reconnect(deviceId);
    if (state) await finishConnection(state, true);
  } catch (error) {
    setConnected(false);
    log(`Reconexão automática adiada: ${error.message}`);
  } finally {
    $("#connectButton").disabled = false;
    if (!bluetooth.connected) $("#connectButton").textContent = "Conectar caixa";
  }
}

bluetooth.addEventListener("connection", (event) => {
  setConnected(event.detail.connected);
  if (!event.detail.connected) {
    toast("A caixa foi desconectada.", true);
    log("Conexão encerrada");
  }
});

bluetooth.addEventListener("write", (event) => {
  const id = event.detail.id.toString(16).toUpperCase();
  log(`TX ${id} · ${event.detail.bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}`);
});

bluetooth.addEventListener("notification", (event) => {
  const { id, bytes } = event.detail;
  log(`RX ${id.toString(16).toUpperCase()} · ${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}`);
  if (id === UUID.lightLiveState) applyLiveState(bytes);
  if (id === UUID.eqLiveState) applyCustomEq(bytes);
  if ((id === UUID.batteryLevel || id === UUID.batteryLive) && bytes.length) applyBattery(bytes[0]);
});

$("#connectButton").addEventListener("click", connect);

$("#eqPreset").addEventListener("change", (event) => {
  const preset = EQ_PRESETS[Number(event.target.value)];
  updateEqUi(preset.bands);
  saveEq(preset.value, preset.bands);
  command(`Equalizador: ${preset.name}`, () => bluetooth.write(UUID.eqPreset, [preset.value]));
});

[["bass", 1], ["mid", 2], ["treble", 3]].forEach(([id, band]) => {
  const input = $(`#${id}`);
  input.addEventListener("input", () => {
    $(`#${id}Output`).value = Number(input.value) > 0 ? `+${input.value}` : input.value;
    $("#eqPreset").value = "6";
  });
  input.addEventListener("change", () => command(`${id}: ${input.value} dB`, () => bluetooth.write(UUID.customEq, eqBandCommand(band, input.value))));
  input.addEventListener("change", () => saveEq(6, currentEqBands()));
});

$("#boost").addEventListener("change", (event) => command(`Boost ${event.target.checked ? "ligado" : "desligado"}`, () => bluetooth.write(UUID.boostWrite, [event.target.checked ? 1 : 0])));
$("#lightsPower").addEventListener("change", (event) => command(`Luzes ${event.target.checked ? "ligadas" : "desligadas"}`, () => bluetooth.write(UUID.lightPower, [event.target.checked ? 0 : 1])));
$("#lightMode").addEventListener("change", (event) => {
  $("#lightModeLabel").textContent = LIGHT_MODES[event.target.value];
  command(`Animação: ${LIGHT_MODES[event.target.value]}`, () => bluetooth.write(UUID.lightMode, [Number(event.target.value)]));
});
$("#lightColor").addEventListener("input", () => {
  updateLightPreview();
  clearTimeout(colorTimer);
  colorTimer = setTimeout(() => command(`Cor: ${$("#lightColor").value}`, () => bluetooth.write(UUID.lightColor, rgbCommand($("#lightColor").value, 50, Number($("#lightMode").value) < 5))), 160);
});
$("#lightIntensity").addEventListener("input", () => {
  updateLightPreview();
  clearTimeout(intensityTimer);
  intensityTimer = setTimeout(() => command(`Intensidade: ${$("#lightIntensity").value}%`, () => bluetooth.write(UUID.lightIntensity, [Number($("#lightIntensity").value)])), 120);
});

$("#source").addEventListener("change", (event) => command(`Fonte: ${event.target.selectedOptions[0].text}`, () => bluetooth.write(UUID.source, [Number(event.target.value)])));
$("#repeat").addEventListener("change", (event) => command(`Repetição: ${event.target.selectedOptions[0].text}`, () => bluetooth.write(UUID.repeat, [Number(event.target.value)])));
$("#sleepTimer").addEventListener("change", (event) => command(`Timer: ${event.target.selectedOptions[0].text}`, () => bluetooth.write(UUID.sleepTimer, [Number(event.target.value)])));

$$('[data-command]').forEach((button) => button.addEventListener("click", () => {
  const values = { previous: 0, next: 1, play: null };
  let value = values[button.dataset.command];
  if (button.dataset.command === "play") {
    playing = !playing;
    value = playing ? 1 : 0;
    button.textContent = playing ? "❚❚" : "▶";
  }
  command(`Reprodução: ${button.dataset.command}`, () => bluetooth.write(button.dataset.command === "play" ? UUID.playback : UUID.track, [value]));
}));

$$('[data-dj]').forEach((button) => button.addEventListener("click", () => {
  button.classList.add("active");
  setTimeout(() => button.classList.remove("active"), 1000);
  command(`Efeito ${button.textContent}`, () => bluetooth.write(UUID.djEffect, [Number(button.dataset.dj)]));
}));

fillOptions();
const savedEq = loadSavedEq();
$("#eqPreset").value = String(savedEq?.preset ?? 0);
updateEqUi(savedEq?.bands ?? [0, 0, 0]);
updateLightPreview();
setConnected(false);
if (!bluetooth.supported) $("#unsupportedBanner").classList.remove("hidden");
log("Interface pronta. Ligue a PB-06 e clique em Conectar caixa.");
reconnectSavedDevice();
