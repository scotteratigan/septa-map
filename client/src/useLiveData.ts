import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { isVehicleArray, Vehicle } from "./types";

const POLL_INTERVAL_MS = 10000;
const ANIMATION_INTERVAL_MS = 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const TOTAL_STEPS = POLL_INTERVAL_MS / ANIMATION_INTERVAL_MS;

type CoordinateMap = Record<string, [number, number]>;

export type LiveDataResult = {
  vehicles: Vehicle[];
  isSessionExpired: boolean;
  refresh: () => void;
};

// Polls the /septa proxy for live vehicle positions and smoothly interpolates
// each vehicle from its previous position to its newly reported one between
// polls, so the markers glide instead of teleporting. Polling pauses while the
// tab is hidden and stops after SESSION_TIMEOUT_MS of visible time.
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
  const stepRef = useRef(TOTAL_STEPS);

  const pollRef = useRef<() => Promise<void>>(() => Promise.resolve());

  async function poll() {
    try {
      const res = await axios.get<unknown>("/septa");
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
      console.error("Failed to fetch SEPTA vehicle positions:", err);
    }
  }

  function animate() {
    const vehicles = vehiclesRef.current;
    if (vehicles.length === 0) return;

    const t = Math.min(stepRef.current, TOTAL_STEPS) / TOTAL_STEPS;

    const frame = vehicles.map((vehicle) => {
      const id = vehicle.VehicleID;
      const from = fromRef.current[id] || vehicle.coordinates;
      const to = toRef.current[id] || vehicle.coordinates;
      const lng = from[0] + (to[0] - from[0]) * t;
      const lat = from[1] + (to[1] - from[1]) * t;
      return { ...vehicle, coordinates: [lng, lat] as [number, number] };
    });

    setDisplayData(frame);
    if (stepRef.current < TOTAL_STEPS) stepRef.current += 1;
  }

  pollRef.current = poll;

  const refresh = useCallback(() => {
    setIsSessionExpired(false);
    void pollRef.current();
  }, []);

  useEffect(() => {
    poll();
  }, []);

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

  useInterval(poll, isLive ? POLL_INTERVAL_MS : null);
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
