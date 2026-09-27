"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/authGuard";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/loader";

function chatIdFor(a, b) {
  return [a, b].sort().join("_");
}

export default function Chat() {
  const { userAgent, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const activeFriendId = params?.friendId?.[0] || null;

  const [docId, setDocId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [chatMeta, setChatMeta] = useState({}); // chatId -> { lastMessage, lastMessageAt, lastMessageSenderId, lastRead }
  const [fetchingFriends, setFetchingFriends] = useState(true);

  const [activeFriend, setActiveFriend] = useState(null);
  const [isFriend, setIsFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // 1. resolve my doc id + load friends list
  useEffect(() => {
    if (!userAgent) return;

    async function load() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userAgent.email));
      const snap = await getDocs(q);
      if (snap.empty) {
        setFetchingFriends(false);
        return;
      }

      const myDoc = snap.docs[0];
      setDocId(myDoc.id);
      const friendIds = myDoc.data().friends || [];

      const friendDocs = await Promise.all(
        friendIds.map((id) => getDoc(doc(db, "users", id)))
      );
      setFriends(
        friendDocs.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() }))
      );
      setFetchingFriends(false);
    }

    load();
  }, [userAgent]);

  // 2. live-subscribe to all my chat docs, to know unread state + last message previews
  useEffect(() => {
    if (!docId) return;

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", docId));

    const unsubscribe = onSnapshot(q, (snap) => {
      const meta = {};
      snap.docs.forEach((d) => {
        meta[d.id] = d.data();
      });
      setChatMeta(meta);
    });

    return () => unsubscribe();
  }, [docId]);

  // 3. when the active friend changes, verify friendship + load their profile
  useEffect(() => {
    if (!docId || !activeFriendId) {
      setIsFriend(null);
      setActiveFriend(null);
      return;
    }

    async function checkFriendship() {
      const myDoc = await getDoc(doc(db, "users", docId));
      const friendIds = myDoc.data()?.friends || [];

      if (!friendIds.includes(activeFriendId)) {
        setIsFriend(false);
        return;
      }

      const friendSnap = await getDoc(doc(db, "users", activeFriendId));
      if (friendSnap.exists()) {
        setActiveFriend({ id: friendSnap.id, ...friendSnap.data() });
      }
      setIsFriend(true);
    }

    checkFriendship();
  }, [docId, activeFriendId]);

  // 4. subscribe to messages for the active chat + mark it read
  useEffect(() => {
    if (!docId || !activeFriendId || isFriend !== true) return;

    const chatId = chatIdFor(docId, activeFriendId);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // mark as read
    setDoc(
      doc(db, "chats", chatId),
      {
        participants: [docId, activeFriendId].sort(),
        lastRead: { [docId]: serverTimestamp() },
      },
      { merge: true }
    ).catch((err) => console.error("Failed to mark chat read:", err));

    return () => unsubscribe();
  }, [docId, activeFriendId, isFriend]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !docId || !activeFriendId || sending) return;

    setSending(true);
    setText("");
    try {
      const chatId = chatIdFor(docId, activeFriendId);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: docId,
        text: trimmed,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          participants: [docId, activeFriendId].sort(),
          lastMessage: trimmed,
          lastMessageAt: serverTimestamp(),
          lastMessageSenderId: docId,
          lastRead: { [docId]: serverTimestamp() },
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function isUnread(friendId) {
    const chatId = chatIdFor(docId, friendId);
    const meta = chatMeta[chatId];
    if (!meta || !meta.lastMessageAt) return false;
    if (meta.lastMessageSenderId === docId) return false; // I sent it last, not unread
    const myLastRead = meta.lastRead?.[docId];
    if (!myLastRead) return true;
    return meta.lastMessageAt.toMillis() > myLastRead.toMillis();
  }

  function lastMessagePreview(friendId) {
    const chatId = chatIdFor(docId, friendId);
    return chatMeta[chatId]?.lastMessage || null;
  }

  function sortKey(friendId) {
    const chatId = chatIdFor(docId, friendId);
    return chatMeta[chatId]?.lastMessageAt?.toMillis() || 0;
  }

  const sortedFriends = [...friends].sort((a, b) => sortKey(b.id) - sortKey(a.id));

  if (loading || fetchingFriends) return <Loader />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        {/* LEFT: friends list */}
        <aside
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: "1px solid #e5e5e5",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #eee" }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>Messages</h1>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {sortedFriends.length === 0 && (
              <p style={{ padding: "16px 20px", color: "#999", fontSize: 14 }}>
                You don&apos;t have any friends yet — accept a friend request first.
              </p>
            )}

            {sortedFriends.map((friend) => {
              const unread = isUnread(friend.id);
              const active = friend.id === activeFriendId;
              const preview = lastMessagePreview(friend.id);

              return (
                <button
                  key={friend.id}
                  onClick={() => router.push(`/chat/${friend.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 20px",
                    background: active ? "#f3f3f3" : "transparent",
                    border: "none",
                    borderBottom: "1px solid #f2f2f2",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <img
                    src={friend.picture || "https://via.placeholder.com/44"}
                    alt={friend.name}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: unread ? 700 : 600,
                        color: "#111",
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {friend.name || "Unnamed"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: unread ? "#111" : "#999",
                        fontWeight: unread ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {preview || "No messages yet"}
                    </div>
                  </div>
                  {unread && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#111",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: active conversation */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!activeFriendId && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
                fontSize: 15,
              }}
            >
              Select a conversation to start chatting
            </div>
          )}

          {activeFriendId && isFriend === false && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#999" }}>You can only message your friends.</p>
            </div>
          )}

          {activeFriendId && isFriend === true && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 24px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <img
                  src={activeFriend?.picture || "https://via.placeholder.com/40"}
                  alt={activeFriend?.name}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
                <strong>{activeFriend?.name || "Unknown"}</strong>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "#fafafa",
                }}
              >
                {messages.map((m) => {
                  const isMine = m.senderId === docId;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMine ? "flex-end" : "flex-start",
                        background: isMine ? "#111" : "#fff",
                        color: isMine ? "#fff" : "#111",
                        border: isMine ? "none" : "1px solid #e5e5e5",
                        padding: "10px 16px",
                        borderRadius: 18,
                        maxWidth: "65%",
                        wordBreak: "break-word",
                        fontSize: 14,
                        lineHeight: 1.4,
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 16,
                  borderTop: "1px solid #eee",
                  background: "#fff",
                }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message…"
                  rows={1}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 22,
                    border: "1px solid #ddd",
                    resize: "none",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  style={{
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    borderRadius: 22,
                    padding: "0 22px",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: sending || !text.trim() ? "default" : "pointer",
                    opacity: sending || !text.trim() ? 0.5 : 1,
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}