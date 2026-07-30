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
  departments: "masters/departments",
  designations: "masters/designations",
  panchayats: "masters/panchayat",
  panchayatLeaders: "masters/panchayat-leaders",
  districtLeaders: "masters/district-leaders",
  hierarchies: "masters/hierarchy",
  blockPanchayatUnions: "masters/block-panchayat-unions",

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
  dailyTripHouseholdCollection: "schedule-operations/daily-trip-household-collections",
  binCollectionEvent: "schedule-operations/bin-collection-events",
  vehicleBreakdown: "schedule-operations/vehicle-breakdowns",
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
  usersCreation: "user-creations/users-creation",
  staffCreation: "user-creations/staffcreation",
  supervisorZoneMap: "user-creations/supervisor-zone-map",
  unassignedStaffPool: "user-creations/unassigned-staff-pool",
  staffAccessConfiguration: "user-creations/staff-access-configuration",

  /* =========================
     PROCESS
  ========================= */
  zonePropertyLoadTrackers: "process-items/zone-property-load-tracker",

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
     COMPLAINT TICKET (renamed from the legacy "grivences" group)
  ========================= */
  complaints: "complaint-ticket/tickets",
  mainCategory: "complaint-ticket/categories",
  subCategory: "complaint-ticket/subcategories",

  /* =========================
     TRANSPORT MASTERS
  ========================= */
  vehicleTypes: "transport-masters/vehicle-type",
  vehicleCreations: "transport-masters/vehicle-creation",
  tripAttendances: "transport-masters/trip-attendance",
  fuels: "transport-masters/fuels",

  /* =========================
     AUDITS
  ========================= */
  vehicleTripAudits: "audits/vehicle-trip-audit",
  tripExceptionLogs: "audits/trip-exception-log",
  binLoadLogs: "audits/bin-load-log",
  supervisorZoneAccessAudits: "audits/supervisor-zone-access-audit",
  staffTemplateAuditLogs: "audits/stafftemplate-audit-log",
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
