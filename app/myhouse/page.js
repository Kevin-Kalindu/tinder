"use client";

import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/lib/authGuard";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/loader";

export default function House() {
  const { userAgent, loading } = useRequireAuth();

  const [docId, setDocId] = useState(null);
  const [houseId, setHouseId] = useState(null);
  const [house, setHouse] = useState(null);
  const [resolving, setResolving] = useState(true);

  const [joinInput, setJoinInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [formError, setFormError] = useState("");

  const [chores, setChores] = useState([]);
  const [notes, setNotes] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [polls, setPolls] = useState([]);
  const [members, setMembers] = useState([]);

  const [choreName, setChoreName] = useState("");
  const [chorePerson, setChorePerson] = useState("");
  const [noteText, setNoteText] = useState("");
  const [groceryItem, setGroceryItem] = useState("");
  const [maintenanceText, setMaintenanceText] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");

  const [wifiShown, setWifiShown] = useState(false);
  const [editingWifi, setEditingWifi] = useState(false);
  const [wifiNameInput, setWifiNameInput] = useState("");
  const [wifiPassInput, setWifiPassInput] = useState("");

  const [toastMsg, setToastMsg] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef(null);

  function toast(msg) {
    setToastMsg(msg);
    setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 1800);
  }

  // 1. resolve my doc id + houseId from my profile
  useEffect(() => {
    if (!userAgent) return;

    async function resolve() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userAgent.email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setResolving(false);
        return;
      }

      const myDoc = snap.docs[0];
      setDocId(myDoc.id);
      setHouseId(myDoc.data().houseId || null);
      setResolving(false);
    }

    resolve();
  }, [userAgent]);

  // 2. subscribe to house doc once we know houseId
  useEffect(() => {
    if (!houseId) {
      setHouse(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "houses", houseId), (snap) => {
      setHouse(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    return () => unsubscribe();
  }, [houseId]);

  // 3. subscribe to subcollections once we have a house
  useEffect(() => {
    if (!houseId) {
      setChores([]);
      setNotes([]);
      setGroceries([]);
      setMaintenance([]);
      setPolls([]);
      return;
    }

    const unsubChores = onSnapshot(
      query(collection(db, "houses", houseId, "chores"), orderBy("createdAt", "asc")),
      (snap) => setChores(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubNotes = onSnapshot(
      query(collection(db, "houses", houseId, "notes"), orderBy("createdAt", "desc")),
      (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubGroceries = onSnapshot(
      query(collection(db, "houses", houseId, "groceries"), orderBy("createdAt", "asc")),
      (snap) => setGroceries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubMaintenance = onSnapshot(
      query(collection(db, "houses", houseId, "maintenance"), orderBy("createdAt", "desc")),
      (snap) => setMaintenance(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPolls = onSnapshot(
      query(collection(db, "houses", houseId, "polls"), orderBy("createdAt", "desc")),
      (snap) => setPolls(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubChores();
      unsubNotes();
      unsubGroceries();
      unsubMaintenance();
      unsubPolls();
    };
  }, [houseId]);

  // 4. sync local wifi input state whenever house doc changes
  useEffect(() => {
    if (house) {
      setWifiNameInput(house.wifiName || "");
      setWifiPassInput(house.wifiPassword || "");
    }
  }, [house]);

  // 5. resolve members array into full profiles
  useEffect(() => {
    if (!house?.members?.length) {
      setMembers([]);
      return;
    }

    async function loadMembers() {
      const docs = await Promise.all(
        house.members.map((id) => getDoc(doc(db, "users", id)))
      );
      setMembers(docs.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() })));
    }

    loadMembers();
  }, [house?.members]);

  async function nextHouseId() {
    const counterRef = doc(db, "general", "houses");
    const counterSnap = await getDoc(counterRef);
    const current = counterSnap.exists() ? counterSnap.data().amount || 0 : 0;
    const next = current + 1;
    await setDoc(counterRef, { amount: next }, { merge: true });
    return `H${String(next).padStart(3, "0")}`;
  }

  async function handleCreateHouse() {
    if (!docId || creating) return;
    setCreating(true);
    setFormError("");
    try {
      const newHouseId = await nextHouseId();
      await setDoc(doc(db, "houses", newHouseId), {
        id: newHouseId,
        name: "My House",
        createdBy: docId,
        members: [docId],
        wifiName: "House Wi-Fi",
        wifiPassword: "changeme123",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", docId), { houseId: newHouseId });
      setHouseId(newHouseId);
      toast("House created");
    } catch (err) {
      console.error("Failed to create house:", err);
      setFormError("Something went wrong creating the house.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinHouse() {
    const targetId = joinInput.trim().toUpperCase();
    if (!targetId || !docId || joining) return;
    setJoining(true);
    setFormError("");
    try {
      const houseRef = doc(db, "houses", targetId);
      const houseSnap = await getDoc(houseRef);
      if (!houseSnap.exists()) {
        setFormError("No house found with that ID.");
        setJoining(false);
        return;
      }
      await updateDoc(houseRef, { members: arrayUnion(docId) });
      await updateDoc(doc(db, "users", docId), { houseId: targetId });
      setHouseId(targetId);
      setJoinInput("");
      toast("Joined house");
    } catch (err) {
      console.error("Failed to join house:", err);
      setFormError("Something went wrong joining that house.");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeaveHouse() {
    if (!houseId || !docId) return;
    if (!confirm("Leave this house?")) return;
    try {
      await updateDoc(doc(db, "houses", houseId), { members: arrayRemove(docId) });
      await updateDoc(doc(db, "users", docId), { houseId: null });
      setHouseId(null);
      toast("Left house");
    } catch (err) {
      console.error("Failed to leave house:", err);
    }
  }

  // ---- chores ----
  async function addChore(e) {
    e.preventDefault();
    if (!choreName.trim() || !chorePerson.trim() || !houseId) return;
    await addDoc(collection(db, "houses", houseId, "chores"), {
      name: choreName.trim(),
      person: chorePerson.trim(),
      done: false,
      createdAt: serverTimestamp(),
    });
    setChoreName("");
    setChorePerson("");
    toast("Chore added");
  }
  async function toggleChore(chore) {
    await updateDoc(doc(db, "houses", houseId, "chores", chore.id), { done: !chore.done });
  }
  async function deleteChore(chore) {
    await deleteDoc(doc(db, "houses", houseId, "chores", chore.id));
  }

  // ---- notes ----
  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim() || !houseId) return;
    await addDoc(collection(db, "houses", houseId, "notes"), {
      text: noteText.trim(),
      createdAt: serverTimestamp(),
    });
    setNoteText("");
    toast("Anonymous note posted");
  }

  // ---- groceries ----
  async function addGrocery(e) {
    e.preventDefault();
    if (!groceryItem.trim() || !houseId) return;
    await addDoc(collection(db, "houses", houseId, "groceries"), {
      name: groceryItem.trim(),
      done: false,
      createdAt: serverTimestamp(),
    });
    setGroceryItem("");
    toast("Grocery item added");
  }
  async function toggleGrocery(item) {
    await updateDoc(doc(db, "houses", houseId, "groceries", item.id), { done: !item.done });
  }
  async function deleteGrocery(item) {
    await deleteDoc(doc(db, "houses", houseId, "groceries", item.id));
  }

  // ---- maintenance ----
  async function addMaintenance(e) {
    e.preventDefault();
    if (!maintenanceText.trim() || !houseId) return;
    await addDoc(collection(db, "houses", houseId, "maintenance"), {
      text: maintenanceText.trim(),
      status: "Open",
      createdAt: serverTimestamp(),
    });
    setMaintenanceText("");
    toast("Maintenance request submitted");
  }
  async function toggleMaintenance(item) {
    await updateDoc(doc(db, "houses", houseId, "maintenance", item.id), {
      status: item.status === "Open" ? "Resolved" : "Open",
    });
  }

  // ---- polls ----
  async function addPoll(e) {
    e.preventDefault();
    if (!pollQuestion.trim() || !houseId) return;
    await addDoc(collection(db, "houses", houseId, "polls"), {
      question: pollQuestion.trim(),
      yes: 0,
      no: 0,
      createdAt: serverTimestamp(),
    });
    setPollQuestion("");
    toast("Poll created");
  }
  async function votePoll(poll, key) {
    await updateDoc(doc(db, "houses", houseId, "polls", poll.id), {
      [key]: (poll[key] || 0) + 1,
    });
  }

  // ---- wifi ----
  async function saveWifi() {
    await updateDoc(doc(db, "houses", houseId), {
      wifiName: wifiNameInput.trim() || "House Wi-Fi",
      wifiPassword: wifiPassInput.trim() || "",
    });
    setEditingWifi(false);
    toast("Wi-Fi details updated");
  }
  async function copyWifi() {
    const text = `Network: ${house?.wifiName}\nPassword: ${house?.wifiPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Wi-Fi details copied");
    } catch {
      toast("Copy unavailable in this browser");
    }
  }

  // ---- door ----
  function handleUnlockDoor() {
    alert("Front door unlocked");
  }

  if (loading || resolving) return <Loader />;

  // ---------- NO HOUSE YET ----------
  if (!houseId || !house) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 20,
          }}
        >
          <h1 style={{ marginBottom: 8 }}>My House</h1>
          <p style={{ color: "#888", marginBottom: 28, textAlign: "center", maxWidth: 380 }}>
            Create a house to manage chores, notes and more with your roommates, or join one with an
            invite ID.
          </p>

          <button
            onClick={handleCreateHouse}
            disabled={creating}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              marginBottom: 24,
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? "Creating…" : "+ Add House"}
          </button>

          <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 360 }}>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Enter house ID (e.g. H001)"
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />
            <button
              onClick={handleJoinHouse}
              disabled={joining}
              style={{
                background: "#fff",
                border: "1px solid #111",
                borderRadius: 10,
                padding: "0 18px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </div>

          {formError && <p style={{ color: "crimson", marginTop: 14 }}>{formError}</p>}
        </main>
      </div>
    );
  }

  // ---------- FULL DASHBOARD ----------
  const openChoreCount = chores.filter((t) => !t.done).length;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div className="house-shell" style={{ flex: 1 }}>
        <div className="ambient one"></div>
        <div className="ambient two"></div>
        <div className="ambient three"></div>

        <header className="house-only-header">
          <div className="house-only-nav" style={{ padding: "0 32px", width: "100%" }}>
            <div className="house-only-brand">
              <strong style={{ fontSize: 18 }}>{house.name}</strong>
            </div>
            <div className="nav-meta">
              <div className="house-only-label">Invite ID: {house.id}</div>
              <div className="secure-pill">Private space</div>
              <button className="tiny-btn" onClick={handleLeaveHouse}>Leave</button>
            </div>
          </div>
        </header>

        <main className="house-page">
          <div className="container">
            <section className="house-intro">
              <div>
                <div className="eyebrow">Private household dashboard</div>
                <h1>Run the house without the group-chat chaos.</h1>
                <p>One calm place for chores, anonymous household notes and quick front-door access.</p>
              </div>
              <div className="intro-summary">
                <div className="summary-chip"><strong>{openChoreCount}</strong><span>Open chores</span></div>
                <div className="summary-chip"><strong>{notes.length}</strong><span>Notes posted</span></div>
                <div className="summary-chip"><strong>Locked</strong><span>Front door</span></div>
              </div>
            </section>

            <section className="house-main-grid">
              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Chore management</h2><p>Add tasks, assign them, and clear them when they're done.</p></div>
                  <div className="icon-tile">✓</div>
                </div>
                <form className="house-form" onSubmit={addChore}>
                  <input className="house-input" value={choreName} onChange={(e) => setChoreName(e.target.value)} placeholder="e.g. Take out recycling" required />
                  <input className="house-input" value={chorePerson} onChange={(e) => setChorePerson(e.target.value)} placeholder="Assign to" required />
                  <button className="house-submit" type="submit">Add chore</button>
                </form>
                <div className="task-list">
                  {chores.length === 0 && <div className="empty-state">No chores yet. Add one above.</div>}
                  {chores.map((t) => (
                    <div key={t.id} className={`task${t.done ? " done" : ""}`}>
                      <button type="button" onClick={() => toggleChore(t)}>{t.done ? "↺" : "✓"}</button>
                      <div className="task-name">
                        <strong>{t.name}</strong>
                        <span>Assigned to {t.person}</span>
                      </div>
                      <button type="button" onClick={() => deleteChore(t)}>×</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="house-panel door-panel compact-door">
                <div className="door-glow"></div>
                <div className="door-top">
                  <div>
                    <div className="eyebrow" style={{ color: "#ffb181" }}>Front door</div>
                    <h2>Door access</h2>
                    <div className="door-state">
                      <span className="door-orb"></span>
                      <span>Locked · secure</span>
                    </div>
                  </div>
                  <div className="door-live">Live</div>
                </div>
                <div className="door-center">
                  <div className="lock-ring">
                    <div className="door-icon-large">🔒</div>
                  </div>
                </div>
                <div className="door-bottom">
                  <div className="door-info-row">
                    <div className="door-mini"><small>Auto re-lock</small><strong>10 seconds</strong></div>
                    <div className="door-mini"><small>Last action</small><strong>No activity yet</strong></div>
                  </div>
                  <button className="door-action" type="button" onClick={handleUnlockDoor}>Unlock front door</button>
                </div>
              </section>

              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Anonymous notes</h2><p>Leave something for everyone without attaching your name.</p></div>
                  <div className="icon-tile">✦</div>
                </div>
                <form className="notes-form" onSubmit={addNote}>
                  <textarea className="house-input house-textarea" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write an anonymous household note…" required />
                  <button className="house-submit" type="submit" style={{ padding: "13px 18px", justifySelf: "start" }}>Post anonymously</button>
                </form>
                <div className="note-list" style={{ marginTop: 16 }}>
                  {notes.length === 0 && <div className="empty-state">No anonymous notes yet.</div>}
                  {notes.map((n) => (
                    <div key={n.id} className="note">
                      {n.text}
                      <time>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : ""}</time>
                    </div>
                  ))}
                </div>
              </section>

              <section className="house-panel wifi-card">
                <div className="panel-head">
                  <div><h2>House Wi-Fi</h2><p>Keep the network info somewhere everyone can find it.</p></div>
                  <div className="icon-tile">⌁</div>
                </div>

                {editingWifi ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <input className="house-input" value={wifiNameInput} onChange={(e) => setWifiNameInput(e.target.value)} placeholder="Network name" />
                    <input className="house-input" value={wifiPassInput} onChange={(e) => setWifiPassInput(e.target.value)} placeholder="Password" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="house-submit" onClick={saveWifi} type="button">Save</button>
                      <button className="tiny-btn" onClick={() => setEditingWifi(false)} type="button">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="wifi-hero">
                      <div className="wifi-icon">⌁</div>
                      <div className="wifi-meta">
                        <small>Network</small>
                        <strong>{house.wifiName}</strong>
                        <small style={{ marginTop: 6 }}>
                          Password: <span>{wifiShown ? house.wifiPassword : "••••••••••"}</span>
                        </small>
                      </div>
                    </div>
                    <div className="wifi-actions">
                      <button className="primary" type="button" onClick={() => setWifiShown((v) => !v)}>
                        {wifiShown ? "Hide password" : "Show password"}
                      </button>
                      <button className="secondary" type="button" onClick={copyWifi}>Copy details</button>
                    </div>
                    <button className="tiny-btn" style={{ marginTop: 10 }} onClick={() => setEditingWifi(true)}>Edit Wi-Fi</button>
                  </>
                )}
              </section>

              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Shared grocery list</h2><p>Add what the house needs and check items off while shopping.</p></div>
                  <div className="icon-tile">🛒</div>
                </div>
                <form className="house-form" style={{ gridTemplateColumns: "1fr auto" }} onSubmit={addGrocery}>
                  <input className="house-input" value={groceryItem} onChange={(e) => setGroceryItem(e.target.value)} placeholder="e.g. Milk" required />
                  <button className="house-submit" type="submit">Add item</button>
                </form>
                <div className="grocery-list">
                  {groceries.length === 0 && <div className="empty-state">Nothing on the grocery list.</div>}
                  {groceries.map((g) => (
                    <div key={g.id} className={`grocery-item${g.done ? " done" : ""}`}>
                      <button className="tiny-btn" type="button" onClick={() => toggleGrocery(g)}>{g.done ? "↺" : "✓"}</button>
                      <strong style={{ flex: 1 }}>{g.name}</strong>
                      <button className="tiny-btn" type="button" onClick={() => deleteGrocery(g)}>×</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Housemates</h2><p>Everyone currently living in {house.name}.</p></div>
                  <div className="icon-tile">👥</div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {members.length === 0 && <div className="empty-state">No housemates yet.</div>}
                  {members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "#fff",
                        border: "1px solid rgba(44,36,29,.08)",
                        borderRadius: 16,
                        padding: 12,
                      }}
                    >
                      <img
                        src={m.picture || "https://via.placeholder.com/44"}
                        alt={m.name}
                        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 14 }}>{m.name || "Unnamed"}</strong>
                        {m.program && (
                          <span style={{ fontSize: 13, color: "var(--house-muted)" }}>{m.program}</span>
                        )}
                      </div>
                      {m.id === house.createdBy && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "#f7eadc",
                            color: "#6f5b4a",
                            flexShrink: 0,
                          }}
                        >
                          Owner
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Maintenance requests</h2><p>Log issues around the house and track whether they are open or resolved.</p></div>
                  <div className="icon-tile">🛠</div>
                </div>
                <form className="house-form" style={{ gridTemplateColumns: "1fr auto" }} onSubmit={addMaintenance}>
                  <input className="house-input" value={maintenanceText} onChange={(e) => setMaintenanceText(e.target.value)} placeholder="e.g. Kitchen tap is leaking" required />
                  <button className="house-submit" type="submit">Submit</button>
                </form>
                <div className="maintenance-list">
                  {maintenance.length === 0 && <div className="empty-state">No maintenance requests.</div>}
                  {maintenance.map((m) => (
                    <div key={m.id} className="maintenance-item">
                      <strong>{m.text}</strong>
                      <span>House maintenance</span>
                      <br />
                      <button className="status-badge" type="button" onClick={() => toggleMaintenance(m)}>{m.status}</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="house-panel">
                <div className="panel-head">
                  <div><h2>Quick polls</h2><p>Settle small house decisions without another group-chat thread.</p></div>
                  <div className="icon-tile">◉</div>
                </div>
                <form className="house-form" style={{ gridTemplateColumns: "1fr auto" }} onSubmit={addPoll}>
                  <input className="house-input" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="e.g. Movie night Friday?" required />
                  <button className="house-submit" type="submit">Create poll</button>
                </form>
                <div className="poll-list">
                  {polls.length === 0 && <div className="empty-state">No active polls.</div>}
                  {polls.map((p) => (
                    <div key={p.id} className="poll-item">
                      <strong>{p.question}</strong>
                      <span>{(p.yes || 0) + (p.no || 0)} votes</span>
                      <div className="poll-options">
                        <button type="button" onClick={() => votePoll(p, "yes")}>Yes · {p.yes || 0}</button>
                        <button type="button" onClick={() => votePoll(p, "no")}>No · {p.no || 0}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>

      {toastShow && <div className="house-toast show">{toastMsg}</div>}

      <style>{`
        :root{
          --house-bg:#f4eadb;--house-card:#fffaf3;--house-ink:#2c241d;--house-muted:#79695d;
          --house-line:rgba(62,45,33,.10);--house-orange:#ff7427;--house-orange-2:#ff9b55;
          --house-soft:#f9dfc6;--house-dark:#221a15;--house-green:#7cc988;
        }
        .house-shell{min-height:100vh;position:relative;overflow:hidden;background:
          radial-gradient(circle at 82% 8%,rgba(255,132,61,.22),transparent 27%),
          radial-gradient(circle at 8% 34%,rgba(255,255,255,.72),transparent 25%),
          linear-gradient(180deg,#fff8ef 0%,#f4e5d3 100%)}
        .ambient{position:absolute;border-radius:999px;filter:blur(2px);pointer-events:none;animation:floaty 9s ease-in-out infinite}
        .ambient.one{width:170px;height:170px;background:rgba(255,132,61,.12);right:6%;top:24%}
        .ambient.two{width:90px;height:90px;background:rgba(255,255,255,.65);left:5%;top:68%;animation-delay:-3s}
        .ambient.three{width:130px;height:130px;border:1px solid rgba(255,116,39,.2);right:23%;bottom:5%;animation-delay:-6s}
        @keyframes floaty{50%{transform:translateY(-18px) translateX(8px) rotate(5deg)}}
        .house-only-header{height:78px;display:flex;align-items:center;border-bottom:1px solid var(--house-line);background:rgba(255,249,241,.80);backdrop-filter:blur(18px);position:sticky;top:0;z-index:20}
        .house-only-nav{display:flex;align-items:center;justify-content:space-between;gap:24px}
        .house-only-label,.secure-pill{font-size:.79rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
        .house-only-label{color:var(--house-muted)}
        .secure-pill{padding:9px 12px;border-radius:999px;background:#fff;border:1px solid var(--house-line);display:flex;align-items:center;gap:7px}
        .secure-pill:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--house-green);box-shadow:0 0 0 4px rgba(124,201,136,.13)}
        .nav-meta{display:flex;align-items:center;gap:10px}
        .house-page{position:relative;z-index:1;padding:40px 0 64px}
        .container{max-width:1180px;margin:0 auto;padding:0 24px}
        .house-intro{display:grid;grid-template-columns:1.25fr .75fr;gap:28px;align-items:end;margin-bottom:24px}
        .eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--house-orange)}
        .house-intro h1{font-size:clamp(2.2rem,4.5vw,3.6rem);line-height:1;letter-spacing:-.04em;margin:8px 0 16px;max-width:900px}
        .house-intro p{max-width:720px;color:var(--house-muted);font-size:1.02rem;line-height:1.7;margin:0}
        .intro-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .summary-chip{background:rgba(255,250,243,.76);border:1px solid var(--house-line);border-radius:18px;padding:15px;transition:.22s ease;box-shadow:0 12px 28px rgba(84,54,29,.05)}
        .summary-chip:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(84,54,29,.10)}
        .summary-chip strong{display:block;font-size:1.35rem;margin-bottom:4px}
        .summary-chip span{font-size:.78rem;color:var(--house-muted)}
        .house-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:stretch}
        .compact-door{min-height:auto;padding:22px}
        .compact-door .door-top{align-items:center}
        .compact-door .door-center{min-height:auto;display:block;margin:18px 0}
        .compact-door .lock-ring{width:92px;height:92px;margin:0 auto}
        .compact-door .door-icon-large{font-size:2.3rem}
        .compact-door .door-info-row{grid-template-columns:1fr 1fr}
        .compact-door h2{font-size:1.5rem;margin:4px 0 6px}
        .compact-door .door-live{white-space:nowrap}
        .grocery-list,.maintenance-list,.poll-list{display:grid;gap:10px}
        .grocery-item,.maintenance-item,.poll-item{background:#fff;border:1px solid rgba(44,36,29,.08);border-radius:16px;padding:13px;transition:.2s ease}
        .grocery-item:hover,.maintenance-item:hover,.poll-item:hover{transform:translateY(-2px);border-color:rgba(255,116,39,.22);box-shadow:0 10px 22px rgba(77,48,26,.07)}
        .grocery-item{display:flex;align-items:center;gap:10px}.grocery-item.done{opacity:.55}.grocery-item.done strong{text-decoration:line-through}
        .tiny-btn{border:0;background:#f7eadc;border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:800;color:#6f5b4a}.tiny-btn:hover{background:#ffddc4;color:#de5d15}
        .maintenance-item strong,.poll-item strong{display:block;margin-bottom:4px}.maintenance-item span,.poll-item span{font-size:.8rem;color:var(--house-muted)}
        .status-badge{display:inline-flex;margin-top:8px;padding:6px 9px;border-radius:999px;background:#f7eadc;font-size:.72rem;font-weight:800;border:0;cursor:pointer}
        .poll-options{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.poll-options button{border:1px solid rgba(44,36,29,.10);background:#fff7ef;border-radius:999px;padding:8px 11px;cursor:pointer;font-weight:750}.poll-options button:hover{background:#ffe2ca;border-color:rgba(255,116,39,.22)}
        .wifi-card{background:linear-gradient(145deg,#fff5e8,#f4dcc7);border:1px solid rgba(255,116,39,.15)}
        .wifi-hero{display:flex;align-items:center;gap:14px;padding:14px;border-radius:18px;background:#fff;border:1px solid rgba(44,36,29,.07);margin-bottom:12px}.wifi-icon{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:#221a15;color:#fff;font-size:1.5rem}.wifi-meta small{display:block;color:var(--house-muted)}.wifi-meta strong{font-size:1.05rem}
        .wifi-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wifi-actions button{border:0;border-radius:14px;padding:12px 14px;font:inherit;font-weight:800;cursor:pointer}.wifi-actions .primary{background:var(--house-orange);color:#fff}.wifi-actions .secondary{background:#fff;border:1px solid rgba(44,36,29,.10)}
        .house-panel{position:relative;overflow:hidden;background:rgba(255,250,243,.92);border:1px solid rgba(67,46,29,.08);border-radius:28px;padding:26px;box-shadow:0 20px 48px rgba(68,45,24,.08);transition:.25s ease;display:flex;flex-direction:column}
        .house-panel:hover{transform:translateY(-3px);box-shadow:0 26px 56px rgba(68,45,24,.12);border-color:rgba(255,116,39,.18)}
        .panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}
        .panel-head h2{font-size:1.5rem;margin:0 0 6px;letter-spacing:-.02em}
        .panel-head p{margin:0;color:var(--house-muted);line-height:1.6;max-width:560px}
        .icon-tile{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:var(--house-soft);font-size:1.3rem;flex:0 0 auto;transition:.25s ease}
        .house-panel:hover .icon-tile{transform:rotate(-6deg) scale(1.05)}
        .door-panel{display:flex;flex-direction:column;background:linear-gradient(155deg,#2a211b 0%,#17120f 65%,#2f1e14 100%);color:#fff;border-color:rgba(255,255,255,.06)}
        .door-panel:hover{border-color:rgba(255,153,92,.24)}
        .door-glow{position:absolute;width:250px;height:250px;border-radius:50%;background:rgba(255,116,39,.18);right:-85px;top:-75px;filter:blur(4px);transition:.35s ease}
        .door-panel:hover .door-glow{transform:scale(1.12)}
        .door-top,.door-center,.door-bottom{position:relative;z-index:1}
        .door-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
        .door-panel h2{font-size:1.8rem;margin:7px 0 8px}
        .door-state{display:flex;align-items:center;gap:10px;color:#eadfd4;font-size:.93rem}
        .door-orb{width:10px;height:10px;border-radius:50%;background:var(--house-green);box-shadow:0 0 0 6px rgba(124,201,136,.10)}
        .door-live{font-size:.72rem;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#f4e9df}
        .door-center{display:grid;place-items:center;min-height:270px}
        .lock-ring{width:176px;height:176px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.12),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 0 0 18px rgba(255,255,255,.018),0 28px 60px rgba(0,0,0,.20);transition:.35s ease}
        .door-panel:hover .lock-ring{transform:scale(1.03)}
        .door-icon-large{font-size:4.2rem;line-height:1}
        .door-info-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
        .door-mini{padding:12px 13px;border-radius:15px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
        .door-mini small{display:block;color:#bfae9f;margin-bottom:3px}
        .door-mini strong{font-size:.92rem}
        .door-action{width:100%;border:0;border-radius:17px;padding:16px 18px;background:linear-gradient(135deg,var(--house-orange),#ff9954);color:#fff;font:inherit;font-weight:850;cursor:pointer;box-shadow:0 14px 28px rgba(255,116,39,.22);transition:.22s ease}
        .door-action:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 18px 34px rgba(255,116,39,.30)}
        .door-action:active{transform:translateY(1px) scale(.99)}
        .house-form{display:grid;grid-template-columns:1.25fr .75fr auto;gap:10px;margin-bottom:16px}
        .house-input{width:100%;border:1px solid rgba(44,36,29,.12);background:#fff;border-radius:14px;padding:13px 14px;font:inherit;color:inherit;outline:none;transition:.2s ease}
        .house-input:hover{border-color:rgba(255,116,39,.32)}
        .house-input:focus{border-color:var(--house-orange);box-shadow:0 0 0 4px rgba(255,116,39,.10)}
        .house-submit{border:0;border-radius:14px;padding:0 18px;background:var(--house-dark);color:#fff;font:inherit;font-weight:800;cursor:pointer;transition:.2s ease}
        .house-submit:hover{transform:translateY(-2px);background:#3b2a20}
        .house-textarea{min-height:112px;resize:vertical}
        .notes-form{display:grid;gap:10px}
        .task-list,.note-list{display:grid;gap:10px}
        .task,.note{background:#fff;border:1px solid rgba(44,36,29,.08);border-radius:17px;padding:14px;transition:.2s ease}
        .task:hover,.note:hover{transform:translateX(3px);border-color:rgba(255,116,39,.22);box-shadow:0 10px 22px rgba(77,48,26,.07)}
        .task{display:flex;align-items:center;gap:12px}
        .task button{width:32px;height:32px;border:0;border-radius:10px;background:#f7eadc;font-size:1rem;cursor:pointer;color:#7a6655;transition:.2s ease}
        .task button:hover{background:#ffddc4;color:#de5d15;transform:scale(1.08)}
        .task-name{flex:1;min-width:0}
        .task-name strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .task-name span{font-size:.8rem;color:var(--house-muted)}
        .task.done{opacity:.55}
        .task.done strong{text-decoration:line-through}
        .note{line-height:1.55;position:relative;padding-left:18px}
        .note:before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:999px;background:linear-gradient(var(--house-orange),var(--house-orange-2))}
        .note time{display:block;margin-top:8px;font-size:.76rem;color:var(--house-muted)}
        .empty-state{border:1px dashed rgba(44,36,29,.15);border-radius:16px;padding:20px;text-align:center;color:var(--house-muted);background:rgba(255,255,255,.45)}
        .house-toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,0);opacity:0;background:#171310;color:#fff;padding:12px 18px;border-radius:999px;transition:.25s ease;z-index:50;pointer-events:none;box-shadow:0 16px 34px rgba(0,0,0,.22)}
        .house-toast.show{opacity:1}
        @media(max-width:1000px){.house-intro{grid-template-columns:1fr}.intro-summary{max-width:560px}.house-main-grid{grid-template-columns:1fr}}
        @media(max-width:700px){.house-form{grid-template-columns:1fr}.intro-summary{grid-template-columns:1fr 1fr}.door-info-row,.wifi-actions{grid-template-columns:1fr}.house-page{padding-top:28px}.house-intro h1{font-size:2.4rem}.house-panel{padding:20px;border-radius:22px}}
        @media(max-width:460px){.intro-summary{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}