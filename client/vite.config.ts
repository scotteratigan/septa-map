import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const MAPBOX_TOKEN_HELP =
  "Copy client/.env.example to client/.env.local and set VITE_MAPBOX_TOKEN. " +
  "Get a token at https://account.mapbox.com/access-tokens/";

const UNIT_TEST_MAPBOX_TOKEN = "pk.test-dummy-token-for-unit-tests";

function getMapboxToken(mode: string): string | undefined {
  const env = loadEnv(mode, process.cwd(), "");
  return env.VITE_MAPBOX_TOKEN?.trim() || process.env.VITE_MAPBOX_TOKEN?.trim();
}

function assertMapboxToken(mode: string) {
  if (process.env.VITEST) {
    return;
  }

  if (!getMapboxToken(mode)) {
    throw new Error(`Missing VITE_MAPBOX_TOKEN. ${MAPBOX_TOKEN_HELP}`);
  }
}

export default defineConfig(({ mode }) => {
  assertMapboxToken(mode);

  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      // mapbox-gl ships as a single ~1.8 MB bundle with no meaningful sub-chunks.
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/mapbox-gl")) {
              return "mapbox-gl";
            }
            if (
              id.includes("node_modules/@deck.gl") ||
              id.includes("node_modules/@luma.gl") ||
              id.includes("node_modules/@loaders.gl") ||
              id.includes("node_modules/@math.gl")
            ) {
              return "deck-gl";
            }
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/septa": "http://localhost:5050",
      },
    },
    optimizeDeps: {
      include: ["mapbox-gl"],
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.ts",
      env: {
        VITE_MAPBOX_TOKEN: UNIT_TEST_MAPBOX_TOKEN,
      },
    },
  };
});
