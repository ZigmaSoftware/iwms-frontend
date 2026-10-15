import { useState } from "react";
import { Eye, Image as ImageIcon } from "lucide-react";
import { Dialog } from "primereact/dialog";

type EvidenceImagePreviewProps = {
  url?: string | null;
  label: string;
};

export function EvidenceImagePreview({ url, label }: EvidenceImagePreviewProps) {
  const [open, setOpen] = useState(false);

  if (!url) return <span className="text-xs text-gray-400">No image</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View ${label}`}
        aria-label={`View ${label}`}
        className="group relative h-12 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/35">
          <Eye className="h-4 w-4 text-transparent transition-colors group-hover:text-white" />
        </span>
      </button>
      <Dialog
        visible={open}
        onHide={() => setOpen(false)}
        header={label}
        modal
        dismissableMask
        draggable={false}
        style={{ width: "min(92vw, 840px)" }}
      >
        <div className="grid min-h-48 place-items-center bg-gray-50">
          <img
            src={url}
            alt={label}
            className="max-h-[72vh] max-w-full object-contain"
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800"
        >
          <ImageIcon className="h-4 w-4" /> Open original
        </a>
      </Dialog>
    </>
  );
}
