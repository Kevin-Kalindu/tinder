"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/lib/authGuard";
import Sidebar from "@/components/Sidebar";
import Loader from "@/components/loader";

const SWIPE_THRESHOLD = 40;

// "house" first as the cover photo, then whatever else is on the document,
// same ordering used on the listings grid.
const IMAGE_KEY_ORDER = ["house", "livingroom", "bathroom"];

function orderImages(imagesMap) {
  if (!imagesMap) return [];
  const known = IMAGE_KEY_ORDER.filter((key) => imagesMap[key]);
  const rest = Object.keys(imagesMap).filter((key) => !IMAGE_KEY_ORDER.includes(key));
  return [...known, ...rest].map((key) => ({ key, url: imagesMap[key] }));
}

export default function ListingDetail() {
  const { id } = useParams();
  const { loading } = useRequireAuth();

  const [listing, setListing] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const dragState = useRef({ startX: 0, dragging: false });

  useEffect(() => {
    if (!id) return;
    async function loadListing() {
      setFetching(true);
      const snap = await getDoc(doc(db, "house", id));
      if (snap.exists()) {
        setListing({ id: snap.id, ...snap.data() });
      } else {
        setNotFound(true);
      }
      setFetching(false);
    }
    loadListing();
  }, [id]);

  if (loading || fetching) return <Loader />;

  if (notFound || !listing) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="content center">
          <p className="not-found">No listing found in "house" with ID "{id}".</p>
        </main>
        <style>{`
          .layout { display: flex; min-height: 100vh; background: #ffffff; }
          .content.center { flex: 1; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
          .not-found { color: #999999; font-size: 14px; }
        `}</style>
      </div>
    );
  }

  const images = orderImages(listing.images);

  function goTo(nextIndex) {
    if (images.length === 0) return;
    setPhotoIndex((nextIndex + images.length) % images.length);
  }

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, dragging: true };
  }

  function handlePointerUp(e) {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    dragState.current.dragging = false;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      goTo(photoIndex + (dx < 0 ? 1 : -1));
    }
  }

  const stats = [
    { icon: "🛏️", label: "Bedrooms", value: listing.bedrooms },
    { icon: "🛁", label: "Bathrooms", value: listing.bathrooms },
    { icon: "🚪", label: "Rooms available", value: listing.available_rooms },
  ].filter((s) => s.value !== undefined && s.value !== null);

  const tags = [
    listing.property_type,
    listing.furnished ? "Furnished" : null,
    listing.utilities_included ? "Utilities included" : null,
  ].filter(Boolean);

  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        <div className="shell">
          {/* Hero image carousel */}
          <div
            className="hero"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              background: images[photoIndex]
                ? `center / cover no-repeat url(${images[photoIndex].url})`
                : "linear-gradient(135deg, #f4f4f5, #e9e9ec)",
            }}
          >
            {images.length > 1 && (
              <>
                <button className="arrow arrow-left" onClick={() => goTo(photoIndex - 1)} aria-label="Previous photo">
                  ‹
                </button>
                <button className="arrow arrow-right" onClick={() => goTo(photoIndex + 1)} aria-label="Next photo">
                  ›
                </button>
                <div className="dots">
                  {images.map((img, i) => (
                    <span
                      key={img.key}
                      className={`dot ${i === photoIndex ? "active" : ""}`}
                      onClick={() => goTo(i)}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="hero-overlay">
              <p className="hero-neighborhood">{listing.neighborhood}</p>
              <h1 className="hero-title">{listing.title}</h1>
            </div>
          </div>

          {/* Content */}
          <div className="body">
            <div className="top-row">
              <div className="address-block">
                <span className="pin">📍</span>
                <p>{listing.address}</p>
              </div>
              {listing.rent != null && (
                <div className="rent-block">
                  <span className="rent">${listing.rent}</span>
                  <span className="per-month">/month</span>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="tags-row" style={{ animationDelay: "0.05s" }}>
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {stats.length > 0 && (
              <div className="stats-row" style={{ animationDelay: "0.1s" }}>
                {stats.map((s) => (
                  <div key={s.label} className="stat">
                    <span className="stat-icon">{s.icon}</span>
                    <span className="stat-value">{s.value}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {listing.closest_bus_stop && (
              <div className="bus-card" style={{ animationDelay: "0.15s" }}>
                <span className="bus-icon">🚌</span>
                <div>
                  <p className="bus-name">{listing.closest_bus_stop.name}</p>
                  <p className="bus-walk">
                    {listing.closest_bus_stop.walk_minutes} min walk
                  </p>
                </div>
              </div>
            )}

            {listing.description && (
              <div className="description-card" style={{ animationDelay: "0.2s" }}>
                <p className="section-label">About this place</p>
                <p className="description-text">{listing.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
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
          padding: 40px 32px 80px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .shell {
          width: 100%;
          max-width: 780px;
          animation: fadeInUp 0.45s ease both;
        }

        .hero {
          position: relative;
          width: 100%;
          height: 460px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15);
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
        }

        .hero-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 60px 32px 24px;
          background: linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0));
          color: #ffffff;
        }

        .hero-neighborhood {
          margin: 0 0 4px;
          font-size: 13px;
          letter-spacing: 0.03em;
          opacity: 0.85;
        }

        .hero-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.85);
          color: #111111;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
        }

        .arrow:hover {
          transform: translateY(-50%) scale(1.1);
        }

        .arrow-left { left: 16px; }
        .arrow-right { right: 16px; }

        .dots {
          position: absolute;
          top: 16px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 6px;
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .dot.active {
          background: #ffffff;
        }

        .body {
          margin-top: 28px;
        }

        .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          animation: fadeInUp 0.45s ease 0.02s both;
        }

        .address-block {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          max-width: 440px;
        }

        .address-block p {
          margin: 0;
          font-size: 15px;
          color: #333333;
          line-height: 1.5;
        }

        .pin {
          font-size: 16px;
          margin-top: 1px;
        }

        .rent-block {
          flex-shrink: 0;
          text-align: right;
        }

        .rent {
          font-size: 30px;
          font-weight: 800;
          color: #111111;
        }

        .per-month {
          font-size: 13px;
          color: #999999;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
          animation: fadeInUp 0.45s ease both;
        }

        .tag {
          border: 1px solid #dddddd;
          background: #fafafa;
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #333333;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          animation: fadeInUp 0.45s ease both;
        }

        .stat {
          flex: 1;
          border: 1px solid #eeeeee;
          border-radius: 14px;
          padding: 16px 12px;
          text-align: center;
        }

        .stat-icon {
          display: block;
          font-size: 20px;
          margin-bottom: 6px;
        }

        .stat-value {
          display: block;
          font-size: 18px;
          font-weight: 800;
          color: #111111;
        }

        .stat-label {
          display: block;
          font-size: 11px;
          color: #999999;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }

        .bus-card {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid #eeeeee;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 24px;
          animation: fadeInUp 0.45s ease both;
        }

        .bus-icon {
          font-size: 22px;
        }

        .bus-name {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #111111;
        }

        .bus-walk {
          margin: 2px 0 0;
          font-size: 12px;
          color: #888888;
        }

        .description-card {
          border-top: 1px solid #eeeeee;
          padding-top: 20px;
          animation: fadeInUp 0.45s ease both;
        }

        .section-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #999999;
          margin: 0 0 10px;
        }

        .description-text {
          font-size: 15px;
          line-height: 1.75;
          color: #333333;
          margin: 0;
        }

        @media (max-width: 600px) {
          .hero { height: 320px; }
          .top-row { flex-direction: column; }
          .rent-block { text-align: left; }
        }
      `}</style>
    </div>
  );
}