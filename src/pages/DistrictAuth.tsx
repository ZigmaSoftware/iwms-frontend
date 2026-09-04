import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Building2, Eye, EyeOff, Lock, User } from "lucide-react";
import ZigmaLogo from "../images/logo.png";
import LoginBg from "../images/bgSignin.png";
import { useCaptcha, CaptchaField } from "@/components/auth/Captcha";

export default function DistrictAuth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha();

  const navigate = useNavigate();
  const { toast } = useToast();

  const clearDistrictSession = () => {
    [
      "district_access_token",
      "district_unique_id",
      "district_name",
      "district_user_name",
      "district_role",
    ].forEach((key) => localStorage.removeItem(key));
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !captcha.value.trim()) {
      toast({ title: "Required", description: "Enter username, password and captcha.", variant: "destructive" });
      return;
    }
    setLoading(true);
    clearDistrictSession();

    try {
      const res = await api.post("/login/login-user/", {
        username,
        password,
        login_type: "district_member",
        captcha_id: captcha.captchaId,
        captcha_value: captcha.value,
      });

      const payload = res.data;
      const token = payload?.access_token ?? payload?.access ?? "";
      const profile = payload?.profile ?? {};
      const districtId = profile?.district_unique_id;
      const districtName = profile?.district_name;
      const leaderName = profile?.employee_name ?? profile?.name ?? username;

      if (!token) {
        throw new Error("Login failed: token missing.");
      }
      if (!districtId || !districtName) {
        throw new Error("This user is not assigned to a district.");
      }

      localStorage.setItem("district_access_token", token);
      localStorage.setItem("district_unique_id", districtId);
      localStorage.setItem("district_name", districtName);
      localStorage.setItem("district_user_name", leaderName);
      localStorage.setItem("district_role", "district_member");

      navigate("/district", { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.captcha?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.detail ||
        error?.message ||
        "Invalid credentials";
      captcha.refresh();
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
            District Login
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            Sign in to access your district dashboard.
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="district-username" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="district-username"
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
            <label htmlFor="district-password" className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="district-password"
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

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Security check
            </label>
            <CaptchaField captcha={captcha} />
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
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* card footer */}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          Secure login ·{" "}
          <span className="font-semibold text-slate-500">Zigma IWMS · District Portal</span>
        </p>
      </div>
    </div>
  );
}
