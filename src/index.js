import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { connect as connectDB } from "mongoose";

import { app } from "./app.js";
import { MONGO_URI, PORT } from "./config/index.js";

(async () => {
  try {
    await connectDB(MONGO_URI);
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`DB connected and the server is running on port:${PORT}`)
    );
  } catch (error) {
    console.log(error);
  }
})();