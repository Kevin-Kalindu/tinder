"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/authGuard";
import { doc, getDoc, getDocs, collection, query, where, setDoc } from "firebase/firestore";
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
  looking: false, // set to true when the user clicks "Looking for a roommate"
};

// Fields that must be non-empty before saving is allowed.
// Booleans (drinking, smoking, has_place) always have a value, so they're
// not included here.
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

  // Load this user's existing profile, if one exists, by matching authUid
  useEffect(() => {
    if (!userAgent) return;

    async function loadProfile() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("authUid", "==", userAgent.uid));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const data = existingDoc.data();
        setDocId(existingDoc.id);
        setProfile({
          ...emptyProfile,
          ...data,
          age: data.age?.toString() ?? "",
          budget: data.budget?.toString() ?? "",
          interests: Array.isArray(data.interests)
            ? data.interests.join(", ")
            : "",
          looking: data.looking === true,
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
        authUid: userAgent.uid,
        age: Number(profile.age),
        budget: Number(profile.budget),
        interests: profile.interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
      };
      // merge: true creates the doc if it doesn't exist yet,
      // or updates it in place if it does
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
        { looking: nextLooking, authUid: userAgent.uid, id: targetId },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to update looking status:", err);
      setProfile((prev) => ({ ...prev, looking: !nextLooking }));
    }
  }

  if (loading || fetching) return <Loader />;

  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <div className="header">
          <h1>My Profile</h1>
          {!isEditing && (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>

        {missingFields.length > 0 && (
          <div className="error-box">
            Please fill out: {missingFields.join(", ")}
          </div>
        )}

        <div className="fields">
          <Field label="Name" value={profile.name} editing={isEditing} onChange={(v) => handleChange("name", v)} />
          <Field label="Email" value={profile.email} editing={false} onChange={() => {}} />
          <Field label="Age" value={profile.age} editing={isEditing} onChange={(v) => handleChange("age", v)} type="number" />
          <Field label="Date of birth" value={profile.dob} editing={isEditing} onChange={(v) => handleChange("dob", v)} type="date" />

          <SelectField
            label="Gender"
            value={profile.gender}
            editing={isEditing}
            options={["Male", "Female", "Other"]}
            onChange={(v) => handleChange("gender", v)}
          />

          <Field label="Program" value={profile.program} editing={isEditing} onChange={(v) => handleChange("program", v)} />
          <Field label="Budget" value={profile.budget} editing={isEditing} onChange={(v) => handleChange("budget", v)} type="number" />
          <Field label="Description" value={profile.description} editing={isEditing} onChange={(v) => handleChange("description", v)} multiline />
          <Field
            label="Interests (comma-separated)"
            value={profile.interests}
            editing={isEditing}
            onChange={(v) => handleChange("interests", v)}
          />

          <SelectField
            label="Cleanliness"
            value={profile.cleanliness}
            editing={isEditing}
            options={["Low", "Medium", "High"]}
            onChange={(v) => handleChange("cleanliness", v)}
          />
          <SelectField
            label="Noise level"
            value={profile.noise_level}
            editing={isEditing}
            options={["Low", "Medium", "High"]}
            onChange={(v) => handleChange("noise_level", v)}
          />
          <SelectField
            label="Sleep schedule"
            value={profile.sleep_schedule}
            editing={isEditing}
            options={["early", "late", "varies"]}
            onChange={(v) => handleChange("sleep_schedule", v)}
          />
          <SelectField
            label="Guests frequency"
            value={profile.guests_frequency}
            editing={isEditing}
            options={["rarely", "sometimes", "often"]}
            onChange={(v) => handleChange("guests_frequency", v)}
          />

          <Field label="Pet" value={profile.pet} editing={isEditing} onChange={(v) => handleChange("pet", v)} />
          <Field label="Picture URL" value={profile.picture} editing={isEditing} onChange={(v) => handleChange("picture", v)} />

          <ToggleField label="Drinking" value={profile.drinking} editing={isEditing} onChange={(v) => handleChange("drinking", v)} />
          <ToggleField label="Smoking" value={profile.smoking} editing={isEditing} onChange={(v) => handleChange("smoking", v)} />
          <ToggleField label="Has a place" value={profile.has_place} editing={isEditing} onChange={(v) => handleChange("has_place", v)} />
        </div>

        {isEditing && (
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}

        <button
          className={`looking-btn ${profile.looking ? "active" : ""}`}
          onClick={handleToggleLooking}
        >
          {profile.looking ? "✓ Looking for a roommate" : "Looking for a roommate"}
        </button>
      </main>

      <style>{`
        .layout {
          display: flex;
          min-height: 100vh;
          background: #ffffff;
        }

        .content {
          flex: 1;
          max-width: 640px;
          margin: 0 auto;
          padding: 56px 40px 80px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 40px;
        }

        h1 {
          color: #111111;
          font-size: 28px;
          font-weight: 700;
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
          margin-bottom: 32px;
        }

        .fields {
          display: flex;
          flex-direction: column;
          gap: 28px;
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

        .field p {
          color: #111111;
          font-size: 16px;
          margin: 0;
          min-height: 20px;
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
          margin-top: 40px;
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