import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  value?: string[] | null;
  onChange?: (next: string[]) => void;
  options?: readonly MultiSelectOption[];
  placeholder?: ReactNode;
  disabled?: boolean;
  filter?: boolean;
  maxSelectedLabels?: number;
  id?: string;
  className?: string;
};

/**
 * Checkbox-list multi-select with search, select-all/clear, and a
 * chip-truncated trigger summary. Ported from TN_Iwms's
 * components/form/MultiSelect.tsx, simplified to plain string values.
 */
export function MultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = "Select options",
  disabled = false,
  filter = true,
  maxSelectedLabels = 3,
  id,
  className = "",
}: MultiSelectProps) {
  const generatedId = useId();
  const controlId = id ?? `multi-select-${generatedId}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPosition, setPanelPosition] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedValues = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const isOpen = open && !disabled;

  const selectedKeys = useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedKeys.has(option.value)),
    [options, selectedKeys]
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    const closeOnViewportChange = () => {
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, []);

  const emit = (next: string[]) => onChange?.(next);

  const toggle = (optionValue: string) => {
    if (selectedKeys.has(optionValue)) {
      emit(selectedValues.filter((item) => item !== optionValue));
      return;
    }
    emit([...selectedValues, optionValue]);
  };

  const visibleLabels = selectedOptions.slice(0, Math.max(1, maxSelectedLabels));
  const hiddenCount = selectedOptions.length - visibleLabels.length;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setQuery("");
            return;
          }
          const rect = triggerRef.current?.getBoundingClientRect();
          if (rect) {
            const viewportPadding = 16;
            const panelWidth = Math.min(Math.max(rect.width, 280), window.innerWidth - viewportPadding * 2);
            const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - panelWidth - viewportPadding);
            const estimatedPanelHeight = filter ? 340 : 292;
            const openAbove =
              window.innerHeight - rect.bottom < estimatedPanelHeight &&
              rect.top > window.innerHeight - rect.bottom;
            setPanelPosition({
              left,
              width: panelWidth,
              ...(openAbove ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
            });
          }
          setOpen(true);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex h-10 w-full items-center gap-2 rounded-md border px-3 text-left text-sm shadow-sm outline-none transition-all ${
          disabled
            ? "cursor-not-allowed border-input bg-muted text-muted-foreground"
            : isOpen
              ? "border-primary bg-background ring-2 ring-primary/15"
              : "border-input bg-background text-foreground hover:border-primary/50"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOptions.length ? "font-medium" : "text-muted-foreground"}`}>
          {selectedOptions.length === 0 ? (
            placeholder
          ) : (
            <>
              {visibleLabels.map((option, index) => (
                <span key={option.value}>
                  {index > 0 ? ", " : ""}
                  {option.label}
                </span>
              ))}
              {hiddenCount > 0 ? ` +${hiddenCount}` : ""}
            </>
          )}
        </span>
        {selectedOptions.length > 1 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
            {selectedOptions.length}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={panelPosition}
            className="fixed z-[100] overflow-hidden rounded-xl border border-input bg-background shadow-[0_18px_45px_-12px_rgba(15,23,42,0.28)]"
          >
            <div className="border-b border-input p-3">
              {filter && (
                <div className="flex h-9 items-center gap-2 rounded-lg bg-muted px-3">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search options..."
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              <div className={`${filter ? "mt-2" : ""} flex items-center justify-between px-1 text-[10px]`}>
                <span className="font-medium text-muted-foreground">
                  {selectedOptions.length} of {options.length} selected
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => emit(options.map((option) => option.value))}
                    disabled={options.length === 0 || selectedOptions.length === options.length}
                    className="font-bold text-primary transition-colors hover:opacity-80 disabled:opacity-40"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => emit([])}
                    disabled={!selectedValues.length}
                    className="font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div role="listbox" aria-multiselectable="true" aria-labelledby={controlId} className="max-h-60 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">No matching options</div>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedKeys.has(option.value);
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      key={option.value}
                      onClick={() => toggle(option.value)}
                      className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs transition-colors last:mb-0 ${
                        checked ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default MultiSelect;
