import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { platformApi } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

import ZigmaLogo from "@/images/logo.png";
import BgImg from "@/images/bgSignin.png";

type PlatformLoginResponse = {
  access_token: string;
  unique_id?: string;
  username?: string;
};

const PLATFORM_TOKEN_KEY = "platform_access_token";

export default function PlatformLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await platformApi.post<PlatformLoginResponse>("/auth/login/", {
        username,
        password,
      });

      localStorage.setItem(PLATFORM_TOKEN_KEY, res.data.access_token);
      localStorage.setItem("platform_username", res.data.username ?? username);
      localStorage.setItem("platform_unique_id", res.data.unique_id ?? "");

      navigate("/platform", { replace: true });
    } catch (error: any) {
      toast({
        title: "Platform login",
        description: error?.response?.data?.detail || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f6f4] dark:bg-[#050b15] p-4 font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BgImg})` }}
      />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-col items-center justify-center p-10 bg-[#0f1c31] text-center border-r border-gray-200">
          <img src={ZigmaLogo} className="h-40 w-40 mb-4" />
          <h2 className="text-2xl font-bold text-[#9be37d]">Platform Console</h2>
          <p className="text-gray-200 text-sm mt-3 max-w-xs leading-relaxed">
            Sign in as Platform Super Admin to create Companies and Projects.
          </p>
        </div>

        <div className="p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-800">Super Admin Login</h1>
              <p className="text-[#43A047] mt-1 text-sm">Platform authority only</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Back to Staff Login
            </Button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-gray-700">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="platform_admin"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="h-12 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-[#43A047] focus:border-[#43A047]"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="h-12 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-[#43A047] focus:border-[#43A047] pr-12"
                  required
                />

                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-[#43A047] hover:bg-[#2e7d32] text-white text-base font-semibold shadow-md transition-all"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
