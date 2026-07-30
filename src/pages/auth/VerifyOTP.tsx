import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import ZigmaLogo from "@/images/logo.png";
import LoginBg from "@/images/bgSignin.png";

const OTP_LENGTH = 4;

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { sessionToken?: string; email?: string; username?: string } | null;

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sessionToken = state?.sessionToken ?? "";
  const maskedEmail = state?.email
    ? state.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c)
    : "";

  const otp = digits.join("");

  const focusNext = (index: number) => {
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };
  const focusPrev = (index: number) => {
    if (index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char) focusNext(index);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index]) focusPrev(index);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.length < OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits.`);
      return;
    }
    if (!sessionToken) {
      setError("Invalid session. Please go back and request a new OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp/", {
        session_token: sessionToken,
        otp_code: otp,
      });
      const resetToken: string = res.data?.reset_token;
      navigate("/auth/reset-password", { state: { resetToken } });
    } catch (err: any) {
      setError(err?.response?.data?.message || "OTP verification failed.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!state?.username || !state?.email) {
      setError("Session expired. Please go back and try again.");
      return;
    }
    setResending(true);
    setError("");
    setInfo("");
    try {
      const res = await api.post("/auth/forgot-password/", {
        username: state.username,
        email: state.email,
      });
      const newSessionToken: string = res.data?.session_token;
      navigate("/auth/verify-otp", {
        replace: true,
        state: { sessionToken: newSessionToken, email: state.email, username: state.username },
      });
      setInfo("A new OTP has been sent to your email.");
      setDigits(Array(OTP_LENGTH).fill(""));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend OTP. Please wait before trying again.");
    } finally {
      setResending(false);
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
          <CardHeader className="px-5 pt-8 pb-4 sm:px-8">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-green-100 bg-green-50">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <CardTitle className="text-center text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
              Verify OTP
            </CardTitle>
            <CardDescription className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
              Enter the {OTP_LENGTH}-digit OTP sent to{" "}
              {maskedEmail ? <strong>{maskedEmail}</strong> : "your registered email"}.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-8 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert className="rounded-xl border-green-200 bg-green-50 text-green-800">
                  <AlertDescription>{info}</AlertDescription>
                </Alert>
              )}

              {/* OTP digit boxes */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e as KeyboardEvent<HTMLInputElement>)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className="h-12 w-12 rounded-xl border-2 border-slate-200 bg-slate-50 text-center text-xl font-bold text-slate-900 shadow-sm transition-all focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300/50 sm:h-14 sm:w-14"
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={loading || otp.length < OTP_LENGTH}
                className="h-12 w-full rounded-xl bg-linear-to-r from-orange-400 to-orange-500 font-semibold text-white shadow-lg shadow-orange-200/70 hover:from-orange-500 hover:to-orange-600"
              >
                {loading ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Link
                  to="/auth/forgot-password"
                  className="inline-flex items-center gap-1.5 font-semibold text-green-600 hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back
                </Link>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-orange-500 hover:underline disabled:opacity-50"
                >
                  {resending ? "Resending…" : "Resend OTP"}
                </button>
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
