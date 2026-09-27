"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/lib/authGuard";
import Loader from "@/components/loader";
import Sidebar from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SWIPE_THRESHOLD = 120; // px of horizontal drag before a card commits to swiping away
const ROTATION_FACTOR = 0.08; // deg of tilt per px dragged

function RoommateCard({ user, onSwipe, isTop }) {
  const cardRef = useRef(null);
  const dragState = useRef({ startX: 0, startY: 0, dragging: false });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(null); // "left" | "right" | null
  const router = useRouter();

  const handlePointerDown = (e) => {
    if (!isTop || exiting) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      dragging: true,
    };
    setDragging(true);
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dx, y: dy });
  };

  const commitSwipe = (direction) => {
    setExiting(direction);
    setDragging(false);
    // Let the exit animation play before removing the card from the stack
    setTimeout(() => onSwipe(direction, user), 220);
  };

  const handlePointerUp = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    setDragging(false);

    if (offset.x > SWIPE_THRESHOLD) {
      commitSwipe("right");
    } else if (offset.x < -SWIPE_THRESHOLD) {
      commitSwipe("left");
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  // Programmatic swipe, used by the Pass / Like buttons
  const triggerSwipe = (direction) => {
    if (exiting) return;

    const flyX = direction === "right" ? 400 : -400;

    // Phase 1: move the card out to the same offset a real drag would reach,
    // so the LIKE/NOPE stamp and tilt appear exactly like mid-swipe.
    setOffset({ x: flyX, y: 0 });

    // Phase 2: let that frame paint, then commit the exit — same as
    // releasing a drag past the threshold.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        commitSwipe(direction);
      });
    });
  };

  // Clicking the name routes to that person's full profile, without
  // triggering a drag/swipe on the card underneath it.
  const handleNameClick = (e) => {
    e.stopPropagation();
    const targetId = user.id ?? user.firestoreId;
    if (targetId) router.push(`/roommates/${targetId}`);
  };

  let transform = `translate(${offset.x}px, ${offset.y}px) rotate(${
    offset.x * ROTATION_FACTOR
  }deg)`;
  let transition = dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease";
  let opacity = 1;

  if (exiting) {
    const flyX = exiting === "right" ? 600 : -600;
    transform = `translate(${flyX}px, ${offset.y}px) rotate(${
      exiting === "right" ? 30 : -30
    }deg)`;
    opacity = 0;
  }

  const likeOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const nopeOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        inset: 0,
        margin: "0 auto",
        width: "100%",
        maxWidth: 440,
        height: 680,
        borderRadius: 28,
        background: "#fff",
        boxShadow: "0 24px 60px rgba(0,0,0,0.16), 0 4px 14px rgba(0,0,0,0.08)",
        overflow: "hidden",
        touchAction: "none",
        cursor: isTop ? (dragging ? "grabbing" : "grab") : "default",
        transform,
        transition,
        opacity,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      {/* LIKE / NOPE stamps */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 28,
          padding: "8px 18px",
          border: "4px solid #22c55e",
          borderRadius: 10,
          color: "#22c55e",
          fontWeight: 800,
          fontSize: 28,
          letterSpacing: 1.5,
          transform: "rotate(-14deg)",
          opacity: likeOpacity,
          zIndex: 2,
        }}
      >
        LIKE
      </div>
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 28,
          padding: "8px 18px",
          border: "4px solid #ef4444",
          borderRadius: 10,
          color: "#ef4444",
          fontWeight: 800,
          fontSize: 28,
          letterSpacing: 1.5,
          transform: "rotate(14deg)",
          opacity: nopeOpacity,
          zIndex: 2,
        }}
      >
        NOPE
      </div>

      {/* Photo */}
      <div
        style={{
          height: 340,
          flexShrink: 0,
          position: "relative",
          background: user.picture
            ? `center / cover no-repeat url(${user.picture})`
            : "#e5e7eb",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={handleNameClick}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 3,
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(6px)",
            color: "#111111",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          View Profile
        </button>

        <div
          style={{
            width: "100%",
            padding: "56px 24px 20px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))",
            color: "#fff",
          }}
        >
          <div
            onClick={handleNameClick}
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              display: "inline-block",
            }}
          >
            {user.name}
            {user.age ? `, ${user.age}` : ""}
          </div>
          {user.program && (
            <div style={{ fontSize: 16, opacity: 0.92, marginTop: 4 }}>{user.program}</div>
          )}
        </div>
      </div>

      {/* Details, scrollable if content is long */}
      <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
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
            <p style={{ ...row, marginTop: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
              About
            </p>
            <p style={{ margin: 0, color: "#374151", lineHeight: 1.6, fontSize: 15 }}>{user.description}</p>
          </>
        )}
      </div>

      {/* Action buttons, only meaningful on the top card */}
      {isTop && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            padding: "18px 0 26px",
          }}
        >
          {/* <button
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
          </button> */}
        </div>
      )}
    </div>
  );
}

