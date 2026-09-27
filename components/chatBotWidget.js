"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ChatbotWidget() {
  // Deliberately NOT using useRequireAuth here: that hook redirects signed-out
  // visitors away, which would break public pages (e.g. /signup) if this
  // widget sits in the root layout. This just listens for auth state and
  // hides the chat button when nobody's signed in.
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [myId, setMyId] = useState(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: "user" | "bot", text: string }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // Look up this account's app-level "id" (the U001-style id) by email,
  // same pattern used on the roommates/listings pages.
  useEffect(() => {
    if (!firebaseUser) {
      setMyId(null);
      return;
    }

    async function loadMyId() {
      try {
        const usersRef = collection(db, "users");
        const meQuery = query(usersRef, where("email", "==", firebaseUser.email));
        const meSnap = await getDocs(meQuery);

        if (!meSnap.empty) {
          setMyId(meSnap.docs[0].data().id);
        }
      } catch (err) {
        console.error("Chatbot: failed to resolve user id", err);
      }
    }

    loadMyId();
  }, [firebaseUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !myId || sending) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: myId, message: text }),
      });

      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }

      const json = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: json.answer }]);
    } catch (err) {
      console.error("Chatbot request failed", err);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Nothing rendered at all if nobody's signed in yet.
  if (!firebaseUser) return null;

  return (
    <div className="chatbot-root">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <span>Ask a question</span>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </div>

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="chatbot-empty">Ask me anything about roommates, listings, or the app.</p>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chatbot-bubble ${m.role === "user" ? "chatbot-bubble-user" : "chatbot-bubble-bot"}`}>
                {m.text}
              </div>
            ))}

            {sending && (
              <div className="chatbot-bubble chatbot-bubble-bot chatbot-typing">
                <span className="chatbot-dot" />
                <span className="chatbot-dot" />
                <span className="chatbot-dot" />
              </div>
            )}
          </div>

          <div className="chatbot-input-row">
            <textarea
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
            />
            <button
              className="chatbot-send"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        className="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "✕" : "💬"}
      </button>

      <style jsx>{`
        .chatbot-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .chatbot-fab {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          background: #111111;
          color: #ffffff;
          font-size: 22px;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
          transition: transform 0.15s ease;
        }

        .chatbot-fab:hover {
          transform: scale(1.05);
        }

        .chatbot-panel {
          width: 320px;
          height: 420px;
          margin-bottom: 12px;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px) scale(0.98);
          animation: panelIn 0.18s ease forwards;
        }

        @keyframes panelIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .chatbot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: #111111;
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
        }

        .chatbot-close {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          padding: 2px 6px;
        }

        .chatbot-messages {
          flex: 1;
          padding: 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chatbot-empty {
          color: #999999;
          font-size: 13px;
          margin: auto 0;
          text-align: center;
        }

        .chatbot-bubble {
          max-width: 80%;
          padding: 9px 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .chatbot-bubble-user {
          align-self: flex-end;
          background: #111111;
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }

        .chatbot-bubble-bot {
          align-self: flex-start;
          background: #f2f2f2;
          color: #111111;
          border-bottom-left-radius: 4px;
        }

        .chatbot-typing {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .chatbot-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #999999;
          animation: dotPulse 1s infinite ease-in-out;
        }

        .chatbot-dot:nth-child(2) {
          animation-delay: 0.15s;
        }

        .chatbot-dot:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes dotPulse {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .chatbot-input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 10px;
          border-top: 1px solid #eeeeee;
        }

        .chatbot-input {
          flex: 1;
          resize: none;
          border: 1px solid #dddddd;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          max-height: 80px;
        }

        .chatbot-input:focus {
          border-color: #111111;
        }

        .chatbot-send {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: #111111;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .chatbot-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}