"use client";

import {useState} from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation';

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

function signup(){
    const [mode, setMode] = useState("login")
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [notFound, setNotFound] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()
    

    async function handleGoogleSignIn(){
        signInWithPopup(auth, googleProvider)
        .then((result) => {
            const user = result.user
            const email = result.email
            router.push("./me")
        }).catch((error) => {
            setError(error.message)
        })
        }
        
    return(
            <div className="wrap">
              <div className="card">
                <h1 className="heading">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </h1>
                <p className="subheading">
                  {mode === "login"
                    ? "Sign in to continue"
                    : "Just a few details to get started"}
                </p>
         
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleGoogleSignIn}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"
                    />
                  </svg>
                  Continue with Google
                </button>
         
                <div className="divider">
                  <span />
                  <p>or</p>
                  <span />
                </div>
         
                <form className="form">
                  {mode === "signup" && (
                    <label className="field">
                      <span>Name</span>
                      <input type="text" placeholder="Your name" required />
                    </label>
                  )}
         
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setNotFound(false);
                      }}
                      placeholder="you@example.com"
                      required
                    />
                  </label>
         
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </label>
         
                  {error && <p className="error">{error}</p>}
         
                  {notFound && (
                    <div className="not-found-box">
                      <p>No account found for this email.</p>
                      <button
                        type="button"
                        className="create-btn"
                        onClick={switchToSignup}
                      >
                        Create an account
                      </button>
                    </div>
                  )}
         
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading
                      ? "Please wait…"
                      : mode === "login"
                      ? "Log in"
                      : "Create account"}
                  </button>
                </form>
         
                <p className="switch-line">
                  {mode === "login" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button type="button" className="link-btn" >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button type="button" className="link-btn" >
                        Log in
                      </button>
                    </>
                  )}
                </p>
         
                <Link href="/" className="back-home">
                  ← Back home
                </Link>
              </div>
         
              <style>{`
                .wrap {
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 24px;
                  background: radial-gradient(circle at 50% 20%, #251a4a 0%, #14102b 60%, #0c0920 100%);
                  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
                }
         
                .card {
                  width: 100%;
                  max-width: 380px;
                  background: rgba(255, 255, 255, 0.04);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  backdrop-filter: blur(12px);
                  border-radius: 20px;
                  padding: 32px 28px;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                }
         
                .heading {
                  color: #f2f0ff;
                  font-size: 24px;
                  font-weight: 700;
                  margin: 0 0 4px;
                  text-align: center;
                }
         
                .subheading {
                  color: #b8b0e0;
                  font-size: 14px;
                  text-align: center;
                  margin: 0 0 24px;
                }
         
                .google-btn {
                  width: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 10px;
                  padding: 12px;
                  border-radius: 12px;
                  border: 1px solid rgba(255, 255, 255, 0.15);
                  background: #ffffff;
                  color: #222;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
         
                .google-btn:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
                }
         
                .divider {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin: 20px 0;
                }
         
                .divider span {
                  flex: 1;
                  height: 1px;
                  background: rgba(255, 255, 255, 0.15);
                }
         
                .divider p {
                  color: #8a82b8;
                  font-size: 12px;
                  margin: 0;
                }
         
                .form {
                  display: flex;
                  flex-direction: column;
                  gap: 14px;
                }
         
                .field {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  font-size: 13px;
                  color: #cfc9ee;
                }
         
                .field input {
                  padding: 11px 12px;
                  border-radius: 10px;
                  border: 1px solid rgba(255, 255, 255, 0.15);
                  background: rgba(255, 255, 255, 0.05);
                  color: #f2f0ff;
                  font-size: 14px;
                  outline: none;
                  transition: border-color 0.15s ease;
                }
         
                .field input:focus {
                  border-color: #7c5cff;
                }
         
                .field input::placeholder {
                  color: #6f689a;
                }
         
                .error {
                  color: #ff7b9d;
                  font-size: 13px;
                  margin: 0;
                }
         
                .not-found-box {
                  background: rgba(124, 92, 255, 0.12);
                  border: 1px solid rgba(124, 92, 255, 0.35);
                  border-radius: 12px;
                  padding: 12px 14px;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                }
         
                .not-found-box p {
                  margin: 0;
                  font-size: 13px;
                  color: #e0dbff;
                }
         
                .create-btn {
                  align-self: flex-start;
                  background: linear-gradient(90deg, #7c5cff, #ff6b9d);
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 999px;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                }
         
                .submit-btn {
                  margin-top: 4px;
                  padding: 12px;
                  border-radius: 12px;
                  border: none;
                  background: linear-gradient(90deg, #7c5cff, #ff6b9d);
                  color: white;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: opacity 0.15s ease;
                }
         
                .submit-btn:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
         
                .switch-line {
                  text-align: center;
                  font-size: 13px;
                  color: #b8b0e0;
                  margin: 18px 0 0;
                }
         
                .link-btn {
                  background: none;
                  border: none;
                  color: #a888ff;
                  font-weight: 600;
                  cursor: pointer;
                  padding: 0;
                  font-size: 13px;
                }
         
                .back-home {
                  display: block;
                  text-align: center;
                  margin-top: 16px;
                  font-size: 12px;
                  color: #6f689a;
                  text-decoration: none;
                }
         
                .back-home:hover {
                  color: #a888ff;
                }
              `}</style>
            </div>
    )
}

export default signup