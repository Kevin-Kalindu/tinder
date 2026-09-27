"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/lib/authGuard";
import Loader from "@/components/loader";
import Sidebar from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SWIPE_THRESHOLD = 120; // px of horizontal drag before a card commits to swiping away
const ROTATION_FACTOR = 0.08; // deg of tilt per px dragged

function RoommateCard({ user, onSwipe, isTop }) {
  const [exiting, setExiting] = useState(null); // "left" | "right" | null

  const [{ x, y, rot, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rot: 0,
    scale: 1,
    config: { tension: 300, friction: 28 },
  }));

  const commitSwipe = (direction) => {
    setExiting(direction);
    const flyX = direction === "right" ? 600 : -600;
    api.start({
      x: flyX,
      rot: direction === "right" ? 30 : -30,
      config: { tension: 200, friction: 24 },
    });
    // Let the exit animation play before removing the card from the stack
    setTimeout(() => onSwipe(direction, user), 220);
  };

  const bind = useDrag(
    ({ down, movement: [mx, my], velocity: [vx], direction: [dx], cancel }) => {
      if (!isTop || exiting) return;

      // If dragged past threshold and released, cancel the gesture and commit
      if (!down && Math.abs(mx) > SWIPE_THRESHOLD) {
        cancel();
        commitSwipe(mx > 0 ? "right" : "left");
        return;
      }

      // Fast flick, even under threshold, also commits
      if (!down && Math.abs(vx) > 0.5 && Math.abs(mx) > 40) {
        cancel();
        commitSwipe(dx > 0 ? "right" : "left");
        return;
      }

      api.start({
        x: down ? mx : 0,
        y: down ? my : 0,
        rot: down ? mx * ROTATION_FACTOR : 0,
        scale: down ? 1.02 : 1,
        immediate: down,
      });
    },
    { enabled: isTop && !exiting }
  );

  // Programmatic swipe, used by the Pass / Like buttons
  const triggerSwipe = (direction) => {
    if (exiting) return;
    commitSwipe(direction);
  };

  const likeOpacity = x.to((v) => Math.min(Math.max(v / SWIPE_THRESHOLD, 0), 1));
  const nopeOpacity = x.to((v) => Math.min(Math.max(-v / SWIPE_THRESHOLD, 0), 1));

  return (
    <animated.div
      {...bind()}
      style={{
        position: "absolute",
        inset: 0,
        margin: "0 auto",
        width: "100%",
        maxWidth: 360,
        height: 560,
        borderRadius: 20,
        background: "#fff",
        boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        overflow: "hidden",
        touchAction: "none",
        cursor: isTop ? "grab" : "default",
        x,
        y,
        scale,
        rotate: rot,
        opacity: exiting ? x.to((v) => 1 - Math.min(Math.abs(v) / 600, 1)) : 1,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {/* LIKE / NOPE stamps */}
      <animated.div
        style={{
          position: "absolute",
          top: 24,
          left: 20,
          padding: "6px 14px",
          border: "3px solid #22c55e",
          borderRadius: 8,
          color: "#22c55e",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 1,
          transform: "rotate(-14deg)",
          opacity: likeOpacity,
          zIndex: 2,
        }}
      >
        LIKE
      </animated.div>
      <animated.div
        style={{
          position: "absolute",
          top: 24,
          right: 20,
          padding: "6px 14px",
          border: "3px solid #ef4444",
          borderRadius: 8,
          color: "#ef4444",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 1,
          transform: "rotate(14deg)",
          opacity: nopeOpacity,
          zIndex: 2,
        }}
      >
        NOPE
      </animated.div>

      {/* Photo */}
      <div
        style={{
          height: 260,
          flexShrink: 0,
          background: user.picture
            ? `center / cover no-repeat url(${user.picture})`
            : "#e5e7eb",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            width: "100%",
            padding: "40px 18px 14px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {user.name}
            {user.age ? `, ${user.age}` : ""}
          </div>
          {user.program && (
            <div style={{ fontSize: 14, opacity: 0.9 }}>{user.program}</div>
          )}
        </div>
      </div>

      {/* Details, scrollable if content is long */}
      <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
        {user.budget != null && (
          <p style={row}>
            <strong>Budget:</strong> ${user.budget}
          </p>
        )}
        {user.cleanliness && (
          <p style={row}>
            <strong>Cleanliness:</strong> {user.cleanliness}
          </p>
        )}
        {user.sleep_schedule && (
          <p style={row}>
            <strong>Sleep schedule:</strong> {user.sleep_schedule}
          </p>
        )}
        {user.noise_level && (
          <p style={row}>
            <strong>Noise level:</strong> {user.noise_level}
          </p>
        )}
        {user.guests_frequency && (
          <p style={row}>
            <strong>Guests:</strong> {user.guests_frequency}
          </p>
        )}
        {user.pet && (
          <p style={row}>
            <strong>Pet:</strong> {user.pet}
          </p>
        )}
        <p style={row}>
          <strong>Smoking:</strong> {user.smoking ? "Yes" : "No"}
        </p>
        <p style={row}>
          <strong>Drinking:</strong> {user.drinking ? "Yes" : "No"}
        </p>
        {user.interests?.length > 0 && (
          <p style={row}>
            <strong>Interests:</strong> {user.interests.join(", ")}
          </p>
        )}
        {user.description && (
          <>
            <p style={{ ...row, marginTop: 10 }}>
              <strong>About:</strong>
            </p>
            <p style={{ margin: 0, color: "#374151" }}>{user.description}</p>
          </>
        )}
      </div>

      {/* Action buttons, only meaningful on the top card */}
      {isTop && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 24,
            padding: "12px 0 18px",
          }}
        >
          <button
            onClick={() => triggerSwipe("left")}
            aria-label="Pass"
            style={circleButton("#ef4444")}
          >
            ✕
          </button>
          <button
            onClick={() => triggerSwipe("right")}
            aria-label="Like"
            style={circleButton("#22c55e")}
          >
            ♥
          </button>
        </div>
      )}
    </animated.div>
  );
}

