import { lazy, type ComponentType } from "react";

const OverallDashboard = lazy(() => import("@/pages/dashboard/pages/OverallDashboard"));
const MapView = lazy(() => import("@/pages/dashboard/pages/MapView"));
const Vehicle = lazy(() => import("@/pages/dashboard/pages/Vehicle"));
const WasteCollection = lazy(() => import("@/pages/dashboard/pages/WasteCollection"));
const ResourceManagement = lazy(() => import("@/pages/dashboard/pages/ResourceManagement"));
const Grievances = lazy(() => import("@/pages/dashboard/pages/Grievances"));
const Alerts = lazy(() => import("@/pages/dashboard/pages/Alerts"));
const Reports = lazy(() => import("@/pages/dashboard/pages/Reports"));
const Weighbridge = lazy(() => import("@/pages/dashboard/pages/Weighbridge"));
// const BinMonitoring = lazy(() => import("@/pages/dashboard/pages/BinMonitoring"));

export type DashboardComponent = ComponentType | undefined;

export const ROUTES: Record<string, DashboardComponent> = {
  "dashboard-overall": OverallDashboard,
  "dashboard-map": MapView,
  "dashboard-vehicle": Vehicle,
  "dashboard-waste-collection": WasteCollection,
  "dashboard-resources": ResourceManagement,
  "dashboard-grievances": Grievances,
  "dashboard-alerts": Alerts,
  "dashboard-reports": Reports,
  "dashboard-weighbridge": Weighbridge,
  // "dashboard-bins": BinMonitoring,
};
