import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api";
import { Input } from "@/components/ui/input";
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
} from "@/utils/permissions";
import {
  persistLoginSession,
  unwrapLoginPayload,
  type LoginEnvelope,
} from "@/utils/authStorage";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import ZigmaLogo from "../images/logo.png";
import LoginBg from "../images/bgSignin.png";

type LoginResponse = LoginEnvelope;


export default function Auth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/login/", {
        username,
        password,
      });

      console.log("[Auth] Login response received:", res.data);

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
      //   All other staff (Driver, Operator, Supervisor, User) → /dashboard
      const hasAdminRole = isAdmin(normalizedRole);

      console.log("[Auth] Role:", normalizedRole, "| isAdmin:", hasAdminRole);

      if (hasAdminRole) {
        setAdminViewPreference(ADMIN_VIEW_MODE_ADMIN);
        navigate("/admin", { replace: true });
      } else {
        clearAdminViewPreference();
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      console.error("[Auth] ❌ Login failed:", error);

      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        "Invalid credentials";

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
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 bg-cover bg-center bg-no-repeat px-4 py-10 font-sans md:justify-end md:px-16"
      style={{ backgroundImage: `url(${LoginBg})` }}
    >
      {/* readability scrim over the photo */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-black/10 via-transparent to-black/30" />

      {/* ── Logo (top-left) ─────────────────────────────────────── */}
      <img
        src={ZigmaLogo}
        alt="Zigma IWMS"
        className="absolute left-6 top-6 z-10 h-10 w-auto object-contain drop-shadow-md md:left-10 md:top-8 md:h-14"
      />

      {/* ── Login card ──────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md rounded-4xl border border-white/60 bg-white/95 p-8 shadow-2xl shadow-slate-900/30 backdrop-blur-sm sm:p-10">

        {/* avatar ring */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-100 bg-green-50">
            <Lock className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* heading */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            {t("login.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            {t("login.subtitle")}
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSignIn} className="space-y-4">

          {/* username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {t("login.username")}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="username"
                type="text"
                placeholder={t("login.username_placeholder")}
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-green-400 focus-visible:ring-green-300/50 transition-all"
                required
              />
            </div>
          </div>

          {/* password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {t("login.password")}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("login.password_placeholder")}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:border-green-400 focus-visible:ring-green-300/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* forgot */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[11px] font-semibold text-green-600 hover:underline"
              onClick={() => navigate("/auth/forgot-password")}
            >
              {t("login.forgot_password")}
            </button>
          </div>

          {/* submit — orange gradient matching existing brand accent */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-400 to-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-200/70 transition-all hover:from-orange-500 hover:to-orange-600 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                {t("login.authenticating")}
              </>
            ) : (
              <>
                {t("login.sign_in")}
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* card footer */}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          Secure login ·{" "}
          <span className="font-semibold text-slate-500">Zigma IWMS</span>
        </p>
      </div>
    </div>
  );
}
