import app from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`SGB MVP listening on port ${env.port}`);
});
