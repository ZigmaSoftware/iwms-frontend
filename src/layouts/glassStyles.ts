/* Glass styles shared by the admin and dashboard headers, so both look the
   same: a translucent surface with a hairline border and an inner top
   highlight, plus capsules and icon buttons that sit on it. */

export const glassClasses = {
  light:
    "border-white/70 bg-white/55 shadow-[0_10px_34px_-14px_rgba(15,60,70,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-saturate-[1.8]",
  dark: "border-white/[0.08] bg-[rgba(16,36,39,0.5)] shadow-[0_12px_36px_-14px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-saturate-150",
};

export const glassScrolledClasses = {
  light:
    "shadow-[0_16px_40px_-14px_rgba(15,60,70,0.35),inset_0_1px_0_rgba(255,255,255,0.9)]",
  dark: "shadow-[0_16px_40px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)]",
};

/** A capsule grouping several controls inside the glass bar. */
export const glassCapsuleClasses = {
  light:
    "border-white/80 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
  dark: "border-white/[0.08] bg-white/[0.03]",
};

export const glassIconButtonClasses = {
  light: "text-gray-500 hover:bg-white/80 hover:text-green-700",
  dark: "text-gray-400 hover:bg-white/[0.06] hover:text-green-300",
};

/** Soft white sheen across the top of the glass bar. */
export const glassSheenClasses = {
  light: "from-white/50",
  dark: "from-white/[0.05]",
};
