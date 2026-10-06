import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { PencilIcon, TrashBinIcon, MoreVerticalIcon } from "@/icons";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: "default" | "destructive";
}

export interface ActionMenuProps {
  onEdit?: () => void;
  editDisabled?: boolean;
  editDisabledReason?: string;
  editLabel?: string;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
  deleteLabel?: string;
  actions?: ActionMenuItem[];
}

function MenuButton({
  item,
}: {
  item: {
    key: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    disabledReason?: string;
    variant?: "default" | "destructive";
  };
}) {
  return (
    <button
      key={item.key}
      type="button"
      disabled={item.disabled}
      title={item.disabled ? item.disabledReason : undefined}
      onClick={item.onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        item.variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 disabled:hover:bg-transparent"
          : "text-foreground hover:bg-accent disabled:hover:bg-transparent",
      )}
    >
      {item.icon}
      {item.label}
    </button>
  );
}

export function ActionMenu({
  onEdit,
  editDisabled,
  editDisabledReason,
  editLabel = "Edit",
  onDelete,
  deleteDisabled,
  deleteDisabledReason,
  deleteLabel = "Delete",
  actions = [],
}: ActionMenuProps) {
  const [open, setOpen] = React.useState(false);

  const items: ActionMenuItem[] = [
    ...(onEdit
      ? [
          {
            key: "edit",
            label: editLabel,
            icon: <PencilIcon />,
            onClick: onEdit,
            disabled: editDisabled,
            disabledReason: editDisabledReason,
            variant: "default" as const,
          },
        ]
      : []),
    ...actions,
    ...(onDelete
      ? [
          {
            key: "delete",
            label: deleteLabel,
            icon: <TrashBinIcon />,
            onClick: onDelete,
            disabled: deleteDisabled,
            disabledReason: deleteDisabledReason,
            variant: "destructive" as const,
          },
        ]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Row actions"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <MoreVerticalIcon />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          className={cn(
            "z-[80] w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            "data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {items.map((item) => (
            <MenuButton
              key={item.key}
              item={{
                ...item,
                onClick: () => {
                  setOpen(false);
                  item.onClick();
                },
              }}
            />
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
