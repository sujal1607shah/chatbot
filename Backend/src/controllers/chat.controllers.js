import { Chat } from "../models/Chat.model.js";

/* ---------------------------
   Lightweight rule-based bot
   --------------------------- */

// Normalize text
const norm = (s = "") => s.trim().toLowerCase();

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
  contact: "You can reach out to me for collaborations!"
};

// Simple FAQ / knowledge base
const FAQ = [
  {
    keywords: ["hello", "hi", "hey"],
    reply: "Hello! 👋 I am Sujal's AI assistant. Ask me about Sujal's skills, projects, or background!",
  },
  {
    keywords: ["how are you"],
    reply: "I'm functioning perfectly! Ready to tell you all about Sujal.",
  },
  {
    keywords: ["help", "support"],
    reply: "Try asking: 'Who is Sujal?', 'What skills does he have?', 'Show me his projects', or 'What is his tech stack?'.",
  },
  {
    keywords: ["time", "what time", "current time"],
    reply: () => `Current server time is: ${new Date().toLocaleString()}`,
  },
  {
    keywords: ["bye", "goodbye"],
    reply: "Goodbye! Feel free to come back if you need more info about Sujal. 👋",
  },
];

/**
 * Determine reply from the message using rules.
 * Returns a string reply.
 */
const getRuleBasedReply = (message) => {
  const m = norm(message);

  // 1) Check for Profile Questions
  if (m.includes("who is sujal") || m.includes("about sujal") || m.includes("tell me about yourself") || m.includes("who are you")) {
    return `${sujalProfile.name} is a ${sujalProfile.profession}. ${sujalProfile.bio}`;
  }

  if (m.includes("skill") || m.includes("stack") || m.includes("technolog")) {
    return `Sujal's technical skills include: ${sujalProfile.skills.join(", ")}.`;
  }

  if (m.includes("project") || m.includes("work")) {
    const projectList = sujalProfile.projects.map(p => `• ${p.name}: ${p.desc}`).join("\n");
    return `Here are some of Sujal's key projects:\n${projectList}`;
  }

  if (m.includes("contact") || m.includes("email") || m.includes("reach")) {
    return sujalProfile.contact;
  }

  if (m.includes("photo") || m.includes("picture")) {
    return `Sujal prefers dark/black backgrounds for his photos.`;
  }

  // 2) exact phrase matches / keywords from FAQ
  for (const item of FAQ) {
    for (const kw of item.keywords) {
      if (m.includes(kw)) {
        return typeof item.reply === "function" ? item.reply() : item.reply;
      }
    }
  }

  // 3) simple patterns: question about registration/login
  if (m.includes("register") || m.includes("signup")) {
    return "To register, use the Register button and provide your name, email and password.";
  }

  if (m.includes("login")) {
    return "To log in, use your registered email and password at the login page.";
  }

  // 4) fallback
  return `I'm not sure about that. Try asking about Sujal's "skills", "projects", or "bio".`;
};

/* ---------------------------
   Controller exports
   --------------------------- */

/**
 * POST /api/chat/send
 * Body: { message: string, sessionId?: string }
 */
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    let { sessionId } = req.params;
    const body = req.body || {};
    const { message } = body;

    // Use body sessionId if params one is invalid or missing/mismatched
    if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
      sessionId = body.sessionId;
    }

    if (!message || String(message).trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    // find or create chat session
    let chat;
    if (sessionId) {
      chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Chat session not found" });
    } else {
      // Fallback: create new session if no ID provided (though usually separate endpoint)
      chat = await Chat.create({ user: userId, messages: [] });
    }

    // push user message
    const userMsg = { sender: "user", message: message };
    chat.messages.push(userMsg);

    // Generate Bot Reply
    const botText = getRuleBasedReply(message);
    const botMsg = { sender: "bot", message: botText };
    chat.messages.push(botMsg);

    await chat.save();

    return res.status(200).json({
      sessionId: chat._id,
      reply: botText,
      messages: chat.messages // Return all messages to sync state if needed
    });
  } catch (error) {
    console.error("chatController.sendMessage error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/chat/history
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.params;

    if (sessionId) {
      const chat = await Chat.findOne({ _id: sessionId, user: userId });
      if (!chat) return res.status(404).json({ message: "Session not found" });

      return res.json({
        sessionId: chat._id,
        sessionTitle: chat.sessionTitle,
        messages: chat.messages,
      });
    }

    // no sessionId -> return session list (recent first)
    const sessions = await Chat.find({ user: userId })
      .select("_id sessionTitle updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(100);

    const summary = sessions.map((s) => ({
      id: s._id,
      title: s.sessionTitle,
      updatedAt: s.updatedAt,
      lastMessage: s.messages.length ? s.messages[s.messages.length - 1] : null,
    }));

    return res.json(summary);
  } catch (error) {
    console.error("chatController.getHistory error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/chat/session
 */
export const createSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title } = req.body || {};
    const chat = await Chat.create({
      user: userId,
      sessionTitle: title ? String(title).trim() : "New Chat",
      messages: [],
    });
    return res.status(201).json({ id: chat._id, title: chat.sessionTitle });
  } catch (error) {
    console.error("chatController.createSession error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/chat/session/:id
 */
export const deleteSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.params.sessionId;
    const deleted = await Chat.findOneAndDelete({ _id: sessionId, user: userId });
    if (!deleted) return res.status(404).json({ message: "Session not found" });
    return res.json({ message: "Session deleted" });
  } catch (error) {
    console.error("chatController.deleteSession error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/chat/session/:id
 */
export const renameSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.params.sessionId;
    const { name } = req.body || {};

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
    }

    const chat = await Chat.findOne({ _id: sessionId, user: userId });
    if (!chat) return res.status(404).json({ message: "Session not found" });

    chat.sessionTitle = String(name).trim();
    await chat.save();

    return res.json({ id: chat._id, title: chat.sessionTitle });
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
