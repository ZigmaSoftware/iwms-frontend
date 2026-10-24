import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Opt out of the duplicate-submit guard for this request. */
    allowDuplicate?: boolean;
  }
}

/* --------------------------------------------------------
   ENV
-------------------------------------------------------- */
const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD
  ? import.meta.env.VITE_API_PROD
  : import.meta.env.VITE_API_LOCAL;

/* --------------------------------------------------------
   DUPLICATE-SUBMIT GUARD
   If a Save/Update/Delete button is clicked again (e.g. on a slow
   network) while the same request is still in flight, the repeat
   click shares the pending request instead of hitting the API again.
-------------------------------------------------------- */
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

const requestKey = (config: InternalAxiosRequestConfig): string | null => {
  const method = (config.method ?? "get").toLowerCase();
  if (config.allowDuplicate || !MUTATING_METHODS.has(method)) return null;

  // By the time the adapter runs, JSON bodies are already serialized to
  // strings. FormData/Blob bodies (file uploads) can't be compared
  // reliably, so they are left unguarded.
  const { data } = config;
  if (data != null && typeof data !== "string") return null;

  return [
    method,
    config.baseURL ?? "",
    config.url ?? "",
    JSON.stringify(config.params ?? null),
    data ?? "",
  ].join(" ");
};

const withDuplicateGuard = (api: AxiosInstance) => {
  const sendRequest = axios.getAdapter(api.defaults.adapter);
  const inFlight = new Map<string, Promise<AxiosResponse>>();

  api.defaults.adapter = (config) => {
    const key = requestKey(config);
    if (!key) return sendRequest(config);

    const pending = inFlight.get(key);
    if (pending) return pending;

    const request = sendRequest(config).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
};

/* --------------------------------------------------------
   CREATE INSTANCE
-------------------------------------------------------- */
type CreateApiOptions = {
  tokenStorageKey: string;
  loginPathIncludes: string[];
};

const createApi = (opts: CreateApiOptions): AxiosInstance => {
  const api = axios.create({
    baseURL: API_ROOT,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  withDuplicateGuard(api);

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(opts.tokenStorageKey);

    const isLogin = opts.loginPathIncludes.some((p) =>
      config.url?.includes(p)
    );

    if (token && !isLogin) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Let the idle-logout guard confirm with the server whether the session
  // was ended (logged out elsewhere / idle timeout) — see useIdleLogout.
  api.interceptors.response.use(undefined, (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  });

  return api;
};

/* --------------------------------------------------------
   EXPORT SINGLE API
-------------------------------------------------------- */
export const api = createApi({
  tokenStorageKey: "access_token",
  loginPathIncludes: ["/login/"],
});

// Debug: expose base URL for troubleshooting (prints once on module load)
// eslint-disable-next-line no-console
console.debug("[api] API_ROOT", { API_ROOT });
