import express from "express";
import { sendMessage,
  getHistory,
  createSession,
  deleteSession,
  renameSession,} from "../controllers/chat.controllers.js";

const chatrouter =express.Router();

chatrouter.post("/session", createSession);
chatrouter.get("/history/:sessionId", getHistory);
chatrouter.post("/message/:sessionId", sendMessage);
chatrouter.delete("/session/:sessionId", deleteSession);
chatrouter.put("/session/:sessionId", renameSession);

export default chatrouter;
