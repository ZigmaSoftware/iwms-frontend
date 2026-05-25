// import { useState, type ChangeEvent, type FormEvent } from "react";
// import { useNavigate } from "react-router-dom";
// import { api } from "@/api";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/hooks/use-toast";
// import { useTranslation } from "react-i18next";
// import { useUser } from "@/contexts/UserContext";
// import {
//   DEFAULT_ROLE,
//   USER_ROLE_STORAGE_KEY,
//   normalizeRole,
//   setAdminViewPreference,
//   clearAdminViewPreference,
//   ADMIN_VIEW_MODE_ADMIN,
//   isAdmin,
// } from "@/types/roles";
// import { fetchPermissionsFromAPI } from "@/utils/permissions";
// import { Eye, EyeOff } from "lucide-react";
// import ZigmaLogo from "../images/logo.png";
// import BgImg from "../images/bgSignin.png";

// type Profile = {
//   user_type: string;
//   unique_id: string;
//   name: string;
//   role: string;
//   email: string;
//   company_unique_id: string;
//   company_name: string;
//   staff_unique_id: string;
//   employee_id: string;
//   employee_name: string;
//   emp_id: string;
//   staffusertype_unique_id: string;
//   project_id?: string;
//   project_unique_id?: string;
//   project?: {
//     unique_id?: string;
//   };
// };

// type LoginResponse = {
//   access_token: string;
//   role: string;
//   unique_id: string;
//   name?: string;
//   username?: string;
//   email?: string;
//   permissions?: Record<string, any>;
//   profile?: Profile;
// };

// export default function Auth() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();
//   const { toast } = useToast();
//   const { t } = useTranslation();
//   const { setUser } = useUser();

//   const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const res = await api.post<LoginResponse>("/login/", {
//         username,
//         password,
//       });

//       console.log("[Auth] ✅ Login response received:", res.data);

//       const {
//         access_token,
//         role,
//         unique_id,
//         name,
//         username: apiUsername,
//         email,
//         profile,
//       } = res.data;

//       const normalizedRole = normalizeRole(role) ?? DEFAULT_ROLE;

//       // ✅ Store auth
//       localStorage.setItem("access_token", access_token);
//       localStorage.setItem(USER_ROLE_STORAGE_KEY, normalizedRole);

//       // ✅ Fetch permissions immediately
//       console.log("[Auth] 📡 Fetching permissions immediately after login...");
//       try {
//         await fetchPermissionsFromAPI();
//         console.log("[Auth] ✅ Permissions cached successfully");
//       } catch (permError) {
//         console.warn(
//           "[Auth] ⚠️ Permissions fetch failed, will retry on app load:",
//           permError
//         );
//       }

//       // ✅ Store profile
//       if (profile) {
//         localStorage.setItem("profile", JSON.stringify(profile));

//         const projectId =
//           profile.project_id ??
//           profile.project_unique_id ??
//           profile.project?.unique_id;

//         if (projectId) {
//           localStorage.setItem("project_id", projectId);
//         } else {
//           localStorage.removeItem("project_id");
//         }
//       }

//       // ✅ Set user context
//       setUser({
//         name: name ?? apiUsername ?? username,
//         email: email ?? "",
//       });

//       // ✅ Admin view preference using isAdmin() — covers admin, superadmin, companyadmin
//       if (isAdmin(normalizedRole)) {
//         setAdminViewPreference(ADMIN_VIEW_MODE_ADMIN);
//         navigate("/admin", { replace: true });
//       } else {
//         clearAdminViewPreference();
//         navigate("/", { replace: true });
//       }
//     } catch (error: any) {
//       console.error("[Auth] ❌ Login failed:", error);

//       toast({
//         title: t("login.title"),
//         description:
//           error?.response?.data?.detail || "Invalid credentials",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#f3f6f4] dark:bg-[#050b15] p-4 font-sans">
//       <div
//         className="absolute inset-0 bg-cover bg-center"
//         style={{ backgroundImage: `url(${BgImg})` }}
//       />
//       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

//       <div className="relative w-full max-w-5xl grid md:grid-cols-2 rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
//         {/* LEFT */}
//         <div className="flex flex-col items-center justify-center p-10 bg-[#e8f5e9] dark:bg-[#0f1c31] text-center border-r border-gray-200">
//           <img src={ZigmaLogo} className="h-40 w-40 mb-4" />
//           <h2 className="text-2xl font-bold text-[#2e7d32] dark:text-[#9be37d]">
//             {t("login.left_title")}
//           </h2>
//           <p className="text-gray-700 text-sm mt-3 max-w-xs leading-relaxed">
//             {t("login.left_text")}
//           </p>
//         </div>

//         {/* RIGHT */}
//         <div className="p-10 flex flex-col justify-center">
//           <div className="flex items-center mb-6">
//             <div>
//               <h1 className="text-3xl font-semibold text-gray-800">
//                 {t("login.title")}
//               </h1>
//               <p className="text-[#43A047] dark:text-[#7cd67c] mt-1 text-sm">
//                 {t("login.subtitle")}
//               </p>
//             </div>
//           </div>

