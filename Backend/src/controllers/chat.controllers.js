/**
 * src/controllers/chatController.js
 *
 * Rule-based Chat Controller — NO external AI calls.
 * - Stores messages in Chat model (one document per session).
 * - Simple intent/keyword matching for bot replies.
 * - Exposes: sendMessage, getHistory, createSession, deleteSession, renameSession
 *
 * Requires:
 *   import { protect } in routes to set req.user
 *   Chat model: src/models/chatModel.js (as provided earlier)
 */

import { Chat } from "../models/Chat.model.js";

/* ---------------------------
   Lightweight rule-based bot
   --------------------------- */

// Normalize text
const norm = (s = "") => s.trim().toLowerCase();

// Simple FAQ / knowledge base (you can extend this)
const FAQ = [
  {
    keywords: ["hello", "hi", "hey"],
    reply: "Hello! 👋 How can I help you today?",
  },
  {
    keywords: ["how are you", "how r you", "how are u"],
    reply: "I'm a bot — always ready to help! How can I assist you?",
  },
  {
    keywords: ["help", "support"],
    reply:
      "I can answer simple questions, save chat history, and echo your messages. Try typing 'faq' or ask for 'time'.",
  },
  {
    keywords: ["time", "what time", "current time"],
    reply: () => `Current server time is: ${new Date().toLocaleString()}`,
  },
  {
    keywords: ["bye", "goodbye", "see you"],
    reply: "Goodbye! If you need me again, just start a new chat. 👋",
  },
  {
    keywords: ["faq", "questions"],
    reply: "You can ask about registration, login, or chat features. Example: 'How do I reset my password?'",
  },
];

// inside your chatController (above handlers)
const sujalProfile = {
  name: "Sujal Shah",
  profession: "Full-Stack Developer & Computer Engineering Student",
  skills: ["React", "Appwrite", "Node.js", "Express", "MongoDB", "UI/UX Design", "Competitive Programming"],
  projects: [
    { name: "Video & Article Summarizer", desc: "Summarizes long videos and articles into concise text." },
    { name: "Chatbot System", desc: "Authenticated chatbot platform with session-based storage and LLM-ready design." },
    { name: "Employee Registration & PDF Generator", desc: "CRUD app with client-side validation and PDF exports." }
  ],
  bio: "I build AI-assisted web applications with a focus on clean UI and robust backend architecture. I prefer dark/black backgrounds for UI and photos.",
  photoPreference: "dark/black background"
};


/**
 * Determine reply from the message using rules.
 * Returns a string reply.
 */
const getRuleBasedReply = (message) => {
  const m = norm(message);

  // 1) exact phrase matches / keywords
  for (const item of FAQ) {
    for (const kw of item.keywords) {
      if (m.includes(kw)) {
        return typeof item.reply === "function" ? item.reply() : item.reply;
      }
    }
  }

  // 2) simple patterns: question about registration/login
  if (m.includes("register") || m.includes("signup") || m.includes("sign up")) {
    return "To register, use the Register button and provide your name, email and password. If you'd like, I can create a demo request for you.";
  }

  if (m.includes("login") || m.includes("log in")) {
    return "To log in, use your registered email and password at the login page. If you forgot your password, ask for 'reset password'.";
  }

  if (m.includes("reset") && m.includes("password")) {
    return "Password reset is not implemented in this demo. In production you'd receive a reset link by email.";
  }

  // 3) small talk / utilities
  if (m.startsWith("calculate ")) {
    try {
      // Very simple and limited calculator (careful: eval-like risks avoided)
      const expr = message.slice("calculate ".length).replace(/[^0-9+\-*/().\s]/g, "");
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${expr})`)();
      if (result === undefined) throw new Error("bad expression");
      return `Result: ${result}`;
    } catch (e) {
      return "I couldn't calculate that. Please send a valid arithmetic expression, e.g. `calculate 2+2*3`.";
    }
  }

  // 4) fallback: echo + suggestion
  return `You said: "${message}". I don't fully understand that yet — try asking something simpler (e.g., 'help', 'time', 'faq').`;
};

/* ---------------------------
   Controller exports
   --------------------------- */

/**
 * POST /api/chat/send
 * Body: { message: string, sessionId?: string }
 * Protected route: req.user available
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, sessionId } = req.body;

    if (!message || String(message).trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    // find or create chat session
    let chat;
    if (sessionId) {
      chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Chat session not found" });
    } else {
      chat = await Chat.create({ user: userId, messages: [] });
    }

    // push user message
   const userMsg = { sender: "user", message: message };
chat.messages.push(userMsg);
    await chat.save();

    const botText = getRuleBasedReply(message);

    // push bot message
   const botMsg = { sender: "bot", message: botText };
chat.messages.push(botMsg);
    await chat.save();

    // return useful data to client
    return res.json({
      sessionId: chat._id,
      reply: botText,
      // include last few messages to render conversation without an extra roundtrip
      messages: chat.messages.slice(-10),
    });
  } catch (error) {
    console.error("chatController.sendMessage error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/chat/history
 * Query params:
 *   - sessionId (optional): fetch messages for a session
 *   - page, limit (optional) for pagination inside messages
 * If no sessionId, returns a list of sessions (summary).
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.query;
    let { page = 1, limit = 50 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (sessionId) {
      const chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Session not found" });

      // simple in-array pagination (ok for small sessions)
      const total = chat.messages.length;
      const start = Math.max(total - page * limit, 0);
      const end = Math.max(total - (page - 1) * limit, 0);
      const messages = chat.messages.slice(start, end);

      return res.json({
        sessionId: chat._id,
        sessionTitle: chat.sessionTitle,
        totalMessages: total,
        page,
        limit,
        messages,
      });
    }

    // no sessionId -> return session list (recent first)
    const sessions = await Chat.find({ user: userId })
      .select("_id sessionTitle updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(100);

    const summary = sessions.map((s) => ({
      sessionId: s._id,
      sessionTitle: s.sessionTitle,
      updatedAt: s.updatedAt,
      totalMessages: s.messages.length,
      lastMessage: s.messages.length ? s.messages[s.messages.length - 1] : null,
    }));

    return res.json({ sessions: summary });
  } catch (error) {
    console.error("chatController.getHistory error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/chat/session
 * Body: { title?: string }
 * Create a new session (returns sessionId)
 */
export const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title } = req.body;
    const chat = await Chat.create({
      user: userId,
      sessionTitle: title ? String(title).trim() : "New Chat",
      messages: [],
    });
    return res.status(201).json({ sessionId: chat._id, sessionTitle: chat.sessionTitle });
  } catch (error) {
    console.error("chatController.createSession error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/chat/session/:id
 * Delete a chat session for the logged-in user
 */
export const deleteSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.params.id;
    const deleted = await Chat.findOneAndDelete({ _id: sessionId, user: userId });
    if (!deleted) return res.status(404).json({ message: "Session not found" });
    return res.json({ message: "Session deleted" });
  } catch (error) {
    console.error("chatController.deleteSession error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/chat/session/:id/rename
 * Body: { title: "New title" }
 */
export const renameSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.params.id;
    const { title } = req.body;
    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
    }

    const chat = await Chat.findOne({ _id: sessionId, user: userId });
    if (!chat) return res.status(404).json({ message: "Session not found" });

    chat.sessionTitle = String(title).trim();
    await chat.save();

    return res.json({ sessionId: chat._id, sessionTitle: chat.sessionTitle });
  } catch (error) {
    console.error("chatController.renameSession error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export default {
  sendMessage,
  getHistory,
  createSession,
  deleteSession,
  renameSession,
};
