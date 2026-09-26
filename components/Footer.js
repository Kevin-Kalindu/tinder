import Link from "next/link";

const siteMapLinks = [
  { label: "Home", href: "/" },
  { label: "Listings", href: "/listings" },
  { label: "Roommates", href: "/roommates" },
  { label: "My House", href: "/myhouse" },
  { label: "Chat", href: "/chat" },
  { label: "Me", href: "/me" },
  { label: "About", href: "/about" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <nav className="links">
        {siteMapLinks.map(({ label, href }) => (
          <Link key={href} href={href} className="link">
            {label}
          </Link>
        ))}
      </nav>
      <p className="copy">© {new Date().getFullYear()} Your Company. All rights reserved.</p>

      <style>{`
        .footer {
          width: 100%;
          background: #14102b;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
        }

        .link {
          color: #b8b0e0;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .link:hover {
          color: #ff8c42;
        }

        .copy {
          color: #6f689a;
          font-size: 12px;
          margin: 0;
        }
      `}</style>
    </footer>
  );
}