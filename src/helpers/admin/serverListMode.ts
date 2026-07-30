import type { AxiosRequestConfig } from "axios";
import type { CrudHelpers } from "./crudHelpers";

export type ServerListMetadata = {
  count: number;
  config?: AxiosRequestConfig;
  rawRows: Record<string, unknown>[];
  version: number;
};

const registeredApis = new WeakMap<CrudHelpers, number>();
const latestMetadata = new WeakMap<CrudHelpers, ServerListMetadata>();
let metadataVersion = 0;

export const registerServerListApi = (
  api: CrudHelpers,
  pageSize: number,
) => {
  registeredApis.set(api, pageSize);
};

export const getRegisteredServerListPageSize = (api: CrudHelpers) =>
  registeredApis.get(api);

export const setLatestServerListMetadata = (
  api: CrudHelpers,
  metadata: Omit<ServerListMetadata, "version">,
) => {
  metadataVersion += 1;
  latestMetadata.set(api, { ...metadata, version: metadataVersion });
};

export const getLatestServerListMetadata = (api: CrudHelpers) =>
  latestMetadata.get(api);
