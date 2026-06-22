import { Vehicle } from "./types";

export const mockVehicles: Vehicle[] = [
  {
    lat: "39.965988",
    lng: "-75.206703",
    VehicleID: "bus-late",
    route: "14",
    name: "bus-late",
    late: 5,
    Direction: "EastBound",
    destination: "Center City",
    coordinates: [-75.206703, 39.965988],
  },
  {
    lat: "39.954815",
    lng: "-75.1835",
    VehicleID: "trolley-on-time",
    route: "10",
    name: "trolley-on-time",
    late: 0,
    coordinates: [-75.1835, 39.954815],
  },
  {
    lat: "39.944153",
    lng: "-75.173561",
    VehicleID: "trolley-early",
    route: "T1",
    name: "trolley-early",
    late: -4,
    coordinates: [-75.173561, 39.944153],
  },
  {
    lat: "39.959141",
    lng: "-75.217834",
    VehicleID: "subway-unknown",
    route: "M1",
    name: "subway-unknown",
    coordinates: [-75.217834, 39.959141],
  },
];
