import { decryptSegment } from "@/utils/routeCrypto";
import { adminApi } from "./registry";
import type { AdminEntity } from "./endpoints";
import type { CrudHelpers } from "./crudHelpers";

const routeEntityBySlug: Record<string, AdminEntity> = {
  "company-creation": "companies",
  "project-creation": "projects",
  continents: "continents",
  countries: "countries",
  states: "states",
  districts: "districts",
  cities: "cities",
  zones: "zones",
  wards: "wards",
  panchayats: "panchayats",
  hierarchies: "hierarchies",
  "block-panchayat-unions": "blockPanchayatUnions",
  "panchayat-leaders": "panchayatLeaders",
  "district-leaders": "districtLeaders",
  departments: "departments",
  designations: "designations",
  properties: "properties",
  "sub-properties": "subProperties",
  "collection-points": "collectionPoints",
  "waste-types": "wasteTypes",
  bins: "bins",
  "mainscreen-type": "mainScreenTypes",
  mainscreens: "mainScreens",
  userscreens: "userScreens",
  "userscreen-action": "userScreenActions",
  userscreenpermissions: "companyWiseScreenPermissions",
  "user-type": "userTypes",
  "staff-user-type": "staffUserTypes",
  "staff-creation": "staffCreation",
  "staff-template": "staffTemplateCreation",
  "alternative-staff-template": "alternativeStaffTemplate",
  "supervisor-zone-map": "supervisorZoneMap",
  "customer-creation": "customerCreations",
  "apartment-list": "customerCreations",
  feedback: "feedbacks",
  complaint: "complaintTickets",
  categories: "complaintCategories",
  subcategories: "complaintSubcategories",
  priorities: "complaintPriorities",
  statuses: "complaintStatuses",
  sources: "complaintSources",
  teams: "complaintTeams",
  "main-complaint-category": "complaintCategories",
  "sub-complaint-category": "complaintSubcategories",
  "vehicle-type": "vehicleTypes",
  "vehicle-creation": "vehicleCreations",
  "trip-plans": "tripPlans",
  fuel: "fuels",
  "daily-trip-assignment": "dailyTripAssignment",
  "daily-trip-collection-point": "dailyTripCollectionPoint",
  "daily-trip-household-collection": "dailyTripHouseholdCollection",
  "bin-collection-event": "binCollectionEvent",
  "collection-monitoring": "binCollectionEvent",
  "daily-trip-log": "dailyTripLog",
  "daily-waste-comparisons": "dailyWasteComparison",
  "monthly-waste-comparison": "monthlyWasteComparison",
  "vehicle-breakdowns": "vehicleBreakdown",
  "waste-collected-data": "wasteCollections",
  "zone-property-load-tracker": "zonePropertyLoadTrackers",
  "unassigned-staff-pool": "unassignedStaffPool",
  "trip-attendance": "tripAttendances",
  "vehicle-trip-audit": "vehicleTripAudits",
  "trip-exception-log": "tripExceptionLogs",
  "bin-load-log": "binLoadLogs",
  "common-audit": "commonAudits",
  "login-audit": "loginAudits",
  "login-audits": "loginAudits",
};

const readPlainPathSegments = () => {
  if (typeof window === "undefined") return [];

  return window.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decryptSegment(segment) ?? segment);
};

export const getCurrentAdminBulkImportApi = (): CrudHelpers | null => {
  const segments = readPlainPathSegments();
  const leaf = [...segments].reverse().find((segment) => {
    const normalized = segment.replace(/\/+$/, "");
    return Boolean(routeEntityBySlug[normalized]);
  });

  if (!leaf) return null;
  return adminApi[routeEntityBySlug[leaf.replace(/\/+$/, "")]] ?? null;
};

const STAFF_EXCLUDED_SLUGS = new Set([
  "staff-user-type",
  "staff-creation",
  "staff-template",
  "alternative-staff-template",
  "staff-template-audit",
  "staff-access-configuration",
  "supervisor-zone-map",
  "supervisor-zone-access-audit",
  "unassigned-staff-pool",
  "trip-attendance",
  // Bin Collection Event owns its own client-side fetch/filter/pagination
  // (binCollectionEventList.tsx). Letting SafeDataTable also drive it in
  // server/lazy mode races two independent fetches against the same
  // endpoint whenever a column filter (e.g. collection_date) changes,
  // which crashes the render (blank page) with no error boundary to catch it.
  "bin-collection-event",
  "collection-monitoring",
  // Companywise User Screen Permission list groups the flat, one-row-per
  // (project, mainscreen, userscreen, action) API rows into one summary row
  // per project (userScreenPermissionList.tsx). SafeDataTable's server/lazy
  // mode fetches raw ungrouped rows straight from the API on every page
  // change, which replaced the grouped rows with the flat list as soon as
  // the user paged past page 1.
  "userscreenpermissions",
]);

export const getCurrentAdminServerListApi = (): CrudHelpers | null => {
  const segments = readPlainPathSegments().map((segment) =>
    segment.replace(/\/+$/, ""),
  );
  if (segments.some((segment) => STAFF_EXCLUDED_SLUGS.has(segment))) {
    return null;
  }

  const leaf = [...segments]
    .reverse()
    .find((segment) => Boolean(routeEntityBySlug[segment]));
  if (!leaf) return null;
  return adminApi[routeEntityBySlug[leaf]] ?? null;
};
