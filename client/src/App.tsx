import React, { Suspense, useEffect, useRef, useState } from "react";
import "./App.scss";
import useLiveData from "./useLiveData";
import { HoverInfo, StatusFilter, TypeFilter } from "./types";
import { lateness, routeLabel, status, vehicleType } from "./vehicleUtils";
import { VEHICLE_TYPES } from "./vehicleDisplay";

const MapView = React.lazy(() => import("./MapView"));

const STATUS_OPTIONS: Record<Exclude<StatusFilter, "unknown">, string> = {
  all: "All statuses",
  onTime: "On time",
  late: "Late",
  early: "Early",
};

function App() {
  const { vehicles: busData, isSessionExpired, refresh } = useLiveData();
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

  const hoveredType = hover
    ? VEHICLE_TYPES[vehicleType(hover.object.route)]
    : null;
  const late = hover ? lateness(hover.object.late) : null;

  return (
    <div id="map-page">
      <Suspense fallback={null}>
        <MapView vehicles={filteredData} onHover={setHover} />
      </Suspense>

      <div className="hud">
        <header className="page-header">
          <h1 className="page-header__title">SEPTA Live Feed</h1>
          <p className="page-header__subtitle">
            Real-time positions of SEPTA buses, trolleys, and subways across
            Philadelphia, updated in realtime.
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
      {isSessionExpired && (
        <div className="session-modal" role="dialog" aria-modal="true">
          <div className="session-modal__panel">
            <h2 className="session-modal__title">Live feed paused</h2>
            <p className="session-modal__body">
              Updates stop after 5 minutes to limit server usage. Refresh to
              load the latest vehicle positions.
            </p>
            <button
              type="button"
              className="session-modal__button"
              onClick={refresh}
            >
              Refresh live feed
            </button>
          </div>
        </div>
      )}
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
