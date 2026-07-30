import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Eye, EyeOff, Lock, User } from "lucide-react";
import ZigmaLogo from "../images/logo.png";
import LoginBg from "../images/bgSignin.png";
import {
  persistLoginSession,
  unwrapLoginPayload,
  type LoginEnvelope,
} from "@/utils/authStorage";

export default function LocalBodyAuth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ title: "Required", description: "Enter username and password.", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const res = await api.post<LoginEnvelope>("/login/login-user/", {
        username,
        password,
        login_type: "panchayat_leader",
      });

      const payload = unwrapLoginPayload(res.data);
      // DO NOT call persistLoginSession here — that would overwrite the
      // admin's access_token in localStorage and break the admin session.
      // Instead, store the localbody token under its own dedicated key.
      const lbToken = (payload as any).access_token ?? (payload as any).access ?? "";
      if (lbToken) {
        localStorage.setItem("lb_access_token", lbToken);
      }

      // Store panchayat context for the dashboard
      const profile = (payload as any).profile ?? {};
      if (profile.panchayat_unique_id) {
        localStorage.setItem("lb_panchayat_unique_id", profile.panchayat_unique_id);
        localStorage.setItem("lb_panchayat_name", profile.panchayat_name ?? "");
      }
      localStorage.setItem("lb_leader_name", profile.leader_name ?? profile.name ?? username);
      localStorage.setItem("lb_role", "panchayat_leader");

      navigate("/localbody", { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        "Invalid credentials";
      toast({ title: "Login Failed", description: message, variant: "destructive" });
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
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-blue-100 bg-blue-50">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* heading */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
            PLB Leader Login
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            Sign in to access your PLB dashboard
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSignIn} className="space-y-4">

          <div className="space-y-1.5">
            <label htmlFor="lb-username" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="lb-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-300/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lb-password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="lb-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-300/50 transition-all"
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

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-200/70 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Authenticating…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* card footer */}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          Secure login ·{" "}
          <span className="font-semibold text-slate-500">Zigma IWMS · Local Body Portal</span>
        </p>
      </div>
    </div>
  );
}
