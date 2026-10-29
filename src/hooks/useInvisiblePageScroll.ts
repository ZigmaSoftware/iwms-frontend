import { useEffect } from "react";

/** Hides the page's scrollbar while the calling page is open; the page still
 *  scrolls (wheel, touch, keyboard). `scrollbar-none` is defined in index.css. */
export function useInvisiblePageScroll() {
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    targets.forEach((el) => el.classList.add("scrollbar-none"));
    return () => targets.forEach((el) => el.classList.remove("scrollbar-none"));
  }, []);
}
