"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRequireAuth } from "@/lib/authGuard";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/loader";

export default function RoommateProfile() {
  const { id } = useParams(); // the doc name in the URL, e.g. "U014"
  const { userAgent, loading } = useRequireAuth();

  const [myDocId, setMyDocId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [requestState, setRequestState] = useState("idle"); // idle | sending | sent
  const [notFound, setNotFound] = useState(false);

  // Find my own doc ID, same lookup used on the Me and Roommates pages
  useEffect(() => {
    if (!userAgent) return;

    async function loadMyDocId() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("authUid", "==", userAgent.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setMyDocId(snap.docs[0].id);
      }
    }

    loadMyDocId();
  }, [userAgent]);

  // Fetch the profile being viewed, by its document name from the URL
  useEffect(() => {
    if (!id) return;

    async function loadProfile() {
      setFetching(true);
      const snap = await getDoc(doc(db, "users", id));
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
      } else {
        setNotFound(true);
      }
      setFetching(false);
    }

    loadProfile();
  }, [id]);

  // Once both my ID and their profile are loaded, figure out what state
  // the Add Friend button should be in.
  useEffect(() => {
    if (!myDocId || !profile) return;

    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.requests) ? profile.requests : [];

    if (friends.includes(myDocId) || requests.includes(myDocId)) {
      setRequestState("sent");
    }
  }, [myDocId, profile]);

  async function handleAddFriend() {
    if (!myDocId || !profile) return;
    setRequestState("sending");
    try {
      await updateDoc(doc(db, "users", profile.id), {
        requests: arrayUnion(myDocId),
      });
      setRequestState("sent");
    } catch (err) {
      console.error("Failed to send friend request:", err);
      setRequestState("idle");
      alert("Something went wrong sending that request.");
    }
  }

  if (loading || fetching) return <Loader />;

  if (notFound) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="content">
          <p className="not-found">This profile doesn't exist.</p>
        </main>
        <style>{`
          .layout { display: flex; min-height: 100vh; background: #ffffff; }
          .content { flex: 1; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
          .not-found { color: #999999; font-size: 14px; }
        `}</style>
      </div>
    );
  }

  const isOwnProfile = myDocId && profile.id === myDocId;
  const isFriend = Array.isArray(profile.friends) && profile.friends.includes(myDocId);

  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <div className="profile-card">
          <div className="top">
            <img
              src={profile.picture || "https://via.placeholder.com/120"}
              alt={profile.name || "Profile picture"}
              className="pic"
            />
            <div className="top-text">
              <h1>{profile.name || "Unnamed"}</h1>
              <p className="program">{profile.program || "Program not listed"}</p>
            </div>
          </div>

          {!isOwnProfile && (
            <button
              className={`add-friend-btn ${requestState}`}
              onClick={handleAddFriend}
              disabled={requestState !== "idle"}
            >
              {isFriend
                ? "Already friends"
                : requestState === "sent"
                ? "Request sent"
                : requestState === "sending"
                ? "Sending…"
                : "Add Friend"}
            </button>
          )}

          <p className="description">{profile.description || "No description yet."}</p>

          <div className="details-grid">
            <Detail label="Age" value={profile.age} />
            <Detail label="Budget" value={profile.budget ? `$${profile.budget}` : null} />
            <Detail label="Cleanliness" value={profile.cleanliness} />
            <Detail label="Noise level" value={profile.noise_level} />
            <Detail label="Sleep schedule" value={profile.sleep_schedule} />
            <Detail label="Guests" value={profile.guests_frequency} />
            <Detail label="Pet" value={profile.pet} />
            <Detail label="Drinking" value={profile.drinking ? "Yes" : "No"} />
            <Detail label="Smoking" value={profile.smoking ? "Yes" : "No"} />
            <Detail label="Has a place" value={profile.has_place ? "Yes" : "No"} />
          </div>

          {Array.isArray(profile.interests) && profile.interests.length > 0 && (
            <div className="interests-row">
              {profile.interests.map((interest) => (
                <span key={interest} className="interest-pill">
                  {interest}
                </span>
              ))}
            </div>
          )}
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
          display: flex;
          justify-content: center;
          padding: 56px 24px 80px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .profile-card {
          width: 100%;
          max-width: 480px;
          border: 1px solid #dddddd;
          border-radius: 16px;
          padding: 28px;
        }

        .top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .pic {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid #dddddd;
        }

        .top-text h1 {
          margin: 0 0 4px;
          font-size: 22px;
          color: #111111;
        }

        .program {
          margin: 0;
          font-size: 13px;
          color: #777777;
        }

        .add-friend-btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 24px;
          background: #111111;
          color: #ffffff;
          border: 1px solid #111111;
        }

        .add-friend-btn.sent,
        .add-friend-btn:disabled {
          background: #ffffff;
          color: #777777;
          border: 1px solid #cccccc;
          cursor: default;
        }

        .description {
          color: #333333;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .interests-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .interest-pill {
          border: 1px solid #dddddd;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12px;
          color: #333333;
        }
      `}</style>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <p className="detail-label">{label}</p>
      <p className="detail-value">{value || value === 0 ? value : "—"}</p>
      <style>{`
        .detail-label {
          font-size: 11px;
          color: #999999;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 2px;
        }
        .detail-value {
          font-size: 14px;
          color: #111111;
          margin: 0;
        }
      `}</style>
    </div>
  );
}