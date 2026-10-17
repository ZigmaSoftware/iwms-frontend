/* =====================================================================
   Admin sidebar menu definitions (data only).

   Shared by AppSidebar (renders + filters by "view") and
   AdminEncryptedRouter (resolves the permission of the page being opened,
   so a list/new/edit route needs the same grant the sidebar entry names).
===================================================================== */
import type React from "react";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarCog,
  ClipboardList,
  FileSearch,
  Globe,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MapPin,
  MessageSquareWarning,
  MonitorCog,
  PieChart,
  Recycle,
  Route,
  ShieldCheck,
  Truck,
  UserCircle,
  Users,
} from "lucide-react";

import { getEncryptedRoute } from "@/utils/routeCache";
import { permissionFor } from "@/generated/permissionCatalog";

const {
  encAttendance,
  encMasters,
  encAudits,
  encContinents,
  encCountries,
  encDepartments,
  encDesignations,
  encStates,
  encDistricts,
  encCities,
  encWards,
  encCollectionPoints,
  encPlants,
  encWasteTypes,
  encZones,
  encProperties,
  encSubProperties,
  encStaffCreation,
  encAdmins,
  encUserScreen,
  encUserType,
  encCustomerMaster,
  encCustomerCreation,
  encApartmentList,
  encReport,
  encMonthlyDistance,
  encTripSummary,
  encWasteCollectedSummary,
  encMonthlyWasteComparison,
  encComplaintsReport,
  encComplaintTicket,
  encComplaint,
  encMyTasks,
  encComplaintMastersModule,
  encComplaintTypes,
  encComplaintCategories,
  encComplaintSubcategories,
  encComplaintSlaRules,
  encFeedback,
  encTransportMaster,
  encScheduleSetup,
  encScheduleOperations,
  encFuel,
  encVehicleCreation,
  encVehicleHistory,
  encVehicleTrack,
  encVehicleTracking,
  encVehicleType,
  encWasteCollectedData,
  encWorkforceManagement,
  encDateReport,
  encDayReport,
  encStaffUserType,
  encProjectStaffHierarchy,
  encMainScreenType,
  encUserScreenAction,
  encMainScreen,
  encUserScreenPermission,
  encStaffAccessConfiguration,
  encAppModules,
  encCustomerAccessConfiguration,
  encStaffMasters,
  encStaffTemplate,
  encAlternativeStaffTemplate,
  encCommonAudit,
  encTripPlans,
  encCompanyCreation,
  encProjectCreation,
  encSuperAdminMaster,
  encPanchayats,
  encPanchayatLeaders,
  encDistrictLeaders,
  encBins,
  encDailyTripAssignment,
  encDailyTripCollectionPoint,
  encDailyTripHouseholdCollection,
  encDailyTripLog,
  encDailyTripTracking,
  encStaticRouteMap,
  encBinCollectionEvent,
  encLoginAudits,
  encPermissionAudit,
  encStaticRouteAudit,
  encComplaintAudit,
  encAuditDashboard,
  encDailyWasteComparison,
  encVehicleBreakdown,
  encTripRetripRequest,
  encTripDelayReport,
} = getEncryptedRoute();

export type NavMatchable = {
  path?: string;
  matchPaths?: string[];
  /** Match `path` only, not routes nested under it. */
  exact?: boolean;
};

// `module`/`screens` always come from `permissionFor(...)`, which only accepts
// names in the generated backend permission catalog. Group headers (items
// with subItems) carry none: they show whenever a child is visible.
export type NavPermission = {
  module?: string;
  screens?: string[];
};

export type NavItem = NavMatchable &
  NavPermission & {
    nameKey: string;
    icon: React.ReactNode;
    /** Platform super admins only; not grantable to anyone else. */
    superadminOnly?: boolean;
    subItems?: Array<
      NavMatchable &
        NavPermission & {
          nameKey: string;
          path: string;
        }
    >;
  };

export type SidebarSectionKey =
  | "main"
  | "attendance"
  | "superadminMaster"
  | "commonMaster"
  | "master"
  | "leaderManagement"
  | "wasteType"
  | "screenManagement"
  | "roleAssigns"
  | "staffManagement"
  | "processItems"
  | "customerMasters"
  | "complaintMasters"
  | "complaintTicket"
  | "transportMasters"
  | "scheduleSetup"
  | "scheduleOperations"
  | "wasteReports"
  | "auditItems"
  | "wasteManagement"
  | "workforceManagement"
  | "fleetReports";

