import { jsPDF } from "jspdf";

import type { Customer } from "./types";
import { loadQrImage, safeFilename, text } from "./customerQrPdf";

/**
 * A4 QR sticker sheet for door-to-door waste collection — 6 laminated
 * portrait stickers per page (3 columns x 2 rows), each 60.5 x 127.3 mm.
 *
 * The layout follows the civic door-plate convention used by municipal waste
 * programmes: everything is centred on a single axis and read top-down while
 * standing at the door —
 *
 * - the project emblem and the operator mark sit on the top row;
 * - the project (local body) and its tagline identify the programme;
 * - the ward headline is the largest text, so a crew confirms the round;
 * - area and house number share one line, narrowing it to the door;
 * - the QR runs edge to edge inside the padding for the largest scan target;
 * - the project's own emblem heads the card, uploaded per project.
 *
 * A heavy navy keyline (rather than a hairline) survives the lamination trim.
 */

// Canvas render surface: A4 at ~150 DPI, which keeps the QR modules crisp
// without producing an unreasonably large PDF payload.
export const SHEET_WIDTH = 1240;
export const SHEET_HEIGHT = 1754;

export const COLUMNS = 2;
export const ROWS = 2;
export const STICKERS_PER_PAGE = COLUMNS * ROWS;

// Outer page margin and the gutter between neighbouring cards.
export const MARGIN_X = 88;
export const MARGIN_Y = 116;
export const GUTTER_X = 48;
export const GUTTER_Y = 44;

export const CARD_WIDTH = (SHEET_WIDTH - MARGIN_X * 2 - GUTTER_X * (COLUMNS - 1)) / COLUMNS;
export const CARD_HEIGHT = (SHEET_HEIGHT - MARGIN_Y * 2 - GUTTER_Y * (ROWS - 1)) / ROWS;

export const FOOTER_HEIGHT = 40;
export const CARD_RADIUS = 14;
export const CARD_PADDING = 36;

/** Programme description printed under the local-body name. */
export const BRAND_NAVY = "#123a63";
export const INK = "#0f172a";
export const MUTED = "#5b6b7d";
export const HAIRLINE = "#c8d3de";

const COMPANY_LOGO_URL = "/logos/bpLogo.png";

export type LoadedLogos = {
  company: HTMLImageElement | null;
};

/**
 * Loads a logo without tainting the canvas.
 *
 * Assigning a cross-origin URL straight to `image.src` marks the canvas as
 * tainted, and `toDataURL` then throws — which kills the whole PDF export.
 * Project emblems are served from the API origin, so they hit exactly that.
 * Fetching to a blob URL keeps the image same-origin; a `crossOrigin` retry
 * covers servers that send CORS headers but block the plain fetch.
 */
