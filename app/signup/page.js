"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

function Signup() {
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGoogleSignIn() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/me");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <main className="shell">
        <h1>
          Welcome to
          <br />
          Rinder.
        </h1>
        <p className="sub">
          There's no long form to fill out here. Start with Google, then
          build your housing and roommate profile inside Rinder.
        </p>

        <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.14-3.08-.4-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59A14.45 14.45 0 0 1 9.75 24c0-1.6.28-3.15.79-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.92-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.9l-7.97 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

        {error && <p className="error">{error}</p>}

        <section className="benefit-cards">
          <article className="benefit-card">
            <div className="icon">
              <svg viewBox="0 0 24 24">
                <path d="M3 11.5 12 4l9 7.5V21H3z" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </div>
            <h2>Save places</h2>
            <p>Keep Fredericton rentals you want to revisit.</p>
          </article>

          <article className="benefit-card">
            <div className="icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21c.7-4.1 3.1-6 7.5-6s6.8 1.9 7.5 6" />
              </svg>
            </div>
            <h2>Meet people</h2>
            <p>Build a profile around lifestyle and interests.</p>
          </article>

          <article className="benefit-card">
            <div className="icon">
              <svg viewBox="0 0 24 24">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <h2>Settle in</h2>
            <p>Move into shared-home tools once you've found your place.</p>
          </article>
        </section>
      </main>

      <style>{`
        :root {
          --bg: #fbf6ee;
          --ink: #241914;
          --muted: #8a7b6e;
          --line: #e4d2bf;
          --card: #f8efe4;
          --accent: #f36a2d;
          --accent-soft: #ffe0c2;
        }

        .page {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        }

        .shell {
          width: min(760px, 100%);
          text-align: center;
        }

        h1 {
          margin: 0;
          font-size: clamp(3rem, 6vw, 4.6rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
          font-weight: 900;
        }

        .sub {
          max-width: 620px;
          margin: 20px auto 26px;
          color: var(--muted);
          font-size: 1.1rem;
          line-height: 1.55;
        }

        .google-btn {
          width: 100%;
          height: 72px;
          border: 1.5px solid var(--line);
          border-radius: 22px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--ink);
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(82, 58, 36, 0.06);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .google-btn svg {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
        }

        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(82, 58, 36, 0.1);
        }

        .error {
          margin-top: 14px;
          color: #c1442a;
          font-size: 14px;
        }

        .benefit-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 20px;
          text-align: left;
        }

        .benefit-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 22px;
          padding: 20px;
          min-height: 170px;
        }

        .icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--accent-soft);
          display: grid;
          place-items: center;
          margin-bottom: 15px;
        }

        .icon svg {
          width: 22px;
          height: 22px;
          stroke: var(--ink);
          fill: none;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .benefit-card h2 {
          margin: 0 0 8px;
          font-size: 1.15rem;
          letter-spacing: -0.025em;
        }

        .benefit-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.45;
        }

        @media (max-width: 680px) {
          .page {
            align-items: flex-start;
            padding: 22px 16px;
          }
          h1 {
            font-size: 3.1rem;
          }
          .sub {
            font-size: 1rem;
          }
          .google-btn {
            height: 64px;
            font-size: 1.12rem;
            border-radius: 18px;
          }
          .benefit-cards {
            grid-template-columns: 1fr;
          }
          .benefit-card {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default Signup;