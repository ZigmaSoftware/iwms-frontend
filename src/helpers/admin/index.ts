// helpers/admin/index.ts
// --------------------------------------------------------------
// Consolidated Admin Services Export (Aligned with adminEndpoints)
// --------------------------------------------------------------

import { adminApi } from "./registry";

/* =========================
   SUPERADMIN
========================= */
export const companyApi = adminApi.companies;
export const projectApi = adminApi.projects;


/* =========================
   COMMON MASTERS
========================= */
export const continentApi = adminApi.continents;
export const countryApi = adminApi.countries;
export const stateApi = adminApi.states;

/* =========================
   MASTERS
========================= */
export const districtApi = adminApi.districts;
export const cityApi = adminApi.cities;
export const zoneApi = adminApi.zones;
export const wardApi = adminApi.wards;

/* =========================
   WASTE TYPES
========================= */
export const propertiesApi = adminApi.properties;
export const subPropertiesApi = adminApi.subProperties;

/* =========================
   ASSETS
========================= */
export const binApi = adminApi.bins;

/* =========================
   SCREEN MANAGEMENT
========================= */
export const mainScreenTypeApi = adminApi.mainScreenTypes;
export const mainScreenApi = adminApi.mainScreens;
export const userScreenApi = adminApi.userScreens;
export const userScreenActionApi = adminApi.userScreenActions;
export const userScreenPermissionApi =
  adminApi.companyWiseScreenPermissions;

/* =========================
   ROLE ASSIGNMENT
========================= */
export const userTypeApi = adminApi.userTypes;
export const staffUserTypeApi = adminApi.staffUserTypes;

/* =========================
   USER CREATION
========================= */
export const userCreationApi = adminApi.usersCreation;
export const staffCreationApi = adminApi.staffCreation;
export const staffTemplateApi = adminApi.staffTemplateCreation;
export const alternativeStaffTemplateApi =
  adminApi.alternativeStaffTemplate;
export const supervisorZoneMapApi = adminApi.supervisorZoneMap;
export const unassignedStaffPoolApi =
  adminApi.unassignedStaffPool;

/* =========================
   PROCESS
========================= */
export const routePlanApi = adminApi.routePlans;
export const zonePropertyLoadTrackerApi =
  adminApi.zonePropertyLoadTrackers;

/* =========================
   AUTHENTICATION
========================= */
export const loginApi = adminApi.loginUser;

/* =========================
   CUSTOMERS
========================= */
export const customerCreationApi = adminApi.customerCreations;
export const wasteCollectionApi = adminApi.wasteCollections;
export const feedbackApi = adminApi.feedbacks;

/* =========================
   GRIEVANCES
========================= */
export const complaintApi = adminApi.complaints;
export const mainCategoryApi = adminApi.mainCategory;
export const subCategoryApi = adminApi.subCategory;

/* =========================
   TRANSPORT MASTERS
========================= */
export const vehicleTypeApi = adminApi.vehicleTypes;
export const vehicleCreationApi = adminApi.vehicleCreations;
export const tripDefinitionApi = adminApi.tripDefinitions;
export const tripInstanceApi = adminApi.tripInstances;
export const tripAttendanceApi = adminApi.tripAttendances;
export const fuelApi = adminApi.fuels;

/* =========================
   AUDITS
========================= */
export const vehicleTripAuditApi =
  adminApi.vehicleTripAudits;
export const tripExceptionLogApi =
  adminApi.tripExceptionLogs;
export const binLoadLogApi = adminApi.binLoadLogs;
export const supervisorZoneAccessAuditApi =
  adminApi.supervisorZoneAccessAudits;
export const staffTemplateAuditLogApi =
  adminApi.staffTemplateAuditLogs;

/* =========================
   UTILITIES
========================= */
export * from "./endpoints";
export * from "./crudHelpers";
