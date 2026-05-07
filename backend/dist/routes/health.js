"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const index_js_1 = require("../db/index.js");
const app = new hono_1.Hono();
app.get("/", async (c) => {
    const dbOk = await (0, index_js_1.checkDatabaseConnection)();
    return c.json({ status: "ok", timestamp: new Date().toISOString(), db: dbOk ? "connected" : "disconnected" });
});
exports.default = app;
//# sourceMappingURL=health.js.map