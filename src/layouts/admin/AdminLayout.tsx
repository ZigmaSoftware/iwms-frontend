import AppHeader from "@/layouts/admin/components/AppHeader";
import AppSidebar from "@/layouts/admin/components/AppSidebar";
import AdminBreadcrumb from "@/layouts/admin/components/AdminBreadcrumb";
import AdminSubNav from "@/layouts/admin/components/AdminSubNav";
import Backdrop from "@/layouts/admin/components/Backdrop";
import { RouteProgress } from "@/components/common/RouteProgress";
import { SidebarProvider, useSidebar } from "@/contexts/SideBarContext";
import type { AdminLayoutProps } from "@/types/roles";

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </SidebarProvider>
  );
}

function AdminLayoutShell({ children }: AdminLayoutProps) {
  const { isExpanded, isMobileOpen } = useSidebar();

  const desktopPadding =
    isExpanded || isMobileOpen ? "lg:pl-64" : "lg:pl-[72px]";

  return (
    <div
      className="admin-shell app-surface-bg relative min-h-screen text-(--admin-text)"
      style={{
        ["--admin-header-h" as any]: "72px",
      }}
    >
      <AppHeader />
      <AppSidebar />
      <Backdrop />
      <main
        className={`pt-1 transition-all duration-300 lg:pt-2 ${desktopPadding}`}
      >
        <div className="min-h-[calc(100vh-4rem)] px-2 py-4 sm:px-3 lg:px-4 lg:py-8">
          <div className="flex w-full min-w-0 flex-col gap-5">
            <AdminSubNav />
            <div className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-(--admin-border) app-card-bg px-3 py-4 shadow-(--admin-cardShadow) backdrop-blur sm:px-4 sm:py-5 lg:rounded-[28px]">
              <RouteProgress />
              <AdminBreadcrumb />
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
