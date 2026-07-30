import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import ZigmaLogo from "@/images/logo.png";
import LoginBg from "@/images/bgSignin.png";

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function getPasswordStrength(pwd: string): { level: StrengthLevel; label: string; color: string; width: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { level: "weak", label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score === 2) return { level: "fair", label: "Fair", color: "bg-orange-400", width: "w-2/4" };
  if (score === 3) return { level: "good", label: "Good", color: "bg-yellow-400", width: "w-3/4" };
  return { level: "strong", label: "Strong", color: "bg-green-500", width: "w-full" };
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { resetToken?: string } | null;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetToken = state?.resetToken ?? "";
  const strength = newPassword ? getPasswordStrength(newPassword) : null;
  const passwordsMatch = confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resetToken) {
      setError("Invalid session. Please start the password reset process again.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password/", {
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      navigate("/auth", {
        state: { successMessage: "Password reset successfully. Please log in with your new password." },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset password. Please try again.");
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
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-100 bg-green-50">
                <KeyRound className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <CardTitle className="text-center text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
              Reset Password
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
              Choose a strong new password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new_password" className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:border-green-400 focus-visible:ring-green-300/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {strength && (
                  <div className="space-y-1 mt-1">
                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                    </div>
                    <p className={`text-xs font-semibold ${
                      strength.level === "weak" ? "text-red-500" :
                      strength.level === "fair" ? "text-orange-400" :
                      strength.level === "good" ? "text-yellow-500" :
                      "text-green-600"
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-12 rounded-xl border-slate-200 bg-slate-50 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:ring-green-300/50 transition-all ${
                      confirmPassword
                        ? passwordsMatch
                          ? "border-green-400 focus-visible:border-green-400"
                          : "border-red-400 focus-visible:border-red-400"
                        : "focus-visible:border-green-400"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500 font-medium">Passwords do not match.</p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-600 font-medium">Passwords match.</p>
                )}
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
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
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
