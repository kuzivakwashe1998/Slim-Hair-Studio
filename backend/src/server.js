import express from "express";
import cors from "cors";
import routes from "./routes.js";
import { PORT } from "./config.js";
import { store } from "./store.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.get("/api/health", (_req, res) => res.json({ ok: true, studio: "SLIM HAIR STUDIO", store: store.kind, time: new Date().toISOString() }));
app.use("/api", routes);
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" }); });

app.listen(PORT, "0.0.0.0", () => console.log(`Slim Hair Studio API → http://0.0.0.0:${PORT}/api  (store: ${store.kind})`));
