import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ModuleProvider } from "@/contexts/ModuleContext";
import { UserProvider } from "@/contexts/UserContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { RolesProvider } from "@/contexts/RolesContext";
import { queryClient } from "@/tanstack/client";

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <RolesProvider>
        <ThemeProvider>
          <ModuleProvider>
            <UserProvider>
              <PermissionProvider>
                <TooltipProvider>
                  <BrowserRouter>
                    {children}
                    <Toaster />
                    <Sonner />
                    {import.meta.env.DEV ? (
                      <ReactQueryDevtools initialIsOpen={false} />
                    ) : null}
                  </BrowserRouter>
                </TooltipProvider>
              </PermissionProvider>
            </UserProvider>
          </ModuleProvider>
        </ThemeProvider>
      </RolesProvider>
    </QueryClientProvider>
  );
}
