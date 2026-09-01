import { jsPDF } from "jspdf";
import QRCode from "qr.js/lib/QRCode";
import ErrorCorrectLevel from "qr.js/lib/ErrorCorrectLevel";

import {
  BRAND_NAVY,
  CARD_HEIGHT,
  CARD_PADDING,
  CARD_RADIUS,
  CARD_WIDTH,
  COLUMNS,
  FOOTER_HEIGHT,
  GUTTER_X,
  GUTTER_Y,
  HAIRLINE,
  INK,
  MARGIN_X,
  MARGIN_Y,
  MUTED,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  STICKERS_PER_PAGE,
  drawContainedImage,
  drawCropMarks,
  ellipsize,
  fitSingleLine,
  fitWrappedLines,
  loadLogos,
  roundedRectPath,
  type LoadedLogos,
} from "@/pages/admin/modules/masters/customerMasters/customerCreations/customerQrStickerPdf";

/**
 * A4 QR sticker sheet for secondary bins.
 *
 * Intentionally the *same* sticker as the customer sheet — same grid, card
 * geometry, logos, keyline, crop marks and footer — so a laminated bin plate
 * matches a laminated door plate. The layout constants and drawing primitives
 * are imported from customerQrStickerPdf rather than copied, so the two sheets
 * cannot drift apart.
 *
 * Only the three text slots carry bin data instead of customer data:
 *   project name  ->  project name (unchanged)
 *   ward headline ->  bin name
 *   address line  ->  collection point
 *   caption       ->  bin unique_id
 *
 * The QR is encoded locally rather than fetched: Bin.bin_qr stores an image of
 * exactly `{"id":"<unique_id>"}` (see app/utils/bin_qr.py), so re-encoding
 * gives an identical symbol with no network round-trip and no tainted canvas.
 */

export const BINS_PER_PAGE = STICKERS_PER_PAGE;

export type BinQrEntry = {
  unique_id: string;
  bin_name?: string | null;
  cp_name?: string | null;
  sequence?: number | null;
};

export type BinSheetScope = {
  companyName?: string | null;
  projectName?: string | null;
  tripCode?: string | null;
  tripDate?: string | null;
};

const text = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const safeFilename = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");

/** Draws the QR straight onto the canvas, matching utils/exportPdf's encoder. */
const drawQrOnCanvas = (
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
) => {
  const qr = new QRCode(-1, ErrorCorrectLevel.M);
  qr.addData(value);
  qr.make();
  const modules: boolean[][] = qr.modules;
  const cell = size / modules.length;

  context.fillStyle = "#ffffff";
  context.fillRect(x, y, size, size);
  context.fillStyle = "#000000";
  modules.forEach((row, rowIndex) =>
    row.forEach((filled, columnIndex) => {
      if (filled) {
        // Ceil the cell so neighbouring modules butt together instead of
        // leaving hairline gaps that can confuse a scanner.
        context.fillRect(
          x + columnIndex * cell,
          y + rowIndex * cell,
          Math.ceil(cell),
          Math.ceil(cell),
        );
      }
    }),
  );
};

const drawBinSticker = (
  context: CanvasRenderingContext2D,
  entry: BinQrEntry,
  logos: LoadedLogos,
  cardX: number,
  cardY: number,
  projectName: string,
) => {
  drawCropMarks(context, cardX, cardY, CARD_WIDTH, CARD_HEIGHT);

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

  context.textAlign = "center";
  context.textBaseline = "top";

  // ── Top row: operator mark (bins have no per-project emblem of their own) ──
  const emblemBox = 76;
  const companyLogoWidth = 250;
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

  // ── Project / programme name ──
  const project = projectName.trim();
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

  context.strokeStyle = HAIRLINE;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(cardX + CARD_PADDING + 14, y);
  context.lineTo(cardX + CARD_WIDTH - CARD_PADDING - 14, y);
  context.stroke();
  y += 16;

  // ── Bin name: the largest text, where the customer sticker puts the ward ──
  const heading = entry.sequence
    ? `${entry.sequence}. ${text(entry.bin_name)}`
    : text(entry.bin_name);
  const headingSize = fitSingleLine(context, heading, innerWidth, "700", 26, 15);
  context.font = `700 ${headingSize}px Arial, sans-serif`;
  context.fillStyle = INK;
  context.fillText(ellipsize(context, heading, innerWidth), centre, y);
  y += headingSize + 14;

  // ── Collection point, where the customer sticker puts area / house no ──
  const cpLine = text(entry.cp_name);
  const cpSize = fitSingleLine(context, cpLine, innerWidth, "700", 22, 12);
  context.font = `700 ${cpSize}px Arial, sans-serif`;
  context.fillStyle = BRAND_NAVY;
  context.fillText(ellipsize(context, cpLine, innerWidth), centre, y);
  y += cpSize + 16;

  // ── QR: fills the space left between the details and the footer ──
  const footerTop = cardY + CARD_HEIGHT - FOOTER_HEIGHT;
  const captionHeight = 26;
  const quietZone = 6;
  const zoneHeight = footerTop - y;
  const qrSize = Math.min(
    zoneHeight - captionHeight - quietZone * 2,
    innerWidth - quietZone * 2,
  );
  const blockHeight = qrSize + quietZone * 2 + captionHeight;
  const qrY = y + (zoneHeight - blockHeight) / 2 + quietZone;
  const qrX = centre - qrSize / 2;

  drawQrOnCanvas(context, JSON.stringify({ id: entry.unique_id }), qrX, qrY, qrSize);

  // ── Caption: the bin id, printed so it can be keyed in if a code will not scan ──
  context.font = "600 14px 'Courier New', Courier, monospace";
  context.fillStyle = MUTED;
  context.fillText(
    ellipsize(context, text(entry.unique_id), innerWidth),
    centre,
    qrY + qrSize + quietZone + 14,
  );

  context.restore();
};

