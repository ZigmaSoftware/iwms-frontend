/** Backend origin that serves uploaded files under /media/. */
export const API_ORIGIN = (() => {
  const apiRoot =
    import.meta.env.VITE_PROD === "true"
      ? import.meta.env.VITE_API_PROD
      : import.meta.env.VITE_API_LOCAL;
  try {
    return new URL(apiRoot).origin;
  } catch {
    return "";
  }
})();

/** Turn a stored FileField value (absolute URL, "/media/…" or a path relative
 *  to MEDIA_ROOT such as "uploads/vehicles/rc/x.pdf") into an absolute URL. */
export const resolveMediaUrl = (value?: string | null): string => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/media/")) return `${API_ORIGIN}${encodeURI(trimmed)}`;
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  if (withoutLeadingSlash.startsWith("media/")) {
    return `${API_ORIGIN}/${encodeURI(withoutLeadingSlash)}`;
  }
  return `${API_ORIGIN}/media/${encodeURI(withoutLeadingSlash)}`;
};

export const fileNameFromUrl = (value?: string | null): string => {
  if (!value) return "document";
  const cleaned = value.split("?")[0].replace(/\/+$/, "");
  return decodeURIComponent(cleaned.substring(cleaned.lastIndexOf("/") + 1)) || "document";
};
