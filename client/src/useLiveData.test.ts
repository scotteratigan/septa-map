import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import useLiveData from "./useLiveData";
import { mockVehicles } from "./testFixtures";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios);

describe("useLiveData", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("loads vehicle data from /septa on mount", async () => {
    mockedAxios.get.mockResolvedValue({ data: mockVehicles });

    const { result } = renderHook(() => useLiveData());

    await waitFor(() => {
      expect(result.current.vehicles).toHaveLength(mockVehicles.length);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith("/septa", {
      timeout: 30_000,
    });
    expect(result.current.vehicles[0].VehicleID).toBe("bus-late");
  });

  it("ignores invalid API responses", async () => {
    mockedAxios.get.mockResolvedValue({ data: { error: "nope" } });

    const { result } = renderHook(() => useLiveData());

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    expect(result.current.vehicles).toEqual([]);
  });

  it("interpolates coordinates between polls", async () => {
    vi.useFakeTimers();

    const firstPoll = mockVehicles.map((vehicle) => ({
      ...vehicle,
      coordinates: [vehicle.coordinates[0], vehicle.coordinates[1]] as [
        number,
        number,
      ],
    }));
    const secondPoll = mockVehicles.map((vehicle, index) => ({
      ...vehicle,
      coordinates: [
        vehicle.coordinates[0] + (index + 1) * 0.01,
        vehicle.coordinates[1] + (index + 1) * 0.01,
      ] as [number, number],
    }));

    mockedAxios.get
      .mockResolvedValueOnce({ data: firstPoll })
      .mockResolvedValueOnce({ data: secondPoll })
      .mockResolvedValue({ data: secondPoll });

    const { result } = renderHook(() => useLiveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(result.current.vehicles).toHaveLength(firstPoll.length);
    const startLng = result.current.vehicles[0].coordinates[0];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();
    });

    expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.current.vehicles[0].coordinates[0]).not.toBe(startLng);
  });

  it("pauses polling while the tab is hidden", async () => {
    vi.useFakeTimers();
    mockedAxios.get.mockResolvedValue({ data: mockVehicles });
    const hiddenSpy = vi.spyOn(document, "hidden", "get");

    const { result } = renderHook(() => useLiveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    hiddenSpy.mockReturnValue(true);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(result.current.vehicles).toHaveLength(mockVehicles.length);

    hiddenSpy.mockRestore();
  });

  it("expires the session after five visible minutes", async () => {
    vi.useFakeTimers();
    mockedAxios.get.mockResolvedValue({ data: mockVehicles });

    const { result } = renderHook(() => useLiveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isSessionExpired).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);
    });

    expect(result.current.isSessionExpired).toBe(true);

    const callsAtExpiry = mockedAxios.get.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(callsAtExpiry);
  });

  it("refresh resumes polling after session expiry", async () => {
    vi.useFakeTimers();
    mockedAxios.get.mockResolvedValue({ data: mockVehicles });

    const { result } = renderHook(() => useLiveData());

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1);
    });

    expect(result.current.isSessionExpired).toBe(true);
    const callsAtExpiry = mockedAxios.get.mock.calls.length;

    await act(async () => {
      result.current.refresh();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isSessionExpired).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledTimes(callsAtExpiry + 1);
  });

  it("polls less frequently after a slow response", async () => {
    vi.useFakeTimers();

    mockedAxios.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: mockVehicles }), 6_000);
        }),
    );

    renderHook(() => useLiveData());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
      await Promise.resolve();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
      await Promise.resolve();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await Promise.resolve();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});
