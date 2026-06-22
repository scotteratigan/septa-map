import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
  getAnimationSteps,
  getConnectionHintPollIntervalMs,
  getNextPollIntervalMs,
  resolvePollIntervalMs,
} from "./pollInterval";

describe("getNextPollIntervalMs", () => {
  it("uses the base interval for fast responses", () => {
    expect(getNextPollIntervalMs(500, false)).toBe(BASE_POLL_INTERVAL_MS);
  });

  it("backs off for slower responses", () => {
    expect(getNextPollIntervalMs(2_500, false)).toBe(20_000);
    expect(getNextPollIntervalMs(6_000, false)).toBe(30_000);
    expect(getNextPollIntervalMs(12_000, false)).toBe(MAX_POLL_INTERVAL_MS);
  });

  it("uses the maximum interval after errors", () => {
    expect(getNextPollIntervalMs(100, true)).toBe(MAX_POLL_INTERVAL_MS);
  });
});

describe("getConnectionHintPollIntervalMs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when the Network Information API is unavailable", () => {
    vi.stubGlobal("navigator", { connection: undefined });
    expect(getConnectionHintPollIntervalMs()).toBeNull();
  });

  it("respects save-data and effective connection types", () => {
    vi.stubGlobal("navigator", {
      connection: { saveData: true, effectiveType: "4g" },
    });
    expect(getConnectionHintPollIntervalMs()).toBe(MAX_POLL_INTERVAL_MS);

    vi.stubGlobal("navigator", {
      connection: { saveData: false, effectiveType: "3g" },
    });
    expect(getConnectionHintPollIntervalMs()).toBe(20_000);
  });
});

describe("resolvePollIntervalMs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers the slower of measured RTT and connection hints", () => {
    vi.stubGlobal("navigator", {
      connection: { saveData: false, effectiveType: "3g" },
    });

    expect(resolvePollIntervalMs(500, false)).toBe(20_000);
  });
});

describe("getAnimationSteps", () => {
  it("scales animation frames to the poll interval", () => {
    expect(getAnimationSteps(10_000)).toBe(10);
    expect(getAnimationSteps(30_000)).toBe(30);
  });
});
