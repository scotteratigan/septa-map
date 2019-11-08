import { useEffect, useState, useRef } from "react";
const axios = require("axios");

export default function useLiveData() {
  const [coordinates, setCoordinates] = useState({});
  const [data, setData] = useState([]); //temporary
  const [displayData, setDisplayData] = useState([]); //actual return?
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 10;

  function updateData() {
    console.log("Updating vehicle positions...");
    const newCoordinates = {};
    data.forEach(vehicle => {
      const { VehicleID, coordinates } = vehicle;
      newCoordinates[VehicleID].from = { coordinates };
    });
    axios
      .get("/septa")
      .then(res => {
        res.data.forEach(vehicle => {
          const { VehicleID, coordinates } = vehicle;
          newCoordinates[VehicleID].to = { coordinates }; // error: cannot set value 'to' of undefined
        });
        const newData = [...res.data].map(vehicle => ({ ...vehicle })); // required to make a copy of the coordinates array
        setData(newData);
        setCoordinates(newCoordinates);
        setStep(0);
        console.log(res.data);
      })
      .catch(err => {
        console.error("error:", err);
      });
  }

  function getCurrentCoordinates() {
    const newDisplayData = [...data].map(vehicle => {
      const id = vehicle.VehicleID;
      const prevLng = coordinates[id].from[0];
      const prevLat = coordinates[id].from[1];
      const currLng = coordinates[id].to[0];
      const currLat = coordinates[id].to[1];
      const lngStep = (prevLng - currLng) / TOTAL_STEPS;
      const latStep = (prevLat - currLat) / TOTAL_STEPS;
      const lngVal = prevLng + lngStep * step;
      const latVal = prevLat + latStep * step;
      return { ...vehicle, coordinates: [lngVal, latVal] };
    });
    setDisplayData(newDisplayData);
    setStep(step + 1);
  }

  useInterval(getCurrentCoordinates, 1000);
  useInterval(updateData, 10000);
  // return data;
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
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
