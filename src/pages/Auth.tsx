import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { usePermission } from "@/contexts/PermissionContext";
import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import {
  DEFAULT_ROLE,
  normalizeRole,
  setAdminViewPreference,
  clearAdminViewPreference,
  ADMIN_VIEW_MODE_ADMIN,
  isAdmin,
} from "@/types/roles";
import {
  getStoredColumnPermissions,
  getStoredPermissions,
  hasAnyPermission,
} from "@/utils/permissions";
import {
  persistLoginSession,
  unwrapLoginPayload,
  type LoginEnvelope,
} from "@/utils/authStorage";
import { Eye, EyeOff, Lock, User, UserRound, Leaf, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import ZigmaLogo from "../images/logo.png";
import AnimatedLoginScene from "@/components/auth/AnimatedLoginScene";
import LoginFeatureChain from "@/components/auth/LoginFeatureChain";
import { useCaptcha } from "@/components/auth/Captcha";
import "@/components/auth/animated-login.css";

type LoginResponse = LoginEnvelope;

/** Renders a translated heading with its last word accented, matching the
 * government reference app's two-tone "Welcome <accent>Back!</accent>" style
 * without hardcoding English text (works for any locale's word order). */
function AccentLastWord({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) {
    return <em>{text}</em>;
  }
  const lastWord = words.pop();
  return (
    <>
      {words.join(" ")} <em>{lastWord}</em>
    </>
  );
}

export default function Auth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [userInvalid, setUserInvalid] = useState(false);
  const [passInvalid, setPassInvalid] = useState(false);
  const [passHint, setPassHint] = useState("Enter your password to continue.");
  const [captchaInvalid, setCaptchaInvalid] = useState(false);
  const [shake, setShake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const captcha = useCaptcha();

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setUser } = useUser();

  // Show success toast once when redirected from reset-password
  useEffect(() => {
    const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;
    if (successMessage) {
      toast({ title: "Password Reset", description: successMessage });
      window.history.replaceState({}, "");
    }
  }, []);

  // Get updatePermissions so we can force React state sync after login
  const { updatePermissions } = usePermission();
  const { reloadFromSession } = useProjectSelector();

  const triggerShake = () => {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserInvalid(false);
    setPassInvalid(false);
    setCaptchaInvalid(false);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password || !captcha.value.trim()) {
      if (!trimmedUsername) setUserInvalid(true);
      if (!password) {
        setPassHint("Enter your password to continue.");
        setPassInvalid(true);
      }
      if (!captcha.value.trim()) setCaptchaInvalid(true);
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/login/", {
        username,
        password,
        captcha_id: captcha.captchaId,
        captcha_value: captcha.value,
      });

      const payload = unwrapLoginPayload(res.data);
      persistLoginSession(payload);
      reloadFromSession();

      const normalizedRole =
        normalizeRole(payload.user?.role ?? payload.role ?? null) ?? DEFAULT_ROLE;
      const freshPermissions = getStoredPermissions();
      updatePermissions(freshPermissions, getStoredColumnPermissions());

      //  Set user context
      setUser({
        name:
          payload.user?.name ??
          payload.user?.username ??
          payload.name ??
          payload.username ??
          username,
        email: payload.user?.email ?? payload.email ?? "",
      });

      // Route based on role:
      //   Admin-type roles (Company Admin, superadmin, etc.) → /admin
      //   Any other role granted module/screen permissions → /admin
      //   Everyone else (no admin-module access) → /dashboard
      const hasAdminRole = isAdmin(normalizedRole, hasAnyPermission("view", freshPermissions));

      if (hasAdminRole) {
        setAdminViewPreference(ADMIN_VIEW_MODE_ADMIN);
        navigate("/admin", { replace: true });
      } else {
        clearAdminViewPreference();
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.captcha?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        "Invalid credentials";

      if (error?.response?.data?.captcha) {
        setCaptchaInvalid(true);
      } else {
        setPassHint(errorMessage);
        setPassInvalid(true);
      }
      captcha.refresh();
      triggerShake();

      toast({
        title: t("login.title"),
        description: errorMessage,
        variant: "destructive",
      });
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
              <UserRound className="avatar-icon" />
              <Leaf className="avatar-badge" />
            </div>

            <h2 className="welcome">
              <AccentLastWord text={t("login.title")} />
            </h2>
            <p className="subtitle">{t("login.subtitle")}</p>

            <form onSubmit={handleSignIn} noValidate>
              <div className={`field u${userInvalid ? " invalid" : ""}`}>
                <label htmlFor="username">{t("login.username")}</label>
                <div className="control">
                  <span className="lead" aria-hidden="true"><User /></span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder={t("login.username_placeholder")}
                    value={username}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setUsername(e.target.value);
                      setUserInvalid(false);
                    }}
                  />
                </div>
                <p className="hint" role="alert">
                  <AlertCircle />
                  <span>Enter your username or email to continue.</span>
                </p>
              </div>

              <div className={`field p${passInvalid ? " invalid" : ""}`}>
                <label htmlFor="password">{t("login.password")}</label>
                <div className="control">
                  <span className="lead" aria-hidden="true"><Lock /></span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t("login.password_placeholder")}
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setPassword(e.target.value);
                      setPassInvalid(false);
                    }}
                  />
                  <button
                    type="button"
                    className="reveal"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="hint" role="alert">
                  <AlertCircle />
                  <span>{passHint}</span>
                </p>
              </div>

              <div className={`field c${captchaInvalid ? " invalid" : ""}`}>
                <label htmlFor="captcha">Security check</label>
                <div className="captcha-row">
                  <div className="captcha-image">
                    {captcha.image ? (
                      <img src={captcha.image} alt="Captcha" draggable={false} />
                    ) : (
                      <span className="captcha-loading">Loading…</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="captcha-refresh"
                    aria-label="Refresh captcha"
                    onClick={captcha.refresh}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <div className="control">
                    <span className="lead" aria-hidden="true"><ShieldCheck /></span>
                    <input
                      id="captcha"
                      name="captcha"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter the code shown"
                      value={captcha.value}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        captcha.setValue(e.target.value);
                        setCaptchaInvalid(false);
                      }}
                    />
                  </div>
                </div>
                <p className="hint" role="alert">
                  <AlertCircle />
                  <span>Enter the code shown in the image.</span>
                </p>
              </div>

              <button
                type="button"
                className="forgot"
                onClick={() => navigate("/auth/forgot-password")}
              >
                {t("login.forgot_password")}
              </button>

              <button className={`submit${loading ? " busy" : ""}`} type="submit" disabled={loading}>
                <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" /><path d="M15 12H3" />
                </svg>
                <span className="label">{t("login.sign_in")}</span>
                <svg className="spinner" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
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
