import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { StaticMap } from 'react-map-gl';
import busImg from './bus.svg';
import trolleyImg from './trolley.svg';
import subwayImg from './subway.svg';
import './App.scss';
import './mapbox-gl.css';
import useLiveData from './useLiveData';
import {
  HoverInfo,
  StatusFilter,
  TypeFilter,
  Vehicle,
  VehicleType,
} from './types';

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
  bus: { label: 'Bus', icon: busImg, color: [234, 88, 12] },
  trolley: { label: 'Trolley', icon: trolleyImg, color: [22, 163, 74] },
  subway: { label: 'Subway', icon: subwayImg, color: [37, 99, 235] },
};

// SEPTA's TransitView feed has no vehicle-type field, so derive it from the
// SEPTA Metro route code: B/L/M = subway-grade rail, T/D/G = trolley lines.
// The numeric set is a fallback for the legacy (pre-Metro) trolley route names.
const LEGACY_TROLLEY_ROUTES = new Set([
  '10', '11', '13', '15', '34', '36', '101', '102',
]);

function vehicleType(route: string): VehicleType {
  const r = String(route).toUpperCase();
  if (/^[BLM]\d+$/.test(r)) return 'subway';
  if (/^[TDG]\d+$/.test(r)) return 'trolley';
  if (LEGACY_TROLLEY_ROUTES.has(r)) return 'trolley';
  return 'bus';
}

// Maps the new SEPTA Metro trolley codes to their legacy (pre-Metro) route
// numbers, so riders who still know the lines by number can recognize them.
const TROLLEY_LEGACY_NUMBERS: Record<string, string> = {
  T1: '10',
  T2: '11',
  T3: '13',
  T4: '34',
  T5: '36',
  D1: '15',
  G1: '101',
  G2: '102',
};

// Renders a route for display, appending the legacy trolley number in parens
// when the route is a SEPTA Metro trolley code (e.g. "T1 (10)").
function routeLabel(route: string): string {
  const legacy = TROLLEY_LEGACY_NUMBERS[String(route).toUpperCase()];
  return legacy ? `${route} (${legacy})` : String(route);
}

const ICON_DIMENSIONS = { width: 128, height: 128, anchorY: 128, mask: true };

function lateness(late: number | undefined): string | null {
  if (typeof late !== 'number') return null;
  if (late > 0) return `${late} min late`;
  if (late < 0) return `${Math.abs(late)} min early`;
  return 'On time';
}

// Buckets a vehicle's reported lateness (in minutes) into a status category.
// SEPTA reports a few minutes of slack as effectively on time.
const ON_TIME_THRESHOLD = 2;

function status(late: number | undefined): Exclude<StatusFilter, 'all'> {
  if (typeof late !== 'number') return 'unknown';
  if (late > ON_TIME_THRESHOLD) return 'late';
  if (late < -ON_TIME_THRESHOLD) return 'early';
  return 'onTime';
}

const STATUS_OPTIONS: Record<Exclude<StatusFilter, 'unknown'>, string> = {
  all: 'All statuses',
  onTime: 'On time',
  late: 'Late',
  early: 'Early',
};

function App() {
  const busData = useLiveData();
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Routes available in the current feed, narrowed to the selected vehicle
  // type so the route dropdown only ever offers relevant choices.
  const routeOptions = React.useMemo(() => {
    const routes = new Set<string>();
    busData.forEach(d => {
      if (typeFilter === 'all' || vehicleType(d.route) === typeFilter) {
        routes.add(String(d.route));
      }
    });
    return Array.from(routes).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [busData, typeFilter]);

  const filteredData = busData.filter(d => {
    if (typeFilter !== 'all' && vehicleType(d.route) !== typeFilter) return false;
    if (routeFilter !== 'all' && String(d.route) !== routeFilter) return false;
    if (statusFilter !== 'all' && status(d.late) !== statusFilter) return false;
    return true;
  });

  function handleTypeChange(value: string) {
    setTypeFilter(value as TypeFilter);
    // A route only belongs to one vehicle type, so changing type can orphan the
    // current route selection; reset it to avoid an empty result set.
    setRouteFilter('all');
  }

  const busLayer = new IconLayer({
    id: 'icon-layer',
    data: filteredData,
    pickable: true,
    getIcon: (d: Vehicle) => {
      const type = vehicleType(d.route);
      return { id: type, url: VEHICLE_TYPES[type].icon, ...ICON_DIMENSIONS };
    },
    // Size in meters so icons scale with zoom (smaller when zoomed out),
    // clamped to a pixel range so they never get tiny or huge.
    sizeUnits: 'meters',
    sizeScale: 1,
    sizeMinPixels: 8,
    sizeMaxPixels: 36,
    getPosition: (d: Vehicle) => d.coordinates,
    getSize: () => 380,
    getColor: (d: Vehicle) => VEHICLE_TYPES[vehicleType(d.route)].color,
    onHover: (info: { object?: Vehicle; x: number; y: number }) =>
      setHover(
        info.object ? { object: info.object, x: info.x, y: info.y } : null
      ),
  });

  const hoveredType = hover ? VEHICLE_TYPES[vehicleType(hover.object.route)] : null;
  const late = hover ? lateness(hover.object.late) : null;

  return (
    <div id='map-page'>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={[busLayer]}>
        <StaticMap mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN} />
      </DeckGL>

      <div className='hud'>
        <header className='page-header'>
          <h1 className='page-header__title'>SEPTA Live Feed</h1>
          <p className='page-header__subtitle'>
            Real-time positions of SEPTA buses, trolleys, and subways across
            Philadelphia, updated every few seconds.
          </p>
        </header>

        <div className='controls'>
          <div className='filters'>
          <label className='filters__field'>
            <span className='filters__label'>Vehicle type</span>
            <select
              value={typeFilter}
              onChange={e => handleTypeChange(e.target.value)}>
              <option value='all'>All vehicles</option>
              {Object.entries(VEHICLE_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className='filters__field'>
            <span className='filters__label'>Route</span>
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}>
              <option value='all'>All routes</option>
              {routeOptions.map(route => (
                <option key={route} value={route}>
                  {routeLabel(route)}
                </option>
              ))}
            </select>
          </label>

          <label className='filters__field'>
            <span className='filters__label'>Status</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
              {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

          <div className='filters__count'>
            Showing {filteredData.length} of {busData.length} vehicles
          </div>
        </div>
      </div>
      {hover && hoveredType && (
        <div className='bus-tooltip' style={{ left: hover.x, top: hover.y }}>
          <div className='bus-tooltip__route'>
            {hoveredType.label} &middot; Route {routeLabel(hover.object.route)}
          </div>
          <div>Vehicle {hover.object.VehicleID}</div>
          {hover.object.Direction && <div>Heading {hover.object.Direction}</div>}
          {hover.object.destination && <div>To {hover.object.destination}</div>}
          {late && <div>{late}</div>}
        </div>
      )}
    </div>
  );
}

export default App;
