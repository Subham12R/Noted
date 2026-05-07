"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_js_1 = require("../lib/auth.js");
const app = new hono_1.Hono();
// Mount better-auth handler for all auth routes
app.all("/*", (c) => auth_js_1.auth.handler(c.req.raw));
exports.default = app;
//# sourceMappingURL=auth.js.map