export const MODULE_GROUPS: {
  key: string;
  titleKey: string;
  accent: string;
  sectionKeys: SidebarSectionKey[];
}[] = [
  {
    key: "dashboard",
    titleKey: "admin.nav.group_dashboard",
    accent: "bg-green-500",
    sectionKeys: ["main"],
  },
  {
    key: "super-admin",
    titleKey: "admin.nav.group_super_admin",
    accent: "bg-blue-500",
    sectionKeys: [
      "superadminMaster",
      "screenManagement",
      "roleAssigns",
      "staffManagement",
      "commonMaster",
      "complaintMasters",
      "auditItems",
    ],
  },
  {
    key: "masters",
    titleKey: "admin.nav.group_masters",
    accent: "bg-orange-400",
    sectionKeys: [
      "master",
      "wasteType",
      "transportMasters",
      "customerMasters",
      "leaderManagement",
    ],
  },
  {
    key: "core-modules",
    titleKey: "admin.nav.group_core_modules",
    accent: "bg-green-500",
    sectionKeys: [
      "scheduleSetup",
      "scheduleOperations",
      "complaintTicket",
      "attendance",
    ],
  },
  {
    key: "reports",
    titleKey: "admin.nav.group_reports",
    accent: "bg-blue-500",
    sectionKeys: ["wasteReports", "fleetReports"],
  },
];

/* =====================
   MENU DEFINITIONS
===================== */

// Each entry names its permission with permissionFor(module, ...screens).
// Those names come from the generated backend permission catalog
// (src/generated/permissionCatalog.ts <- iwms-backend/app/utils/
// permission_catalog.py), so the checkbox an admin ticks in Staff Access
// Configuration is the one that shows the page, and a typo fails to compile.
// A page backed by several screens lists them all; the catalog groups them
// under one heading in the permission forms (e.g. Daily Trip Plan).

export const navItems: NavItem[] = [
  {
    nameKey: "admin.nav.superadmin_dashboard",
    icon: <ShieldCheck size={18} />,
    path: "/admin/superadmin-dashboard",
    superadminOnly: true,
  },
  {
    nameKey: "admin.nav.admin_dashboard",
    icon: <LayoutDashboard size={18} />,
    path: "/admin",
    // Every admin page lives under /admin; only the page itself is this item.
    exact: true,
    ...permissionFor("dashboard", "admin-dashboard"),
  },
];

export const attendanceItems: NavItem[] = [
  {
    nameKey: "admin.nav.attendance",
    icon: <CalendarCheck size={18} />,
    path: `/${encAttendance}/${encAttendance}`,
    ...permissionFor("attendance", "attendance"),
  },
];

export const superadminMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.superAdmin_masters",
    icon: <Building2 size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.company",
        path: `/${encSuperAdminMaster}/${encCompanyCreation}`,
        ...permissionFor("superadmin-masters", "company"),
      },
      {
        nameKey: "admin.nav.project",
        path: `/${encSuperAdminMaster}/${encProjectCreation}`,
        ...permissionFor("superadmin-masters", "project"),
      },
    ],
  },
];

export const commonMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.common_masters",
    icon: <Globe size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.continent",
        path: `/${encMasters}/${encContinents}`,
        ...permissionFor("common-masters", "continents"),
      },
      {
        nameKey: "admin.nav.country",
        path: `/${encMasters}/${encCountries}`,
        ...permissionFor("common-masters", "countries"),
      },
      {
        nameKey: "admin.nav.state",
        path: `/${encMasters}/${encStates}`,
        ...permissionFor("common-masters", "states"),
      },
    ],
  },
];

