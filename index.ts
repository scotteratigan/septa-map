import { createApp } from "./server";

const WEBSERVER_PORT = process.env.PORT || 5050;
const app = createApp();

app.listen(WEBSERVER_PORT, () => {
  console.log(`Listening on port ${WEBSERVER_PORT}`);
});