const row = { margin: "8px 0", fontSize: 15, color: "#111827", lineHeight: 1.5 };

function circleButton(color) {
  return {
    width: 68,
    height: 68,
    borderRadius: "50%",
    border: `2.5px solid ${color}`,
    background: "#fff",
    color,
    fontSize: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  };
}

function Roommates() {
  const { userAgent, loading } = useRequireAuth();

  const [myId, setMyId] = useState(null); // this user's app-level "id" (the U001-style doc id)
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
        // Find this account's own profile by email — the only link back to
        // the signed-in Firebase Auth user — to get its "id" (e.g. "U001").
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
        console.log("roommates API response:", json);

        // Get only the TOP 30 roommate suggestions
        const ids = (json.suggested_roommates || [])
          .slice(0, 30)
          .map((roommate) => roommate.id);
        console.log("Firestore ids being searched for:", ids);

        if (ids.length === 0) {
          setProfiles([]);
          return;
        }

        // Firestore allows max 30 values in an "in" query
        const q = query(usersRef, where("id", "in", ids));
        const snapshot = await getDocs(q);

        // Convert Firestore documents into normal objects
        // (named docSnap so it doesn't shadow the `doc()` ref helper used below)
        const users = snapshot.docs.map((docSnap) => ({
          firestoreId: docSnap.id,
          ...docSnap.data(),
        }));

        console.log("Matching Firestore profiles found:", users);
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

  // Adds *my* app-level id to the other person's "requests" array in
  // Firestore, so their side can see an incoming friend request from me.
  const sendFriendRequest = async (targetId) => {
    if (!myId) {
      console.warn("sendFriendRequest skipped: myId is not set yet");
      return;
    }

    console.log(`Sending friend request: adding "${myId}" to users/${targetId}.requests`);

    try {
      await updateDoc(doc(db, "users", targetId), {
        requests: arrayUnion(myId),
      });
      console.log(`Friend request written successfully to users/${targetId}`);
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
      // TODO: record passes somewhere if you don't want to re-suggest them
    }

    // Remove the swiped card from the stack
    setProfiles((prev) =>
      prev.filter((p) => (p.id ?? p.firestoreId) !== key)
    );
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
    {fetching && <Loader/>}
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 44,
          paddingBottom: 44,
          minHeight: "100vh",
          background: "#f9fafb",
        }}
      >
        {!fetching && error && (
          <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>
        )}
        {!fetching && !error && profiles.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: 15 }}>No more suggestions right now.</p>
        )}

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 440,
            height: 680,
          }}
        >
          {/* Render newest-on-top: reverse so the first profile ends up
              last in the DOM / visually on top of the stack */}
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
          <p style={{ marginTop: 28, color: "#9ca3af", fontSize: 14 }}>
            Swipe left to skip, right to send a friend request
          </p>
        )}
      </main>
    </div>
    </div>
  );
}

export default Roommates;