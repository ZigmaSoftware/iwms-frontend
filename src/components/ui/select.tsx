import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Drop-in replacement for Radix Select, built on shadcn's Combobox pattern
 * (Popover + Command/cmdk) instead of Radix's native <select>-like listbox.
 *
 * Every call site in the app builds its menu the same way — `<SelectTrigger>`
 * + `<SelectContent>` full of `<SelectItem>` — so that same JSX shape is kept
 * here and interpreted internally: `SelectContent`'s children are walked to
 * pull out `{value, label, disabled}` for the Command list, which is what
 * lets every existing form get real type-to-filter search and keyboard
 * navigation without editing call sites.
 */

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  getLabel: (value: string) => React.ReactNode | undefined;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Select>`);
  return ctx;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  children?: React.ReactNode;
}

const Select = ({ value, defaultValue, onValueChange, disabled, name, children }: SelectProps) => {
  const [open, setOpen] = React.useState(false);
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);

  const resolvedValue = value !== undefined ? value : uncontrolled;

  const handleChange = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  // Labels must be known as soon as `value` is set — including set
  // programmatically before the user has ever opened this dropdown (e.g.
  // autofilling a form from a fetched record) — not only once SelectContent
  // has actually rendered. Radix's Popover.Content unmounts its children
  // while closed, so SelectContent's own item list (and the old
  // registerLabel-in-a-ref approach) never ran until first open. Extracting
  // straight from `children` here instead, into state so SelectValue
  // re-renders, means this doesn't depend on SelectContent — or Radix's
  // portal — ever mounting.
  const itemsByValue = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child) || child.type !== SelectContent) return;
      const contentProps = child.props as { children?: React.ReactNode };
      extractItems(contentProps.children).forEach((item) => map.set(item.value, item.label));
    });
    return map;
  }, [children]);

  const getLabel = React.useCallback(
    (itemValue: string) => itemsByValue.get(itemValue),
    [itemsByValue],
  );

  const ctx = React.useMemo<SelectContextValue>(
    () => ({
      value: resolvedValue,
      onValueChange: handleChange,
      disabled,
      name,
      open,
      setOpen,
      getLabel,
    }),
    [resolvedValue, handleChange, disabled, name, open, getLabel],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        {children}
      </Popover>
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

const SelectValue = ({
  className,
  placeholder,
}: {
  className?: string;
  placeholder?: React.ReactNode;
}) => {
  const { value, getLabel } = useSelectContext("SelectValue");
  if (!value) return <span className={cn("text-muted-foreground", className)}>{placeholder}</span>;
  return <span className={cn("truncate", className)}>{getLabel(value) ?? value}</span>;
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, id, ...props }, ref) => {
    const { disabled, name, open } = useSelectContext("SelectTrigger");
    return (
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          name={name}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

type ExtractedItem = {
  value: string;
  label: React.ReactNode;
  keywords?: string;
  disabled?: boolean;
};

const nodeText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
};

/** Walks SelectContent's children, flattening SelectGroup/fragments, to collect item data. */
function extractItems(children: React.ReactNode): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === SelectItem) {
      const props = child.props as {
        value: string;
        children?: React.ReactNode;
        disabled?: boolean;
      };
      items.push({
        value: props.value,
        label: props.children,
        keywords: nodeText(props.children),
        disabled: props.disabled,
      });
      return;
    }

    if (child.type === SelectSeparator || child.type === SelectLabel) return;

    const childProps = child.props as { children?: React.ReactNode } | undefined;
    if (childProps?.children) {
      items.push(...extractItems(childProps.children));
    }
  });

  return items;
}

interface SelectContentProps {
  className?: string;
  children?: React.ReactNode;
  /** Set false to force the search box off for this menu. */
  searchable?: boolean;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, searchable = true }, ref) => {
    const { value, onValueChange, setOpen } = useSelectContext("SelectContent");

    const items = React.useMemo(() => extractItems(children), [children]);

    return (
      <PopoverContent
        ref={ref}
        align="start"
        className={cn("w-[--radix-popover-trigger-width] p-0", className)}
        // Command runs its own typeahead on keydown; nothing extra needed here,
        // Escape closes via Popover's default behavior.
      >
        <Command
          filter={(itemValue, search) => {
            const item = items.find((i) => i.value === itemValue);
            const text = (item?.keywords ?? itemValue).toLowerCase();
            return text.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          {searchable ? <CommandInput placeholder="Search…" /> : null}
          <CommandList>
            {searchable ? <CommandEmpty>No matches</CommandEmpty> : null}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === item.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    );
  },
);
SelectContent.displayName = "SelectContent";

const SelectLabel = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}>{children}</div>;

interface SelectItemProps {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Rendered directly only when its parent isn't `SelectContent` (Command
 * builds its own rows from the data `SelectContent` extracts). In normal use
 * this component never mounts — it's a typed data-carrier read via props.
 */
const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children }, ref) => (
    <div ref={ref} hidden>
      {children}
    </div>
  ),
);
SelectItem.displayName = "SelectItem";

const SelectSeparator = ({ className }: { className?: string }) => (
  <CommandSeparator className={className} />
);

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
