import { StatusFilter, VehicleType } from "./types";

// SEPTA's TransitView feed has no vehicle-type field, so derive it from the
// SEPTA Metro route code: B/L/M = subway-grade rail, T/D/G = trolley lines.
// The numeric set is a fallback for the legacy (pre-Metro) trolley route names.
const LEGACY_TROLLEY_ROUTES = new Set([
  "10",
  "11",
  "13",
  "15",
  "34",
  "36",
  "101",
  "102",
]);

// Maps the new SEPTA Metro trolley codes to their legacy (pre-Metro) route
// numbers, so riders who still know the lines by number can recognize them.
const TROLLEY_LEGACY_NUMBERS: Record<string, string> = {
  T1: "10",
  T2: "11",
  T3: "13",
  T4: "34",
  T5: "36",
  D1: "15",
  G1: "101",
  G2: "102",
};

const ON_TIME_THRESHOLD = 2;

export function vehicleType(route: string): VehicleType {
  const r = String(route).toUpperCase();
  if (/^[BLM]\d+$/.test(r)) return "subway";
  if (/^[TDG]\d+$/.test(r)) return "trolley";
  if (LEGACY_TROLLEY_ROUTES.has(r)) return "trolley";
  return "bus";
}

export function routeLabel(route: string): string {
  const legacy = TROLLEY_LEGACY_NUMBERS[String(route).toUpperCase()];
  return legacy ? `${route} (${legacy})` : String(route);
}

export function lateness(late: number | undefined): string | null {
  if (typeof late !== "number") return null;
  if (late > 0) return `${late} min late`;
  if (late < 0) return `${Math.abs(late)} min early`;
  return "On time";
}

export function status(late: number | undefined): Exclude<StatusFilter, "all"> {
  if (typeof late !== "number") return "unknown";
  if (late > ON_TIME_THRESHOLD) return "late";
  if (late < -ON_TIME_THRESHOLD) return "early";
  return "onTime";
}