//           <form onSubmit={handleSignIn} className="space-y-6">
//             {/* Username */}
//             <div>
//               <Label htmlFor="username" className="text-gray-700">
//                 {t("login.username")}
//               </Label>
//               <Input
//                 id="username"
//                 type="text"
//                 placeholder={t("login.username_placeholder")}
//                 value={username}
//                 onChange={(e: ChangeEvent<HTMLInputElement>) =>
//                   setUsername(e.target.value)
//                 }
//                 className="h-12 rounded-lg bg-white border border-gray-300
//                   text-gray-800 placeholder-gray-500 dark:placeholder-gray-400
//                   focus:ring-2 focus:ring-[#43A047] focus:border-[#43A047]"
//                 required
//               />
//             </div>

//             {/* Password */}
//             <div>
//               <Label htmlFor="password" className="text-gray-700">
//                 {t("login.password")}
//               </Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   placeholder={t("login.password_placeholder")}
//                   value={password}
//                   onChange={(e: ChangeEvent<HTMLInputElement>) =>
//                     setPassword(e.target.value)
//                   }
//                   className="h-12 rounded-lg bg-white border border-gray-300
//                     text-gray-800 placeholder-gray-500 dark:placeholder-gray-400
//                     focus:ring-2 focus:ring-[#43A047] focus:border-[#43A047] pr-12"
//                   required
//                 />
//                 <button
//                   type="button"
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
//                   onClick={() => setShowPassword((v) => !v)}
//                 >
//                   {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//                 </button>
//               </div>
//             </div>

//             {/* Forgot Password */}
//             <div className="text-right">
//               <button
//                 type="button"
//                 className="text-sm text-[#2e7d32] font-medium"
//                 onClick={() =>
//                   toast({
//                     title: t("login.forgot_password"),
//                     description: "Password recovery is being implemented.",
//                   })
//                 }
//               >
//                 {t("login.forgot_password")}
//               </button>
//             </div>

//             {/* Submit */}
//             <Button
//               type="submit"
//               disabled={loading}
//               className="w-full h-12 rounded-lg bg-[#43A047] hover:bg-[#2e7d32]
//                 text-white text-base font-semibold shadow-md transition-all"
//             >
//               {loading ? t("login.authenticating") : t("login.sign_in")}
//             </Button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { usePermission } from "@/contexts/PermissionContext";
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
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import ZigmaLogo from "../images/logo.png";

type Profile = {
  user_type: string;
  unique_id: string;
  name: string;
  role: string;
  email: string;
  company_unique_id: string;
  company_name: string;
  staff_unique_id: string;
  employee_id: string;
  employee_name: string;
  emp_id: string;
  staffusertype_unique_id: string;
  project_id?: string;
  project_unique_id?: string;
  project?: {
    unique_id?: string;
  };
};

type LoginResponse = LoginEnvelope;

/**
 * Check if the permissions object has at least one module
 * with at least one screen that has any action allowed.
 * Handles both formats:
 *   - Array format:  { "common-masters": { "continents": ["view"] } }
 *   - Object format: { "common-masters": { "continents": { "view": true } } }
 */
function hasAnyPermission(permissions: Record<string, any>): boolean {
  if (!permissions || typeof permissions !== "object") return false;

  return Object.values(permissions).some((module) => {
    if (typeof module === "boolean") return module;
    if (!module || typeof module !== "object") return false;

    return Object.values(module).some((screenValue) => {
      if (typeof screenValue === "boolean") return screenValue;
      if (Array.isArray(screenValue)) return screenValue.length > 0;
      if (typeof screenValue === "object" && screenValue !== null) {
        return Object.values(screenValue).some((v) => v === true);
      }
      return false;
    });
  });
}

