import React, { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { StaticMap } from 'react-map-gl';
// import busData from './data';
import busImg from './bus.svg';
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

const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 32, height: 32, mask: true },
};

function App() {
  const [hovered, setHovered] = useState({});
  const busData = useLiveData();

  function Tooltip() {
    const { hoveredObject, pointerX, pointerY } = hovered;
    return hoveredObject ? (
      <div
        style={{
          position: 'absolute',
          zIndex: 1,
          pointerEvents: 'none',
          left: pointerX,
          top: pointerY,
          backgroundColor: 'rgba(255, 255, 255, 0.9',
          padding: 4,
          borderRadius: 3,
        }}>
        <div>Id: {hoveredObject.name}</div>
        {hoveredObject.route && <div>Route: {hoveredObject.route}</div>}
        {hoveredObject.Direction && <div>Direction: {hoveredObject.Direction}</div>}
        {hoveredObject.destination && <div>Destination: {hoveredObject.destination}</div>}
      </div>
    ) : (
      <></>
    );
  }

  const busLayer = new IconLayer({
    id: 'icon-layer',
    data: busData,
    pickable: true,
    iconMapping: ICON_MAPPING,
    getIcon: d => ({
      url: busImg,
      width: 128,
      height: 128,
      anchorY: 128,
    }),
    sizeScale: 15,
    getPosition: d => d.coordinates,
    getSize: () => 5,
    getColor: d => [Math.sqrt(d.exits), 140, 0],
    onHover: info =>
      setHovered({
        hoveredObject: info.object,
        pointerX: info.x,
        pointerY: info.y,
      }),
  });

  return (
    <div id='map-page'>
      <DeckGL initialViewState={initialViewState} controller={true} layers={[busLayer]}>
        <StaticMap
          mapboxApiAccessToken={
            'pk.eyJ1Ijoic2NvdHRlNTEwIiwiYSI6ImNrMTVkbmFvbj' +
            'B0dHEzbXRjNDFzMWVmbzkifQ.-9BFMk1pHhJD_z6HthzU0g'
          }
        />
        <Tooltip />
      </DeckGL>
    </div>
  );
}

export default App;
