/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.svg?url" {
  const src: string;
  export default src;
}

declare module "*.scss";

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface NetworkInformation {
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  readonly saveData?: boolean;
}

interface Navigator {
  readonly connection?: NetworkInformation;
}

interface Window {
  __SEPTA_MAP_TEST__?: {
    hoverVehicle: (vehicleId: string) => boolean;
    clearHover: () => void;
  };
}
