import busImg from "./bus.svg?url";
import trolleyImg from "./trolley.svg?url";
import subwayImg from "./subway.svg?url";
import { VehicleType } from "./types";

export const VEHICLE_TYPES: Record<
  VehicleType,
  { label: string; icon: string; color: [number, number, number] }
> = {
  bus: { label: "Bus", icon: busImg, color: [234, 88, 12] },
  trolley: { label: "Trolley", icon: trolleyImg, color: [22, 163, 74] },
  subway: { label: "Subway", icon: subwayImg, color: [37, 99, 235] },
};

export const ICON_DIMENSIONS = {
  width: 128,
  height: 128,
  anchorY: 128,
  mask: true,
};
