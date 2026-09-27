"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAuth } from "@/lib/authGuard";

const navItems = [
  { label: "Listings", href: "/listings", icon: ListingsIcon },
  { label: "Roommates", href: "/roommates", icon: RoommatesIcon },
  { label: "My House", href: "/myhouse", icon: HouseIcon },
  { label: "Chat", href: "/chat", icon: ChatIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userAgent } = useRequireAuth();

  const meActive = pathname === "/me";

  return (
    <aside className="sidebar">
      <div className="spacer" />

      <nav className="nav">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`nav-btn ${active ? "active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="spacer" />

      <Link href="/me" className={`nav-btn me-btn ${meActive ? "active" : ""}`}>
        {userAgent?.photoURL ? (
          <img src={userAgent.photoURL} alt="Your profile" className="avatar" />
        ) : (
          <MeIcon />
        )}
        <span>Me</span>
      </Link>

      <style>{`
        .sidebar {
            width: 88px;
            height: 100vh;
            position: sticky;
            top: 0;
            align-self: flex-start;
            background: #241914;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
            gap: 32px;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
            overflow: hidden;
        }

        .spacer {
          flex: 1;
        }

        .me-btn {
          margin-bottom: 4px;
        }

        .avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(251, 246, 238, 0.5);
        }

        .nav-btn.active .avatar {
          border-color: #f36a2d;
        }

        .brand {
          font-size: 26px;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 40px;
          width: 100%;
          align-items: center;
        }

        .nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 72px;
          padding: 10px 4px;
          border-radius: 14px;
          color: rgba(251, 246, 238, 0.7);
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(251, 246, 238, 0.95);
          transform: translateY(-1px);
        }

        .nav-btn.active {
          background: #ffe0c2;
          color: #f36a2d;
        }

        .nav-btn svg {
          width: 22px;
          height: 22px;
        }
      `}</style>
    </aside>
  );
}

function ListingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  );
}

function RoommatesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 21c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <path d="M10 21c0-3.5 2.7-6 6-6s6 2.5 6 6" />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}