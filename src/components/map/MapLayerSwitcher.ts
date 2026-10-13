import L from "leaflet";
import i18n from "@/i18n";
import {
  MAP_LAYERS,
  MAP_LAYER_CHANGE_EVENT,
  MAP_LAYER_ORDER,
  createBaseLayer,
  isMapLayerType,
  readStoredMapLayer,
  storeMapLayer,
  type MapLayerType,
} from "./mapLayers";

/*
 * Base-map switcher for the app's imperative Leaflet maps.
 *
 * Owns only the background tile layer: switching removes one tile group and
 * adds another, so markers, routes, geofences and their popups (and the React
 * state/API data behind them) are untouched. Each base layer is created once
 * per map and reused on later switches.
 */

const LAYERS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`;

const PREVIEW_CLASS: Record<MapLayerType, string> = {
  osm: "bg-gradient-to-br from-emerald-100 via-amber-50 to-sky-200",
  "esri-satellite": "bg-gradient-to-br from-green-800 via-stone-600 to-emerald-900",
  "esri-hybrid": "bg-gradient-to-br from-green-800 via-stone-600 to-emerald-900 ring-1 ring-inset ring-white/70",
};

/** Consecutive tile failures (with no successful load) before warning the user. */
const TILE_ERROR_THRESHOLD = 4;

const translate = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });

export interface MapLayerSwitcherOptions extends L.ControlOptions {
  /** Overrides the persisted choice, e.g. for a map that must open on satellite. */
  initialLayer?: MapLayerType;
}

export class MapLayerSwitcherControl extends L.Control {
  private activeType: MapLayerType;
  private readonly baseLayers = new Map<MapLayerType, L.LayerGroup<L.TileLayer>>();
  private map: L.Map | null = null;
  private root: HTMLElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private toggleLabel: HTMLSpanElement | null = null;
  private warningDot: HTMLSpanElement | null = null;
  private panel: HTMLDivElement | null = null;
  private panelTitle: HTMLParagraphElement | null = null;
  private warningText: HTMLParagraphElement | null = null;
  private readonly optionButtons = new Map<MapLayerType, HTMLButtonElement>();
  private isOpen = false;
  private tileErrors = 0;

  constructor(options: MapLayerSwitcherOptions = {}) {
    super({ position: "topright", ...options });
    this.activeType = options.initialLayer ?? readStoredMapLayer();
  }

  getActiveLayer(): MapLayerType {
    return this.activeType;
  }

  /** Switches the background, persists the choice and syncs other open maps. */
  setActiveLayer(type: MapLayerType) {
    if (type === this.activeType) return;
    this.applyLayer(type);
    storeMapLayer(type);
    window.dispatchEvent(new CustomEvent<MapLayerType>(MAP_LAYER_CHANGE_EVENT, { detail: type }));
  }

  onAdd(map: L.Map): HTMLElement {
    this.map = map;
    this.root = this.buildDom();
    this.applyLayer(this.activeType, true);
    this.renderLabels();

    window.addEventListener(MAP_LAYER_CHANGE_EVENT, this.handleExternalChange);
    document.addEventListener("pointerdown", this.handleDocumentPointerDown);
    document.addEventListener("keydown", this.handleKeyDown);
    i18n.on("languageChanged", this.renderLabels);
    i18n.on("added", this.renderLabels);
    map.on("click", this.close);
    // map.remove() never calls control.onRemove — "unload" is the only hook.
    map.once("unload", this.detach);

    return this.root;
  }

  onRemove() {
    this.detach();
  }

  /* ================= LAYER SWITCH ================= */
  private getBaseLayer(type: MapLayerType) {
    let layer = this.baseLayers.get(type);
    if (!layer) {
      layer = createBaseLayer(type);
      layer.eachLayer((tile) => {
        tile.on("tileload", this.handleTileLoad);
        tile.on("tileerror", this.handleTileError);
      });
      this.baseLayers.set(type, layer);
    }
    return layer;
  }

  private applyLayer(type: MapLayerType, force = false) {
    const map = this.map;
    if (!map || (!force && type === this.activeType && map.hasLayer(this.getBaseLayer(type)))) return;

    const previous = this.baseLayers.get(this.activeType);
    const next = this.getBaseLayer(type);
    if (previous && previous !== next && map.hasLayer(previous)) map.removeLayer(previous);
    if (!map.hasLayer(next)) next.addTo(map);

    this.activeType = type;
    this.setTileWarning(false);
    this.renderSelection();
  }

  /* ================= TILE ERRORS ================= */
  private readonly handleTileLoad = () => {
    if (this.tileErrors) this.setTileWarning(false);
  };

  private readonly handleTileError = (event: L.TileErrorEvent) => {
    // Ignore late errors from a layer the user already switched away from.
    const active = this.baseLayers.get(this.activeType);
    if (!active?.hasLayer(event.target as L.TileLayer)) return;
    this.tileErrors += 1;
    if (this.tileErrors === TILE_ERROR_THRESHOLD) this.setTileWarning(true);
  };

  private setTileWarning(visible: boolean) {
    if (!visible) this.tileErrors = 0;
    this.warningDot?.classList.toggle("hidden", !visible);
    this.warningText?.classList.toggle("hidden", !visible);
  }

  /* ================= DOM ================= */
  private buildDom() {
    const root = L.DomUtil.create("div", "leaflet-control iwms-map-layer-switcher relative");
    L.DomEvent.disableClickPropagation(root);
    L.DomEvent.disableScrollPropagation(root);

    const toggle = L.DomUtil.create(
      "button",
      "relative flex h-[34px] min-w-[34px] items-center justify-center gap-2 rounded-md border border-border bg-card px-2 text-xs font-semibold text-card-foreground shadow-md transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      root,
    );
    toggle.type = "button";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = LAYERS_ICON;
    this.toggleLabel = L.DomUtil.create("span", "hidden whitespace-nowrap md:inline", toggle);
    this.warningDot = L.DomUtil.create(
      "span",
      "absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full border-2 border-card bg-amber-500",
      toggle,
    );
    toggle.addEventListener("click", () => (this.isOpen ? this.close() : this.openPanel()));
    this.toggleButton = toggle;

    // Open away from the map edge the control is docked to.
    const position = this.getPosition();
    const vertical = position.startsWith("bottom") ? "bottom-full mb-1.5" : "top-full mt-1.5";
    const horizontal = position.endsWith("left") ? "left-0" : "right-0";
    const panel = L.DomUtil.create(
      "div",
      `absolute ${horizontal} ${vertical} z-[1001] hidden w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl`,
      root,
    );
    panel.setAttribute("role", "radiogroup");
    this.panelTitle = L.DomUtil.create(
      "p",
      "border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
      panel,
    );
    const list = L.DomUtil.create("div", "flex flex-col gap-0.5 p-1", panel);

    MAP_LAYER_ORDER.forEach((type) => {
      const option = L.DomUtil.create(
        "button",
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        list,
      );
      option.type = "button";
      option.setAttribute("role", "radio");
      option.dataset.layer = type;
      L.DomUtil.create("span", `h-7 w-9 shrink-0 rounded border border-border ${PREVIEW_CLASS[type]}`, option);
      L.DomUtil.create("span", "flex-1 font-medium", option);
      const radio = L.DomUtil.create(
        "span",
        "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/60",
        option,
      );
      L.DomUtil.create("span", "h-1.5 w-1.5 rounded-full bg-primary-foreground", radio);
      option.addEventListener("click", () => {
        this.setActiveLayer(type);
        this.close();
      });
      this.optionButtons.set(type, option);
    });

    this.warningText = L.DomUtil.create(
      "p",
      "hidden border-t border-border px-3 py-2 text-[11px] leading-snug text-amber-600 dark:text-amber-400",
      panel,
    );
    this.panel = panel;
    return root;
  }

  private renderSelection() {
    this.optionButtons.forEach((button, type) => {
      const active = type === this.activeType;
      button.setAttribute("aria-checked", String(active));
      button.classList.toggle("bg-primary/10", active);
      button.classList.toggle("text-primary", active);
      button.classList.toggle("dark:text-card-foreground", active);
      const radio = button.lastElementChild as HTMLElement | null;
      radio?.classList.toggle("border-primary", active);
      radio?.classList.toggle("bg-primary", active);
      radio?.classList.toggle("border-muted-foreground/60", !active);
      (radio?.firstElementChild as HTMLElement | null)?.classList.toggle("invisible", !active);
    });
    this.renderLabels();
  }

  private readonly renderLabels = () => {
    const title = translate("common.map_layers.title", "Map Layers");
    const activeDef = MAP_LAYERS[this.activeType];
    const activeLabel = translate(activeDef.labelKey, activeDef.fallbackLabel);
    if (this.toggleLabel) this.toggleLabel.textContent = title;
    if (this.toggleButton) {
      const tooltip = `${title}: ${activeLabel}`;
      this.toggleButton.title = tooltip;
      this.toggleButton.setAttribute("aria-label", tooltip);
    }
    if (this.panelTitle) this.panelTitle.textContent = title;
    if (this.panel) this.panel.setAttribute("aria-label", title);
    if (this.warningText) {
      this.warningText.textContent = translate(
        "common.map_layers.tile_error",
        "Some map tiles could not be loaded. Check your connection or try another layer.",
      );
    }
    this.optionButtons.forEach((button, type) => {
      const def = MAP_LAYERS[type];
      const label = button.children[1];
      if (label) label.textContent = translate(def.labelKey, def.fallbackLabel);
    });
  };

  /* ================= OPEN / CLOSE ================= */
  private openPanel() {
    this.isOpen = true;
    this.panel?.classList.remove("hidden");
    this.toggleButton?.setAttribute("aria-expanded", "true");
  }

  private readonly close = () => {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel?.classList.add("hidden");
    this.toggleButton?.setAttribute("aria-expanded", "false");
  };

  private readonly handleDocumentPointerDown = (event: PointerEvent) => {
    if (this.isOpen && this.root && !this.root.contains(event.target as Node)) this.close();
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !this.isOpen) return;
    this.close();
    this.toggleButton?.focus();
  };

  private readonly handleExternalChange = (event: Event) => {
    const type = (event as CustomEvent<unknown>).detail;
    if (isMapLayerType(type)) this.applyLayer(type);
  };

  private readonly detach = () => {
    window.removeEventListener(MAP_LAYER_CHANGE_EVENT, this.handleExternalChange);
    document.removeEventListener("pointerdown", this.handleDocumentPointerDown);
    document.removeEventListener("keydown", this.handleKeyDown);
    i18n.off("languageChanged", this.renderLabels);
    i18n.off("added", this.renderLabels);
    if (this.map) {
      this.map.off("click", this.close);
      this.map.off("unload", this.detach);
      this.baseLayers.forEach((layer) => this.map?.removeLayer(layer));
    }
    this.map = null;
  };
}

/**
 * Adds the persisted base map plus the layer switcher to a map. Replaces the
 * old per-page `L.tileLayer(osm).addTo(map)` call.
 */
export const addMapLayerSwitcher = (map: L.Map, options?: MapLayerSwitcherOptions) =>
  new MapLayerSwitcherControl(options).addTo(map);
