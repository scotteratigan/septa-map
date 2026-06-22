import { DeckGL } from "@deck.gl/react";
import { IconLayer } from "@deck.gl/layers";
import Map from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { HoverInfo, Vehicle } from "./types";
import { vehicleType } from "./vehicleUtils";
import { ICON_DIMENSIONS, VEHICLE_TYPES } from "./vehicleDisplay";

const initialViewState = {
  latitude: 39.9473128,
  longitude: -75.2157864,
  zoom: 13,
  pitch: 45,
  bearing: 0,
};

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

type MapViewProps = {
  vehicles: Vehicle[];
  onHover: (info: HoverInfo | null) => void;
};

export default function MapView({ vehicles, onHover }: MapViewProps) {
  const iconLayer = new IconLayer({
    id: "icon-layer",
    data: vehicles,
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
      onHover(
        info.object ? { object: info.object, x: info.x, y: info.y } : null,
      ),
  });

  return (
    <DeckGL
      initialViewState={initialViewState}
      controller={true}
      layers={[iconLayer]}
      style={{ width: "100%", height: "100%" }}
    >
      <Map
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
      />
    </DeckGL>
  );
}
