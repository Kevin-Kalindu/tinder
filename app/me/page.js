"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/authGuard";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // adjust path if your firestore instance lives elsewhere
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/loader";

const emptyProfile = {
  name: "",
  email: "",
  age: "",
  dob: "",
  gender: "",
  program: "",
  budget: "",
  description: "",
  interests: "",
  cleanliness: "",
  noise_level: "",
  sleep_schedule: "",
  guests_frequency: "",
  pet: "",
  picture: "",
  drinking: false,
  smoking: false,
  has_place: false,
  looking: false,
  friends: [],
  requests: [],
};

// Fields that must be non-empty before saving is allowed.
const REQUIRED_FIELDS = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age" },
  { key: "dob", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "program", label: "Program" },
  { key: "budget", label: "Budget" },
  { key: "description", label: "Description" },
  { key: "interests", label: "Interests" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "noise_level", label: "Noise level" },
  { key: "sleep_schedule", label: "Sleep schedule" },
  { key: "guests_frequency", label: "Guests frequency" },
  { key: "pet", label: "Pet" },
  { key: "picture", label: "Picture URL" },
];

function validateProfile(profile) {
  const missing = [];
  for (const { key, label } of REQUIRED_FIELDS) {
    const value = profile[key];
    if (typeof value === "string" && value.trim() === "") {
      missing.push(label);
    }
  }
  return missing;
}

