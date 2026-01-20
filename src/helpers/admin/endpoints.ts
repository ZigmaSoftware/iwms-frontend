/* --------------------------------------------------------
   Admin endpoint registry (Grouped)
-------------------------------------------------------- */
export const adminEndpoints = {
  /* =========================
     MASTERS
  ========================= */
  continents: "masters/continents",
  countries: "masters/countries",
  bins: "masters/bins",
  states: "masters/states",
  districts: "masters/districts",
  cities: "masters/cities",
  zones: "masters/zones",
  wards: "masters/wards",

  /* =========================
     ASSETS
  ========================= */
  fuels: "assets/fuels",
  properties: "assets/properties",
  subProperties: "assets/subproperties",
  zonePropertyLoadTrackers: "assets/zone-property-load-tracker",

  /* =========================
     SCREEN MANAGEMENT
  ========================= */
  mainscreentype: "screen-management/mainscreentype",
  mainscreens: "screen-management/mainscreens",
  userscreens: "screen-management/userscreens",
  userscreenaction: "screen-management/userscreen-action",
  userscreenpermissions: "screen-management/userscreenpermissions",

  /* =========================
     ROLE ASSIGNMENT
  ========================= */
  userTypes: "role-assign/user-type",
  staffUserTypes: "role-assign/staffusertypes",

  /* =========================
     USER CREATION
  ========================= */
  usercreations: "user-creation/users-creation",
  staffCreation: "user-creation/staffcreation",
  staffTemplate: "user-creation/stafftemplate-creation",
  alternativeStaffTemplate: "user-creation/alternative-stafftemplate",
  staffTemplateAuditLog: "user-creation/stafftemplate-audit-log",
  supervisorZoneMap: "user-creation/supervisor-zone-map",
  supervisorZoneAccessAudit: "user-creation/supervisor-zone-access-audit",

  /* =========================
     Login
  ========================= */
  
  loginUser: "login/login-user",

  /* =========================
     CUSTOMERS
  ========================= */
  customerCreations: "customers/customercreations",
  wasteCollections: "customers/wastecollections",
  feedbacks: "customers/feedbacks",
  complaints: "customers/complaints",
  customerTags: "customers/customer-tag",
  householdPickupEvents: "customers/household-pickup-event",
  mainCategory: "customers/main-category",
  SubCategory: "customers/sub-category",
  

  /* =========================
     VEHICLES
  ========================= */
  vehicleTypes: "vehicles/vehicle-type",
  vehicleCreations: "vehicles/vehicle-creation",
  tripDefinitions: "vehicles/trip-definition",
  tripInstances: "vehicles/trip-instance",
  binLoadLogs: "vehicles/bin-load-log",
  tripAttendances: "vehicles/trip-attendance",
  vehicleTripAudits: "vehicles/vehicle-trip-audit",
  tripExceptionLogs: "vehicles/trip-exception-log",
  routePlans: "user-creation/route-plans",
  unassignedStaffPool: "user-creation/unassigned-staff-pool",
} as const;

export type AdminEntity = keyof typeof adminEndpoints;

export const getAdminEndpointPath = (entity: AdminEntity): string => {
  const path = adminEndpoints[entity];
  return path.startsWith("/") ? path : `/${path}`;
};
