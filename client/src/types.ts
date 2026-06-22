export type VehicleType = "bus" | "trolley" | "subway";
export type StatusFilter = "all" | "onTime" | "late" | "early" | "unknown";
export type TypeFilter = "all" | VehicleType;

/** Raw + normalized fields from the SEPTA proxy */
export interface Vehicle {
  lat: string;
  lng: string;
  label?: string;
  VehicleID: string;
  route_id?: string;
  BlockID?: string;
  Direction?: string;
  destination?: string;
  Offset?: string;
  heading?: number;
  late?: number;
  Offset_sec?: string;
  trip?: string;
  route: string;
  name: string;
  coordinates: [number, number];
}

export interface HoverInfo {
  object: Vehicle;
  x: number;
  y: number;
}

/** Upstream SEPTA TransitView vehicle before normalization */
export interface SeptaRawVehicle {
  lat: string;
  lng: string;
  VehicleID: string;
  [key: string]: unknown;
}

export type SeptaRoutesMap = Record<string, SeptaRawVehicle[]>;

export interface SeptaTransitViewResponse {
  routes: SeptaRoutesMap[];
}

export function normalizeVehicles(routes: SeptaRoutesMap): Vehicle[] {
  const vehicles: Vehicle[] = [];
  for (const route of Object.keys(routes)) {
    for (const vehicle of routes[route]) {
      const { lat, lng, VehicleID } = vehicle;
      vehicles.push({
        ...vehicle,
        route,
        name: VehicleID,
        coordinates: [parseFloat(lng), parseFloat(lat)],
      });
    }
  }
  return vehicles;
}

export function isVehicleArray(data: unknown): data is Vehicle[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "VehicleID" in item &&
        "coordinates" in item &&
        "route" in item,
    )
  );
}

export function isSeptaTransitViewResponse(
  data: unknown,
): data is SeptaTransitViewResponse {
  if (typeof data !== "object" || data === null) return false;
  const routes = (data as SeptaTransitViewResponse).routes;
  return (
    Array.isArray(routes) && routes.length > 0 && typeof routes[0] === "object"
  );
}
