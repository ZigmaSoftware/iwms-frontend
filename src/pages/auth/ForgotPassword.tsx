import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, User, Lock } from "lucide-react";
import ZigmaLogo from "@/images/logo.png";
import LoginBg from "@/images/bgSignin.png";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim()) {
      setError("Please enter both username and email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password/", { username, email });
      const sessionToken: string | undefined = res.data?.session_token;
      if (!sessionToken) {
        // Username/email combination not found — show generic message without revealing which
        setError("No account found matching the provided username and email address.");
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 bg-cover bg-center bg-no-repeat px-4 py-10 md:justify-end md:px-16"
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

      <div className="relative z-10 w-full max-w-md">
        <Card className="overflow-hidden rounded-4xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/30 backdrop-blur-sm">
          <CardHeader className="px-8 pt-8 pb-4">
            {/* avatar ring */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-100 bg-green-50">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <CardTitle className="text-center text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
              Forgot Password
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
              Enter your username and registered email address. We'll send you an OTP to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Username
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-green-400 focus-visible:ring-green-300/50"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-green-400 focus-visible:ring-green-300/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-12 w-full rounded-xl bg-linear-to-r from-orange-400 to-orange-500 font-semibold text-white shadow-lg shadow-orange-200/70 hover:from-orange-500 hover:to-orange-600"
              >
                {loading ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Sending OTP…
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>

              <div className="flex justify-center pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </Link>
              </div>
            </form>

            {/* card footer */}
            <p className="mt-6 text-center text-[11px] text-slate-400">
              Secure login ·{" "}
              <span className="font-semibold text-slate-500">Zigma IWMS</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
