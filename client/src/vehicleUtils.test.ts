import { describe, expect, it } from "vitest";
import { lateness, routeLabel, status, vehicleType } from "./vehicleUtils";

describe("vehicleType", () => {
  it("classifies SEPTA Metro subway routes", () => {
    expect(vehicleType("M1")).toBe("subway");
    expect(vehicleType("b2")).toBe("subway");
    expect(vehicleType("L3")).toBe("subway");
  });

  it("classifies SEPTA Metro trolley routes", () => {
    expect(vehicleType("T1")).toBe("trolley");
    expect(vehicleType("d1")).toBe("trolley");
    expect(vehicleType("G2")).toBe("trolley");
  });

  it("classifies legacy numeric trolley routes", () => {
    expect(vehicleType("10")).toBe("trolley");
    expect(vehicleType("101")).toBe("trolley");
  });

  it("defaults everything else to bus", () => {
    expect(vehicleType("14")).toBe("bus");
    expect(vehicleType("MARKET-FRANKFORD OWL")).toBe("bus");
  });
});

describe("routeLabel", () => {
  it("appends legacy trolley numbers for Metro codes", () => {
    expect(routeLabel("T1")).toBe("T1 (10)");
    expect(routeLabel("t5")).toBe("t5 (36)");
  });

  it("returns the route unchanged when there is no legacy mapping", () => {
    expect(routeLabel("14")).toBe("14");
    expect(routeLabel("M1")).toBe("M1");
  });
});

describe("lateness", () => {
  it("formats positive, negative, and zero values", () => {
    expect(lateness(3)).toBe("3 min late");
    expect(lateness(-2)).toBe("2 min early");
    expect(lateness(0)).toBe("On time");
  });

  it("returns null when lateness is missing", () => {
    expect(lateness(undefined)).toBeNull();
  });
});

describe("status", () => {
  it("treats small deviations as on time", () => {
    expect(status(0)).toBe("onTime");
    expect(status(2)).toBe("onTime");
    expect(status(-2)).toBe("onTime");
  });

  it("classifies clearly late and early vehicles", () => {
    expect(status(3)).toBe("late");
    expect(status(-3)).toBe("early");
  });

  it("returns unknown when lateness is missing", () => {
    expect(status(undefined)).toBe("unknown");
  });
});