export const loadLogo = async (source: string): Promise<HTMLImageElement | null> => {
  const decodeFrom = async (src: string, useCors: boolean) => {
    const image = new Image();
    if (useCors) image.crossOrigin = "anonymous";
    image.src = src;
    await image.decode();
    return image;
  };

  try {
    const response = await fetch(source, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      return await decodeFrom(objectUrl, false);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Fall back to a CORS-attributed element; if that also fails the sheet
    // simply renders without the mark rather than failing the export.
    try {
      return await decodeFrom(source, true);
    } catch {
      return null;
    }
  }
};

export const loadLogos = async (): Promise<LoadedLogos> => ({
  company: await loadLogo(COMPANY_LOGO_URL),
});

/**
 * Project emblems are uploaded per project, so a mixed sheet needs several.
 * Each URL is fetched once and reused across every sticker that shares it.
 */
export const createProjectLogoLoader = () => {
  const cache = new Map<string, Promise<HTMLImageElement | null>>();
  return (source?: string | null): Promise<HTMLImageElement | null> => {
    const url = (source ?? "").trim();
    if (!url) return Promise.resolve(null);
    let pending = cache.get(url);
    if (!pending) {
      pending = loadLogo(url);
      cache.set(url, pending);
    }
    return pending;
  };
};

/**
 * Pre-loads every QR image in bounded-concurrency batches.
 *
 * drawSticker used to await its own `loadQrImage` mid-draw, so a 48-sticker
 * sheet performed 48 serial image fetches *after* the customer reads had
 * already finished — the export looked hung for a long time on big trips.
 * Warming a cache first means the draw loop is synchronous per card.
 */
const prefetchQrImages = async (
  customers: Customer[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, HTMLImageElement>> => {
  const sources = [
    ...new Set(customers.map((customer) => customer.qr_code).filter(Boolean)),
  ] as string[];
  const cache = new Map<string, HTMLImageElement>();
  const CONCURRENCY = 8;
  let done = 0;

  for (let start = 0; start < sources.length; start += CONCURRENCY) {
    const batch = sources.slice(start, start + CONCURRENCY);
    await Promise.all(
      batch.map(async (source) => {
        try {
          cache.set(source, await loadQrImage(source));
        } catch {
          // Leave it out of the cache; the card renders "QR unavailable".
        } finally {
          done += 1;
          onProgress?.(done, sources.length);
        }
      }),
    );
  }
  return cache;
};

/** Draws an image scaled to *fit* inside the box, centred, preserving aspect. */
export const drawContainedImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number,
) => {
  const scale = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(
    image,
    boxX + (boxWidth - width) / 2,
    boxY + (boxHeight - height) / 2,
    width,
    height,
  );
};

export const roundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

/** Shrinks the font until the single-line label fits, then clips if still long. */
export const fitSingleLine = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  weight: string,
  maxSize: number,
  minSize: number,
): number => {
  let size = maxSize;
  while (size > minSize) {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) return size;
    size -= 1;
  }
  context.font = `${weight} ${minSize}px Arial, sans-serif`;
  return minSize;
};

/**
 * Fits a label by wrapping rather than shrinking to nothing: tries the largest
 * size that holds on one line, then allows a second line before giving up.
 * A long project name would otherwise hit the minimum size and still be
 * ellipsized, which is how "Blue Planet's Integrated Waste Managemen…" happened.
 */
export const fitWrappedLines = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  weight: string,
  maxSize: number,
  minSize: number,
  maxLines = 2,
): { size: number; lines: string[] } => {
  const wrapAt = (size: number): string[] => {
    context.font = `${weight} ${size}px Arial, sans-serif`;
    const words = value.split(/\s+/).filter(Boolean);
    const widthOf = (parts: string[]): number =>
      context.measureText(parts.join(" ")).width;

    // Balanced split: when the whole label needs two lines, break at the word
    // that keeps both halves closest in width instead of greedily filling the
    // first line. "Blue Planet Integrated Waste Management" then reads as
    // "Blue Planet Integrated" / "Waste Management" rather than orphaning
    // "Management" on its own line.
    if (words.length > 1 && widthOf(words) > maxWidth) {
      let bestAt = -1;
      let bestDelta = Infinity;
      for (let split = 1; split < words.length; split += 1) {
        const first = widthOf(words.slice(0, split));
        const second = widthOf(words.slice(split));
        if (first > maxWidth || second > maxWidth) continue;
        const delta = Math.abs(first - second);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestAt = split;
        }
      }
      if (bestAt > 0) {
        return [words.slice(0, bestAt).join(" "), words.slice(bestAt).join(" ")];
      }
    }

    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Prefer one big line; only drop to two lines once the size is reasonable,
  // so a short name never wraps just because it could.
  const twoLineCeiling = Math.round(maxSize * 0.84);
  for (let size = maxSize; size >= minSize; size -= 1) {
    const lines = wrapAt(size);
    if (lines.length === 1) return { size, lines };
    if (lines.length <= maxLines && size <= twoLineCeiling) return { size, lines };
  }

  context.font = `${weight} ${minSize}px Arial, sans-serif`;
  return { size: minSize, lines: wrapAt(minSize).slice(0, maxLines) };
};

