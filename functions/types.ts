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

export interface Vehicle {
  lat: string;
  lng: string;
  VehicleID: string;
  route: string;
  name: string;
  coordinates: [number, number];
  [key: string]: unknown;
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
