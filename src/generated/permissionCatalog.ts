// AUTO-GENERATED — do not edit by hand.
// Source:     iwms-backend/app/utils/permission_catalog.py
// Regenerate: cd iwms-backend && python manage.py sync_permission_catalog
//
// The one list of permission modules and screens, shared with the backend
// seeder and ModulePermissionMiddleware. Sidebar entries name their
// permission through `permissionFor`, so a module/screen that does not exist
// in the backend catalog is a TypeScript error.

export const PERMISSION_CATALOG = {
  "dashboard": {
    label: "Dashboard",
    section: "dashboard",
    screens: {
      "admin-dashboard": { label: "Admin Dashboard", group: null },
    },
  },
  "superadmin-masters": {
    label: "SuperAdmin Masters",
    section: "super-admin",
    screens: {
      "company": { label: "Company", group: null },
      "project": { label: "Project", group: null },
    },
  },
  "screen-managements": {
    label: "Screen Management",
    section: "super-admin",
    screens: {
      "mainscreentype": { label: "MainScreen Type", group: null },
      "mainscreens": { label: "MainScreen", group: null },
      "userscreens": { label: "User Screen", group: null },
      "userscreen-action": { label: "UserScreen Action", group: null },
      "companywisescreenpermissions": { label: "Companywise User Screen Permission", group: null },
      "app-modules": { label: "App Modules", group: null },
    },
  },
  "role-assigns": {
    label: "Role Management",
    section: "super-admin",
    screens: {
      "user-type": { label: "User Type", group: null },
      "staffusertypes": { label: "Staff User Type", group: "staff-user-type" },
      "contractorusertypes": { label: "Contractor User Type", group: "staff-user-type" },
      "project-staff-hierarchy": { label: "Project Staff Hierarchy", group: null },
    },
  },
  "staff-creations": {
    label: "Staff Management",
    section: "super-admin",
    screens: {
      "department-masters": { label: "Department Master", group: null },
      "designation-masters": { label: "Designation Master", group: null },
      "staffcreation": { label: "Staff Creation", group: null },
      "staff-access-configuration": { label: "Staff Access Configuration", group: null },
    },
  },
  "common-masters": {
    label: "Common Masters",
    section: "super-admin",
    screens: {
      "continents": { label: "Continent", group: null },
      "countries": { label: "Country", group: null },
      "states": { label: "State", group: null },
    },
  },
  "complaint-masters": {
    label: "Complaint Masters",
    section: "super-admin",
    screens: {
      "types": { label: "Types", group: "complaint-types" },
      "categories": { label: "Categories", group: "complaint-types" },
      "subcategories": { label: "Subcategories", group: "complaint-types" },
      "sla-rules": { label: "SLA Rules", group: "complaint-types" },
    },
  },
  "audits": {
    label: "Audits",
    section: "super-admin",
    screens: {
      "audit-dashboard": { label: "Audit Dashboard", group: null },
      "common-audit": { label: "Common Audit", group: null },
      "login-audit": { label: "Login Audit", group: null },
      "permission-audit": { label: "User Access Audit", group: null },
      "static-route-audit": { label: "Static Route Audit", group: null },
      "complaint-audit": { label: "Complaint Audit", group: null },
    },
  },
  "masters": {
    label: "Location Masters / Leader Management",
    section: "masters",
    screens: {
      "districts": { label: "District", group: null },
      "cities": { label: "City", group: null },
      "zones": { label: "Zone", group: null },
      "wards": { label: "Ward", group: null },
      "panchayat": { label: "PLB (Participating Local Bodies)", group: null },
      "panchayat-leaders": { label: "PLB Leader", group: null },
      "district-leaders": { label: "District Leader", group: null },
      "plants": { label: "Plant", group: null },
    },
  },
  "waste-types": {
    label: "Waste Masters",
    section: "masters",
    screens: {
      "properties": { label: "Property", group: null },
      "subproperties": { label: "SubProperty", group: null },
      "bins": { label: "Bin Creation", group: null },
      "waste type": { label: "Waste Type", group: null },
    },
  },
  "transport-masters": {
    label: "Transport Masters",
    section: "masters",
    screens: {
      "vehicle-type": { label: "Vehicle Type", group: null },
      "vehicle-creation": { label: "Vehicle Creation", group: null },
      "fuels": { label: "Fuel", group: null },
    },
  },
  "customers": {
    label: "Customer Masters",
    section: "masters",
    screens: {
      "customercreations": { label: "Customer Creation", group: null },
      "customer-access-configuration": { label: "Customer App Access", group: null },
      "apartment-list": { label: "Apartment List", group: null },
    },
  },
  "schedule-setup": {
    label: "Schedule Setup",
    section: "core-modules",
    screens: {
      "staff-templates": { label: "Staff Template", group: null },
      "alternative-staff-templates": { label: "Alternative Staff Template", group: null },
      "collection-points": { label: "Collection Point", group: null },
      "trip-plans": { label: "Trip Plans", group: null },
    },
  },
  "schedule-operations": {
    label: "Daily Operations",
    section: "core-modules",
    screens: {
      "daily-trip-assignments": { label: "Trip Assignments", group: "daily-trip-plan" },
      "daily-trip-collection-points": { label: "Trip Collection Points", group: "daily-trip-plan" },
      "daily-trip-household-collections": { label: "Household Collection Points", group: "daily-trip-plan" },
      "daily-trip-tracking": { label: "Daily Trip Tracking", group: null },
      "static-route-map": { label: "Static Route Map", group: null },
      "bin-collection-events": { label: "Secondary Bin Collection Event", group: null },
      "daily-trip-logs": { label: "Daily Trip Logs", group: null },
      "wastecollections": { label: "Household Collections", group: null },
      "vehicle-breakdowns": { label: "Vehicle Breakdown", group: null },
      "trip-delay-reports": { label: "Trip Delays", group: null },
      "retrip-requests": { label: "Re-Trip Requests", group: null },
      "staff-notifications": { label: "Staff Notifications (mobile app)", group: null },
    },
  },
  "complaint-ticket": {
    label: "Complaint Management",
    section: "core-modules",
    screens: {
      "tickets": { label: "Tickets", group: "complaint-desk" },
      "reopen-history": { label: "Reopen History", group: "complaint-desk" },
      "address-change": { label: "Address Change Requests", group: "complaint-desk" },
      "notifications": { label: "Ticket Notifications", group: "complaint-desk" },
      "my-tasks": { label: "My Tasks", group: null },
      "feedback": { label: "Feedback", group: null },
    },
  },
  "attendance": {
    label: "Attendance",
    section: "core-modules",
    screens: {
      "attendance": { label: "Attendance", group: null },
    },
  },
  "reports": {
    label: "Waste & Complaint Reports",
    section: "reports",
    screens: {
      "daily-waste-comparisons": { label: "Daily Waste Comparison", group: null },
      "monthly-waste-comparison": { label: "Monthly Waste Comparison", group: null },
      "complaints-report": { label: "Complaints Report", group: null },
    },
  },
  "fleet-reports": {
    label: "Fleet & Reports",
    section: "reports",
    screens: {
      "vehicle-track": { label: "Vehicle Tracking", group: null },
      "vehicle-history": { label: "Vehicle History", group: null },
      "trip-summary": { label: "Trip Summary", group: null },
      "monthly-distance": { label: "Monthly Distance", group: null },
      "waste-collected-summary": { label: "Waste Collected Summary", group: null },
      "weighbridge-management": { label: "Weighbridge Management", group: "weighbridge-management" },
      "date-report": { label: "Date Report", group: "weighbridge-management" },
      "day-report": { label: "Day Report", group: "weighbridge-management" },
    },
  },
} as const;

export const SCREEN_GROUPS = {
  "daily-trip-plan": { label: "Daily Trip Plan", screens: ["daily-trip-assignments", "daily-trip-collection-points", "daily-trip-household-collections"] },
  "staff-user-type": { label: "Staff User Type", screens: ["staffusertypes", "contractorusertypes"] },
  "weighbridge-management": { label: "Weighbridge Management", screens: ["weighbridge-management", "date-report", "day-report"] },
  "complaint-types": { label: "Complaint Types", screens: ["types", "categories", "subcategories", "sla-rules"] },
  "complaint-desk": { label: "Complaint Desk", screens: ["tickets", "reopen-history", "address-change", "notifications"] },
} as const;

export type PermissionModule = keyof typeof PERMISSION_CATALOG;

export type PermissionScreen<M extends PermissionModule> =
  keyof (typeof PERMISSION_CATALOG)[M]["screens"] & string;

/** The permission a sidebar entry checks: one module, one or more screens. */
export const permissionFor = <M extends PermissionModule>(
  module: M,
  ...screens: [PermissionScreen<M>, ...PermissionScreen<M>[]]
): { module: M; screens: string[] } => ({ module, screens });
