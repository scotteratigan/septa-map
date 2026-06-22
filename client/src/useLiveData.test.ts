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
      expect(result.current).toHaveLength(mockVehicles.length);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith("/septa");
    expect(result.current[0].VehicleID).toBe("bus-late");
  });

  it("ignores invalid API responses", async () => {
    mockedAxios.get.mockResolvedValue({ data: { error: "nope" } });

    const { result } = renderHook(() => useLiveData());

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    expect(result.current).toEqual([]);
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
      .mockResolvedValueOnce({ data: secondPoll });

    const { result } = renderHook(() => useLiveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toHaveLength(firstPoll.length);
    const startLng = result.current[0].coordinates[0];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current[0].coordinates[0]).not.toBe(startLng);
  });
});
