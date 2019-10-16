const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const WEBSERVER_PORT = process.env.PORT || 5000;
const app = express();
app.use(bodyParser.json());
app.use(express.static('client/build'));

app.get('/septa', (req, res) => {
  axios
    .get('http://www3.septa.org/hackathon/TransitViewAll/')
    .then(response => {
      const routes = response.data.routes[0];
      const routeNames = Object.keys(routes);
      const simpleVehicleArr = [];
      routeNames.forEach(name => {
        const vehicles = routes[name];
        vehicles.forEach(vehicle => {
          const { lat, lng, VehicleID } = vehicle;
          simpleVehicleArr.push({
            ...vehicle,
            route: name,
            name: VehicleID,
            coordinates: [parseFloat(lng), parseFloat(lat)],
          });
        });
      });
      return res.json(simpleVehicleArr);
    })
    .catch(error => {
      console.error(error);
      return res.json({ error });
    });
});

app.get('*', (req, res) => {
  res.send('404 :/');
});

app.listen(WEBSERVER_PORT, () => {
  console.log(`Listening on port ${WEBSERVER_PORT}`);
});