const row = { margin: "6px 0", fontSize: 14, color: "#111827" };

function circleButton(color) {
  return {
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: `2px solid ${color}`,
    background: "#fff",
    color,
    fontSize: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
  };
}

function Roommates() {
  const { userAgent, loading } = useRequireAuth();

  const [myId, setMyId] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [likedIds, setLikedIds] = useState([]);
  const [passedIds, setPassedIds] = useState([]);

  useEffect(() => {
    if (!userAgent) return;

    async function loadRoommates() {
      setFetching(true);
      setError(null);

      try {
        const usersRef = collection(db, "users");
        const meQuery = query(usersRef, where("email", "==", userAgent.email));
        const meSnap = await getDocs(meQuery);

        if (meSnap.empty) {
          throw new Error("No profile found for this account");
        }

        const myAppId = meSnap.docs[0].data().id;
        setMyId(myAppId);

        const res = await fetch(`${API_URL}/roommates?user_id=${myAppId}`);

        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }

        const json = await res.json();

        const ids = (json.suggested_roommates || [])
          .slice(0, 30)
          .map((roommate) => roommate.id);

        if (ids.length === 0) {
          setProfiles([]);
          return;
        }

        const q = query(usersRef, where("id", "in", ids));
        const snapshot = await getDocs(q);

        const users = snapshot.docs.map((docSnap) => ({
          firestoreId: docSnap.id,
          ...docSnap.data(),
        }));

        setProfiles(users);
      } catch (err) {
        console.error("Failed to load roommates", err);
        setError(err.message);
      } finally {
        setFetching(false);
      }
    }

    loadRoommates();
  }, [userAgent]);

  const sendFriendRequest = async (targetId) => {
    if (!myId) return;
    try {
      await updateDoc(doc(db, "users", targetId), {
        requests: arrayUnion(myId),
      });
    } catch (err) {
      console.error(`Failed to send friend request to users/${targetId}`, err.code, err.message);
    }
  };

  const handleSwipe = (direction, roommate) => {
    const key = roommate.id ?? roommate.firestoreId;

    if (direction === "right") {
      setLikedIds((prev) => [...prev, key]);
      sendFriendRequest(key);
    } else {
      setPassedIds((prev) => [...prev, key]);
    }

    setProfiles((prev) => prev.filter((p) => (p.id ?? p.firestoreId) !== key));
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 20,
        }}
      >
        {fetching && <p>Loading suggestions...</p>}
        {!fetching && error && <p style={{ color: "#ef4444" }}>{error}</p>}
        {!fetching && !error && profiles.length === 0 && (
          <p>No more suggestions right now.</p>
        )}

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 360,
            height: 560,
          }}
        >
          {profiles
            .slice(0, 3)
            .reverse()
            .map((roommate, i, arr) => (
              <RoommateCard
                key={roommate.id ?? roommate.firestoreId}
                user={roommate}
                isTop={i === arr.length - 1}
                onSwipe={handleSwipe}
              />
            ))}
        </div>

        {!fetching && profiles.length > 0 && (
          <p style={{ marginTop: 16, color: "#888", fontSize: 14 }}>
            Swipe left to skip, right to send a friend request
          </p>
        )}
      </main>
    </div>
  );
}

export default Roommates;