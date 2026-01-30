import express from "express";
import {
    sendMessage,
    getHistory,
    createSession,
    deleteSession,
    renameSession,
} from "../controllers/chat.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const chatrouter = express.Router();

chatrouter.post("/session", verifyJwt, createSession);
// Note: getHistory handles both list (no id) and details (with id) if designed so, 
// but usually we split or use checks.
// Based on my controller restoration:
// getHistory with /:sessionId gets details
// getHistory without params gets list? The controller uses req.params.sessionId.
// Wait, the controller used `req.params.sessionId` for details.
// To get list, I might need a separate route or optional param.
// In the restored controller `getHistory`: `const { sessionId } = req.params;`
// If I call `/history`, express might not match `/history/:sessionId`.
// Let's define two routes to be safe since the controller handles both cases if we are careful,
// but usually `req.params` requires a match.

// Actually, looking at the restored controller code:
// `const { sessionId } = req.params;`
// If I visit `/history`, `req.params.sessionId` is undefined? No, route won't match.

// Let's adjust routes to match the original structure that worked.
chatrouter.get("/history", verifyJwt, getHistory); // For list
chatrouter.get("/history/:sessionId", verifyJwt, getHistory); // For details

chatrouter.post("/message/:sessionId", verifyJwt, sendMessage);
chatrouter.delete("/session/:sessionId", verifyJwt, deleteSession);
chatrouter.put("/session/:sessionId", verifyJwt, renameSession);

export default chatrouter;