const drawSheetHeader = (
  context: CanvasRenderingContext2D,
  scope: BinSheetScope,
  total: number,
) => {
  const baseline = MARGIN_Y - 30;
  const company = (scope.companyName ?? "").trim() || "Secondary Bin QR Codes";

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = BRAND_NAVY;
  context.font = "700 25px Arial, sans-serif";
  context.fillText(company, MARGIN_X, baseline);

  const companyWidth = context.measureText(company).width;
  context.fillStyle = MUTED;
  context.font = "20px Arial, sans-serif";
  const secondary = [
    (scope.projectName ?? "").trim(),
    scope.tripCode ? `Trip ${scope.tripCode}` : "",
    scope.tripDate ?? "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  if (secondary) {
    context.fillText(`  ·  ${secondary}`, MARGIN_X + companyWidth, baseline);
  }

  context.textAlign = "right";
  context.fillStyle = MUTED;
  context.font = "18px Arial, sans-serif";
  context.fillText(
    `${total} bin${total === 1 ? "" : "s"}`,
    SHEET_WIDTH - MARGIN_X,
    baseline,
  );
};

const drawSheetFooter = (
  context: CanvasRenderingContext2D,
  page: number,
  pageCount: number,
) => {
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#94a3b8";
  context.font = "17px Arial, sans-serif";
  context.fillText(
    `Page ${page} of ${pageCount}  ·  Generated ${new Date().toLocaleString("en-IN")}`,
    SHEET_WIDTH / 2,
    SHEET_HEIGHT - 44,
  );
};

export const createBinQrSheetPdf = async (
  entries: BinQrEntry[],
  scope?: BinSheetScope,
): Promise<jsPDF> => {
  if (entries.length === 0) throw new Error("No bins to export.");

  const canvas = document.createElement("canvas");
  canvas.width = SHEET_WIDTH;
  canvas.height = SHEET_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF generation is not supported in this browser.");

  const logos = await loadLogos();
  const documentPdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageCount = Math.ceil(entries.length / BINS_PER_PAGE);
  const projectName = (scope?.projectName ?? "").trim();

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

    drawSheetHeader(context, scope ?? {}, entries.length);

    const pageEntries = entries.slice(
      pageIndex * BINS_PER_PAGE,
      (pageIndex + 1) * BINS_PER_PAGE,
    );

    pageEntries.forEach((entry, slot) => {
      const column = slot % COLUMNS;
      const rowIndex = Math.floor(slot / COLUMNS);
      drawBinSticker(
        context,
        entry,
        logos,
        MARGIN_X + column * (CARD_WIDTH + GUTTER_X),
        MARGIN_Y + rowIndex * (CARD_HEIGHT + GUTTER_Y),
        projectName,
      );
    });

    drawSheetFooter(context, pageIndex + 1, pageCount);

    if (pageIndex > 0) documentPdf.addPage();
    documentPdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  }

  return documentPdf;
};

export const downloadBinQrSheetPdf = async (
  entries: BinQrEntry[],
  scope?: BinSheetScope,
): Promise<void> => {
  const documentPdf = await createBinQrSheetPdf(entries, scope);
  const parts = [
    "bin_qr_stickers",
    safeFilename(scope?.companyName ?? ""),
    safeFilename(scope?.tripCode ?? ""),
    safeFilename(scope?.tripDate ?? ""),
  ].filter(Boolean);
  documentPdf.save(`${parts.join("_") || "bin_qr_stickers"}.pdf`);
};