export default function Auth() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { setUser } = useUser();

  // ✅ Get updatePermissions so we can force React state sync after login
  const { updatePermissions } = usePermission();

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/login/", {
        username,
        password,
      });

      console.log("[Auth] ✅ Login response received:", res.data);

      const payload = unwrapLoginPayload(res.data);
      persistLoginSession(payload);

      const normalizedRole =
        normalizeRole(payload.user?.role ?? payload.role ?? null) ?? DEFAULT_ROLE;
      const freshPermissions = getStoredPermissions();
      updatePermissions(freshPermissions, getStoredColumnPermissions());

      // ✅ Set user context
      setUser({
        name:
          payload.user?.name ??
          payload.user?.username ??
          payload.name ??
          payload.username ??
          username,
        email: payload.user?.email ?? payload.email ?? "",
      });

      // ✅ Check admin access by role name OR by any permission granted by superadmin
      const hasAdminAccess =
        isAdmin(normalizedRole) ||
        hasAnyPermission(freshPermissions) ||
        hasAnyPermission((payload.permissions ?? {}) as Record<string, any>);

      console.log(
        "[Auth] 🔐 Role:", normalizedRole,
        "| permissions:", freshPermissions,
        "| hasAdminAccess:", hasAdminAccess
      );

      if (hasAdminAccess) {
        setAdminViewPreference(ADMIN_VIEW_MODE_ADMIN);
        navigate("/admin", { replace: true });
      } else {
        clearAdminViewPreference();
        navigate("/", { replace: true });
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
    <div className="min-h-screen flex items-center justify-center bg-[#eef6f0] p-4 font-sans">
      <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl shadow-green-900/15 grid md:grid-cols-[1.15fr_1fr]">

        {/* ── Left: Branding Panel ─────────────────────────────────────── */}
        <div className="relative hidden md:flex flex-col justify-between bg-[#1a3a2a] overflow-hidden p-10">
          {/* Subtle radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-green-900" />
          {/* Decorative rings */}
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full border border-white/5" />
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full border border-white/5" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-36 w-36 rounded-full border border-white/5" />
          {/* Top-left accent dot */}
          <div className="pointer-events-none absolute top-0 left-0 h-40 w-40 rounded-full bg-[#22a855]/10 -translate-x-1/2 -translate-y-1/2" />

          {/* IWMS badge */}
          <div className="relative flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7ee8a2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22a855] animate-pulse" />
              Integrated Waste Management
            </span>
          </div>

          {/* Center: Logo + headline */}
          <div className="relative flex flex-col items-center text-center flex-1 justify-center gap-6 py-6">
            {/* Logo glow ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#22a855]/20 blur-2xl scale-150" />
              <div className="relative rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-5 shadow-xl">
                <img
                  src={ZigmaLogo}
                  className="h-28 w-28 object-contain drop-shadow-lg"
                  alt="Zigma Logo"
                />
              </div>
            </div>

            {/* Brand name */}
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#22a855] mb-1">
                ZIGMA
              </p>
              <p className="text-[11px] text-white/40 italic tracking-wide">
                Alchemists of the MSW
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full max-w-[220px]">
              <div className="h-px flex-1 bg-white/10" />
              <div className="h-1 w-1 rounded-full bg-[#22a855]/60" />
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Headline */}
            <div className="max-w-xs">
              <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
                Transforming<br />
                <span className="text-[#22a855]">City Operations</span>
              </h2>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">
                Experience a cleaner, faster workflow designed for modern field operations.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xs">
              {["Route Optimization", "Real-time Tracking", "Fleet Management"].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-medium text-white/60"
                >
                  <span className="h-1 w-1 rounded-full bg-[#22a855]" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="relative flex items-center gap-2">
            <div className="h-1.5 w-8 rounded-full bg-[#22a855]" />
            <div className="h-1.5 w-4 rounded-full bg-white/20" />
            <div className="h-1.5 w-2 rounded-full bg-white/10" />
          </div>
        </div>

        {/* ── Right: Form Panel ────────────────────────────────────────── */}
        <div className="bg-white flex flex-col justify-center p-10 gap-8">

          {/* Mobile-only logo */}
          <div className="flex md:hidden items-center gap-3">
            <img src={ZigmaLogo} className="h-10 w-10 object-contain" alt="Zigma" />
            <div>
              <p className="text-sm font-black tracking-wide text-gray-800">ZIGMA</p>
              <p className="text-[10px] text-[#22a855] font-semibold uppercase tracking-widest">IWMS</p>
            </div>
          </div>

          {/* Welcome heading */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-[#22a855]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#22a855]">
                Field Operations Portal
              </p>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {t("login.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              {t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                {t("login.username")}
              </label>
              <Input
                id="username"
                type="text"
                placeholder={t("login.username_placeholder")}
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                className="h-12 rounded-xl border-gray-200 bg-[#f8faf9] text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#22a855] focus-visible:border-[#22a855] transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                  {t("login.password")}
                </label>
                <button
                  type="button"
                  className="text-[11px] text-[#22a855] font-semibold hover:underline"
                  onClick={() =>
                    toast({ title: t("login.forgot_password"), description: "Password recovery is being implemented." })
                  }
                >
                  {t("login.forgot_password")}
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("login.password_placeholder")}
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 bg-[#f8faf9] text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#22a855] focus-visible:border-[#22a855] pr-12 transition-all"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#22a855] hover:bg-[#1a8e44] active:bg-[#167338] text-white text-sm font-bold shadow-lg shadow-green-200 transition-all gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  {t("login.authenticating")}
                </>
              ) : (
                <>
                  {t("login.sign_in")}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-400 leading-relaxed">
            Secure login powered by&nbsp;
            <span className="font-semibold text-[#22a855]">Zigma IWMS</span>
            &nbsp;&mdash; Alchemists of the MSW
          </p>
        </div>
      </div>
    </div>
  );
}
