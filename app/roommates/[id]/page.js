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
  const { id } = useParams();
  const { userAgent, loading } = useRequireAuth();

  const [myDocId, setMyDocId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [requestState, setRequestState] = useState("idle"); // idle | sending | sent
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userAgent) return;
    async function loadMyDocId() {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userAgent.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setMyDocId(data.id || snap.docs[0].id);
      }
    }
    loadMyDocId();
  }, [userAgent]);

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

  useEffect(() => {
    if (!myDocId || !profile) return;
    const friends = Array.isArray(profile.friends) ? profile.friends : [];
    const requests = Array.isArray(profile.requests) ? profile.requests : [];
    if (friends.includes(myDocId) || requests.includes(myDocId)) {
      setRequestState("sent");
    }
  }, [myDocId, profile]);

  async function handleAddFriend() {
    if (!myDocId) {
      alert("You need to save your own profile on the Me page before you can add friends.");
      return;
    }
    if (!profile) return;

    setRequestState("sending");
    try {
      await updateDoc(doc(db, "users", profile.id), {
        requests: arrayUnion(myDocId),
      });
      setRequestState("sent");
    } catch (err) {
      console.error("Failed to send friend request:", err);
      setRequestState("idle");
      alert(`Something went wrong sending that request: ${err.message}`);
    }
  }

  if (loading || fetching) return <Loader />;

  if (notFound) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="content center">
          <p className="not-found">This profile doesn't exist.</p>
        </main>
        <style>{`
          .layout { display: flex; min-height: 100vh; background: #ffffff; }
          .content.center { flex: 1; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
          .not-found { color: #999999; font-size: 14px; }
        `}</style>
      </div>
    );
  }

  const isOwnProfile = myDocId && profile.id === myDocId;
  const isFriend = Array.isArray(profile.friends) && profile.friends.includes(myDocId);
  const interests = Array.isArray(profile.interests) ? profile.interests : [];

  const details = [
    { label: "Age", value: profile.age },
    { label: "Budget", value: profile.budget ? `$${profile.budget}` : null },
    { label: "Cleanliness", value: profile.cleanliness },
    { label: "Noise level", value: profile.noise_level },
    { label: "Sleep schedule", value: profile.sleep_schedule },
    { label: "Guests", value: profile.guests_frequency },
    { label: "Pet", value: profile.pet },
    { label: "Drinking", value: profile.drinking ? "Yes" : "No" },
    { label: "Smoking", value: profile.smoking ? "Yes" : "No" },
    { label: "Has a place", value: profile.has_place ? "Yes" : "No" },
  ];

  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <div className="profile-shell">
          <div className="photo-side">
            <img
              src={profile.picture || "https://via.placeholder.com/600x800"}
              alt={profile.name || "Profile picture"}
              className="hero-photo"
            />
          </div>

          <div className="info-side">
            <h1 className="name">{profile.name || "Unnamed"}</h1>
            <p className="program">{profile.program || "Program not listed"}</p>

            {!isOwnProfile && (
              <button
                className={`add-friend-btn ${requestState}`}
                onClick={handleAddFriend}
                disabled={requestState !== "idle" || isFriend}
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

            {interests.length > 0 && (
              <div className="interests-wrap">
                {interests.map((interest, i) => (
                  <span
                    key={interest}
                    className="bubble"
                    style={{ animationDelay: `${0.15 + i * 0.06}s` }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <div className="details-grid">
              {details.map((d, i) => (
                <div
                  key={d.label}
                  className="detail"
                  style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                >
                  <p className="detail-label">{d.label}</p>
                  <p className="detail-value">{d.value || d.value === 0 ? d.value : "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        .layout {
          display: flex;
          min-height: 100vh;
          background: #ffffff;
        }

        .content {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 48px 32px 80px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .profile-shell {
          width: 100%;
          max-width: 920px;
          display: flex;
          gap: 40px;
          animation: fadeInUp 0.5s ease both;
        }

        .photo-side {
          flex: 0 0 380px;
          height: 560px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
          animation: fadeIn 0.6s ease both;
        }

        .hero-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .photo-side:hover .hero-photo {
          transform: scale(1.06);
        }

        .info-side {
          flex: 1;
          padding-top: 8px;
          min-width: 0;
        }

        .name {
          font-size: 34px;
          font-weight: 800;
          color: #111111;
          margin: 0 0 4px;
          animation: fadeInUp 0.5s ease 0.05s both;
        }

        .program {
          font-size: 14px;
          color: #888888;
          margin: 0 0 20px;
          animation: fadeInUp 0.5s ease 0.1s both;
        }

        .add-friend-btn {
          padding: 12px 28px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 24px;
          background: #111111;
          color: #ffffff;
          border: 1px solid #111111;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          animation: fadeInUp 0.5s ease 0.15s both;
        }

        .add-friend-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
        }

        .add-friend-btn.sent,
        .add-friend-btn:disabled {
          background: #ffffff;
          color: #999999;
          border: 1px solid #dddddd;
          cursor: default;
          transform: none;
          box-shadow: none;
        }

        .description {
          color: #333333;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 24px;
          max-width: 480px;
          animation: fadeInUp 0.5s ease 0.2s both;
        }

        .interests-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 32px;
        }

        .bubble {
          display: inline-block;
          border: 1px solid #dddddd;
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          color: #333333;
          background: #fafafa;
          animation: popIn 0.35s ease both;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .bubble:hover {
          transform: translateY(-2px) scale(1.05);
          background: #111111;
          color: #ffffff;
          border-color: #111111;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 28px;
        }

        .detail {
          border-top: 1px solid #eeeeee;
          padding-top: 10px;
          animation: fadeInUp 0.45s ease both;
        }

        .detail-label {
          font-size: 11px;
          color: #999999;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 4px;
        }

        .detail-value {
          font-size: 15px;
          font-weight: 600;
          color: #111111;
          margin: 0;
        }

        @media (max-width: 760px) {
          .profile-shell {
            flex-direction: column;
          }
          .photo-side {
            flex: none;
            width: 100%;
            height: 320px;
          }
        }
      `}</style>
    </div>
  );
}