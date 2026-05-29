/* --------------------------------------------------------
   Admin endpoint registry (Grouped)
-------------------------------------------------------- */
export const adminEndpoints = {

   /* =========================
     SuperAdmin
  ========================= */
  companies: "superadmin/company",
  projects: "superadmin/project",

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
  
  wasteTypes: "assets/waste-types",
  panchayats: "masters/panchayat",
  areatypes: "masters/areatypes",
  hierarchies: "masters/hierarchy",

  /* =========================
     WASTE TYPES
  ========================= */
  properties: "waste-types/properties",
  subProperties: "waste-types/subproperties",

  /* =========================
     ASSETS
  ========================= */
  bins: "assets/bins",
  collectionPoints: "assets/collection-point",
 
//   bins: "bp-palakkad/bins",

  /* =========================
     SCREEN MANAGEMENT
  ========================= */
  mainScreenTypes: "screen-managements/mainscreentype",
  mainScreens: "screen-managements/mainscreens",
  userScreens: "screen-managements/userscreens",
  userScreenActions: "screen-managements/userscreen-action",
  companyWiseScreenPermissions:
    "screen-managements/companywisescreenpermissions",
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
  staffTemplateCreation: "user-creations/stafftemplate-creation",
  alternativeStaffTemplate:
    "user-creations/alternative-stafftemplate",
  supervisorZoneMap: "user-creations/supervisor-zone-map",
  unassignedStaffPool: "user-creations/unassigned-staff-pool",

  /* =========================
     PROCESS
  ========================= */
  routePlans: "process-items/route-plans",
  zonePropertyLoadTrackers:
    "process-items/zone-property-load-tracker",

  /* =========================
     AUTHENTICATION
  ========================= */
  loginUser: "login/login-user",
  userpermission : "login/my-permissions",
  

  /* =========================
     CUSTOMERS
  ========================= */
  customerCreations: "customer-masters/customercreations",
  wasteCollections: "customer-masters/wastecollections",
  
  feedbacks: "customer-masters/feedbacks",

  /* =========================
     CUSTOMERS
  ========================= */
   pointCollections: "collections/point-collection",
   panchayatWiseCollections: "collections/panchayat-wise",
   wardWiseCollections: "collections/ward-wise",

  /* =========================
     GRIEVANCES
  ========================= */
  complaints: "grivences/complaints",
  mainCategory: "grivences/main-category",
  subCategory: "grivences/sub-category",

  /* =========================
     TRANSPORT MASTERS
  ========================= */
  vehicleTypes: "transport-masters/vehicle-type",
  vehicleCreations: "transport-masters/vehicle-creation",
  tripDefinitions: "transport-masters/trip-definition",
  tripInstances: "transport-masters/trip-instance",
   tripAttendances: "transport-masters/trip-attendance",
   fuels: "transport-masters/fuels",
   dailyTripAssignment: "transport-masters/daily-trip-assignment",
   dailyTripLog: "transport-masters/daily-trip-log",

  /* =========================
     AUDITS
  ========================= */
  vehicleTripAudits: "audits/vehicle-trip-audit",
  tripExceptionLogs: "audits/trip-exception-log",
  binLoadLogs: "audits/bin-load-log",
  supervisorZoneAccessAudits:
    "audits/supervisor-zone-access-audit",
  staffTemplateAuditLogs:
    "audits/stafftemplate-audit-log",
  commonAudits: "audits/common-audit",
  monthlyWasteComparison: "reports/monthly-waste-comparison",
} as const;

export type AdminEntity = keyof typeof adminEndpoints;

export const getAdminEndpointPath = (
  entity: AdminEntity
): string => {
  const path = adminEndpoints[entity];
  return path.startsWith("/") ? path : `/${path}`;
};