export const masterItems: NavItem[] = [
  {
    nameKey: "admin.nav.location_masters",
    icon: <MapPin size={18} />,
    subItems: [
      // ── Administrative / Geographic Hierarchy ────────────────
      {
        nameKey: "admin.nav.district",
        path: `/${encMasters}/${encDistricts}`,
        ...permissionFor("masters", "districts"),
      },
      {
        nameKey: "admin.nav.city",
        path: `/${encMasters}/${encCities}`,
        ...permissionFor("masters", "cities"),
      },
      {
        nameKey: "admin.nav.zone",
        path: `/${encMasters}/${encZones}`,
        ...permissionFor("masters", "zones"),
      },
      // ── Operational / Field Level ────────────────────────────
      {
        nameKey: "admin.nav.ward",
        path: `/${encMasters}/${encWards}`,
        ...permissionFor("masters", "wards"),
      },
      {
        nameKey: "admin.nav.panchayat",
        path: `/${encMasters}/${encPanchayats}`,
        ...permissionFor("masters", "panchayat"),
      },
      {
        nameKey: "admin.nav.plant",
        path: `/${encMasters}/${encPlants}`,
        ...permissionFor("masters", "plants"),
      },
    ],
  },
];

export const leaderManagementItems: NavItem[] = [
  {
    nameKey: "admin.nav.leader_management",
    icon: <Landmark size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.panchayat_leader",
        path: `/${encMasters}/${encPanchayatLeaders}`,
        ...permissionFor("masters", "panchayat-leaders"),
      },
      {
        nameKey: "admin.nav.district_leader",
        path: `/${encMasters}/${encDistrictLeaders}`,
        ...permissionFor("masters", "district-leaders"),
      },
    ],
  },
];

export const wasteTypeItems: NavItem[] = [
  {
    nameKey: "admin.nav.waste_masters",
    icon: <Recycle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.property",
        path: `/${encMasters}/${encProperties}`,
        ...permissionFor("waste-types", "properties"),
      },
      {
        nameKey: "admin.nav.sub_property",
        path: `/${encMasters}/${encSubProperties}`,
        ...permissionFor("waste-types", "subproperties"),
      },
      {
        nameKey: "admin.nav.bin_creation",
        path: `/${encMasters}/${encBins}`,
        ...permissionFor("waste-types", "bins"),
      },
      {
        nameKey: "common.waste_type",
        path: `/${encMasters}/${encWasteTypes}`,
        ...permissionFor("waste-types", "waste type"),
      },
    ],
  },
];

export const screenManagementItems: NavItem[] = [
  {
    nameKey: "admin.nav.screen_management",
    icon: <MonitorCog size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.main_screen_type",
        path: `/${encAdmins}/${encMainScreenType}`,
        ...permissionFor("screen-managements", "mainscreentype"),
      },
      {
        nameKey: "admin.nav.main_screen",
        path: `/${encAdmins}/${encMainScreen}`,
        ...permissionFor("screen-managements", "mainscreens"),
      },
      {
        nameKey: "admin.nav.user_screen",
        path: `/${encAdmins}/${encUserScreen}`,
        ...permissionFor("screen-managements", "userscreens"),
      },
      {
        nameKey: "admin.nav.user_screen_action",
        path: `/${encAdmins}/${encUserScreenAction}`,
        ...permissionFor("screen-managements", "userscreen-action"),
      },
      {
        nameKey: "admin.nav.companywise_user_screen_permission",
        path: `/${encAdmins}/${encUserScreenPermission}`,
        ...permissionFor("screen-managements", "companywisescreenpermissions"),
      },
      {
        nameKey: "admin.nav.app_modules",
        path: `/${encAdmins}/${encAppModules}`,
        ...permissionFor("screen-managements", "app-modules"),
      },
    ],
  },
];

export const roleAssignsItems: NavItem[] = [
  {
    nameKey: "admin.nav.role_management",
    icon: <KeyRound size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.user_type",
        path: `/${encAdmins}/${encUserType}`,
        ...permissionFor("role-assigns", "user-type"),
      },
      {
        nameKey: "admin.nav.staff_user_type",
        path: `/${encAdmins}/${encStaffUserType}`,
        // One page with two tabs, shown as one "Staff User Type" row in the
        // permission forms (SCREEN_GROUPS in the backend).
        ...permissionFor("role-assigns", "staffusertypes", "contractorusertypes"),
      },
      {
        nameKey: "admin.nav.project_staff_hierarchy",
        path: `/${encAdmins}/${encProjectStaffHierarchy}`,
        ...permissionFor("role-assigns", "project-staff-hierarchy"),
      },
    ],
  },
];

