import api from "./axios.js";

// Create a new chat session
export const createSession = async () => {
    const response = await api.post("/chat/session", {});
    return response.data;
};

// Get chat history (List of sessions if no ID, or specific session)
export const getHistory = async (sessionId) => {
    // If sessionId is provided, get that session. Else get list.
    const url = sessionId ? `/chat/history/${sessionId}` : '/chat/history';
    const response = await api.get(url);
    return response.data;
};

// Send a message to a session
export const sendMessage = async (sessionId, message) => {
    const response = await api.post(`/chat/message/${sessionId}`, { message, sessionId });
    return response.data;
};

// Delete a session
export const deleteSession = async (sessionId) => {
    const response = await api.delete(`/chat/session/${sessionId}`);
    return response.data;
};

// Rename a session
export const renameSession = async (sessionId, newName) => {
    const response = await api.put(`/chat/session/${sessionId}`, { name: newName });
    return response.data;
};