export const ellipsize = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string => {
  if (context.measureText(value).width <= maxWidth) return value;
  let truncated = value;
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trimEnd()}…`;
};

/** Crop marks at the four corners of a card, drawn just outside its bounds. */
export const drawCropMarks = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const length = 16;
  const offset = 9;
  context.strokeStyle = "#dbe2ea";
  context.lineWidth = 1;
  context.beginPath();
  const corners: Array<[number, number, number, number]> = [
    [x - offset, y, -1, 0],
    [x, y - offset, 0, -1],
    [x + width + offset, y, 1, 0],
    [x + width, y - offset, 0, -1],
    [x - offset, y + height, -1, 0],
    [x, y + height + offset, 0, 1],
    [x + width + offset, y + height, 1, 0],
    [x + width, y + height + offset, 0, 1],
  ];
  for (const [startX, startY, directionX, directionY] of corners) {
    context.moveTo(startX, startY);
    context.lineTo(startX + directionX * length, startY + directionY * length);
  }
  context.stroke();
};


/**
 * Which company / project the sheet was generated for. Both are optional so an
 * "All Companies / All Projects" export still produces a valid sheet.
 */
export type StickerScope = {
  companyName?: string | null;
  projectName?: string | null;
  /** Reports QR-image prefetch progress so a caller can show "12 / 48". */
  onProgress?: (done: number, total: number) => void;
};

/**
 * Falls back to the customers themselves when the caller has no explicit
 * selection: if every row shares one company (or project), that name is the
 * scope; a mixed set reads as "All".
 */
type ResolvedScope = {
  companyName: string;
  projectName: string;
  /** True when the sheet mixes several companies (an "All Companies" export). */
  isMultiCompany: boolean;
  /** e.g. "Blue Planet 12 · Zigma 8" — only meaningful when mixed. */
  breakdown: string;
};

const resolveScope = (customers: Customer[], scope?: StickerScope): ResolvedScope => {
  const distinct = (pick: (customer: Customer) => string | null | undefined): string => {
    const names = new Set(
      customers
        .map((customer) => (pick(customer) ?? "").trim())
        .filter(Boolean),
    );
    if (names.size === 1) return [...names][0];
    return "";
  };

  // Count per company so a mixed export can show what it actually contains.
  const perCompany = new Map<string, number>();
  for (const customer of customers) {
    const name = (customer.company_name ?? "").trim() || "Unassigned";
    perCompany.set(name, (perCompany.get(name) ?? 0) + 1);
  }

  const companyName =
    (scope?.companyName ?? "").trim() ||
    distinct((customer) => customer.company_name) ||
    "All Companies";

  const isMultiCompany = perCompany.size > 1;

  return {
    companyName,
    projectName:
      (scope?.projectName ?? "").trim() || distinct((customer) => customer.project_name) || "All Projects",
    isMultiCompany,
    breakdown: [...perCompany.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => `${name} ${count}`)
      .join("  ·  "),
  };
};

/**
 * Groups rows by company then project so a mixed "All Companies" export prints
 * as contiguous runs per company instead of interleaving them across sheets.
 */
const groupByCompanyThenProject = (customers: Customer[]): Customer[] =>
  [...customers].sort((a, b) => {
    const byCompany = (a.company_name ?? "").localeCompare(b.company_name ?? "");
    if (byCompany !== 0) return byCompany;
    const byProject = (a.project_name ?? "").localeCompare(b.project_name ?? "");
    if (byProject !== 0) return byProject;
    return (a.customer_name ?? "").localeCompare(b.customer_name ?? "");
  });

/** Unit / house designation — "Flat No: 301", "No. 47", etc. */
const stickerUnit = (customer: Customer): string => {
  const flat = [customer.block_no, customer.flat_no]
    .map((part) => (part ? String(part).trim() : ""))
    .filter(Boolean)
    .join("-");
  if (flat) return `Flat No: ${flat}`;

  const villa = (customer.villa_no ?? "").trim();
  if (villa) return `No. ${villa}`;

  const building = (customer.building_no ?? "").trim();
  if (building) return `No. ${building}`;

  return text(customer.customer_id || customer.unique_id);
};

/** Building / society line shown above the unit. */
const stickerBuilding = (customer: Customer): string =>
  // Deliberately excludes sub_property_name: that holds the property *type*
  // ("Individual House", "Apartment"), which is noise on a door sticker.
  (customer.apartment_name ?? "").trim() ||
  (customer.industry_name ?? "").trim() ||
  (customer.area ?? "").trim() ||
  (customer.street ?? "").trim();

/**
 * Zone + ward headline on one line, e.g. "Zone 2 · GNO (Ward No 18)".
 *
 * A crew standing at the door needs both: the zone narrows the round and the
 * ward pins the street. Either half may be missing, in which case whichever is
 * present stands alone rather than leaving a dangling separator.
 */
const stickerWardHeadline = (customer: Customer): string => {
  const ward = (customer.ward_name ?? "").trim();
  const zone = (customer.zone_name ?? "").trim();

  // "GNO Ward 1" → "GNO (Ward No 1)"
  let wardLabel = ward;
  const match = ward.match(/^(.*?)\s*ward\s*(?:no\.?\s*)?(\S+)$/i);
  if (match) {
    const prefix = match[1].trim();
    const number = match[2];
    wardLabel = prefix ? `${prefix} (Ward No ${number})` : `Ward No ${number}`;
  }

  // Skip a zone that the ward label already names, so a ward carrying its
  // local-body acronym does not read as "GNO · GNO (Ward No 1)".
  const zoneIsRedundant =
    Boolean(zone) &&
    wardLabel.toLowerCase().includes(zone.toLowerCase());

  return [zoneIsRedundant ? "" : zone, wardLabel].filter(Boolean).join(" · ");
};

const drawSticker = async (
  context: CanvasRenderingContext2D,
  customer: Customer,
  logos: LoadedLogos,
  cardX: number,
  cardY: number,
  showCompany = false,
  projectName = "",
  projectLogo: HTMLImageElement | null = null,
  qrCache?: Map<string, HTMLImageElement>,
) => {
  drawCropMarks(context, cardX, cardY, CARD_WIDTH, CARD_HEIGHT);

  // ── Card body: a heavy keyline, not a hairline, so the edge survives the
  // lamination trim and still reads once the sticker is on a door. ──
  context.save();
  roundedRectPath(context, cardX, cardY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = BRAND_NAVY;
  context.lineWidth = 4;
  context.stroke();
  context.clip();

  const centre = cardX + CARD_WIDTH / 2;
  const innerWidth = CARD_WIDTH - CARD_PADDING * 2;
  let y = cardY + CARD_PADDING;

  // ── Top row: project emblem (left) and the operator mark (right) ──
  context.textAlign = "center";
  context.textBaseline = "top";

  // Top row: the project's own emblem on the left, operator mark on the right.
  // Both are given the full band height; drawContainedImage preserves each
  // logo's aspect ratio, so the wide operator mark simply centres within it.
  const emblemBox = 76;
  const companyLogoWidth = 250;
  if (projectLogo) {
    drawContainedImage(context, projectLogo, cardX + CARD_PADDING, y, emblemBox, emblemBox);
  }
  if (logos.company) {
    drawContainedImage(
      context,
      logos.company,
      cardX + CARD_WIDTH - CARD_PADDING - companyLogoWidth,
      y,
      companyLogoWidth,
      emblemBox,
    );
  }
  y += emblemBox + 18;

  // ── Local body / project ──
  context.textAlign = "center";
  context.textBaseline = "top";

  const project = (projectName || customer.project_name || "").trim();
  if (project) {
    const { size, lines } = fitWrappedLines(context, project, innerWidth, "700", 36, 18);
    context.font = `700 ${size}px Arial, sans-serif`;
    context.fillStyle = BRAND_NAVY;
    for (const line of lines) {
      context.fillText(ellipsize(context, line, innerWidth), centre, y);
      y += size + 4;
    }
    y += 4;
  }

  context.font = "17px Arial, sans-serif";
  context.fillStyle = MUTED;

  context.strokeStyle = HAIRLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(cardX + CARD_PADDING + 14, y);
  context.lineTo(cardX + CARD_WIDTH - CARD_PADDING - 14, y);
  context.stroke();
  y += 16;

  // ── Ward headline: the largest text on the card ──
  const ward = stickerWardHeadline(customer);
  if (ward) {
    const size = fitSingleLine(context, ward, innerWidth, "700", 26, 15);
    context.font = `700 ${size}px Arial, sans-serif`;
    context.fillStyle = INK;
    context.fillText(ellipsize(context, ward, innerWidth), centre, y);
    y += size + 14;
  }

  // ── Area and house number, together on one line ──
  const addressLine = [stickerBuilding(customer), stickerUnit(customer)]
    .filter(Boolean)
    .join(" · ");
  const addressSize = fitSingleLine(context, addressLine, innerWidth, "700", 22, 12);
  context.font = `700 ${addressSize}px Arial, sans-serif`;
  context.fillStyle = BRAND_NAVY;
  context.fillText(ellipsize(context, addressLine, innerWidth), centre, y);
  y += addressSize + 16;

  // ── QR: takes every pixel left between the details and the footer ──
  const footerTop = cardY + CARD_HEIGHT - FOOTER_HEIGHT;
  const captionHeight = 26;
  // With no corner brackets the symbol only needs its printed quiet zone, so
  // the code itself can take the full width between the card's padding.
  const quietZone = 6;
  const zoneHeight = footerTop - y;
  const qrSize = Math.min(
    zoneHeight - captionHeight - quietZone * 2,
    innerWidth - quietZone * 2,
  );
  const blockHeight = qrSize + quietZone * 2 + captionHeight;
  const qrY = y + (zoneHeight - blockHeight) / 2 + quietZone;
  const qrX = centre - qrSize / 2;

  if (customer.qr_code) {
    try {
      const qrImage =
        qrCache?.get(customer.qr_code) ?? (await loadQrImage(customer.qr_code));
      // Nearest-neighbour keeps the QR modules square-edged when scaled.
      context.imageSmoothingEnabled = false;
      context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      context.imageSmoothingEnabled = true;
    } catch {
      context.textBaseline = "middle";
      context.fillStyle = MUTED;
      context.font = "14px Arial, sans-serif";
      context.fillText("QR unavailable", centre, qrY + qrSize / 2);
      context.textBaseline = "top";
    }
  } else {
    context.textBaseline = "middle";
    context.fillStyle = MUTED;
    context.font = "14px Arial, sans-serif";
    context.fillText("No QR", centre, qrY + qrSize / 2);
    context.textBaseline = "top";
  }

  const identifier = text(customer.customer_id || customer.unique_id);
  context.font = "600 14px 'Courier New', Courier, monospace";
  context.fillStyle = MUTED;
  context.fillText(
    ellipsize(context, identifier, innerWidth),
    centre,
    qrY + qrSize + quietZone + 14,
  );

  // ── Footer: only used to name the owning company on a mixed sheet ──
  // The divider is drawn with the label, never on its own — a bare rule under
  // the customer id reads as a stray line on a single-company sheet.
  if (showCompany) {
    context.strokeStyle = HAIRLINE;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cardX + CARD_PADDING, footerTop);
    context.lineTo(cardX + CARD_WIDTH - CARD_PADDING, footerTop);
    context.stroke();

    const owner = ((customer.company_name ?? "").trim() || "Unassigned").toUpperCase();
    const size = fitSingleLine(context, owner, innerWidth, "700", 14, 9);
    context.font = `700 ${size}px Arial, sans-serif`;
    context.fillStyle = BRAND_NAVY;
    context.fillText(ellipsize(context, owner, innerWidth), centre, footerTop + 16);
  }

  context.restore();
};

const drawSheetHeader = (
  context: CanvasRenderingContext2D,
  scope: ResolvedScope,
  total: number,
) => {
  const baseline = MARGIN_Y - 30;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = BRAND_NAVY;
  context.font = "700 25px Arial, sans-serif";
  context.fillText(scope.companyName, MARGIN_X, baseline);

  const companyWidth = context.measureText(scope.companyName).width;
  context.fillStyle = MUTED;
  context.font = "20px Arial, sans-serif";
  const secondary = scope.isMultiCompany
    ? `  ·  ${scope.breakdown}`
    : `  ·  ${scope.projectName}`;
  context.fillText(secondary, MARGIN_X + companyWidth, baseline);

  context.textAlign = "right";
  context.fillStyle = MUTED;
  context.font = "17px Arial, sans-serif";
  context.fillText(
    `${total} ${total === 1 ? "sticker" : "stickers"}`,
    SHEET_WIDTH - MARGIN_X,
    baseline,
  );

  context.strokeStyle = HAIRLINE;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(MARGIN_X, MARGIN_Y - 18);
  context.lineTo(SHEET_WIDTH - MARGIN_X, MARGIN_Y - 18);
  context.stroke();
};

const drawSheetFooter = (
  context: CanvasRenderingContext2D,
  scope: ResolvedScope,
  pageNumber: number,
  pageCount: number,
) => {
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#94a3b8";
  context.font = "15px Arial, sans-serif";
  context.fillText(
    `${scope.companyName} · ${scope.projectName} · Generated ${new Date().toLocaleString("en-IN")}`,
    MARGIN_X,
    SHEET_HEIGHT - 34,
  );
  context.textAlign = "right";
  context.fillText(`Page ${pageNumber} of ${pageCount}`, SHEET_WIDTH - MARGIN_X, SHEET_HEIGHT - 34);
};

const createCustomerQrStickerPdf = async (
  customers: Customer[],
  scope?: StickerScope,
): Promise<jsPDF> => {
  if (customers.length === 0) throw new Error("No customers to export.");

  const resolvedScope = resolveScope(customers, scope);
  // Keep each company's stickers together on the sheet.
  const orderedCustomers = resolvedScope.isMultiCompany
    ? groupByCompanyThenProject(customers)
    : customers;

  const canvas = document.createElement("canvas");
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF generation is not supported in this browser.");

  const logos = await loadLogos();
  const loadProjectLogo = createProjectLogoLoader();
  // Warm every QR image up front, in parallel, so the draw loop below never
  // blocks on a network fetch per card.
  const qrCache = await prefetchQrImages(orderedCustomers, scope?.onProgress);
  const documentPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageCount = Math.ceil(customers.length / STICKERS_PER_PAGE);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

    drawSheetHeader(context, resolvedScope, customers.length);

    const pageCustomers = orderedCustomers.slice(
      pageIndex * STICKERS_PER_PAGE,
      (pageIndex + 1) * STICKERS_PER_PAGE,
    );

    for (let slot = 0; slot < pageCustomers.length; slot += 1) {
      const column = slot % COLUMNS;
      const row = Math.floor(slot / COLUMNS);
      const pageCustomer = pageCustomers[slot];
      await drawSticker(
        context,
        pageCustomer,
        logos,
        MARGIN_X + column * (CARD_WIDTH + GUTTER_X),
        MARGIN_Y + row * (CARD_HEIGHT + GUTTER_Y),
        resolvedScope.isMultiCompany,
        // Prefer the row's own project so a mixed export still labels each
        // sticker correctly; fall back to the sheet-level selection.
        (pageCustomer.project_name ?? "").trim() ||
          (resolvedScope.projectName === "All Projects" ? "" : resolvedScope.projectName),
        await loadProjectLogo(pageCustomer.project_logo),
        qrCache,
      );
    }

    drawSheetFooter(context, resolvedScope, pageIndex + 1, pageCount);

    if (pageIndex > 0) documentPdf.addPage();
    documentPdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  }

  return documentPdf;
};

export const createCustomerQrStickerPdfBlob = async (
  customers: Customer[],
  scope?: StickerScope,
): Promise<Blob> => {
  const documentPdf = await createCustomerQrStickerPdf(customers, scope);
  return documentPdf.output("blob");
};

export const downloadCustomerQrStickerPdf = async (
  customers: Customer[],
  scope?: StickerScope,
): Promise<void> => {
  const documentPdf = await createCustomerQrStickerPdf(customers, scope);
  const resolvedScope = resolveScope(customers, scope);

  // Name the file after the selection so sheets for different projects do not
  // overwrite each other in the downloads folder.
  const parts = [
    "customer_qr_stickers",
    safeFilename(resolvedScope.companyName),
    resolvedScope.isMultiCompany ? "" : safeFilename(resolvedScope.projectName),
    customers.length === 1
      ? safeFilename(customers[0].customer_name)
      : `${customers.length}_customers`,
  ].filter(Boolean);
  documentPdf.save(`${parts.join("_")}.pdf`);
};
