"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/lib/authGuard";
import Loader from "@/components/loader";
import Sidebar from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SWIPE_THRESHOLD = 40; // px of horizontal drag before the image carousel advances

// "house" is shown first as the cover photo; anything else found on the
// document (e.g. "livingroom", "bathroom") follows in this order, with any
// unlisted keys tacked on at the end so nothing gets silently dropped.
const IMAGE_KEY_ORDER = ["house", "livingroom", "bathroom"];

function orderImages(imagesMap) {
  if (!imagesMap) return [];
  const known = IMAGE_KEY_ORDER.filter((key) => imagesMap[key]);
  const rest = Object.keys(imagesMap).filter((key) => !IMAGE_KEY_ORDER.includes(key));
  return [...known, ...rest].map((key) => imagesMap[key]);
}

function ListingCard({ listing, index }) {
  const router = useRouter();
  const images = orderImages(listing.images);
  const [photoIndex, setPhotoIndex] = useState(0);
  const dragState = useRef({ startX: 0, dragging: false, moved: false });

  const goTo = (nextIndex, e) => {
    e?.stopPropagation();
    if (images.length === 0) return;
    setPhotoIndex((nextIndex + images.length) % images.length);
  };

  const handlePointerDown = (e) => {
    dragState.current = { startX: e.clientX, dragging: true, moved: false };
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) dragState.current.moved = true;
  };

  const handlePointerUp = (e) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    dragState.current.dragging = false;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      // Treat as a swipe: change photo. Tapping the image no longer navigates.
      goTo(photoIndex + (dx < 0 ? 1 : -1), e);
    }
  };

  return (
    <div className="listing-card" style={{ animationDelay: `${index * 45}ms` }}>
      <div
        className="listing-thumb"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          background: images[photoIndex]
            ? `center / cover no-repeat url(${images[photoIndex]})`
            : "linear-gradient(135deg, #f4f4f5, #e9e9ec)",
        }}
      >
        {images.length === 0 && (
          <span className="listing-thumb-label">{listing.property_type || "Listing"}</span>
        )}

        {listing.matches_preferred_area && (
          <span className="listing-badge">Matches your area</span>
        )}

        {images.length > 1 && (
          <>
            <button className="thumb-arrow thumb-arrow-left" onClick={(e) => goTo(photoIndex - 1, e)} aria-label="Previous photo">
              ‹
            </button>
            <button className="thumb-arrow thumb-arrow-right" onClick={(e) => goTo(photoIndex + 1, e)} aria-label="Next photo">
              ›
            </button>
            <div className="thumb-dots">
              {images.map((_, i) => (
                <span key={i} className={`thumb-dot ${i === photoIndex ? "active" : ""}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="listing-body">
        <p className="listing-title" onClick={() => router.push(`/listings/${listing.id}`)}>
          {listing.title}
        </p>
        {listing.neighborhood && (
          <p className="listing-neighborhood">{listing.neighborhood}</p>
        )}

        <div className="listing-footer">
          {listing.rent != null && (
            <span className="listing-rent">${listing.rent}/mo</span>
          )}
          {listing.bedrooms != null && (
            <span className="listing-beds">{listing.bedrooms} bed</span>
          )}
        </div>
      </div>

      <style jsx>{`
        .listing-card {
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 14px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(14px);
          animation: cardIn 0.45s ease forwards;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .listing-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
          border-color: #d4d4d4;
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .listing-thumb {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: pan-y;
          cursor: pointer;
          user-select: none;
        }

        .listing-thumb-label {
          font-size: 13px;
          font-weight: 600;
          color: #9a9aa2;
          letter-spacing: 0.02em;
        }

        .listing-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #111111;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 999px;
        }

        .thumb-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.85);
          color: #111111;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .thumb-arrow-left {
          left: 8px;
        }

        .thumb-arrow-right {
          right: 8px;
        }

        .thumb-dots {
          position: absolute;
          bottom: 8px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 5px;
        }

        .thumb-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
        }

        .thumb-dot.active {
          background: #ffffff;
        }

        .listing-body {
          padding: 14px 16px 16px;
        }

        .listing-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111111;
          line-height: 1.3;
          cursor: pointer;
          display: inline-block;
        }

        .listing-title:hover {
          text-decoration: underline;
        }

        .listing-neighborhood {
          margin: 4px 0 0;
          font-size: 13px;
          color: #888888;
        }

        .listing-footer {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .listing-rent {
          font-size: 14px;
          font-weight: 700;
          color: #111111;
        }

        .listing-beds {
          font-size: 13px;
          color: #888888;
        }
      `}</style>
    </div>
  );
}

function MyHouse() {
  const { userAgent, loading } = useRequireAuth();

  const [listings, setListings] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userAgent) return;

    async function loadListings() {
      setFetching(true);
      setError(null);

      try {
        // Same email -> app-id lookup used on the roommates page.
        const usersRef = collection(db, "users");
        const meQuery = query(usersRef, where("email", "==", userAgent.email));
        const meSnap = await getDocs(meQuery);

        if (meSnap.empty) {
          throw new Error("No profile found for this account");
        }

        const myAppId = meSnap.docs[0].data().id;

        const res = await fetch(`${API_URL}/recommended-listings?user_id=${myAppId}`);

        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }

        const json = await res.json();
        const top30 = (json.recommended_listings || []).slice(0, 30);

        // Pull each listing's photos from the "house" collection, where the
        // document id matches the listing id and an "images" map holds
        // { house, livingroom, bathroom, ... } -> Cloudinary URLs.
        const ids = top30.map((l) => l.id);
        let imagesById = {};

        if (ids.length > 0) {
          const houseRef = collection(db, "house");
          const houseQuery = query(houseRef, where(documentId(), "in", ids));
          const houseSnap = await getDocs(houseQuery);

          imagesById = Object.fromEntries(
            houseSnap.docs.map((docSnap) => [docSnap.id, docSnap.data().images || {}])
          );
        }

        const listingsWithImages = top30.map((listing) => ({
          ...listing,
          images: imagesById[listing.id] || {},
        }));

        setListings(listingsWithImages);
      } catch (err) {
        console.error("Failed to load listings", err);
        setError(err.message);
      } finally {
        setFetching(false);
      }
    }

    loadListings();
  }, [userAgent]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
        {fetching && <Loader/>}
    <div style={{ display: "flex", background: "#ffffff", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "40px 32px 60px",
          background: "#ffffff",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        {!fetching && error && <p style={{ color: "#ef4444" }}>{error}</p>}
        {!fetching && !error && listings.length === 0 && (
          <p style={{ color: "#888888" }}>No listings to show right now.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 18,
          }}
        >
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      </main>
    </div>
    </div>
  );
}

export default MyHouse;