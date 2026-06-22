import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import {
  isSeptaTransitViewResponse,
  normalizeVehicles,
} from "./client/src/types";

const SEPTA_TRANSIT_VIEW_URL =
  "http://www3.septa.org/hackathon/TransitViewAll/";

type HttpClient = Pick<typeof axios, "get">;

export function createApp(deps: { http?: HttpClient } = {}): Express {
  const http = deps.http ?? axios;
  const app = express();

  app.use(bodyParser.json());
  app.use(express.static("client/dist"));

  app.get("/septa", (_req: Request, res: Response) => {
    http
      .get(SEPTA_TRANSIT_VIEW_URL)
      .then((response) => {
        if (!isSeptaTransitViewResponse(response.data)) {
          return res
            .status(502)
            .json({ error: "Unexpected SEPTA response shape" });
        }
        return res.json(normalizeVehicles(response.data.routes[0]));
      })
      .catch((error) => {
        console.error(error);
        return res.json({ error });
      });
  });

  app.get("*", (_req: Request, res: Response) => {
    res.send("404 :/");
  });

  return app;
}
