import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { startRouteProgress } from "@/components/common/routeProgressStore";
import { panelLinks, useSidebarNav } from "@/layouts/admin/useSidebarNav";

type MenuSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Search every permitted menu option and jump to it. Opened from the "?"
// button at the bottom of the icon rail.
const MenuSearchDialog: React.FC<MenuSearchDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { railGroups, isEntryActive } = useSidebarNav();

  const handleSelect = (path: string) => {
    onOpenChange(false);
    startRouteProgress(path);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search menu</DialogTitle>
        <DialogDescription className="sr-only">
          Type a menu or page name and press Enter to open it.
        </DialogDescription>
        <Command className="rounded-none bg-white dark:bg-(--admin-surfaceAlt)">
          <CommandInput
            placeholder="Which menu are you looking for?"
            className="h-12"
          />
          <CommandList className="max-h-[60vh] scrollbar-none">
            <CommandEmpty>No matching menu.</CommandEmpty>
            {railGroups.flatMap((group) =>
              group.sections.flatMap((section) =>
                section.items.map((item) => (
                  <CommandGroup
                    key={`${section.key}-${item.nameKey}`}
                    heading={t(item.nameKey)}
                  >
                    {panelLinks(item).map((link) => (
                      <CommandItem
                        key={link.path}
                        value={`${t(item.nameKey)} ${t(link.nameKey)} ${link.path}`}
                        onSelect={() => handleSelect(link.path)}
                        className="gap-2 rounded-lg px-3 py-2 data-[selected=true]:bg-green-50 data-[selected=true]:text-green-700 dark:data-[selected=true]:bg-green-400/10 dark:data-[selected=true]:text-green-300"
                      >
                        <span className="text-green-600 dark:text-green-400 [&_svg]:h-4 [&_svg]:w-4">
                          {item.icon}
                        </span>
                        <span className="text-gray-400">{t(item.nameKey)}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                        <span className="font-medium">{t(link.nameKey)}</span>
                        {isEntryActive(link) && (
                          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-400/15 dark:text-green-300">
                            Current
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )),
              ),
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default MenuSearchDialog;
