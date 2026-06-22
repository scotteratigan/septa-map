import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./server";

const validSeptaResponse = {
  routes: [
    {
      "14": [
        {
          lat: "39.965988",
          lng: "-75.206703",
          VehicleID: "1001",
          destination: "Center City",
          Direction: "EastBound",
        },
      ],
      "10": [{ lat: "39.954815", lng: "-75.1835", VehicleID: "2002" }],
    },
  ],
};

describe("GET /septa", () => {
  it("returns normalized vehicles from the SEPTA feed", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ data: validSeptaResponse }),
    };
    const app = createApp({ http });

    const response = await request(app).get("/septa");

    expect(response.status).toBe(200);
    expect(http.get).toHaveBeenCalledWith(
      "http://www3.septa.org/hackathon/TransitViewAll/",
    );
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: "14",
          VehicleID: "1001",
          name: "1001",
          coordinates: [-75.206703, 39.965988],
          destination: "Center City",
          Direction: "EastBound",
        }),
        expect.objectContaining({
          route: "10",
          VehicleID: "2002",
          coordinates: [-75.1835, 39.954815],
        }),
      ]),
    );
    expect(response.body).toHaveLength(2);
  });

  it("returns 502 when the upstream payload has an unexpected shape", async () => {
    const http = {
      get: vi.fn().mockResolvedValue({ data: { routes: [] } }),
    };
    const app = createApp({ http });

    const response = await request(app).get("/septa");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: "Unexpected SEPTA response shape",
    });
  });

  it("returns an error payload when the upstream request fails", async () => {
    const http = {
      get: vi.fn().mockRejectedValue(new Error("network down")),
    };
    const app = createApp({ http });

    const response = await request(app).get("/septa");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: {} });
  });
});

describe("GET *", () => {
  it("returns a fallback message for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/missing-page");

    expect(response.status).toBe(200);
    expect(response.text).toBe("404 :/");
  });
});
