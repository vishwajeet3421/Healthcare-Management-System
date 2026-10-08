require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const seed = require("./seed");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api", (req, res) => res.status(404).json({ message: "API route not found" }));

// Serve the built React app in production
const dist = path.join(__dirname, "../client/dist");
app.use(express.static(dist));
app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html"), (e) => e && res.status(404).send("Frontend not built. Run the app with `npm start` from the project root.")));

// Central error handler: validation / cast errors -> 400, custom errors keep their status
app.use((err, req, res, next) => {
  const status = err.status || (["ValidationError", "CastError"].includes(err.name) ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? "Server error: " + err.message : err.message });
});
process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI).then(async () => {
  await seed();
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}).catch((e) => { console.error("MongoDB connection failed:", e.message, "\nStart MongoDB or fix MONGO_URI in server/.env"); process.exit(1); });