export const staffManagementMasters: NavItem[] = [
  {
    nameKey: "admin.nav.staff_management",
    icon: <Users size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.department",
        path: `/${encStaffMasters}/${encDepartments}`,
        ...permissionFor("staff-creations", "department-masters"),
      },
      {
        nameKey: "admin.nav.designation",
        path: `/${encStaffMasters}/${encDesignations}`,
        ...permissionFor("staff-creations", "designation-masters"),
      },
      {
        nameKey: "admin.nav.staff_creation",
        path: `/${encStaffMasters}/${encStaffCreation}`,
        ...permissionFor("staff-creations", "staffcreation"),
      },
      {
        nameKey: "admin.nav.staff_access_configuration",
        path: `/${encAdmins}/${encStaffAccessConfiguration}`,
        ...permissionFor("staff-creations", "staff-access-configuration"),
      },
    ],
  },
];

export const customerMasters: NavItem[] = [
  {
    nameKey: "admin.nav.customer_masters",
    icon: <UserCircle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.customer_creation",
        path: `/${encCustomerMaster}/${encCustomerCreation}`,
        ...permissionFor("customers", "customercreations"),
      },
      {
        nameKey: "admin.nav.apartment_list",
        path: `/${encCustomerMaster}/${encApartmentList}`,
        ...permissionFor("customers", "apartment-list"),
      },
      {
        nameKey: "admin.nav.customer_access_configuration",
        path: `/${encCustomerMaster}/${encCustomerAccessConfiguration}`,
        ...permissionFor("customers", "customer-access-configuration"),
      },
    ],
  },
];

export const complaintMastersItems: NavItem[] = [
  {
    nameKey: "admin.nav.complaint_masters",
    icon: <ClipboardList size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.complaint_types",
        path: `/${encComplaintMastersModule}/${encComplaintTypes}`,
        ...permissionFor("complaint-masters", "types", "categories", "subcategories", "sla-rules"),
        matchPaths: [
          `/${encComplaintMastersModule}/${encComplaintCategories}`,
          `/${encComplaintMastersModule}/${encComplaintSubcategories}`,
          `/${encComplaintMastersModule}/${encComplaintSlaRules}`,
        ],
      },
    ],
  },
];

export const complaintTicketItems: NavItem[] = [
  {
    nameKey: "admin.nav.complaint_management",
    icon: <MessageSquareWarning size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.complaint_desk",
        path: `/${encComplaintTicket}/${encComplaint}`,
        ...permissionFor("complaint-ticket", "tickets"),
      },
      {
        nameKey: "admin.nav.my_tasks",
        path: `/${encComplaintTicket}/${encMyTasks}`,
        ...permissionFor("complaint-ticket", "my-tasks"),
      },
      {
        nameKey: "admin.nav.feedback",
        path: `/${encComplaintTicket}/${encFeedback}`,
        ...permissionFor("complaint-ticket", "feedback"),
      },
      {
        nameKey: "admin.nav.complaints_report",
        path: `/${encReport}/${encComplaintsReport}`,
        ...permissionFor("reports", "complaints-report"),
      },
    ],
  },
];

export const transportMastersItems: NavItem[] = [
  {
    nameKey: "admin.nav.transport_masters",
    icon: <Truck size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.vehicle_type",
        path: `/${encTransportMaster}/${encVehicleType}`,
        ...permissionFor("transport-masters", "vehicle-type"),
      },
      {
        nameKey: "admin.nav.vehicle_creation",
        path: `/${encTransportMaster}/${encVehicleCreation}`,
        ...permissionFor("transport-masters", "vehicle-creation"),
      },
      {
        nameKey: "admin.nav.fuel",
        path: `/${encTransportMaster}/${encFuel}`,
        ...permissionFor("transport-masters", "fuels"),
      },
    ],
  },
];

export const scheduleSetupItems: NavItem[] = [
  {
    nameKey: "admin.nav.schedule_setup",
    icon: <CalendarCog size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.staff_template",
        path: `/${encScheduleSetup}/${encStaffTemplate}`,
        ...permissionFor("schedule-setup", "staff-templates"),
      },
      {
        nameKey: "admin.nav.alternative_staff_template",
        path: `/${encScheduleSetup}/${encAlternativeStaffTemplate}`,
        ...permissionFor("schedule-setup", "alternative-staff-templates"),
      },
      {
        nameKey: "admin.nav.collection_point",
        path: `/${encScheduleSetup}/${encCollectionPoints}`,
        ...permissionFor("schedule-setup", "collection-points"),
      },
      {
        nameKey: "admin.nav.trip_plans",
        path: `/${encScheduleSetup}/${encTripPlans}`,
        ...permissionFor("schedule-setup", "trip-plans"),
      },
    ],
  },
];