export default function Me() {
  const { userAgent, loading } = useRequireAuth();
  const [profile, setProfile] = useState(emptyProfile);
  const [docId, setDocId] = useState(null); // e.g. "U001" — assigned once, then reused
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [friendsData, setFriendsData] = useState([]);
  const [requestsData, setRequestsData] = useState([]);
  const [relationsLoading, setRelationsLoading] = useState(false);

  // Load this user's existing profile, if one exists, by matching authUid
  useEffect(() => {
    if (!userAgent) return;

    async function loadProfile() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userAgent.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const data = existingDoc.data();
        setDocId(data.id || existingDoc.id);
        setProfile({
          ...emptyProfile,
          ...data,
          age: data.age?.toString() ?? "",
          budget: data.budget?.toString() ?? "",
          interests: Array.isArray(data.interests)
            ? data.interests.join(", ")
            : "",
          looking: data.looking === true,
          friends: Array.isArray(data.friends) ? data.friends : [],
          requests: Array.isArray(data.requests) ? data.requests : [],
        });
      } else {
        setProfile({
          ...emptyProfile,
          name: userAgent.displayName || "",
          email: userAgent.email || "",
          picture: userAgent.photoURL || "",
        });
      }
      setFetching(false);
    }

    loadProfile();
  }, [userAgent]);

  // Whenever the friends/requests ID lists change, fetch the actual
  // name + picture for each of those user documents.
  useEffect(() => {
    async function loadRelations() {
      setRelationsLoading(true);
      const friendIds = profile.friends || [];
      const requestIds = profile.requests || [];

      const [friendDocs, requestDocs] = await Promise.all([
        Promise.all(friendIds.map((id) => getDoc(doc(db, "users", id)))),
        Promise.all(requestIds.map((id) => getDoc(doc(db, "users", id)))),
      ]);

      setFriendsData(
        friendDocs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() }))
      );
      setRequestsData(
        requestDocs
          .filter((d) => d.exists())
          .map((d) => ({ id: d.id, ...d.data() }))
      );
      setRelationsLoading(false);
    }

    if (docId) loadRelations();
  }, [profile.friends, profile.requests, docId]);

  // Returns the existing doc ID, or assigns the next sequential one
  // ("U001", "U002", ...) the first time this user saves, by reading
  // general/users -> amount, adding one, and saving it back.
  async function ensureDocId() {
    if (docId) return docId;

    const counterRef = doc(db, "general", "users");
    const counterSnap = await getDoc(counterRef);
    const currentAmount = counterSnap.exists()
      ? counterSnap.data().amount || 0
      : 0;
    const nextAmount = currentAmount + 1;

    await setDoc(counterRef, { amount: nextAmount }, { merge: true });

    const newId = `U${String(nextAmount).padStart(3, "0")}`;
    setDocId(newId);
    return newId;
  }

  function handleChange(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!userAgent) return;

    const missing = validateProfile(profile);
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    setMissingFields([]);
    setSaving(true);

    try {
      const targetId = await ensureDocId();
      const payload = {
        ...profile,
        id: targetId,
        age: Number(profile.age),
        budget: Number(profile.budget),
        interests: profile.interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
      };
      await setDoc(doc(db, "users", targetId), payload, { merge: true });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLooking() {
    if (!userAgent) return;
    const nextLooking = !profile.looking;
    setProfile((prev) => ({ ...prev, looking: nextLooking }));
    try {
      const targetId = await ensureDocId();
      await setDoc(
        doc(db, "users", targetId),
        { looking: nextLooking, id: targetId },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to update looking status:", err);
      setProfile((prev) => ({ ...prev, looking: !nextLooking }));
    }
  }

  async function handleAcceptRequest(requesterId) {
    if (!docId) return;
    try {
      const myRef = doc(db, "users", docId);
      const theirRef = doc(db, "users", requesterId);

      await updateDoc(myRef, {
        friends: arrayUnion(requesterId),
        requests: arrayRemove(requesterId),
      });
      // Make it mutual — add me to their friends list too
      await updateDoc(theirRef, {
        friends: arrayUnion(docId),
      });

      setProfile((prev) => ({
        ...prev,
        friends: [...prev.friends, requesterId],
        requests: prev.requests.filter((id) => id !== requesterId),
      }));
    } catch (err) {
      console.error("Failed to accept request:", err);
      alert("Something went wrong accepting that request.");
    }
  }

  async function handleRejectRequest(requesterId) {
    if (!docId) return;
    try {
      const myRef = doc(db, "users", docId);
      await updateDoc(myRef, {
        requests: arrayRemove(requesterId),
      });
      setProfile((prev) => ({
        ...prev,
        requests: prev.requests.filter((id) => id !== requesterId),
      }));
    } catch (err) {
      console.error("Failed to reject request:", err);
      alert("Something went wrong rejecting that request.");
    }
  }

  if (loading || fetching) return <Loader />;

  return (
    <div className="layout">
      <Sidebar />
  
      <main className="content">
        <div className="shell">
  
          {/* Page header */}
          <div className="topbar">
            <div className="title-wrap">
              <small>Profile</small>
              <h1>Me</h1>
            </div>
  
            {!isEditing && (
              <button
                className="edit-top"
                onClick={() => setIsEditing(true)}
              >
                Edit profile
              </button>
            )}
          </div>
  
          {/* Profile hero */}
          <section className="hero-card">
            <article className="profile-card">
              <img
                src={
                  profile.picture ||
                  "https://via.placeholder.com/110"
                }
                alt={profile.name || "Profile picture"}
                className="avatar"
              />
  
              <div className="profile-copy">
                <h2>{profile.name || "Unnamed"}</h2>
  
                <div className="email">
                  {profile.email || "—"}
                </div>
  
                <div className="chips">
                  {profile.age && (
                    <span className="chip">
                      {profile.age} years old
                    </span>
                  )}
  
                  {profile.program && (
                    <span className="chip">
                      {profile.program}
                    </span>
                  )}
  
                  {profile.looking && (
                    <span className="chip looking-chip">
                      Looking for roommate
                    </span>
                  )}
                </div>
              </div>
            </article>
  
            {/* Profile metrics */}
            <aside className="side-card">
              <div className="metric">
                <div className="n">
                  {friendsData.length}
                </div>
                <span>Connected friends</span>
              </div>
  
              <div className="metric">
                <div className="n">
                  {requestsData.length}
                </div>
                <span>Pending requests</span>
              </div>
  
              <div className="metric wide">
                <div className="n">
                  {profile.looking ? "Ready to match" : "Not looking"}
                </div>
  
                <span>
                  {profile.looking
                    ? "Your roommate profile is visible to suggested matches."
                    : "Turn on roommate search when you're ready."}
                </span>
              </div>
            </aside>
          </section>
  
          {/* Edit mode */}
          {isEditing && (
            <section className="panel edit-panel">
  
              <div className="panel-head">
                <div>
                  <h3>Edit profile</h3>
                  <span>Keep your profile information current</span>
                </div>
  
                <button
                  className="close-edit"
                  onClick={() => {
                    setIsEditing(false);
                    setMissingFields([]);
                  }}
                >
                  Cancel
                </button>
              </div>
  
              {missingFields.length > 0 && (
                <div className="error-box">
                  <strong>Please fill out:</strong>{" "}
                  {missingFields.join(", ")}
                </div>
              )}
  
              <div className="fields">
  
                <Field
                  label="Name"
                  value={profile.name}
                  editing
                  onChange={(v) => handleChange("name", v)}
                />
  
                <Field
                  label="Age"
                  value={profile.age}
                  editing
                  onChange={(v) => handleChange("age", v)}
                  type="number"
                />
  
                <Field
                  label="Date of birth"
                  value={profile.dob}
                  editing
                  onChange={(v) => handleChange("dob", v)}
                  type="date"
                />
  
                <SelectField
                  label="Gender"
                  value={profile.gender}
                  editing
                  options={["Male", "Female", "Other"]}
                  onChange={(v) => handleChange("gender", v)}
                />
  
                <Field
                  label="Program"
                  value={profile.program}
                  editing
                  onChange={(v) => handleChange("program", v)}
                />
  
                <Field
                  label="Budget"
                  value={profile.budget}
                  editing
                  onChange={(v) => handleChange("budget", v)}
                  type="number"
                />
  
                <Field
                  label="Description"
                  value={profile.description}
                  editing
                  onChange={(v) => handleChange("description", v)}
                  multiline
                />
  
                <Field
                  label="Interests (comma-separated)"
                  value={profile.interests}
                  editing
                  onChange={(v) => handleChange("interests", v)}
                />
  
                <SelectField
                  label="Cleanliness"
                  value={profile.cleanliness}
                  editing
                  options={["Low", "Medium", "High"]}
                  onChange={(v) =>
                    handleChange("cleanliness", v)
                  }
                />
  
                <SelectField
                  label="Noise level"
                  value={profile.noise_level}
                  editing
                  options={["Low", "Medium", "High"]}
                  onChange={(v) =>
                    handleChange("noise_level", v)
                  }
                />
  
                <SelectField
                  label="Sleep schedule"
                  value={profile.sleep_schedule}
                  editing
                  options={["early", "late", "varies"]}
                  onChange={(v) =>
                    handleChange("sleep_schedule", v)
                  }
                />
  
                <SelectField
                  label="Guests frequency"
                  value={profile.guests_frequency}
                  editing
                  options={["rarely", "sometimes", "often"]}
                  onChange={(v) =>
                    handleChange("guests_frequency", v)
                  }
                />
  
                <Field
                  label="Pet"
                  value={profile.pet}
                  editing
                  onChange={(v) => handleChange("pet", v)}
                />
  
                <Field
                  label="Picture URL"
                  value={profile.picture}
                  editing
                  onChange={(v) => handleChange("picture", v)}
                />
  
                <ToggleField
                  label="Drinking"
                  value={profile.drinking}
                  editing
                  onChange={(v) =>
                    handleChange("drinking", v)
                  }
                />
  
                <ToggleField
                  label="Smoking"
                  value={profile.smoking}
                  editing
                  onChange={(v) =>
                    handleChange("smoking", v)
                  }
                />
  
                <ToggleField
                  label="Has a place"
                  value={profile.has_place}
                  editing
                  onChange={(v) =>
                    handleChange("has_place", v)
                  }
                />
  
              </div>
  
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </section>
          )}
  
          {/* Personal details */}
          {!isEditing && (
            <section className="content-grid">
  
              <article className="panel">
                <div className="panel-head">
                  <h3>Personal details</h3>
                  <span>Keep your profile current</span>
                </div>
  
                <div className="details">
  
                  <div className="detail">
                    <small>Name</small>
                    <strong>{profile.name || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Age</small>
                    <strong>{profile.age || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Date of birth</small>
                    <strong>{profile.dob || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Gender</small>
                    <strong>{profile.gender || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Program</small>
                    <strong>{profile.program || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Budget</small>
                    <strong>
                      {profile.budget
                        ? `$${profile.budget}`
                        : "—"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Cleanliness</small>
                    <strong>
                      {profile.cleanliness || "—"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Noise level</small>
                    <strong>
                      {profile.noise_level || "—"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Sleep schedule</small>
                    <strong>
                      {profile.sleep_schedule || "—"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Guests</small>
                    <strong>
                      {profile.guests_frequency || "—"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Pet</small>
                    <strong>{profile.pet || "—"}</strong>
                  </div>
  
                  <div className="detail">
                    <small>Drinking</small>
                    <strong>
                      {profile.drinking ? "Yes" : "No"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Smoking</small>
                    <strong>
                      {profile.smoking ? "Yes" : "No"}
                    </strong>
                  </div>
  
                  <div className="detail">
                    <small>Has a place</small>
                    <strong>
                      {profile.has_place ? "Yes" : "No"}
                    </strong>
                  </div>
  
                  <div className="detail full">
                    <small>Interests</small>
                    <div className="bio-text">
                      {Array.isArray(profile.interests)
                        ? profile.interests.join(", ")
                        : profile.interests || "—"}
                    </div>
                  </div>
  
                  <div className="detail full">
                    <small>Description</small>
                    <div className="bio-text">
                      {profile.description || "—"}
                    </div>
                  </div>
  
                </div>
              </article>
  
              {/* Connections */}
              <aside className="connections-stack">
  
                <section className="panel connection-tab">
                  <div className="panel-head">
                    <h3>Friends</h3>
                    <span>
                      {friendsData.length} connected
                    </span>
                  </div>
  
                  {relationsLoading ? (
                    <p className="empty-text">
                      Loading…
                    </p>
                  ) : friendsData.length === 0 ? (
                    <p className="empty-text">
                      No friends yet
                    </p>
                  ) : (
                    <ul className="friend-list">
                      {friendsData.map((friend) => (
                        <li key={friend.id}>
                          <Link
                            href={`/chat/${friend.id}`}
                            className="friend"
                          >
                            <img
                              src={
                                friend.picture ||
                                "https://via.placeholder.com/40"
                              }
                              alt={
                                friend.name || "Friend"
                              }
                              className="friend-avatar"
                            />
  
                            <div className="friend-copy">
                              <strong>
                                {friend.name ||
                                  "Unnamed"}
                              </strong>
  
                              <span>
                                Friend
                              </span>
                            </div>
  
                            <span className="status">
                              Connected
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
  
                <section className="panel connection-tab">
                  <div className="panel-head">
                    <h3>Requests</h3>
                    <span>
                      {requestsData.length} pending
                    </span>
                  </div>
  
                  {relationsLoading ? (
                    <p className="empty-text">
                      Loading…
                    </p>
                  ) : requestsData.length === 0 ? (
                    <p className="empty-text">
                      No requests
                    </p>
                  ) : (
                    <ul className="friend-list">
                      {requestsData.map((req) => (
                        <li key={req.id}>
  
                          <div className="friend">
                            <img
                              src={
                                req.picture ||
                                "https://via.placeholder.com/40"
                              }
                              alt={
                                req.name || "Request"
                              }
                              className="friend-avatar"
                            />
  
                            <div className="friend-copy">
                              <strong>
                                {req.name ||
                                  "Unnamed"}
                              </strong>
  
                              <span>
                                Roommate request
                              </span>
                            </div>
  
                            <span className="status request">
                              Pending
                            </span>
                          </div>
  
                          <div className="request-actions">
                            <button
                              className="accept-btn"
                              onClick={() =>
                                handleAcceptRequest(
                                  req.id
                                )
                              }
                            >
                              Accept
                            </button>
  
                            <button
                              className="reject-btn"
                              onClick={() =>
                                handleRejectRequest(
                                  req.id
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
  
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
  
              </aside>
            </section>
          )}
  
          {/* Looking status */}
          <button
            className={`looking-btn ${
              profile.looking ? "active" : ""
            }`}
            onClick={handleToggleLooking}
          >
            {profile.looking
              ? "✓ Looking for a roommate"
              : "Looking for a roommate"}
          </button>
  
        </div>
      </main>
  
      <style jsx>{`
  
        :global(*) {
          box-sizing: border-box;
        }
  
        :global(html),
        :global(body) {
          margin: 0;
          min-height: 100%;
        }
  
        .layout {
          min-height: 100vh;
          display: flex;
          background: #f6efe3;
          color: #201b17;
          font-family:
            Inter,
            ui-sans-serif,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }
  
        .content {
          flex: 1;
          min-width: 0;
          padding: 28px 34px 42px;
          overflow: hidden;
          position: relative;
        }
  
        .content::before,
        .content::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          opacity: .45;
        }
  
        .content::before {
          width: 340px;
          height: 340px;
          background: #f8d5bd;
          right: -140px;
          top: -150px;
        }
  
        .content::after {
          width: 260px;
          height: 260px;
          background: #eddac5;
          left: 12%;
          bottom: -120px;
        }
  
        .shell {
          position: relative;
          z-index: 1;
          max-width: 1240px;
          margin: 0 auto;
        }
  
        /* Header */
  
        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 20px;
        }
  
        .title-wrap small {
          text-transform: uppercase;
          letter-spacing: .12em;
          color: #8a5b3c;
          font-weight: 800;
          font-size: .74rem;
        }
  
        .title-wrap h1 {
          font-size: clamp(2.5rem, 5vw, 4.8rem);
          line-height: .95;
          letter-spacing: -.065em;
          margin: 6px 0 0;
        }
  
        .edit-top {
          border: 1px solid #e7d8c7;
          background: #fffaf2;
          color: #201b17;
          border-radius: 999px;
          padding: 11px 16px;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(69,43,26,.05);
          transition: .18s;
          cursor: pointer;
        }
  
        .edit-top:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 55px rgba(67,42,24,.09);
        }
  
        /* Hero */
  
        .hero-card {
          display: grid;
          grid-template-columns:
            minmax(0, 1.1fr)
            minmax(310px, .9fr);
          gap: 16px;
          margin-bottom: 16px;
        }
  
        .profile-card,
        .side-card,
        .panel {
          background: rgba(255,250,242,.94);
          border: 1px solid rgba(111,77,53,.11);
          border-radius: 28px;
          box-shadow:
            0 12px 40px rgba(67,42,24,.065);
        }
  
        .profile-card {
          padding: 26px;
          display: flex;
          align-items: center;
          gap: 22px;
          min-height: 210px;
          position: relative;
          overflow: hidden;
        }
  
        .profile-card::after {
          content: "";
          position: absolute;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background:
            linear-gradient(
              145deg,
              #ffe0c8,
              #ffd1af
            );
          right: -50px;
          bottom: -60px;
        }
  
        .avatar {
          width: 110px;
          height: 110px;
          border-radius: 28px;
          object-fit: cover;
          background:
            linear-gradient(
              145deg,
              #ff6b2c,
              #ff8f4d
            );
          box-shadow:
            0 18px 38px rgba(255,107,44,.22);
          flex: 0 0 auto;
          position: relative;
          z-index: 1;
        }
  
        .profile-copy {
          position: relative;
          z-index: 1;
          min-width: 0;
        }
  
        .profile-copy h2 {
          font-size: 2rem;
          letter-spacing: -.045em;
          margin: 0 0 4px;
        }
  
        .email {
          color: #776f66;
          font-size: .95rem;
        }
  
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
  
        .chip {
          padding: 8px 11px;
          border-radius: 999px;
          background: #f3e7da;
          color: #6f5d4e;
          font-size: .82rem;
        }
  
        .looking-chip {
          background: #edf1e8;
          color: #60705a;
        }
  
        /* Metrics */
  
        .side-card {
          padding: 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
  
        .metric {
          border: 1px solid #e7d8c7;
          background: #fffdfa;
          border-radius: 20px;
          padding: 17px;
          transition: .18s;
        }
  
        .metric:hover {
          transform: translateY(-3px);
          border-color: #f4b083;
          box-shadow:
            0 12px 24px rgba(67,42,24,.06);
        }
  
        .metric .n {
          font-size: 1.9rem;
          font-weight: 900;
          letter-spacing: -.04em;
        }
  
        .metric span {
          display: block;
          color: #776f66;
          font-size: .82rem;
          margin-top: 2px;
        }
  
        .metric.wide {
          grid-column: 1 / -1;
          background: #201b17;
          color: white;
          border-color: #201b17;
        }
  
        .metric.wide span {
          color: #cfc2b6;
        }
  
        /* Main content */
  
        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(300px, .65fr);
          gap: 16px;
        }
  
        .panel {
          padding: 24px;
        }
  
        .panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
  
        .panel-head h3 {
          margin: 0;
          font-size: 1.35rem;
          letter-spacing: -.035em;
        }
  
        .panel-head span {
          color: #776f66;
          font-size: .84rem;
        }
  
        /* Details */
  
        .details {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
  
        .detail {
          padding: 15px 16px;
          border: 1px solid #e7d8c7;
          border-radius: 17px;
          background: #fffdfa;
          transition: .18s;
        }
  
        .detail:hover {
          border-color: #f3b085;
          transform: translateY(-2px);
        }
  
        .detail small {
          display: block;
          color: #9a8d80;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-size: .69rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
  
        .detail strong {
          font-size: .98rem;
        }
  
        .detail.full {
          grid-column: 1 / -1;
        }
  
        .bio-text {
          font-weight: 500;
          line-height: 1.6;
          color: #4d443d;
        }
  
        /* Connections */
  
        .connections-stack {
          display: grid;
          gap: 16px;
          align-content: start;
        }
  
        .connection-tab {
          position: relative;
          overflow: hidden;
        }
  
        .connection-tab::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background:
            linear-gradient(
              #ff6b2c,
              #ff8f4d
            );
        }
  
        .friend-list {
          display: grid;
          gap: 10px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
  
        .friend {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border-radius: 16px;
          border: 1px solid #e7d8c7;
          background: #fffdfa;
          transition: .18s;
          text-decoration: none;
          color: inherit;
        }
  
        .friend:hover {
          transform: translateX(4px);
          border-color: #f1ad80;
        }
  
        .friend-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          background: #ffd6ba;
          color: #6d4128;
          flex-shrink: 0;
        }
  
        .friend-copy {
          min-width: 0;
          flex: 1;
        }
  
        .friend-copy strong {
          display: block;
          font-size: .92rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
  
        .friend-copy span {
          font-size: .78rem;
          color: #776f66;
        }
  
        .status {
          font-size: .72rem;
          padding: 6px 8px;
          border-radius: 999px;
          background: #edf1e8;
          color: #60705a;
          white-space: nowrap;
        }
  
        .status.request {
          background: #fff7f0;
          color: #9b5c33;
        }
  
        .empty-text {
          color: #9a8d80;
          font-size: .84rem;
          margin: 0;
        }
  
        /* Request buttons */
  
        .request-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
  
        .accept-btn,
        .reject-btn {
          flex: 1;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: .78rem;
          font-weight: 700;
          cursor: pointer;
          transition: .18s;
        }
  
        .accept-btn {
          background: #ff6b2c;
          color: white;
          border: 1px solid #ff6b2c;
        }
  
        .accept-btn:hover {
          background: #ff8f4d;
          border-color: #ff8f4d;
          transform: translateY(-1px);
        }
  
        .reject-btn {
          background: #fffdfa;
          color: #6f6155;
          border: 1px solid #e7d8c7;
        }
  
        .reject-btn:hover {
          border-color: #f1ad80;
          transform: translateY(-1px);
        }
  
        /* Looking button */
  
        .looking-btn {
          width: 100%;
          margin-top: 16px;
          border: 0;
          border-radius: 16px;
          padding: 14px;
          background: #fffaf2;
          color: #6f6155;
          border: 1px solid #e7d8c7;
          font-weight: 800;
          cursor: pointer;
          transition: .18s;
        }
  
        .looking-btn:hover {
          transform: translateY(-2px);
          border-color: #f3b085;
        }
  
        .looking-btn.active {
          background: #201b17;
          border-color: #201b17;
          color: white;
        }
  
        /* Edit panel */
  
        .edit-panel {
          margin-bottom: 16px;
        }
  
        .close-edit {
          border: 1px solid #e7d8c7;
          background: #fffdfa;
          color: #6f6155;
          border-radius: 999px;
          padding: 8px 13px;
          font-weight: 700;
          cursor: pointer;
        }
  
        .error-box {
          background: #fff7f0;
          border: 1px solid #f1c09f;
          color: #8d4f2e;
          padding: 13px 16px;
          border-radius: 14px;
          font-size: .84rem;
          margin-bottom: 18px;
        }
  
        .fields {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
  
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
  
        .field:nth-child(7),
        .field:nth-child(8) {
          grid-column: 1 / -1;
        }
  
        .field label {
          font-size: .69rem;
          color: #9a8d80;
          text-transform: uppercase;
          letter-spacing: .08em;
          font-weight: 800;
        }
  
        .field input,
        .field select,
        .field textarea {
          width: 100%;
          margin: 0;
          border: 1px solid #e7d8c7;
          background: #fffdfa;
          border-radius: 14px;
          padding: 12px 13px;
          outline: none;
          color: #201b17;
          font: inherit;
          transition: .18s;
        }
  
        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #ff6b2c;
          box-shadow:
            0 0 0 3px rgba(255,107,44,.08);
        }
  
        .field textarea {
          min-height: 110px;
          resize: vertical;
        }
  
        .toggle-btns {
          display: flex;
          gap: 8px;
        }
  
        .toggle-btn {
          padding: 9px 18px;
          border-radius: 999px;
          border: 1px solid #e7d8c7;
          background: #fffdfa;
          color: #6f6155;
          font-size: .8rem;
          font-weight: 700;
          cursor: pointer;
          transition: .18s;
        }
  
        .toggle-btn.selected {
          background: #ff6b2c;
          border-color: #ff6b2c;
          color: white;
        }
  
        .save-btn {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          border-radius: 14px;
          border: 0;
          background: #ff6b2c;
          color: white;
          font-weight: 800;
          font-size: .95rem;
          cursor: pointer;
          transition: .18s;
        }
  
        .save-btn:hover {
          background: #ff8f4d;
          transform: translateY(-1px);
        }
  
        .save-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
          transform: none;
        }
  
        /* Responsive */
  
        @media (max-width: 980px) {
          .hero-card,
          .content-grid {
            grid-template-columns: 1fr;
          }
  
          .content {
            padding: 24px 20px;
          }
  
          .fields {
            grid-template-columns: 1fr;
          }
  
          .field:nth-child(7),
          .field:nth-child(8) {
            grid-column: auto;
          }
        }
  
        @media (max-width: 640px) {
          .content {
            padding: 20px 14px 92px;
          }
  
          .profile-card {
            align-items: flex-start;
            flex-direction: column;
          }
  
          .avatar {
            width: 86px;
            height: 86px;
            border-radius: 24px;
          }
  
          .side-card {
            grid-template-columns: 1fr 1fr;
          }
  
          .details {
            grid-template-columns: 1fr;
          }
  
          .detail.full {
            grid-column: auto;
          }
  
          .topbar {
            align-items: flex-end;
          }
  
          .title-wrap h1 {
            font-size: 3rem;
          }
  
          .edit-top {
            padding: 10px 13px;
          }
  
          .profile-copy h2 {
            font-size: 1.6rem;
          }
  
          .fields {
            grid-template-columns: 1fr;
          }
        }
  
      `}</style>
    </div>
  );
}

function Field({ label, value, editing, onChange, multiline, type = "text" }) {
  return (
    <div className="field">
      <label>{label}</label>
      {editing ? (
        multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
        ) : (
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <p>{value || "—"}</p>
      )}
    </div>
  );
}

function SelectField({ label, value, editing, options, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      {editing ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <p>{value || "—"}</p>
      )}
    </div>
  );
}

function ToggleField({ label, value, editing, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      {editing ? (
        <div className="toggle-btns">
          <button
            type="button"
            className={`toggle-btn ${value ? "selected" : ""}`}
            onClick={() => onChange(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={`toggle-btn ${!value ? "selected" : ""}`}
            onClick={() => onChange(false)}
          >
            No
          </button>
        </div>
      ) : (
        <p>{value ? "Yes" : "No"}</p>
      )}
    </div>
  );
}