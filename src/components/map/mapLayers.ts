import L from "leaflet";

/* ================= TYPES ================= */
export type MapLayerType = "osm" | "esri-satellite" | "esri-hybrid";

interface TileSource {
  url: string;
  attribution: string;
  maxNativeZoom: number;
  subdomains?: string;
}

export interface MapLayerDefinition {
  /** i18n key for the user-facing name. */
  labelKey: string;
  /** Shown until translations load. */
  fallbackLabel: string;
  /** Rendered bottom-up: imagery first, labels/reference on top. */
  sources: TileSource[];
}

/* ================= CONFIG ================= */
export const DEFAULT_MAP_LAYER: MapLayerType = "osm";
export const MAP_LAYER_STORAGE_KEY = "iwms.map_layer";
/** Fired on window so every open map follows the user's latest choice. */
export const MAP_LAYER_CHANGE_EVENT = "iwms:map-layer-change";

const MAP_MAX_ZOOM = 19;

const ESRI_IMAGERY: TileSource = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, Vantor, Earthstar Geographics",
  // Imagery past z18 is patchy outside cities; Leaflet upscales instead of
  // showing Esri's "Map data not yet available" tiles.
  maxNativeZoom: 18,
};

export const MAP_LAYERS: Record<MapLayerType, MapLayerDefinition> = {
  osm: {
    labelKey: "common.map_layers.osm",
    fallbackLabel: "OpenStreetMap",
    sources: [
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "&copy; OpenStreetMap contributors",
        maxNativeZoom: 19,
      },
    ],
  },
  "esri-satellite": {
    labelKey: "common.map_layers.satellite",
    fallbackLabel: "Satellite",
    sources: [ESRI_IMAGERY],
  },
  "esri-hybrid": {
    labelKey: "common.map_layers.hybrid",
    fallbackLabel: "Satellite + Labels",
    sources: [
      ESRI_IMAGERY,
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: "Labels &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
        maxNativeZoom: 18,
      },
    ],
  },
};

export const MAP_LAYER_ORDER: MapLayerType[] = ["osm", "esri-satellite", "esri-hybrid"];

/* ================= PERSISTENCE ================= */
export const isMapLayerType = (value: unknown): value is MapLayerType =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(MAP_LAYERS, value);

export const readStoredMapLayer = (): MapLayerType => {
  try {
    const stored = localStorage.getItem(MAP_LAYER_STORAGE_KEY);
    return isMapLayerType(stored) ? stored : DEFAULT_MAP_LAYER;
  } catch {
    return DEFAULT_MAP_LAYER;
  }
};

export const storeMapLayer = (type: MapLayerType) => {
  try {
    localStorage.setItem(MAP_LAYER_STORAGE_KEY, type);
  } catch {
    // Storage blocked (private mode / quota) — selection still applies for this session.
  }
};

/* ================= LAYER FACTORY ================= */
/**
 * Builds the base layer as a group so hybrid (imagery + labels) swaps in and
 * out as one unit. Tiles stay in Leaflet's tilePane, so operational layers
 * (markers, routes, geofences) in the overlay/marker panes are never touched.
 */
export const createBaseLayer = (type: MapLayerType): L.LayerGroup<L.TileLayer> =>
  L.layerGroup(
    MAP_LAYERS[type].sources.map((source, index) =>
      L.tileLayer(source.url, {
        attribution: source.attribution,
        maxNativeZoom: source.maxNativeZoom,
        maxZoom: MAP_MAX_ZOOM,
        subdomains: source.subdomains ?? "abc",
        zIndex: index + 1,
      }),
    ),
  );
