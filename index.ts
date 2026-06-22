import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import {
  isSeptaTransitViewResponse,
  normalizeVehicles,
} from './client/src/types';

const WEBSERVER_PORT = process.env.PORT || 5050;
const app = express();
app.use(bodyParser.json());
app.use(express.static('client/build'));

app.get('/septa', (_req: Request, res: Response) => {
  axios
    .get('http://www3.septa.org/hackathon/TransitViewAll/')
    .then(response => {
      if (!isSeptaTransitViewResponse(response.data)) {
        return res.status(502).json({ error: 'Unexpected SEPTA response shape' });
      }
      return res.json(normalizeVehicles(response.data.routes[0]));
    })
    .catch(error => {
      console.error(error);
      return res.json({ error });
    });
});

app.get('*', (_req: Request, res: Response) => {
  res.send('404 :/');
});

app.listen(WEBSERVER_PORT, () => {
  console.log(`Listening on port ${WEBSERVER_PORT}`);
});
