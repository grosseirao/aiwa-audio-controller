import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUuid, decodeBatteryLevel, decodeEqBand, eqBandCommand, rgbCommand } from "../public/protocol.mjs";

test("canonicalUuid expande UUID Bluetooth de 16 bits", () => {
  assert.equal(canonicalUuid(0xae80), "0000ae80-0000-1000-8000-00805f9b34fb");
});

test("eqBandCommand representa ganho com sinal e magnitude", () => {
  assert.deepEqual([...eqBandCommand(1, -7)], [1, 0, 7]);
  assert.deepEqual([...eqBandCommand(3, 4)], [3, 1, 4]);
  assert.deepEqual([...eqBandCommand(2, 99)], [2, 1, 9]);
});

test("decodeEqBand interpreta o estado personalizado salvo na caixa", () => {
  assert.deepEqual(decodeEqBand([1, 0, 7]), { band: 1, gain: -7 });
  assert.deepEqual(decodeEqBand([3, 1, 4]), { band: 3, gain: 4 });
  assert.equal(decodeEqBand([9, 1, 2]), null);
});

test("decodeBatteryLevel converte os 20 níveis usados pela PB-06", () => {
  assert.equal(decodeBatteryLevel(20), 100);
  assert.equal(decodeBatteryLevel(10), 50);
  assert.equal(decodeBatteryLevel(4), 5);
  assert.equal(decodeBatteryLevel(83), 83);
});

test("rgbCommand converte cor, posição e modo", () => {
  assert.deepEqual([...rgbCommand("#e20b1a", 50, true)], [226, 11, 26, 50, 1]);
  assert.throws(() => rgbCommand("red"), /inválida/);
});
