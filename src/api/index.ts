import axios, { type AxiosInstance } from "axios";

/* --------------------------------------------------------
   ENV
-------------------------------------------------------- */
const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD
  ? import.meta.env.VITE_API_PROD
  : import.meta.env.VITE_API_LOCAL;

/* --------------------------------------------------------
   CREATE INSTANCE
-------------------------------------------------------- */
type ApiType = "desktop" | "mobile" | "platform" | "company";

type CreateApiOptions = {
  tokenStorageKey: string;
  loginPathIncludes: string[];
};

const createApi = (type: ApiType, opts: CreateApiOptions): AxiosInstance => {
  const api = axios.create({
    baseURL: `${API_ROOT}/${type}`,
    withCredentials: type === "mobile",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  /* ----------------------------------------------------
      AUTH INTERCEPTOR (ATTACHED IMMEDIATELY)
  ---------------------------------------------------- */
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(opts.tokenStorageKey);

    const isLogin =
      opts.loginPathIncludes.some((p) => config.url?.includes(p));

    if (token && !isLogin) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  return api;
};

/* --------------------------------------------------------
   EXPORT SINGLETONS
-------------------------------------------------------- */
export const desktopApi = createApi("desktop", {
  tokenStorageKey: "access_token",
  loginPathIncludes: ["/login/login-user"],
});

export const mobileApi = createApi("mobile", {
  tokenStorageKey: "access_token",
  loginPathIncludes: ["/login/login-user"],
});

export const platformApi = createApi("platform", {
  tokenStorageKey: "platform_access_token",
  loginPathIncludes: ["/auth/login"],
});

export const companyApi = createApi("company", {
  tokenStorageKey: "access_token",
  loginPathIncludes: ["/login/login-user"],
});
