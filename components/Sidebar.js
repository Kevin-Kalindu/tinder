"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Listings", href: "/listings", icon: ListingsIcon },
  { label: "Roommates", href: "/roommates", icon: RoommatesIcon },
  { label: "My House", href: "/my-house", icon: HouseIcon },
  { label: "Me", href: "/me", icon: MeIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">🏠</div>

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

      <style>{`
        .sidebar {
          width: 88px;
          min-height: 100vh;
          background: linear-gradient(180deg, #ff8c42 0%, #ff6a1f 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0;
          gap: 32px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .brand {
          font-size: 26px;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .nav-btn.active {
          background: rgba(255, 255, 255, 0.95);
          color: #ff6a1f;
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

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}