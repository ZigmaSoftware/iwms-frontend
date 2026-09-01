import { encryptSegment } from "./routeCrypto";

export type EncryptedRoutes = {
  encAttendance: string;
  encAdmins: string;
  encAudits: string;
  encCities: string;
  encCitizenGrivence: string;
  encCollectionMonitoring: string;
  encPanchayatBaseCollection: string;
  encWardBaseCollection: string;
  encComplaint: string;
  encComplaintModules: string;
  encComplaintCategories: string;
  encComplaintSubcategories: string;
  encComplaintFeedback: string;
  encComplaintMasters: string;
  encComplaintPriorities: string;
  encComplaintStatuses: string;
  encComplaintSources: string;
  encComplaintTeams: string;
  encComplaintSlaRules: string;
  // renamed from encCitizenGrivence/encComplaint/encMainComplaintCategory/
  // encSubComplaintCategory to match the backend's "complaint-ticket" group
  encComplaintTicket: string;
  encTickets: string;
  encCategories: string;
  encSubcategories: string;
  encContinents: string;
  encCountries: string;
  encBins: string;
  encDepartments: string;
  encDesignations: string;
  encCustomerCreation: string;
  encApartmentList: string;
  encCustomerMaster: string;
  encDistricts: string;
  encFeedback: string;
  encFuel: string;
  encMainComplaintCategory: string;
  encMasters: string;
  encStaffMasters: string;
  encScheduleMasters: string;
  // split from encScheduleMasters to match the backend's schedule-setup /
  // schedule-operations groups; encScheduleMasters is kept for the
  // reporting sub-resources still registered under that legacy group
  encScheduleSetup: string;
  encScheduleOperations: string;
  encStaffTemplate: string;
  encAlternativeStaffTemplate: string;
  encStaffTemplateAudit: string;
  encMonthlyDistance: string;
  encProperties: string;
  encReport: string;
  encStaffCreation: string;
  encStaffUserType: string;
  encStates: string;
  encSubComplaintCategory: string;
  encSubProperties: string;
  encTripSummary: string;
  encUserCreation: string;
  encUserScreenPermission: string;
  encStaffAccessConfiguration: string;

  encUserType: string;
  encVehicleCreation: string;
  encVehicleHistory: string;
  encVehicleTrack: string;
  encVehicleTracking: string;
  encVehicleType: string;
  encWasteCollectedData: string;
  encWasteCollectedSummary: string;
  encMonthlyWasteComparison: string;
  encWasteManagementMaster: string;
  encWards: string;
  encBlocks: string;
  encCollectionPoints: string;
  encPlants: string;
  encWasteTypes: string;
  encDateReport: string;
  encDayReport: string;
  encWorkforceManagement: string;
  encZones: string;
  encSupervisorZoneMap: string;
  encSupervisorZoneAccessAudit: string;
  encTransportMaster: string;
  encMainScreenType: string;
  encUserScreenAction: string;
  encMainScreen: string;
  encUserScreen: string;
  encTripPlans: string;
  encDailyTripAssignment: string;
  encDailyTripCollectionPoint: string;
  encDailyTripHouseholdCollection: string;
  encDailyTripTracking: string;
  encStaticRouteMap: string;
  encDailyTripLog: string;
  encBinCollectionEvent: string;
  encDailyWasteComparison: string;
  encSchedulerConfig: string;
  encBinLoadLog: string;
  encCustomerTag: string;
  encHouseholdPickupEvent: string;
  encZonePropertyLoadTracker: string;
  encUnassignedStaffPool: string;
  encTripAttendance: string;
  encVehicleTripAudit: string;
  encTripExceptionLog: string;
  encVehicleBreakdown: string;
  encTripRetripRequest: string;
  encTripDelayReport: string;

  // dashboard
  encDashboardOverall: string;
  encDashboardLiveMap: string;
  encDashboardVehicleManagement: string;
  encDashboardWasteCollection: string;
  encDashboardResources: string;
  encDashboardGrievances: string;
  encDashboardAlerts: string;
  encDashboardReports: string;
  encDashboardWeighBridge: string;
  encDashboardBins: string;

  encCompanyCreation: string;
  encCommonAudit: string;
  encLoginAudits: string;
  encProjectCreation: string;
  encSuperAdminMaster: string;


  encPanchayats: string;
  encBlockPanchayatUnions: string;
  encHierarchies: string;
  encPanchayatLeaders: string;
  encDistrictLeaders: string;

};

