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
        <div className="profile-box">
          <div className="header">
            <div className="identity">
              <img
                src={profile.picture || "https://via.placeholder.com/56"}
                alt={profile.name || "Profile picture"}
                className="profile-pic"
              />
              <div className="identity-text">
                <p className="name">{profile.name || "Unnamed"}</p>
                <p className="email">{profile.email || "—"}</p>
              </div>
            </div>
            {!isEditing && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            )}
          </div>

          {isEditing && (
            <>
              {missingFields.length > 0 && (
                <div className="error-box">
                  Please fill out: {missingFields.join(", ")}
                </div>
              )}

              <div className="fields">
                <Field label="Name" value={profile.name} editing onChange={(v) => handleChange("name", v)} />
                <Field label="Age" value={profile.age} editing onChange={(v) => handleChange("age", v)} type="number" />
                <Field label="Date of birth" value={profile.dob} editing onChange={(v) => handleChange("dob", v)} type="date" />

                <SelectField
                  label="Gender"
                  value={profile.gender}
                  editing
                  options={["Male", "Female", "Other"]}
                  onChange={(v) => handleChange("gender", v)}
                />

                <Field label="Program" value={profile.program} editing onChange={(v) => handleChange("program", v)} />
                <Field label="Budget" value={profile.budget} editing onChange={(v) => handleChange("budget", v)} type="number" />
                <Field label="Description" value={profile.description} editing onChange={(v) => handleChange("description", v)} multiline />
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
                  onChange={(v) => handleChange("cleanliness", v)}
                />
                <SelectField
                  label="Noise level"
                  value={profile.noise_level}
                  editing
                  options={["Low", "Medium", "High"]}
                  onChange={(v) => handleChange("noise_level", v)}
                />
                <SelectField
                  label="Sleep schedule"
                  value={profile.sleep_schedule}
                  editing
                  options={["early", "late", "varies"]}
                  onChange={(v) => handleChange("sleep_schedule", v)}
                />
                <SelectField
                  label="Guests frequency"
                  value={profile.guests_frequency}
                  editing
                  options={["rarely", "sometimes", "often"]}
                  onChange={(v) => handleChange("guests_frequency", v)}
                />

                <Field label="Pet" value={profile.pet} editing onChange={(v) => handleChange("pet", v)} />
                <Field label="Picture URL" value={profile.picture} editing onChange={(v) => handleChange("picture", v)} />

                <ToggleField label="Drinking" value={profile.drinking} editing onChange={(v) => handleChange("drinking", v)} />
                <ToggleField label="Smoking" value={profile.smoking} editing onChange={(v) => handleChange("smoking", v)} />
                <ToggleField label="Has a place" value={profile.has_place} editing onChange={(v) => handleChange("has_place", v)} />
              </div>

              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}

          <button
            className={`looking-btn ${profile.looking ? "active" : ""}`}
            onClick={handleToggleLooking}
          >
            {profile.looking ? "✓ Looking for a roommate" : "Looking for a roommate"}
          </button>
        </div>

        <div className="relations-row">
          <div className="relations-box">
            <h2>Friends</h2>
            {relationsLoading ? (
              <p className="empty-text">Loading…</p>
            ) : friendsData.length === 0 ? (
              <p className="empty-text">No friends</p>
            ) : (
              <ul className="relations-list">
                {friendsData.map((friend) => (
                  <li key={friend.id}>
                    <Link href={`/chat/${friend.id}`} className="relation-item">
                      <img
                        src={friend.picture || "https://via.placeholder.com/40"}
                        alt={friend.name || "Friend"}
                        className="relation-pic"
                      />
                      <span>{friend.name || "Unnamed"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relations-box">
            <h2>Requests</h2>
            {relationsLoading ? (
              <p className="empty-text">Loading…</p>
            ) : requestsData.length === 0 ? (
              <p className="empty-text">No requests</p>
            ) : (
              <ul className="relations-list">
                {requestsData.map((req) => (
                  <li key={req.id}>
                    <div className="relation-item">
                      <img
                        src={req.picture || "https://via.placeholder.com/40"}
                        alt={req.name || "Request"}
                        className="relation-pic"
                      />
                      <span>{req.name || "Unnamed"}</span>
                    </div>
                    <div className="request-actions">
                      <button
                        className="accept-btn"
                        onClick={() => handleAcceptRequest(req.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleRejectRequest(req.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .layout {
          display: flex;
          min-height: 100vh;
          background: #ffffff;
        }

        .content {
          flex: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 56px 40px 80px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .profile-box {
          border: 1px solid #dddddd;
          border-radius: 12px;
          padding: 24px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .identity {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .profile-pic {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #dddddd;
        }

        .identity-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .name {
          font-size: 18px;
          font-weight: 700;
          color: #111111;
          margin: 0;
        }

        .email {
          font-size: 13px;
          color: #777777;
          margin: 0;
        }

        .edit-btn {
          background: #ffffff;
          border: 1px solid #111111;
          color: #111111;
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }

        .edit-btn:hover {
          background: #f5f5f5;
        }

        .error-box {
          background: #f5f5f5;
          border: 1px solid #999999;
          color: #333333;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          margin-top: 20px;
        }

        .fields {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 24px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-size: 12px;
          color: #777777;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .field input,
        .field select,
        .field textarea {
          background: #ffffff;
          border: 1px solid #cccccc;
          border-radius: 8px;
          padding: 12px 14px;
          color: #111111;
          font-size: 15px;
          outline: none;
          font-family: inherit;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #111111;
        }

        .toggle-btns {
          display: flex;
          gap: 8px;
        }

        .toggle-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid #cccccc;
          background: #ffffff;
          color: #555555;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .toggle-btn.selected {
          background: #111111;
          border-color: #111111;
          color: #ffffff;
        }

        .save-btn {
          width: 100%;
          margin-top: 24px;
          padding: 14px;
          border-radius: 8px;
          border: none;
          background: #111111;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .looking-btn {
          width: 100%;
          margin-top: 20px;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #cccccc;
          background: #ffffff;
          color: #555555;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
        }

        .looking-btn.active {
          background: #111111;
          border-color: #111111;
          color: #ffffff;
        }

        .relations-row {
          display: flex;
          gap: 20px;
          margin-top: 28px;
        }

        .relations-box {
          flex: 1;
          border: 1px solid #dddddd;
          border-radius: 12px;
          padding: 20px;
          min-width: 0;
        }

        .relations-box h2 {
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          margin: 0 0 16px;
        }

        .empty-text {
          color: #999999;
          font-size: 13px;
          margin: 0;
        }

        .relations-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .relation-item {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #111111;
        }

        .relation-pic {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #dddddd;
          flex-shrink: 0;
        }

        .relation-item span {
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .relations-list li {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .request-actions {
          display: flex;
          gap: 8px;
        }

        .accept-btn,
        .reject-btn {
          flex: 1;
          padding: 6px 0;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .accept-btn {
          background: #111111;
          color: #ffffff;
          border: 1px solid #111111;
        }

        .reject-btn {
          background: #ffffff;
          color: #555555;
          border: 1px solid #cccccc;
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