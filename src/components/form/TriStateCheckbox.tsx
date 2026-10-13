import { useEffect, useRef, type InputHTMLAttributes } from "react";

type TriStateCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Shown as a dash: some, but not all, of the items it controls are ticked. */
  indeterminate?: boolean;
};

/** A checkbox that can also show a partly-ticked state. */
export function TriStateCheckbox({ indeterminate = false, ...props }: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // `indeterminate` has no HTML attribute; it can only be set on the element.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return <input ref={ref} type="checkbox" {...props} />;
}