// Split from the legacy "schedule-masters" section — day-to-day execution resources.
export const scheduleOperationsItems: NavItem[] = [
  {
    nameKey: "admin.nav.schedule_operations",
    icon: <Route size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.daily_trip_plan",
        path: `/${encScheduleOperations}/${encDailyTripAssignment}`,
        ...permissionFor("schedule-operations", "daily-trip-assignments"),
      },
      {
        nameKey: "admin.nav.daily_trip_tracking",
        path: `/${encScheduleOperations}/${encDailyTripTracking}`,
        ...permissionFor("schedule-operations", "daily-trip-tracking"),
      },
      {
        nameKey: "admin.nav.static_route_map",
        path: `/${encScheduleOperations}/${encStaticRouteMap}`,
        ...permissionFor("schedule-operations", "static-route-map"),
      },
      {
        nameKey: "admin.nav.bin_collection_event",
        path: `/${encScheduleOperations}/${encBinCollectionEvent}`,
        ...permissionFor("schedule-operations", "bin-collection-events"),
      },
      {
        nameKey: "admin.nav.waste_collected_data",
        path: `/${encScheduleOperations}/${encWasteCollectedData}`,
        ...permissionFor("schedule-operations", "wastecollections"),
      },
      {
        nameKey: "admin.nav.daily_trip_log",
        path: `/${encScheduleOperations}/${encDailyTripLog}`,
        ...permissionFor("schedule-operations", "daily-trip-logs"),
      },
      {
        nameKey: "Vehicle Breakdown",
        path: `/${encScheduleOperations}/${encVehicleBreakdown}`,
        ...permissionFor("schedule-operations", "vehicle-breakdowns"),
      },
      {
        nameKey: "admin.nav.trip_retrip_request",
        path: `/${encScheduleOperations}/${encTripRetripRequest}`,
        ...permissionFor("schedule-operations", "retrip-requests"),
      },
      {
        nameKey: "Trip Delays",
        path: `/${encScheduleOperations}/${encTripDelayReport}`,
        ...permissionFor("schedule-operations", "trip-delay-reports"),
      },
    ],
  },
];

export const wasteReportItems: NavItem[] = [
  {
    nameKey: "admin.nav.waste_reports",
    icon: <PieChart size={18} />,
    subItems: [
      {
        nameKey: "Daily Waste Comparison",
        path: `/${encReport}/${encDailyWasteComparison}`,
        ...permissionFor("reports", "daily-waste-comparisons"),
      },
      {
        nameKey: "admin.nav.monthly_waste_comparison",
        path: `/${encReport}/${encMonthlyWasteComparison}`,
        ...permissionFor("reports", "monthly-waste-comparison"),
      },
    ],
  },
];

export const auditItems: NavItem[] = [
  {
    nameKey: "admin.nav.audits",
    icon: <FileSearch size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.audit_dashboard",
        path: `/${encAudits}/${encAuditDashboard}`,
        ...permissionFor("audits", "audit-dashboard"),
      },
      {
        nameKey: "admin.nav.common_audit",
        path: `/${encAudits}/${encCommonAudit}`,
        ...permissionFor("audits", "common-audit"),
      },
      {
        nameKey: "admin.nav.login_audit",
        path: `/${encAudits}/${encLoginAudits}`,
        ...permissionFor("audits", "login-audit"),
      },
      {
        nameKey: "admin.nav.user_access_audit",
        path: `/${encAudits}/${encPermissionAudit}`,
        ...permissionFor("audits", "permission-audit"),
      },
      {
        nameKey: "admin.nav.static_route_audit",
        path: `/${encAudits}/${encStaticRouteAudit}`,
        ...permissionFor("audits", "static-route-audit"),
      },
      {
        nameKey: "admin.nav.complaint_audit",
        path: `/${encAudits}/${encComplaintAudit}`,
        ...permissionFor("audits", "complaint-audit"),
      },
    ],
  },
];

