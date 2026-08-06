export const formatCollectionTime = (value?: string | null): string => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/** For bare "HH:MM:SS" values (e.g. Django TimeField JSON) with no date component. */
export const formatTimeOnly = (value?: string | null): string => {
  if (!value) return "-";

  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return formatCollectionTime(value);

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};
