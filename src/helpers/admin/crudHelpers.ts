import type { AxiosRequestConfig } from "axios";
import { api } from "@/api";

/* -----------------------------------------
   Normalize API path
----------------------------------------- */
const normalizePath = (path: string): string => {
  const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${trimmed}/`;
};

/* -----------------------------------------
   CRUD + Custom Helpers
----------------------------------------- */
export type CrudHelpers<T = any> = {
  list: (config?: AxiosRequestConfig) => Promise<T[]>;
  get: (path: string | number, config?: AxiosRequestConfig) => Promise<T>;
  create: <P = unknown>(payload: P, config?: AxiosRequestConfig) => Promise<T>;
  update: <P = unknown>(
    id: string | number,
    payload: P,
    config?: AxiosRequestConfig
  ) => Promise<T>;
  remove: (id: string | number, config?: AxiosRequestConfig) => Promise<void>;
  action: <R = any, P = any>(
    action: string,
    payload?: P,
    config?: AxiosRequestConfig
  ) => Promise<R>;
};

/* -----------------------------------------
   Factory
----------------------------------------- */
export const createCrudHelpers = <T = any>(basePath: string): CrudHelpers<T> => {
  const resource = normalizePath(basePath);

  return {
    /* ---------------------------
       LIST
    ---------------------------- */
    list: async (config) => {
      const { data } = await api.get<T[]>(resource, config);
      return data;
    },

    /* ---------------------------
       GET (Supports PATH PARAMS)
       Examples:
       get(5) → /resource/5/
       get("abc") → /resource/abc/
       get("by-staff-format/?...") → /resource/by-staff-format/?...
    ---------------------------- */
    get: async (path, config) => {
      let url: string;

      // If "path" contains "/" or "?", treat as RAW PATH
      if (typeof path === "string" && (path.includes("/") || path.includes("?"))) {
        url = `${resource}${path}`;
      } else {
        url = `${resource}${path}/`;
      }

      const { data } = await api.get<T>(url, config);
      return data;
    },

    create: async (payload, config) => {
      const { data } = await api.post<T>(resource, payload, config);
      return data;
    },

    update: async (id, payload, config) => {
      // Use PATCH so partial payloads (e.g., status toggles) work with ModelViewSet
      const { data } = await api.patch<T>(`${resource}${id}/`, payload, config);
      return data;
    },

    remove: async (id, config) => {
      await api.delete(`${resource}${id}/`, config);
    },

    /* ---------------------------
       CUSTOM ACTION
       action("bulk-sync-multi/123", payload)
       → POST /resource/bulk-sync-multi/123/
    ---------------------------- */
    action: async (action, payload, config) => {
      const endsWithSlash = action.endsWith("/");
      const url = `${resource}${action}${endsWithSlash ? "" : "/"}`;

      if (payload) {
        const { data } = await api.post(url, payload, config);
        return data;
      }

      const { data } = await api.get(url, config);
      return data;
    },
  };
};
