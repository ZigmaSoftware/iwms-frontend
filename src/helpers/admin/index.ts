// helpers/admin/index.ts
// --------------------------------------------------------------
// Consolidated Admin Services Export
// --------------------------------------------------------------

import { adminApi } from "./registry";

// Master Data
export const continentApi = adminApi.continents;
export const countryApi = adminApi.countries;
export const binApi = adminApi.bins;
export const stateApi = adminApi.states;
export const districtApi = adminApi.districts;
export const cityApi = adminApi.cities;
export const zoneApi = adminApi.zones;
export const wardApi = adminApi.wards;
export const subPropertiesApi = adminApi.subProperties;
export const propertiesApi = adminApi.properties;
export const zonePropertyLoadTrackerApi = adminApi.zonePropertyLoadTrackers;

// Staff & User Management
export const staffCreationApi = adminApi.staffCreation;
export const staffUserTypeApi = adminApi.staffUserTypes;
export const userTypeApi = adminApi.userTypes;
export const userCreationApi = adminApi.usercreations;
export const staffTemplateApi = adminApi.staffTemplate;
export const staffTemplateAuditLogApi = adminApi.staffTemplateAuditLog;
export const alternativeStaffTemplateApi = adminApi.alternativeStaffTemplate;
export const supervisorZoneMapApi = adminApi.supervisorZoneMap;
export const supervisorZoneAccessAuditApi = adminApi.supervisorZoneAccessAudit;

// Transport & Customer
export const fuelApi = adminApi.fuels;
export const vehicleTypeApi = adminApi.vehicleTypes;
export const vehicleCreationApi = adminApi.vehicleCreations;
export const tripDefinitionApi = adminApi.tripDefinitions;
export const binLoadLogApi = adminApi.binLoadLogs;
export const tripInstanceApi = adminApi.tripInstances;
export const tripAttendanceApi = adminApi.tripAttendances;
export const vehicleTripAuditApi = adminApi.vehicleTripAudits;
export const tripExceptionLogApi = adminApi.tripExceptionLogs;
export const customerCreationApi = adminApi.customerCreations;
export const customerTagApi = adminApi.customerTags;
export const householdPickupEventApi = adminApi.householdPickupEvents;
export const unassignedStaffPoolApi = adminApi.unassignedStaffPool;

// Operations
export const wasteCollectionApi = adminApi.wasteCollections;
export const complaintApi = adminApi.complaints;
export const feedbackApi = adminApi.feedbacks;
export const mainCategoryApi = adminApi.mainCategory;
export const subCategoryApi = adminApi.SubCategory;

// Screens & Permissions
export const mainScreenTypeApi = adminApi.mainscreentype;
export const mainScreenApi = adminApi.mainscreens;
export const userScreenApi = adminApi.userscreens;
export const userScreenActionApi = adminApi.userscreenaction;
export const userScreenPermissionApi = adminApi.userscreenpermissions;


// Utilities
export * from "./endpoints";
export * from "./crudHelpers";
