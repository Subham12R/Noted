"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSession = getServerSession;
exports.requireAuth = requireAuth;
const auth_js_1 = require("./auth.js");
async function getServerSession(req) {
    return auth_js_1.auth.api.getSession({ headers: req.headers });
}
async function requireAuth(req) {
    const session = await getServerSession(req);
    if (!session?.user)
        throw new Error("Unauthorized");
    return session;
}
//# sourceMappingURL=auth-utils.js.map