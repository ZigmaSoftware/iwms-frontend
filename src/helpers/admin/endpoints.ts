/* --------------------------------------------------------
   Admin endpoint registry (Grouped)
-------------------------------------------------------- */
export const adminEndpoints = {

  /* =========================
     SUPERADMIN
  ========================= */
  companies: "superadmin/company",
  projects: "superadmin/project",

  /* =========================
     AUTHENTICATION
  ========================= */
  loginUser: "login/login-user",
  userpermission: "login/my-permissions",

  /* =========================
     COMMON MASTERS
  ========================= */
  continents: "common-masters/continents",
  countries: "common-masters/countries",
  states: "common-masters/states",

  /* =========================
     MASTERS
  ========================= */
  districts: "masters/districts",
  cities: "masters/cities",
  zones: "masters/zones",
  wards: "masters/wards",
  departments: "staff-creations/departments",
  designations: "staff-creations/designations",
  panchayats: "masters/panchayat",
  panchayatLeaders: "masters/panchayat-leaders",
  districtLeaders: "masters/district-leaders",
  blockPanchayatUnions: "masters/block-panchayat-unions",
  plants: "masters/plants",

  /* =========================
     WASTE TYPES
  ========================= */
  properties: "waste-types/properties",
  subProperties: "waste-types/subproperties",

  /* =========================
     WASTE TYPES (merged from the legacy "assets" group — the old
     assets/waste-types + assets/bins endpoints now live here)
  ========================= */
  wasteTypes: "waste-types/wastetypes",
  bins: "waste-types/bins",

  /* =========================
     SCHEDULE SETUP (split from the legacy "schedule-masters" group —
     template/plan setup resources)
  ========================= */
  collectionPoints: "schedule-setup/collection-points",
  staffTemplateCreation: "schedule-setup/staff-templates",
  alternativeStaffTemplate: "schedule-setup/alternative-staff-templates",
  tripPlans: "schedule-setup/trip-plans",

  /* =========================
     SCHEDULE OPERATIONS (split from the legacy "schedule-masters" group —
     day-to-day execution resources)
  ========================= */
  dailyTripAssignment: "schedule-operations/daily-trip-assignments",
  dailyTripLog: "schedule-operations/daily-trip-logs",
  dailyTripCollectionPoint: "schedule-operations/daily-trip-collection-points",
  routeDetourWaypoints: "schedule-operations/route-detour-waypoints",
  dailyTripHouseholdCollection: "schedule-operations/daily-trip-household-collections",
  binCollectionEvent: "schedule-operations/bin-collection-events",
  vehicleBreakdown: "schedule-operations/vehicle-breakdowns",
  retripRequests: "schedule-operations/retrip-requests",
  tripDelayReports: "schedule-operations/trip-delay-reports",
  schedulerConfig: "schedule-operations/daily-trip-assignments/scheduler-config/",
  wasteCollections: "schedule-operations/wastecollections",

  /* =========================
     SCHEDULE MASTERS (legacy name — kept only for the reporting
     sub-resources still registered under it; see base_urls.py)
  ========================= */
  dailyWasteComparison: "schedule-masters/daily-waste-comparisons",
  monthlyWasteComparison: "schedule-masters/monthly-waste-comparison",

  /* =========================
     SCREEN MANAGEMENT
  ========================= */
  mainScreenTypes: "screen-managements/mainscreentype",
  mainScreens: "screen-managements/mainscreens",
  userScreens: "screen-managements/userscreens",
  userScreenActions: "screen-managements/userscreen-action",
  companyWiseScreenPermissions: "screen-managements/companywisescreenpermissions",
  columnPermissions: "screen-managements/column-permissions",

  /* =========================
     ROLE ASSIGNMENT
  ========================= */
  userTypes: "role-assigns/user-type",
  staffUserTypes: "role-assigns/staffusertypes",
  roleTypes: "role-assigns/staffusertypes/role-choices",
  contractorUserTypes: "role-assigns/contractorusertypes",
  contractorRoleTypes: "role-assigns/contractorusertypes/role-choices",

  /* =========================
     USER CREATION
  ========================= */
  staffCreation: "staff-creations/staffcreation",
  staffAccessConfiguration: "staff-creations/staff-access-configuration",

  /* =========================
     CUSTOMERS
  ========================= */
  customerCreations: "customer-masters/customercreations",
  feedbacks: "customer-masters/feedbacks",

  /* =========================
     COLLECTIONS
  ========================= */
  panchayatWiseCollections: "collections/panchayat-wise",
  wardWiseCollections: "collections/ward-wise",

  /* =========================
     COMPLAINT TICKETING
  ========================= */
  // ── SUPER ADMIN: global complaint configuration (complaint-masters) ──
  // Writable only for holders of the superadmin-only "complaint-masters"
  // module. The `complaint-ticket/*` twins further down are the same tables
  // exposed read-only so the Desk can fill its dropdowns.
  complaintMasterTypes: "complaint-masters/types",
  complaintMasterCategories: "complaint-masters/categories",
  complaintMasterSubcategories: "complaint-masters/subcategories",
  complaintMasterSlaRules: "complaint-masters/sla-rules",
  complaintMasterRoutingRules: "complaint-masters/routing-rules",
  complaintMasterModules: "complaint-masters/modules",
  complaintMasterPriorities: "complaint-masters/priorities",
  complaintMasterStatuses: "complaint-masters/statuses",
  complaintMasterSources: "complaint-masters/sources",
  complaintMasterLanguages: "complaint-masters/languages",

  // ── CORE MODULES: company/project-scoped entries ──
  complaintTickets: "complaint-ticket/tickets",
  complaintModules: "complaint-ticket/modules",
  complaintCategories: "complaint-ticket/categories",
  complaintSubcategories: "complaint-ticket/subcategories",
  complaintPriorities: "complaint-ticket/priorities",
  complaintStatuses: "complaint-ticket/statuses",
  complaintSources: "complaint-ticket/sources",
  complaintLanguages: "complaint-ticket/languages",
  complaintTeams: "complaint-ticket/teams",
  complaintSlaRules: "complaint-ticket/sla-rules",
  complaintRoutingRules: "complaint-ticket/routing-rules",
  complaintFeedback: "complaint-ticket/feedback",
  complaintReopenHistory: "complaint-ticket/reopen-history",
  complaintAddressChange: "complaint-ticket/address-change",
  complaintNotifications: "complaint-ticket/notifications",

  // Legacy aliases kept for older imports/bookmarks.
  complaints: "complaint-ticket/tickets",
  mainCategory: "complaint-ticket/categories",
  subCategory: "complaint-ticket/subcategories",

  /* =========================
     TRANSPORT MASTERS
  ========================= */
  vehicleTypes: "transport-masters/vehicle-type",
  vehicleCreations: "transport-masters/vehicle-creation",
  fuels: "transport-masters/fuels",

  /* =========================
     DASHBOARD
  ========================= */
  dashboardSummary: "dashboard/summary",

  /* =========================
     AUDITS
  ========================= */
   loginAudits: "audits/login-audit",
   commonAudits: "audits/common-audit",
} as const;

export type AdminEntity = keyof typeof adminEndpoints;

export const getAdminEndpointPath = (
  entity: AdminEntity
): string => {
  const path = adminEndpoints[entity];
  return path.startsWith("/") ? path : `/${path}`;
};
