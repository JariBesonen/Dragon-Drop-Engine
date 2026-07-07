import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import type { ApiConversation, ApiMessage } from "../../lib/api";
import "./Messages.css";

export function Messages() {
  const { currentUser } = useAuth();
  const { userId } = useParams<{ userId?: string }>();

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    userId ? Number(userId) : null,
  );
  const [messageContent, setMessageContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    loadConversations();
    const interval = setInterval(loadConversations, 3000);
    pollIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !selectedUserId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    pollIntervalRef.current = interval;
    return () => clearInterval(interval);
  }, [currentUser, selectedUserId]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    try {
      const result = await api.getConversationList();
      setConversations(result.conversations);
      setError(null);
    } catch (err) {
      setError("Failed to load conversations");
    }
  };

  const loadMessages = async () => {
    if (!selectedUserId) return;
    try {
      const result = await api.getConversation(selectedUserId);
      setMessages(result.messages.reverse());
      setError(null);
    } catch (err) {
      setError("Failed to load messages");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedUserId) return;

    try {
      const response = await api.sendMessage({
        recipientUserId: selectedUserId,
        content: messageContent,
      });
      setMessages((prev) => [...prev, response.message]);
      setMessageContent("");
      await loadConversations();
    } catch (err) {
      setError("Failed to send message");
    }
  };

  if (!currentUser) {
    return (
      <div className="messages-empty">Please log in to view messages.</div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        <h2>Messages</h2>
        {conversations.length === 0 ? (
          <div className="messages-empty-list">No conversations yet</div>
        ) : (
          <div className="conversations-list">
            {conversations.map((conv) => (
              <div
                key={conv.otherUserId}
                className={`conversation-item ${
                  selectedUserId === conv.otherUserId ? "active" : ""
                }`}
                onClick={() => setSelectedUserId(conv.otherUserId)}
              >
                {conv.otherUserAvatarUrl && (
                  <img
                    src={conv.otherUserAvatarUrl}
                    alt={conv.otherUserDisplayName}
                    className="conversation-avatar"
                  />
                )}
                <div className="conversation-info">
                  <div className="conversation-name">
                    {conv.otherUserDisplayName}
                  </div>
                  <div className="conversation-preview">
                    {conv.latestMessageSenderId === currentUser.id
                      ? "You: "
                      : ""}
                    {conv.latestMessageContent}
                  </div>
                  <div className="conversation-time">
                    {new Date(conv.latestMessageCreatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="messages-chat">
        {selectedUserId ? (
          <>
            <div className="messages-header">
              {conversations.find((c) => c.otherUserId === selectedUserId)
                ?.otherUserDisplayName || "Loading..."}
            </div>
            {error && <div className="messages-error">{error}</div>}
            <div className="messages-content" ref={messageListRef}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${
                    msg.senderUserId === currentUser.id ? "sent" : "received"
                  }`}
                >
                  <div className="message-text">{msg.content}</div>
                  <div className="message-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
            <form className="messages-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type a message..."
                className="message-input-field"
              />
              <button
                type="submit"
                className="message-send-button"
                disabled={!messageContent.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="messages-empty">Select a conversation to start</div>
        )}
      </div>
    </div>
  );
}
