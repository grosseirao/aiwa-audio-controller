export const UUID = Object.freeze({
  batteryService: 0x180f,
  batteryLevel: 0x2a19,
  deviceService: 0xae50,
  deviceName: 0xae51,
  deviceNameExtra: 0xae52,
  statusService: 0xae58,
  batteryLive: 0xae61,
  hardwareVersion: 0xae62,
  eqPreset: 0xae63,
  liveStatus: 0xae65,
  audioService: 0xae0b,
  boostWrite: 0xae0c,
  boostRead: 0xae0d,
  customEq: 0xae21,
  effectsService: 0xae40,
  djEffect: 0xae41,
  sleepTimer: 0xae45,
  lightService: 0xae80,
  lightStatus: 0xae81,
  playback: 0xae82,
  repeat: 0xae83,
  track: 0xae84,
  source: 0xae85,
  usbRecord: 0xae86,
  lightMode: 0xae87,
  lightColor: 0xae88,
  lightIntensity: 0xae89,
  lightPower: 0xae90,
  lightSnapshot: 0xae91,
  lightLiveState: 0xae92,
  eqLiveState: 0xae94,
  usbRecordState: 0xae95,
});

export const OPTIONAL_SERVICES = Object.freeze([
  UUID.batteryService,
  UUID.deviceService,
  UUID.statusService,
  UUID.audioService,
  UUID.effectsService,
  UUID.lightService,
]);

export const EQ_PRESETS = Object.freeze([
  { name: "AIWA", value: 0, bands: [0, 0, 0] },
  { name: "Rock", value: 1, bands: [-2, 0, -3] },
  { name: "Pop", value: 2, bands: [-4, 2, 0] },
  { name: "Intense", value: 3, bands: [-6, 0, 0] },
  { name: "Classic", value: 4, bands: [-4, -2, 0] },
  { name: "Jazz", value: 5, bands: [0, -4, -2] },
  { name: "Personalizado", value: 6, bands: [0, 0, 0] },
]);

export const LIGHT_MODES = Object.freeze([
  "RGB 1",
  "RGB 2",
  "RGB 3",
  "RGB 4",
  "RGB 5",
  "Cores 1",
  "Cores 2",
  "Cores 3",
  "Cores 4",
]);

export function canonicalUuid(shortUuid) {
  return `0000${shortUuid.toString(16).padStart(4, "0")}-0000-1000-8000-00805f9b34fb`;
}

export function clampByte(value, min = 0, max = 255) {
  return Math.min(max, Math.max(min, Math.round(Number(value))));
}

export function decodeBatteryLevel(rawValue) {
  const raw = clampByte(rawValue, 0, 100);
  if (raw > 20) return raw;
  const firmwareSteps = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  return firmwareSteps[raw] * 5;
}

export function eqBandCommand(band, gain) {
  const safeBand = clampByte(band, 1, 3);
  const safeGain = Math.min(9, Math.max(-9, Math.round(Number(gain))));
  return Uint8Array.of(safeBand, safeGain > 0 ? 1 : 0, Math.abs(safeGain));
}

export function decodeEqBand(bytes) {
  if (!bytes || bytes.length < 3) return null;
  const band = Number(bytes[0]);
  if (band < 1 || band > 3) return null;
  const magnitude = Math.min(9, Number(bytes[2]));
  return { band, gain: (Number(bytes[1]) === 0 ? -1 : 1) * magnitude };
}

export function rgbCommand(hexColor, position = 50, animated = true) {
  const normalized = String(hexColor).replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new TypeError("Cor RGB inválida");
  const bytes = normalized.match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  return Uint8Array.of(...bytes, clampByte(position, 0, 100), animated ? 1 : 0);
}

export function textFromDataView(value) {
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new TextDecoder().decode(bytes).replace(/\0+$/g, "").trim();
}

export function bytesFromDataView(value) {
  return [...new Uint8Array(value.buffer, value.byteOffset, value.byteLength)];
}
