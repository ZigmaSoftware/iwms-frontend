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
export const departmentApi = adminApi.departments;
export const designationApi = adminApi.designations;
export const collectionPointApi = adminApi.collectionPoints;
export const plantApi = adminApi.plants;
export const wasteTypeApi = adminApi.wasteTypes;
export const panchayatApi = adminApi.panchayats;
export const panchayatLeaderApi = adminApi.panchayatLeaders;
export const districtLeaderApi = adminApi.districtLeaders;
export const blockPanchayatUnionApi = adminApi.blockPanchayatUnions;


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
export const userScreenPermissionApi = adminApi.companyWiseScreenPermissions;
export const columnPermissionApi = adminApi.columnPermissions;

/* =========================
   ROLE ASSIGNMENT
========================= */
export const userTypeApi = adminApi.userTypes;
export const staffUserTypeApi = adminApi.staffUserTypes;
export const roleTypesApi = adminApi.roleTypes;
export const contractorUserTypeApi = adminApi.contractorUserTypes;
export const contractorRoleTypesApi = adminApi.contractorRoleTypes;

/* =========================
   USER CREATION
========================= */
export const staffCreationApi = adminApi.staffCreation;
export const staffTemplateApi = adminApi.staffTemplateCreation;
export const alternativeStaffTemplateApi = adminApi.alternativeStaffTemplate;
export const staffAccessConfigurationApi = adminApi.staffAccessConfiguration;

/* =========================
   AUTHENTICATION
========================= */
export const loginApi = adminApi.loginUser;

/* =========================
   CUSTOMERS
========================= */
export const customerCreationApi = adminApi.customerCreations;
// NOTE: householdPickupEvents removed — not defined in adminEndpoints
export const wasteCollectionApi = adminApi.wasteCollections;
export const panchayatWiseCollectionApi = adminApi.panchayatWiseCollections;
export const wardWiseCollectionApi = adminApi.wardWiseCollections;
export const feedbackApi = adminApi.feedbacks;
// export const collectionMonitoringApi = adminApi.pointCollections;

/* =========================
   DASHBOARD
========================= */
export const dashboardSummaryApi = adminApi.dashboardSummary;

/* =========================
   COMPLAINT TICKETING
========================= */
export const complaintTicketApi = adminApi.complaintTickets;
export const complaintModuleApi = adminApi.complaintModules;
export const complaintCategoryApi = adminApi.complaintCategories;
export const complaintSubcategoryApi = adminApi.complaintSubcategories;
export const complaintPriorityApi = adminApi.complaintPriorities;
export const complaintStatusApi = adminApi.complaintStatuses;
export const complaintSourceApi = adminApi.complaintSources;
export const complaintLanguageApi = adminApi.complaintLanguages;
export const complaintTeamApi = adminApi.complaintTeams;
export const complaintSlaRuleApi = adminApi.complaintSlaRules;
export const complaintRoutingRuleApi = adminApi.complaintRoutingRules;
export const complaintFeedbackApi = adminApi.complaintFeedback;

// Legacy aliases kept for older dashboard widgets.
export const complaintApi = adminApi.complaintTickets;
export const mainCategoryApi = adminApi.complaintCategories;
export const subCategoryApi = adminApi.complaintSubcategories;

/* =========================
   TRANSPORT MASTERS
========================= */
export const vehicleTypeApi = adminApi.vehicleTypes;
export const vehicleCreationApi = adminApi.vehicleCreations;
export const tripPlanApi = adminApi.tripPlans;
export const fuelApi = adminApi.fuels;
export const dailyTripAssignmentApi = adminApi.dailyTripAssignment;
export const dailyTripLogApi = adminApi.dailyTripLog;
export const dailyTripCollectionPointApi = adminApi.dailyTripCollectionPoint;
export const routeDetourWaypointApi = adminApi.routeDetourWaypoints;
export const dailyTripHouseholdCollectionApi = adminApi.dailyTripHouseholdCollection;
export const binCollectionEventApi = adminApi.binCollectionEvent;
export const dailyWasteComparisonApi = adminApi.dailyWasteComparison;
export const vehicleBreakdownApi = adminApi.vehicleBreakdown;
export const retripRequestApi = adminApi.retripRequests;

/* =========================
   AUDITS
========================= */
export const commonAuditApi = adminApi.commonAudits;
export const monthlyWasteComparisonApi = adminApi.monthlyWasteComparison;

/* =========================
   UTILITIES
========================= */
export * from "./endpoints";
export * from "./crudHelpers";
