import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ANIMATION_INTERVAL_MS,
  BASE_POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  getAnimationSteps,
  getConnectionHintPollIntervalMs,
  resolvePollIntervalMs,
} from "./pollInterval";
import { isVehicleArray, Vehicle } from "./types";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

type CoordinateMap = Record<string, [number, number]>;

export type LiveDataResult = {
  vehicles: Vehicle[];
  isSessionExpired: boolean;
  refresh: () => void;
};

// Polls the /septa proxy for live vehicle positions and smoothly interpolates
// each vehicle from its previous position to its newly reported one between
// polls, so the markers glide instead of teleporting. Polling pauses while the
// tab is hidden, stops after SESSION_TIMEOUT_MS of visible time, and backs off
// when requests are slow or fail.
export default function useLiveData(): LiveDataResult {
  const [displayData, setDisplayData] = useState<Vehicle[]>([]);
  const [isTabVisible, setIsTabVisible] = useState(() => !document.hidden);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const isLive = isTabVisible && !isSessionExpired;

  // Animation state lives in refs so the interval callbacks always read the
  // latest values without having to re-subscribe on every render.
  const fromRef = useRef<CoordinateMap>({});
  const toRef = useRef<CoordinateMap>({});
  const vehiclesRef = useRef<Vehicle[]>([]);
  const stepRef = useRef(0);
  const pollIntervalRef = useRef(
    getConnectionHintPollIntervalMs() ?? BASE_POLL_INTERVAL_MS,
  );
  const totalStepsRef = useRef(getAnimationSteps(pollIntervalRef.current));
  const isPollingRef = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);
  const isLiveRef = useRef(isLive);
  isLiveRef.current = isLive;

  const pollRef = useRef<() => Promise<void>>(() => Promise.resolve());

  function clearPollTimeout() {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  function scheduleNextPoll(delayMs: number) {
    clearPollTimeout();
    pollTimeoutRef.current = window.setTimeout(() => {
      void pollRef.current();
    }, delayMs);
  }

  function finalizePoll(durationMs: number, hadError: boolean) {
    pollIntervalRef.current = resolvePollIntervalMs(durationMs, hadError);
    totalStepsRef.current = getAnimationSteps(pollIntervalRef.current);

    if (isLiveRef.current) {
      scheduleNextPoll(pollIntervalRef.current);
    }
  }

  async function poll() {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    const start = performance.now();
    let hadError = false;

    try {
      const res = await axios.get<unknown>("/septa", {
        timeout: REQUEST_TIMEOUT_MS,
      });
      if (!isVehicleArray(res.data)) return;

      const nextTo: CoordinateMap = {};
      res.data.forEach((vehicle) => {
        nextTo[vehicle.VehicleID] = vehicle.coordinates;
      });

      // Start the next tween from each vehicle's last reported position. New
      // vehicles fall back to their fresh position so they appear in place
      // instead of animating in from [0, 0].
      const prevTo = toRef.current;
      const nextFrom: CoordinateMap = {};
      res.data.forEach((vehicle) => {
        const id = vehicle.VehicleID;
        nextFrom[id] = prevTo[id] || nextTo[id];
      });

      fromRef.current = nextFrom;
      toRef.current = nextTo;
      vehiclesRef.current = res.data;
      stepRef.current = 0;
      setDisplayData(res.data);
    } catch (err) {
      hadError = true;
      console.error("Failed to fetch SEPTA vehicle positions:", err);
    } finally {
      isPollingRef.current = false;
      finalizePoll(performance.now() - start, hadError);
    }
  }

  function animate() {
    const vehicles = vehiclesRef.current;
    if (vehicles.length === 0) return;

    const totalSteps = totalStepsRef.current;
    const t = Math.min(stepRef.current, totalSteps) / totalSteps;

    const frame = vehicles.map((vehicle) => {
      const id = vehicle.VehicleID;
      const from = fromRef.current[id] || vehicle.coordinates;
      const to = toRef.current[id] || vehicle.coordinates;
      const lng = from[0] + (to[0] - from[0]) * t;
      const lat = from[1] + (to[1] - from[1]) * t;
      return { ...vehicle, coordinates: [lng, lat] as [number, number] };
    });

    setDisplayData(frame);
    if (stepRef.current < totalSteps) stepRef.current += 1;
  }

  pollRef.current = poll;

  const refresh = useCallback(() => {
    setIsSessionExpired(false);
  }, []);

  useEffect(() => {
    if (isLive) {
      void pollRef.current();
    } else {
      clearPollTimeout();
    }
  }, [isLive]);

  useEffect(() => clearPollTimeout, []);

  useEffect(() => {
    function onVisibilityChange() {
      setIsTabVisible(!document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isTabVisible || isSessionExpired) return;
    const id = window.setTimeout(
      () => setIsSessionExpired(true),
      SESSION_TIMEOUT_MS,
    );
    return () => window.clearTimeout(id);
  }, [isTabVisible, isSessionExpired]);

  useInterval(animate, isLive ? ANIMATION_INTERVAL_MS : null);

  return { vehicles: displayData, isSessionExpired, refresh };
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    function tick() {
      const cb = savedCallback.current;
      if (cb) cb();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