export const fleetReportItems: NavItem[] = [
  {
    nameKey: "admin.nav.fleet_reports",
    icon: <BarChart3 size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.vehicle_tracking",
        path: `/${encVehicleTracking}/${encVehicleTrack}`,
        ...permissionFor("fleet-reports", "vehicle-track"),
      },
      {
        nameKey: "admin.nav.vehicle_history",
        path: `/${encVehicleTracking}/${encVehicleHistory}`,
        ...permissionFor("fleet-reports", "vehicle-history"),
      },
      {
        nameKey: "admin.nav.trip_summary",
        path: `/${encReport}/${encTripSummary}`,
        ...permissionFor("fleet-reports", "trip-summary"),
      },
      {
        nameKey: "admin.nav.monthly_distance",
        path: `/${encReport}/${encMonthlyDistance}`,
        ...permissionFor("fleet-reports", "monthly-distance"),
      },
      {
        nameKey: "admin.nav.waste_collected_summary",
        path: `/${encReport}/${encWasteCollectedSummary}`,
        ...permissionFor("fleet-reports", "waste-collected-summary"),
      },
    ],
  },
  // One permission row covers the menu and both reports (SCREEN_GROUPS
  // "weighbridge-management" in the backend's screen_dependencies.py).
  {
    nameKey: "admin.nav.workforce_management",
    icon: <Briefcase size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.day_report",
        path: `/${encWorkforceManagement}/${encDayReport}`,
        ...permissionFor("fleet-reports", "day-report"),
      },
      {
        nameKey: "admin.nav.date_report",
        path: `/${encWorkforceManagement}/${encDateReport}`,
        ...permissionFor("fleet-reports", "date-report"),
      },
    ],
  },
];

/** Every sidebar section in render order (AppSidebar groups them by MODULE_GROUPS). */
export const SIDEBAR_SECTIONS: { key: SidebarSectionKey; items: NavItem[] }[] = [
  { key: "main", items: navItems },
  { key: "attendance", items: attendanceItems },
  { key: "superadminMaster", items: superadminMasterItems },
  { key: "commonMaster", items: commonMasterItems },
  { key: "master", items: masterItems },
  { key: "leaderManagement", items: leaderManagementItems },
  { key: "wasteType", items: wasteTypeItems },
  { key: "screenManagement", items: screenManagementItems },
  { key: "roleAssigns", items: roleAssignsItems },
  { key: "staffManagement", items: staffManagementMasters },
  { key: "customerMasters", items: customerMasters },
  { key: "complaintMasters", items: complaintMastersItems },
  { key: "complaintTicket", items: complaintTicketItems },
  { key: "transportMasters", items: transportMastersItems },
  { key: "scheduleSetup", items: scheduleSetupItems },
  { key: "scheduleOperations", items: scheduleOperationsItems },
  { key: "wasteReports", items: wasteReportItems },
  { key: "auditItems", items: auditItems },
  { key: "fleetReports", items: fleetReportItems },
];

/**
 * Pages with no sidebar entry of their own (opened from another page's tabs
 * or links) whose catalog screen is known: the router gates them the same way.
 */
const ROUTE_ONLY_PAGES: Array<{ path: string; module: string; screens: string[] }> = [
  {
    path: `/${encScheduleOperations}/${encDailyTripCollectionPoint}`,
    ...permissionFor("schedule-operations", "daily-trip-collection-points"),
  },
  {
    path: `/${encScheduleOperations}/${encDailyTripHouseholdCollection}`,
    ...permissionFor("schedule-operations", "daily-trip-household-collections"),
  },
  {
    path: `/${encWorkforceManagement}/${encWorkforceManagement}`,
    ...permissionFor("fleet-reports", "weighbridge-management"),
  },
];

/**
 * Every page the sidebar opens (plus ROUTE_ONLY_PAGES) with the permission it
 * checks, flattened from SIDEBAR_SECTIONS. `matchPaths` (e.g. the Complaint Types tab routes) are
 * listed too: they are the same page, so they need the same grant.
 */
export const SIDEBAR_PAGES: Array<{ path: string; module: string; screens: string[] }> =
  SIDEBAR_SECTIONS.flatMap(({ items }) =>
    items.flatMap((item): Array<NavMatchable & NavPermission> =>
      item.subItems?.length ? item.subItems : [item],
    ),
  ).flatMap((entry) =>
    entry.module && entry.screens?.length
      ? [entry.path, ...(entry.matchPaths ?? [])]
          .filter((path): path is string => Boolean(path))
          .map((path) => ({ path, module: entry.module!, screens: entry.screens! }))
      : [],
  ).concat(ROUTE_ONLY_PAGES);
