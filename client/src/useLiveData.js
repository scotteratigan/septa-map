import { useEffect, useRef, useState } from "react";
import axios from "axios";

const POLL_INTERVAL_MS = 10000;
const ANIMATION_INTERVAL_MS = 1000;
const TOTAL_STEPS = POLL_INTERVAL_MS / ANIMATION_INTERVAL_MS;

// Polls the /septa proxy for live vehicle positions and smoothly interpolates
// each vehicle from its previous position to its newly reported one between
// polls, so the markers glide instead of teleporting.
export default function useLiveData() {
  const [displayData, setDisplayData] = useState([]);

  // Animation state lives in refs so the interval callbacks always read the
  // latest values without having to re-subscribe on every render.
  const fromRef = useRef({}); // VehicleID -> [lng, lat] start of current tween
  const toRef = useRef({}); // VehicleID -> [lng, lat] latest reported position
  const vehiclesRef = useRef([]); // latest vehicle metadata, in feed order
  const stepRef = useRef(TOTAL_STEPS);

  async function poll() {
    try {
      const res = await axios.get("/septa");
      if (!Array.isArray(res.data)) return;

      const nextTo = {};
      res.data.forEach(vehicle => {
        nextTo[vehicle.VehicleID] = vehicle.coordinates;
      });

      // Start the next tween from each vehicle's last reported position. New
      // vehicles fall back to their fresh position so they appear in place
      // instead of animating in from [0, 0].
      const prevTo = toRef.current;
      const nextFrom = {};
      res.data.forEach(vehicle => {
        const id = vehicle.VehicleID;
        nextFrom[id] = prevTo[id] || nextTo[id];
      });

      fromRef.current = nextFrom;
      toRef.current = nextTo;
      vehiclesRef.current = res.data;
      stepRef.current = 0;
    } catch (err) {
      console.error("Failed to fetch SEPTA vehicle positions:", err);
    }
  }

  function animate() {
    const vehicles = vehiclesRef.current;
    if (vehicles.length === 0) return;

    const t = Math.min(stepRef.current, TOTAL_STEPS) / TOTAL_STEPS;

    const frame = vehicles.map(vehicle => {
      const id = vehicle.VehicleID;
      const from = fromRef.current[id] || vehicle.coordinates;
      const to = toRef.current[id] || vehicle.coordinates;
      const lng = from[0] + (to[0] - from[0]) * t;
      const lat = from[1] + (to[1] - from[1]) * t;
      return { ...vehicle, coordinates: [lng, lat] };
    });

    setDisplayData(frame);
    if (stepRef.current < TOTAL_STEPS) stepRef.current += 1;
  }

  useEffect(() => {
    poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(poll, POLL_INTERVAL_MS);
  useInterval(animate, ANIMATION_INTERVAL_MS);

  return displayData;
}

function useInterval(callback, delay) {
  const savedCallback = useRef();
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
