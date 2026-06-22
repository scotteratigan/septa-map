import { describe, expect, it } from "vitest";
import {
  isSeptaTransitViewResponse,
  isVehicleArray,
  normalizeVehicles,
} from "./types";

describe("normalizeVehicles", () => {
  it("flattens route buckets into vehicles with coordinates", () => {
    const routes = {
      "14": [{ lat: "39.96", lng: "-75.20", VehicleID: "1001", heading: 90 }],
      "10": [{ lat: "39.95", lng: "-75.18", VehicleID: "2002" }],
    };

    const vehicles = normalizeVehicles(routes);

    expect(vehicles).toHaveLength(2);
    expect(vehicles.find((vehicle) => vehicle.route === "14")).toMatchObject({
      route: "14",
      VehicleID: "1001",
      name: "1001",
      coordinates: [-75.2, 39.96],
    });
    expect(vehicles.find((vehicle) => vehicle.route === "10")).toMatchObject({
      route: "10",
      VehicleID: "2002",
      coordinates: [-75.18, 39.95],
    });
  });

  it("preserves extra fields from the upstream feed", () => {
    const routes = {
      "47": [
        {
          lat: "39.92",
          lng: "-75.15",
          VehicleID: "3003",
          destination: "Whitman Plaza",
          Direction: "SouthBound",
        },
      ],
    };

    const [vehicle] = normalizeVehicles(routes);

    expect(vehicle.destination).toBe("Whitman Plaza");
    expect(vehicle.Direction).toBe("SouthBound");
  });
});

describe("isVehicleArray", () => {
  it("accepts normalized vehicle arrays", () => {
    expect(
      isVehicleArray([
        {
          VehicleID: "1",
          route: "14",
          coordinates: [-75.1, 39.9],
        },
      ]),
    ).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(isVehicleArray(null)).toBe(false);
    expect(isVehicleArray([])).toBe(true);
    expect(isVehicleArray([{ VehicleID: "1" }])).toBe(false);
    expect(isVehicleArray({ routes: [] })).toBe(false);
  });
});

describe("isSeptaTransitViewResponse", () => {
  it("accepts the upstream TransitView envelope", () => {
    expect(
      isSeptaTransitViewResponse({
        routes: [{ "14": [{ lat: "1", lng: "2", VehicleID: "1" }] }],
      }),
    ).toBe(true);
  });

  it("rejects unexpected shapes", () => {
    expect(isSeptaTransitViewResponse(null)).toBe(false);
    expect(isSeptaTransitViewResponse({ routes: [] })).toBe(false);
    expect(isSeptaTransitViewResponse({ notRoutes: [] })).toBe(false);
  });
});
