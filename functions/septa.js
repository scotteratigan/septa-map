// Cloudflare Pages Function: GET /septa
// Proxies the SEPTA TransitViewAll feed and flattens it into a single array of
// vehicles. Runs on the Workers runtime, so it uses the native fetch/Response
// APIs (no axios/express). The server-side hop also avoids browser CORS issues.
const SEPTA_URL = "https://www3.septa.org/hackathon/TransitViewAll/";

export async function onRequestGet() {
  try {
    const upstream = await fetch(SEPTA_URL, {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `SEPTA upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const json = await upstream.json();
    const routes = json.routes[0];

    const vehicles = [];
    for (const route of Object.keys(routes)) {
      for (const vehicle of routes[route]) {
        const { lat, lng, VehicleID } = vehicle;
        vehicles.push({
          ...vehicle,
          route,
          name: VehicleID,
          coordinates: [parseFloat(lng), parseFloat(lat)],
        });
      }
    }

    return Response.json(vehicles, {
      // Vehicles update roughly every few seconds; a short edge cache shields
      // SEPTA from bursts without making the map feel stale.
      headers: { "Cache-Control": "public, max-age=5" },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
