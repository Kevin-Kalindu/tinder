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
    <div className="chat-page">
      <div className="chat-app">
        <Sidebar />

        <div className="chat-shell">
          <aside className="chat-sidebar">
            <h1>Messages</h1>

            <div className="chat-search">
              <span>⌕</span>
              <input type="text" placeholder="Search conversations" />
            </div>

            {sortedFriends.length === 0 && (
              <p style={{ padding: "16px 10px", color: "#9b8c7f", fontSize: 14 }}>
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
                  className={`chat-conversation${active ? " active" : ""}`}
                >
                  <img
                    src={friend.picture || "https://via.placeholder.com/44"}
                    alt={friend.name}
                    className="chat-avatar image"
                  />

                  <div className="chat-conv-copy">
                    <strong>{friend.name || "Unnamed"}</strong>
                    <span style={{ color: unread ? "var(--ink)" : undefined, fontWeight: unread ? 600 : undefined }}>
                      {preview || "No messages yet"}
                    </span>
                  </div>

                  {unread && <span className="chat-unread" />}
                </button>
              );
            })}
          </aside>

          <main className="chat-main">
            {!activeFriendId && (
              <div className="chat-empty">
                Select a conversation to start chatting
              </div>
            )}

            {activeFriendId && isFriend === false && (
              <div className="chat-not-friend">
                <p>You can only message your friends.</p>
              </div>
            )}

            {activeFriendId && isFriend === true && (
              <>
                <header className="chat-head">
                  <img
                    src={activeFriend?.picture || "https://via.placeholder.com/44"}
                    alt={activeFriend?.name}
                    className="chat-avatar image"
                  />
                  <div className="chat-head-copy">
                    <strong>{activeFriend?.name || "Unknown"}</strong>
                    <span>Active now</span>
                  </div>
                  <div className="chat-head-spacer" />
                  <button className="chat-head-btn" type="button" title="More options">
                    •••
                  </button>
                </header>

                <section className="chat-messages" id="messages">
                  <div className="chat-day">Today</div>

                  {messages.map((m) => {
                    const isMine = m.senderId === docId;
                    const createdAt = m.createdAt?.toDate?.() || null;

                    return (
                      <div
                        key={m.id}
                        className={`chat-message ${isMine ? "mine" : "theirs"}`}
                      >
                        <div className="chat-bubble">{m.text}</div>
                        {createdAt && (
                          <div className="chat-stamp">
                            {createdAt.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div ref={bottomRef} />
                </section>

                <form
                  className="chat-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <div className="chat-composer-box">
                    <button className="chat-icon" type="button" title="Attach">
                      ＋
                    </button>

                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message..."
                      rows={1}
                      aria-label="Message"
                    />

                    <button className="chat-icon" type="button" title="Emoji">
                      ☺
                    </button>
                  </div>

                  <button
                    className="chat-send"
                    type="submit"
                    disabled={sending || !text.trim()}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </form>
              </>
            )}
          </main>
        </div>
      </div>

      <style jsx global>{`/* Rinder chat styling */
:root{
  --cream:#f6efe3;
  --paper:#fffaf2;
  --paper-2:#fbf3e8;
  --ink:#201b17;
  --muted:#7b6f64;
  --line:#e7d7c6;
  --orange:#ff6b2c;
  --orange-2:#ff8f4d;
  --peach:#ffd9bf;
  --dark:#29211c;
  --green:#6f8267;
  --shadow:0 18px 50px rgba(67,42,24,.08);
}
.chat-page{min-height:100vh;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--cream);color:var(--ink)}
.chat-page button,.chat-page input,.chat-page textarea{font:inherit}
.chat-page button{cursor:pointer}
.chat-app{min-height:100vh;display:flex;background:radial-gradient(circle at 90% 10%,rgba(255,173,116,.16),transparent 28%),radial-gradient(circle at 20% 90%,rgba(244,206,170,.18),transparent 30%),var(--cream)}
.chat-shell{display:flex;flex:1;min-width:0}
.chat-sidebar{width:300px;flex-shrink:0;height:100vh;position:sticky;top:0;background:rgba(255,250,242,.92);backdrop-filter:blur(12px);border-right:1px solid var(--line);padding:20px 16px;overflow:auto}
.chat-sidebar h1{font-size:1.35rem;margin:0 0 16px;letter-spacing:-.03em}
.chat-search{display:flex;align-items:center;gap:9px;background:#fffdfa;border:1px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:16px}
.chat-search input{border:0;outline:0;background:transparent;width:100%;color:var(--ink)}
.chat-conversation{width:100%;border:0;background:transparent;display:flex;align-items:center;gap:11px;padding:11px 10px;border-radius:16px;text-align:left;margin-bottom:6px;transition:.18s;color:var(--ink)}
.chat-conversation:hover{background:#f7eadf;transform:translateX(3px)}
.chat-conversation.active{background:#ffe5d1}
.chat-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(145deg,#ffd2b1,#ffae79);display:grid;place-items:center;font-weight:800;color:#6c4029;flex:0 0 auto;object-fit:cover}
.chat-avatar.image{background:transparent}
.chat-conv-copy{min-width:0;flex:1}
.chat-conv-copy strong{display:block;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-conv-copy span{display:block;font-size:.76rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.chat-unread{width:8px;height:8px;border-radius:50%;background:var(--orange);flex-shrink:0}
.chat-main{min-width:0;display:flex;flex:1;flex-direction:column;height:100vh}
.chat-empty,.chat-not-friend{flex:1;display:flex;align-items:center;justify-content:center;color:#9b8c7f;font-size:15px}
.chat-not-friend p{color:#9b8c7f}
.chat-head{padding:18px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);background:rgba(255,250,242,.82);backdrop-filter:blur(10px);position:sticky;top:0;z-index:2}
.chat-head .chat-avatar{width:44px;height:44px}
.chat-head-copy strong{display:block}
.chat-head-copy span{font-size:.78rem;color:var(--muted)}
.chat-head-spacer{flex:1}
.chat-head-btn{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:#fffdfa;color:var(--ink);transition:.18s}
.chat-head-btn:hover{transform:translateY(-2px);border-color:#f1aa7d}
.chat-messages{flex:1;overflow:auto;padding:26px;display:flex;flex-direction:column;gap:14px;background:transparent}
.chat-day{align-self:center;font-size:.72rem;color:#9b8c7f;background:#f5e9dd;padding:6px 10px;border-radius:999px}
.chat-message{display:flex;gap:8px;align-items:flex-end;max-width:75%}
.chat-message.mine{align-self:flex-end;flex-direction:row-reverse}
.chat-message.theirs{align-self:flex-start}
.chat-bubble{padding:11px 14px;border-radius:18px;line-height:1.42;box-shadow:0 8px 22px rgba(77,47,29,.04);font-size:.93rem;word-break:break-word}
.chat-message.theirs .chat-bubble{background:#fffdfa;border:1px solid var(--line);border-bottom-left-radius:6px}
.chat-message.mine .chat-bubble{background:linear-gradient(135deg,var(--orange),var(--orange-2));color:#fff;border-bottom-right-radius:6px}
.chat-stamp{font-size:.66rem;color:#9b8c7f;padding-bottom:3px;white-space:nowrap}
.chat-composer{padding:16px 22px 20px;border-top:1px solid var(--line);background:rgba(255,250,242,.94);display:flex;gap:10px;align-items:center}
.chat-composer-box{flex:1;display:flex;align-items:center;gap:9px;border:1px solid var(--line);background:#fffdfa;border-radius:18px;padding:8px 10px 8px 13px;box-shadow:0 8px 25px rgba(67,42,24,.045)}
.chat-composer textarea{flex:1;border:0;outline:0;background:transparent;color:var(--ink);resize:none;min-height:24px;max-height:140px;padding:3px 0;line-height:1.4}
.chat-icon{border:0;background:transparent;color:#8d7e72;font-size:1rem;padding:7px;border-radius:10px}
.chat-icon:hover{background:#f3e8dc;color:var(--ink)}
.chat-send{border:0;border-radius:14px;background:var(--orange);color:#fff;font-weight:800;padding:10px 14px;transition:.18s}
.chat-send:hover:not(:disabled){background:#ef5c1f;transform:translateY(-1px)}
.chat-send:disabled{cursor:default;opacity:.5}
@media(max-width:900px){.chat-sidebar{width:250px}}
@media(max-width:700px){.chat-app{display:block}.chat-shell{display:block}.chat-sidebar{position:relative;width:100%;height:auto;border-right:0;border-bottom:1px solid var(--line);padding-bottom:10px}.chat-main{height:calc(100vh - 170px)}.chat-messages{padding:18px}.chat-message{max-width:88%}}
`}</style>
    </div>
  );
}

