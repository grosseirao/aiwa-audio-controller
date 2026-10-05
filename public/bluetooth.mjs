import { OPTIONAL_SERVICES, UUID, bytesFromDataView, canonicalUuid, decodeBatteryLevel, textFromDataView } from "./protocol.mjs";

export class AiwaBluetooth extends EventTarget {
  #device = null;
  #server = null;
  #characteristics = new Map();
  #writeQueue = Promise.resolve();

  get supported() {
    return Boolean(navigator.bluetooth);
  }

  get connected() {
    return Boolean(this.#device?.gatt?.connected);
  }

  get deviceName() {
    return this.#device?.name || "AIWA PB-06";
  }

  get deviceId() {
    return this.#device?.id || "";
  }

  async connect() {
    if (!this.supported) throw new Error("Web Bluetooth não está disponível neste navegador.");
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: OPTIONAL_SERVICES.map(canonicalUuid),
    });
    return this.#connectDevice(device);
  }

  async reconnect(deviceId) {
    if (!this.supported || typeof navigator.bluetooth.getDevices !== "function") return null;
    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((item) => item.id === deviceId);
    if (!device) return null;
    return this.#connectDevice(device);
  }

  async #connectDevice(device) {
    this.#device = device;
    this.#device.addEventListener("gattserverdisconnected", () => {
      this.#characteristics.clear();
      this.dispatchEvent(new CustomEvent("connection", { detail: { connected: false } }));
    }, { once: true });

    this.#server = await this.#device.gatt.connect();
    await this.#discover();
    await this.#subscribe();
    const state = await this.readState();
    this.dispatchEvent(new CustomEvent("connection", { detail: { connected: true, name: this.deviceName } }));
    return state;
  }

  disconnect() {
    this.#device?.gatt?.disconnect();
  }

  async #discover() {
    this.#characteristics.clear();
    for (const serviceId of OPTIONAL_SERVICES) {
      try {
        const service = await this.#server.getPrimaryService(canonicalUuid(serviceId));
        const characteristics = await service.getCharacteristics();
        for (const characteristic of characteristics) {
          this.#characteristics.set(characteristic.uuid.toLowerCase(), characteristic);
        }
      } catch {
        // Algumas revisões da PB-06 não expõem todos os serviços.
      }
    }

    if (!this.#characteristics.size) {
      throw new Error("O dispositivo selecionado não expõe os serviços de controle da PB-06.");
    }
  }

  characteristic(shortUuid) {
    return this.#characteristics.get(canonicalUuid(shortUuid));
  }

  async #subscribe() {
    const notifyIds = [UUID.batteryLevel, UUID.batteryLive, UUID.liveStatus, UUID.lightStatus, UUID.lightLiveState, UUID.eqLiveState, UUID.usbRecordState];
    for (const id of notifyIds) {
      const characteristic = this.characteristic(id);
      if (!characteristic?.properties.notify && !characteristic?.properties.indicate) continue;
      try {
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", (event) => this.#handleNotification(id, event.target.value));
        if ([UUID.lightStatus, UUID.lightLiveState, UUID.eqLiveState].includes(id)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch {
        // Leituras explícitas ainda mantêm os controles utilizáveis.
      }
    }
  }

  #handleNotification(id, value) {
    const bytes = bytesFromDataView(value);
    this.dispatchEvent(new CustomEvent("notification", { detail: { id, bytes } }));
  }

  async read(shortUuid) {
    const characteristic = this.characteristic(shortUuid);
    if (!characteristic?.properties.read) return null;
    return characteristic.readValue();
  }

  async write(shortUuid, bytes) {
    const characteristic = this.characteristic(shortUuid);
    if (!characteristic) throw new Error(`Comando indisponível (característica ${shortUuid.toString(16).toUpperCase()}).`);
    const payload = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);

    this.#writeQueue = this.#writeQueue.then(async () => {
      if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(payload);
      } else if (characteristic.writeValueWithResponse) {
        await characteristic.writeValueWithResponse(payload);
      } else {
        await characteristic.writeValue(payload);
      }
      this.dispatchEvent(new CustomEvent("write", { detail: { id: shortUuid, bytes: [...payload] } }));
    });
    return this.#writeQueue;
  }

  async readState() {
    const state = { name: this.deviceName };
    const readSafely = async (id) => {
      try {
        return await this.read(id);
      } catch {
        return null;
      }
    };

    const [name, nameExtra, battery, hardware, boost, lights, liveLights, customEq] = await Promise.all([
      readSafely(UUID.deviceName),
      readSafely(UUID.deviceNameExtra),
      readSafely(UUID.batteryLevel),
      readSafely(UUID.hardwareVersion),
      readSafely(UUID.boostRead),
      readSafely(UUID.lightSnapshot),
      readSafely(UUID.lightLiveState),
      readSafely(UUID.eqLiveState),
    ]);

    if (name) state.name = textFromDataView(name) + (nameExtra ? textFromDataView(nameExtra) : "");
    if (battery) {
      state.batteryRaw = battery.getUint8(0);
      state.battery = decodeBatteryLevel(state.batteryRaw);
    }
    if (hardware) state.hardware = hardware.getUint8(0);
    if (boost) state.boost = boost.getUint8(0) === 1;
    if (lights) state.lights = bytesFromDataView(lights);
    if (liveLights) state.liveLights = bytesFromDataView(liveLights);
    if (customEq) state.customEq = bytesFromDataView(customEq);
    return state;
  }
}
