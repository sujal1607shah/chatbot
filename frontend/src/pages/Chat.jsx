import React, { useState, useEffect, useRef } from 'react';
import { createSession, getHistory, sendMessage, deleteSession } from '../api/chat.api';
import { useNavigate } from 'react-router-dom';

const Chat = () => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Load sessions on mount
  useEffect(() => {
    loadSessionsList();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessionsList = async () => {
    try {
      const data = await getHistory(); // Returns array of sessions
      if (Array.isArray(data)) {
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          // Load the most recent session
          loadSession(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions", error);
    }
  };

  const loadSession = async (sessionId) => {
    if (!sessionId) return;
    setLoading(true);
    setCurrentSessionId(sessionId);
    try {
      const data = await getHistory(sessionId);
      // data should be { sessionId, sessionTitle, messages: [...] }
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    setLoading(true);
    try {
      const newSession = await createSession();
      // newSession: { id, title }
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create session", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    let activeId = currentSessionId;

    if (!activeId) {
      if (sessions.length === 0) {
        // Auto-create new session
        const newSession = await createSession();
        setSessions([newSession, ...sessions]);
        setCurrentSessionId(newSession.id);
        activeId = newSession.id;
      } else {
        // Should not happen if currentSessionId is null but sessions exist, 
        // unless session selection was cleared.
        // Alert user or pick first? Let's pick first.
        activeId = sessions[0].id;
        setCurrentSessionId(activeId);
      }
    }

    const userMsg = { sender: 'user', message: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(activeId, input);
      // response: { sessionId, reply, messages... }
      const botMsg = {
        sender: 'bot',
        message: response.reply
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages(prev => [...prev, { sender: 'bot', message: "Error sending message." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        if (updatedSessions.length > 0) {
          loadSession(updatedSessions[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user'); // Clean up user data too
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-800 transition-all duration-300 ease-in-out flex flex-col border-r border-gray-700 relative`}
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate">
            Sujal's  Bot
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-4 bg-gray-800">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors shadow-md"
          >
            <span>+</span> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-2 custom-scrollbar">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => loadSession(session.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-700/50 text-gray-300'}`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-lg">💬</span>
                <span className="truncate text-sm">{session.title || "Conversation"}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity"
              >
                🗑️
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-center text-gray-500 text-sm mt-4">No recent chats</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:underline w-full text-left"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0b141a]"> {/* Keeping dark theme */}
        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900/90 backdrop-blur-md z-10">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white"
              >
                ☰
              </button>
            )}
            <h3 className="font-medium text-gray-200">{currentSessionId ? 'Chat with Sujal AI' : 'Start a new chat'}</h3>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-xl">Ask me about Sujal!</p>
              <p className="text-sm mt-2">Try "Who is Sujal?", "Skills", or "Projects"</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] md:max-w-[70%] lg:max-w-[60%] p-4 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none animate-pulse">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gray-900 border-t border-gray-800">
          <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message..."
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg border border-gray-700/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;