const plainRoutes: EncryptedRoutes = {
  encAttendance: "attendance",
  encAdmins: "admins",
  encAudits: "audits",
  encCities: "cities",
  encCitizenGrivence: "citizen-grievance",
  encCollectionMonitoring: "collection-monitoring",
  encPanchayatBaseCollection: "panchayat-base-collection",
  encWardBaseCollection: "ward-base-collection",
  encComplaint: "complaint",
  encComplaintModules: "modules",
  encComplaintCategories: "categories",
  encComplaintSubcategories: "subcategories",
  encComplaintFeedback: "feedback",
  encComplaintMasters: "masters",
  encComplaintPriorities: "priorities",
  encComplaintStatuses: "statuses",
  encComplaintSources: "sources",
  encComplaintTeams: "teams",
  encComplaintSlaRules: "sla-rules",
  encComplaintTicket: "complaint-ticket",
  encTickets: "tickets",
  encCategories: "categories",
  encSubcategories: "subcategories",
  encContinents: "continents",
  encCountries: "countries",
  encBins: "bins",
  encDepartments: "departments",
  encDesignations: "designations",
  encCustomerCreation: "customer-creation",
  encApartmentList: "apartment-list",
  encCustomerMaster: "customer-master",
  encSuperAdminMaster: "superadmin-masters",
  encCompanyCreation: "company-creation",
  encCommonAudit: "common-audit",
  encLoginAudits: "login-audits",
  encProjectCreation: "project-creation",
  encDistricts: "districts",
  encFeedback: "feedback",
  encFuel: "fuel",
  encMainComplaintCategory: "main-complaint-category",
  encMasters: "masters",
  encStaffMasters: "staff-masters",
  encScheduleMasters: "schedule-masters",
  encScheduleSetup: "schedule-setup",
  encScheduleOperations: "schedule-operations",
  encStaffTemplate: "staff-template",
  encAlternativeStaffTemplate: "alternative-staff-template",
  encStaffTemplateAudit: "staff-template-audit",
  encMonthlyDistance: "monthly-distance",
  encProperties: "properties",
  encReport: "reports",
  encStaffCreation: "staff-creation",
  encStaffUserType: "staff-user-type",
  encStates: "states",
  encSubComplaintCategory: "sub-complaint-category",
  encSubProperties: "sub-properties",
  encTripSummary: "trip-summary",
  encUserCreation: "user-creation",

  encUserType: "user-type",
  encVehicleCreation: "vehicle-creation",
  encVehicleHistory: "vehicle-history",
  encVehicleTrack: "vehicle-track",
  encVehicleTracking: "vehicle-tracking",
  encVehicleType: "vehicle-type",
  encWasteCollectedData: "waste-collected-data",
  encWasteCollectedSummary: "waste-collected-summary",
  encMonthlyWasteComparison: "monthly-waste-comparison",
  encWasteManagementMaster: "waste-management",
  encWards: "wards",
  encBlocks: "blocks",
  encCollectionPoints: "collection-points",
  encPlants: "plants",
  encWasteTypes: "waste-types",
  encDateReport: "date-report",
  encDayReport: "day-report",
  encWorkforceManagement: "workforce-management",
  encZones: "zones",
  encSupervisorZoneMap: "supervisor-zone-map",
  encSupervisorZoneAccessAudit: "supervisor-zone-access-audit",
  encTransportMaster: "transport-master",
  encMainScreenType: "mainscreen-type",
  encUserScreenAction: "userscreen-action",
  encMainScreen: "mainscreens",
  encUserScreen: "userscreens",
  encUserScreenPermission: "userscreenpermissions",
  encStaffAccessConfiguration: "staff-access-configuration",
  encTripPlans: "trip-plans",
  encDailyTripAssignment: "daily-trip-assignment",
  encDailyTripCollectionPoint: "daily-trip-collection-point",
  encDailyTripHouseholdCollection: "daily-trip-household-collection",
  encDailyTripTracking: "daily-trip-tracking",
  encStaticRouteMap: "static-route-map",
  encDailyTripLog: "daily-trip-log",
  encBinCollectionEvent: "bin-collection-event",
  encDailyWasteComparison: "daily-waste-comparisons",
  encSchedulerConfig: "scheduler-config",
  encBinLoadLog: "bin-load-log",
  encCustomerTag: "customer-tag",
  encHouseholdPickupEvent: "household-pickup-event",
  encZonePropertyLoadTracker: "zone-property-load-tracker",
  encUnassignedStaffPool: "unassigned-staff-pool",
  encTripAttendance: "trip-attendance",
  encVehicleTripAudit: "vehicle-trip-audit",
  encTripExceptionLog: "trip-exception-log",
  encVehicleBreakdown: "vehicle-breakdowns",
  encTripRetripRequest: "retrip-requests",
  encTripDelayReport: "trip-delay-reports",

  // palakkad

  encPanchayats: "panchayats",
  encBlockPanchayatUnions: "block-panchayat-unions",
  encHierarchies: "hierarchies",
  encPanchayatLeaders: "panchayat-leaders",
  encDistrictLeaders: "district-leaders",


  //dashboard

  encDashboardOverall: "dashboard-overall",
  encDashboardLiveMap: "dashboard-map",
  encDashboardVehicleManagement: "dashboard-vehicle",
  encDashboardWasteCollection: "dashboard-waste-collection",
  encDashboardResources: "dashboard-resources",
  encDashboardGrievances: "dashboard-grievances",
  encDashboardAlerts: "dashboard-alerts",
  encDashboardReports: "dashboard-reports",
  encDashboardWeighBridge: "dashboard-weighbridge",
  encDashboardBins: "dashboard-bins"

  
};

const encryptRoutes = (routes: EncryptedRoutes): EncryptedRoutes => {
  return Object.fromEntries(
    Object.entries(routes).map(([key, value]) => [key, encryptSegment(value)]),
  ) as EncryptedRoutes;
};

const encryptedDefaults = encryptRoutes(plainRoutes);

export function getEncryptedRoute(
  overrides?: Partial<EncryptedRoutes>,
): EncryptedRoutes {
  if (!overrides || Object.keys(overrides).length === 0) {
    return encryptedDefaults;
  }

  const merged = {
    ...plainRoutes,
    ...overrides,
  };

  return encryptRoutes(merged as EncryptedRoutes);
}
