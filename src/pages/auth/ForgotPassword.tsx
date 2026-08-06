import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Lock, Mail, User, Leaf, AlertCircle } from "lucide-react";
import ZigmaLogo from "../../images/logo.png";
import AnimatedLoginScene from "@/components/auth/AnimatedLoginScene";
import LoginFeatureChain from "@/components/auth/LoginFeatureChain";
import "@/components/auth/animated-login.css";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim()) {
      setError("Please enter both username and email address.");
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password/", { username, email });
      const sessionToken: string | undefined = res.data?.session_token;
      if (!sessionToken) {
        // Username/email combination not found — show generic message without revealing which
        setError("No account found matching the provided username and email address.");
        triggerShake();
        return;
      }
      navigate("/auth/verify-otp", {
        state: { sessionToken, email, username },
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again."
      );
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zigma-login" ref={containerRef}>
      <AnimatedLoginScene containerRef={containerRef} />

      <main className="page">
        <section className="left">
          <a className="brand" href="#" aria-label="Zigma home" onClick={(e) => e.preventDefault()}>
            <img src={ZigmaLogo} alt="Zigma IWMS" />
          </a>

          <h1 className="headline">Smart Solutions for a Cleaner, Greener Tomorrow</h1>

          <LoginFeatureChain containerRef={containerRef} />
        </section>

        <section className="right">
          <div className={`card${shake ? " shake" : ""}`} id="card">
            <div className="avatar" aria-hidden="true">
              <Lock className="avatar-icon" />
              <Leaf className="avatar-badge" />
            </div>

            <h2 className="welcome">
              Forgot <em>Password</em>
            </h2>
            <p className="subtitle">
              Enter your username and registered email address. We'll send you an OTP to reset your password.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field u">
                <label htmlFor="username">Username</label>
                <div className="control">
                  <span className="lead" aria-hidden="true"><User /></span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div className="field p">
                <label htmlFor="email">Email Address</label>
                <div className="control">
                  <span className="lead" aria-hidden="true"><Mail /></span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div className={`field${error ? " invalid" : ""}`}>
                <p className="hint" role="alert">
                  <AlertCircle />
                  <span>{error}</span>
                </p>
              </div>

              <button className={`submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" /><path d="M15 12H3" />
                </svg>
                <span className="label">Send OTP</span>
                <svg className="spinner" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
              </button>

              <button
                type="button"
                className="forgot"
                onClick={() => navigate("/auth")}
                style={{ textAlign: "center", margin: "18px auto 0", display: "block" }}
              >
                ← Back to Login
              </button>
            </form>

            <p className="footnote">
              <Leaf aria-hidden="true" />
              Together for a Sustainable Future
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
