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

const initialViewState = {
  latitude: 39.9473128,
  longitude: -75.2157864,
  zoom: 13,
  pitch: 45,
  bearing: 0,
};

const VEHICLE_TYPES = {
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

function vehicleType(route) {
  const r = String(route).toUpperCase();
  if (/^[BLM]\d+$/.test(r)) return 'subway';
  if (/^[TDG]\d+$/.test(r)) return 'trolley';
  if (LEGACY_TROLLEY_ROUTES.has(r)) return 'trolley';
  return 'bus';
}

const ICON_DIMENSIONS = { width: 128, height: 128, anchorY: 128, mask: true };

function lateness(late) {
  if (typeof late !== 'number') return null;
  if (late > 0) return `${late} min late`;
  if (late < 0) return `${Math.abs(late)} min early`;
  return 'On time';
}

function App() {
  const busData = useLiveData();
  const [hover, setHover] = useState(null);

  const busLayer = new IconLayer({
    id: 'icon-layer',
    data: busData,
    pickable: true,
    getIcon: d => {
      const type = vehicleType(d.route);
      return { id: type, url: VEHICLE_TYPES[type].icon, ...ICON_DIMENSIONS };
    },
    // Size in meters so icons scale with zoom (smaller when zoomed out),
    // clamped to a pixel range so they never get tiny or huge.
    sizeUnits: 'meters',
    sizeScale: 1,
    sizeMinPixels: 8,
    sizeMaxPixels: 36,
    getPosition: d => d.coordinates,
    getSize: () => 380,
    getColor: d => VEHICLE_TYPES[vehicleType(d.route)].color,
    onHover: info =>
      setHover(info.object ? { object: info.object, x: info.x, y: info.y } : null),
  });

  const hoveredType = hover && VEHICLE_TYPES[vehicleType(hover.object.route)];
  const late = hover && lateness(hover.object.late);

  return (
    <div id='map-page'>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={[busLayer]}>
        <StaticMap mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN} />
      </DeckGL>
      {hover && (
        <div className='bus-tooltip' style={{ left: hover.x, top: hover.y }}>
          <div className='bus-tooltip__route'>
            {hoveredType.label} &middot; Route {hover.object.route}
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
