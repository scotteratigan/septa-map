import React, { useEffect, useRef, useState } from "react";
import { DeckGL } from "@deck.gl/react";
import { IconLayer } from "@deck.gl/layers";
import Map from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import busImg from "./bus.svg?url";
import trolleyImg from "./trolley.svg?url";
import subwayImg from "./subway.svg?url";
import "./App.scss";
import useLiveData from "./useLiveData";
import {
  HoverInfo,
  StatusFilter,
  TypeFilter,
  Vehicle,
  VehicleType,
} from "./types";
import { lateness, routeLabel, status, vehicleType } from "./vehicleUtils";

const initialViewState = {
  latitude: 39.9473128,
  longitude: -75.2157864,
  zoom: 13,
  pitch: 45,
  bearing: 0,
};

const VEHICLE_TYPES: Record<
  VehicleType,
  { label: string; icon: string; color: [number, number, number] }
> = {
  bus: { label: "Bus", icon: busImg, color: [234, 88, 12] },
  trolley: { label: "Trolley", icon: trolleyImg, color: [22, 163, 74] },
  subway: { label: "Subway", icon: subwayImg, color: [37, 99, 235] },
};

const ICON_DIMENSIONS = { width: 128, height: 128, anchorY: 128, mask: true };

const STATUS_OPTIONS: Record<Exclude<StatusFilter, "unknown">, string> = {
  all: "All statuses",
  onTime: "On time",
  late: "Late",
  early: "Early",
};

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

function App() {
  const busData = useLiveData();
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const busDataRef = useRef(busData);
  busDataRef.current = busData;

  useEffect(() => {
    if (import.meta.env.VITE_E2E !== "true") return;

    window.__SEPTA_MAP_TEST__ = {
      hoverVehicle(vehicleId: string) {
        const vehicle = busDataRef.current.find(
          (entry) => entry.VehicleID === vehicleId,
        );
        if (!vehicle) return false;
        setHover({ object: vehicle, x: 120, y: 200 });
        return true;
      },
      clearHover() {
        setHover(null);
      },
    };

    return () => {
      delete window.__SEPTA_MAP_TEST__;
    };
  }, []);

  // Routes available in the current feed, narrowed to the selected vehicle
  // type so the route dropdown only ever offers relevant choices.
  const routeOptions = React.useMemo(() => {
    const routes = new Set<string>();
    busData.forEach((d) => {
      if (typeFilter === "all" || vehicleType(d.route) === typeFilter) {
        routes.add(String(d.route));
      }
    });
    return Array.from(routes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [busData, typeFilter]);

  const filteredData = busData.filter((d) => {
    if (typeFilter !== "all" && vehicleType(d.route) !== typeFilter)
      return false;
    if (routeFilter !== "all" && String(d.route) !== routeFilter) return false;
    if (statusFilter !== "all" && status(d.late) !== statusFilter) return false;
    return true;
  });

  function handleTypeChange(value: string) {
    setTypeFilter(value as TypeFilter);
    // A route only belongs to one vehicle type, so changing type can orphan the
    // current route selection; reset it to avoid an empty result set.
    setRouteFilter("all");
  }

  const busLayer = new IconLayer({
    id: "icon-layer",
    data: filteredData,
    pickable: true,
    getIcon: (d: Vehicle) => {
      const type = vehicleType(d.route);
      return { id: type, url: VEHICLE_TYPES[type].icon, ...ICON_DIMENSIONS };
    },
    // Size in meters so icons shrink when zoomed out; pixel clamps keep
    // markers readable without turning into blobs at city-wide zoom.
    sizeUnits: "meters",
    sizeScale: 1,
    sizeMinPixels: 3,
    sizeMaxPixels: 18,
    getPosition: (d: Vehicle) => d.coordinates,
    getSize: () => 200,
    getColor: (d: Vehicle) => VEHICLE_TYPES[vehicleType(d.route)].color,
    onHover: (info: { object?: Vehicle; x: number; y: number }) =>
      setHover(
        info.object ? { object: info.object, x: info.x, y: info.y } : null,
      ),
  });

  const hoveredType = hover
    ? VEHICLE_TYPES[vehicleType(hover.object.route)]
    : null;
  const late = hover ? lateness(hover.object.late) : null;

  return (
    <div id="map-page">
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={[busLayer]}
        style={{ width: "100%", height: "100%" }}
      >
        <Map
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
        />
      </DeckGL>

      <div className="hud">
        <header className="page-header">
          <h1 className="page-header__title">SEPTA Live Feed</h1>
          <p className="page-header__subtitle">
            Real-time positions of SEPTA buses, trolleys, and subways across
            Philadelphia, updated every few seconds.
          </p>
        </header>

        <div className="controls">
          <div className="filters">
            <label className="filters__field">
              <span className="filters__label">Vehicle type</span>
              <select
                value={typeFilter}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="all">All vehicles</option>
                {Object.entries(VEHICLE_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filters__field">
              <span className="filters__label">Route</span>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
              >
                <option value="all">All routes</option>
                {routeOptions.map((route) => (
                  <option key={route} value={route}>
                    {routeLabel(route)}
                  </option>
                ))}
              </select>
            </label>

            <label className="filters__field">
              <span className="filters__label">Status</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="filters__count">
            Showing {filteredData.length} of {busData.length} vehicles
          </div>
        </div>
      </div>
      {hover && hoveredType && (
        <div className="bus-tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="bus-tooltip__route">
            {hoveredType.label} &middot; Route {routeLabel(hover.object.route)}
          </div>
          <div>Vehicle {hover.object.VehicleID}</div>
          {hover.object.Direction && (
            <div>Heading {hover.object.Direction}</div>
          )}
          {hover.object.destination && <div>To {hover.object.destination}</div>}
          {late && <div>{late}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
