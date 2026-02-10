import type { AxiosRequestConfig } from "axios";
import { api } from "@/api";
/* -----------------------------------------
   Normalize API path (idempotent)
----------------------------------------- */
const normalizePath = (path: string): string => {
  const cleaned = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `/${cleaned}/`;
};

/* -----------------------------------------
   Types
----------------------------------------- */
export type PaginatedResponse<T> = {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: unknown;
};

export type CrudHelpers<T = any> = {
  list: (config?: AxiosRequestConfig) => Promise<T[]>;

  listPaginated: (
    page?: number,
    limit?: number,
    config?: AxiosRequestConfig
  ) => Promise<PaginatedResponse<T>>;

  get: (path: string | number, config?: AxiosRequestConfig) => Promise<T>;

  create: <P = unknown>(
    payload: P,
    config?: AxiosRequestConfig
  ) => Promise<T>;

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

  upload: <R = any>(
    payload: FormData,
    config?: AxiosRequestConfig
  ) => Promise<R>;

  uploadUpdate: <R = any>(
    id: string | number,
    payload: FormData,
    config?: AxiosRequestConfig
  ) => Promise<R>;
};

/* -----------------------------------------
   Factory
----------------------------------------- */
export const createCrudHelpers = <T = any>(
  basePath: string
): CrudHelpers<T> => {
  const resource = normalizePath(basePath);

  return {
    /* ---------- LIST ---------- */

    list: async (config) => {
      const { data } = await api.get<T[] | PaginatedResponse<T>>(
        resource,
        config
      );

      if (
        data &&
        typeof data === "object" &&
        "results" in data &&
        Array.isArray(data.results)
      ) {
        return data.results;
      }

      return data as T[];
    },

    listPaginated: async (page = 1, limit = 5, config) => {
      const { data } = await api.get<PaginatedResponse<T>>(resource, {
        ...config,
        params: {
          page,
          limit,
          ...config?.params,
        },
      });

      return data;
    },

    /* ---------- GET ---------- */

    get: async (path, config) => {
      const isRaw =
        typeof path === "string" &&
        (path.includes("/") || path.includes("?"));

      const url = isRaw
        ? `${resource}${path}`
        : `${resource}${path}/`;

      const { data } = await api.get<T>(url, config);
      return data;
    },

    /* ---------- MUTATIONS ---------- */

    create: async (payload, config) => {
      const { data } = await api.post<T>(resource, payload, config);
      return data;
    },

    update: async (id, payload, config) => {
      const { data } = await api.patch<T>(
        `${resource}${id}/`,
        payload,
        config
      );
      return data;
    },

    remove: async (id, config) => {
      await api.delete(`${resource}${id}/`, config);
    },

    /* ---------- CUSTOM ACTION ---------- */

    action: async (action, payload, config) => {
      const cleanAction = action.replace(/^\/+/, "");
      const url = `${resource}${cleanAction}${
        cleanAction.endsWith("/") ? "" : "/"
      }`;

      const { data } = payload
        ? await api.post(url, payload, config)
        : await api.get(url, config);

      return data;
    },

    /* ---------- FILE UPLOADS ---------- */

    upload: async (payload, config) => {
      const { data } = await api.post(resource, payload, {
        ...config,
        headers: {
          "Content-Type": "multipart/form-data",
          ...config?.headers,
        },
      });
      return data;
    },

    uploadUpdate: async (id, payload, config) => {
      const { data } = await api.patch(
        `${resource}${id}/`,
        payload,
        {
          ...config,
          headers: {
            "Content-Type": "multipart/form-data",
            ...config?.headers,
          },
        }
      );
      return data;
    },
  };
};
