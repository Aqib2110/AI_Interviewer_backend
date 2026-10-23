import { Temporal as PolyfillTemporal } from "@js-temporal/polyfill";

(globalThis as any).Temporal = PolyfillTemporal;

export const Temporal = PolyfillTemporal;