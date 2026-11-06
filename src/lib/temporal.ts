// import { Temporal as PolyfillTemporal } from "@js-temporal/polyfill";

// (globalThis as any).Temporal = PolyfillTemporal;

// export const Temporal = PolyfillTemporal;


import { Temporal } from "@js-temporal/polyfill";

Object.defineProperty(globalThis, "Temporal", {
  value: Temporal,
  writable: true,
  configurable: true,
});