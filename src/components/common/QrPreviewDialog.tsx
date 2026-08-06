import { useRef, useState, type ReactNode } from "react";
import { saveAs } from "file-saver";
import QRCode from "react-qr-code";
import { Button } from "primereact/button";
import Swal from "@/lib/notify";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Reusable QR preview + download dialog.
 *
 * Accepts EITHER an already-generated QR image URL (served by the backend,
 * e.g. staff/bin/customer QR PNGs) OR raw string data to render client-side.
 * When both are supplied, `qrImageUrl` wins since the backend copy is the
 * source of truth and avoids a second QR-generation pass.
 */
export interface QrPreviewDialogProps {
  /** Controls dialog visibility. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title (also used as the image alt text). */
  title: string;
  /** Backend-served QR image URL (PNG). Takes precedence over `value`. */
  qrImageUrl?: string | null;
  /** Raw QR payload, rendered client-side via react-qr-code when no `qrImageUrl` is given. */
  value?: string | null;
  /** Filename used for the downloaded PNG (".png" is appended if missing). */
  fileName?: string;
  /** Render/download size in pixels for the client-rendered QR (ignored for image URLs). */
  size?: number;
  /** Optional caption rendered below the QR (e.g. entity name / id). */
  description?: ReactNode;
  /** Extra action buttons rendered next to Download (e.g. screen-specific Preview/Print). */
  extraActions?: ReactNode;
  /** Message shown when neither `qrImageUrl` nor `value` is provided. */
  emptyMessage?: string;
}

const DEFAULT_SIZE = 220;

const toSafePngFileName = (name: string) => {
  const withoutExtension = name.trim().replace(/\.png$/i, "");
  const safeBaseName =
    withoutExtension
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^[_.-]+|[_.-]+$/g, "") || "qr-code";

  return `${safeBaseName}.png`;
};

const downloadQrImageFromUrl = async (url: string, fileName: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch the QR image.");
    const blob = await response.blob();
    saveAs(blob, fileName);
  } catch {
    // Fallback for cases the fetch can't reach (e.g. opaque CORS response) —
    // let the browser attempt a direct download of the URL itself.
    saveAs(url, fileName);
  }
};

const downloadQrImageFromSvg = async (svgElement: SVGSVGElement, fileName: string, size: number) => {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PNG conversion is not supported in this browser.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("Failed to generate a PNG from the QR code.");

    saveAs(pngBlob, fileName);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default function QrPreviewDialog({
  open,
  onOpenChange,
  title,
  qrImageUrl,
  value,
  fileName = "qr-code.png",
  size = DEFAULT_SIZE,
  description,
  extraActions,
  emptyMessage = "No QR code is available.",
}: QrPreviewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const hasImageUrl = Boolean(qrImageUrl);
  const hasRawValue = !hasImageUrl && Boolean(value);
  const canDownload = hasImageUrl || hasRawValue;

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const downloadName = toSafePngFileName(fileName);
      if (hasImageUrl && qrImageUrl) {
        await downloadQrImageFromUrl(qrImageUrl, downloadName);
      } else if (hasRawValue) {
        const svgElement = svgContainerRef.current?.querySelector("svg");
        if (!svgElement) throw new Error("QR code is not ready yet.");
        await downloadQrImageFromSvg(svgElement, downloadName, size);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Download failed",
        text: error instanceof Error ? error.message : "Failed to download the QR code.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-[90vw] p-4">
        <DialogTitle className={description ? undefined : "sr-only"}>{title}</DialogTitle>
        <div className="flex flex-col items-center gap-4">
          {hasImageUrl ? (
            <img
              src={qrImageUrl ?? undefined}
              alt={title}
              className="h-auto w-[min(75vw,320px)] object-contain"
              style={{ maxWidth: size, maxHeight: size }}
            />
          ) : hasRawValue ? (
            <div ref={svgContainerRef} className="bg-white p-2">
              <QRCode value={value as string} size={size} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          )}

          {description && <div className="text-center">{description}</div>}

          {canDownload && (
            <div className="flex w-full gap-2">
              <Button
                label={isDownloading ? "Downloading..." : "Download"}
                icon="pi pi-download"
                loading={isDownloading}
                disabled={isDownloading}
                onClick={handleDownload}
                className="flex-1 p-button-outlined"
              />
              {extraActions}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
