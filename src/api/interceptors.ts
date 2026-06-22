import type { AxiosInstance } from "axios";
import { api } from "./index";

const attachAuthInterceptor = (api: AxiosInstance) => {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("access_token");

      const isLoginRequest = config.url?.includes("login-user");

      if (token && !isLoginRequest) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
};


attachAuthInterceptor(api);
