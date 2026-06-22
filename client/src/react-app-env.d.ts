/// <reference types="react-scripts" />

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.scss';

declare module '@deck.gl/react';
declare module '@deck.gl/layers';

declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_MAPBOX_TOKEN?: string;
  }
}
