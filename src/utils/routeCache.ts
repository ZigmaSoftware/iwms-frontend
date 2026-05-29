import { encryptSegment } from "./routeCrypto";

export type EncryptedRoutes = {
  encAdmins: string;
  encAudits: string;
  encCities: string;
  encCitizenGrivence: string;
  encCollectionMonitoring: string;
  encPanchayatBaseCollection: string;
  encWardBaseCollection: string;
  encComplaint: string;
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

  encUserType: string;
  encVehicleCreation: string;
  encVehicleHistory: string;
  encVehicleTrack: string;
  encVehicleTracking: string;
  encVehicleType: string;
  encWasteCollectedData: string;
  encWasteCollectedSummary: string;
  encWasteManagementMaster: string;
  encWards: string;
  encCollectionPoints: string;
  encWasteTypes: string;
  encDateReport: string;
  encDayReport: string;
  encWorkforceManagement: string;
  encZones: string;
  encRoutePlans: string;
  encSupervisorZoneMap: string;
  encSupervisorZoneAccessAudit: string;
  encTransportMaster: string;
  encMainScreenType: string;
  encUserScreenAction: string;
  encMainScreen: string;
  encUserScreen: string;
  encTripDefinition: string;
  encDailyTripAssignment: string;
  encDailyTripLog: string;
  encBinLoadLog: string;
  encCustomerTag: string;
  encHouseholdPickupEvent: string;
  encZonePropertyLoadTracker: string;
  encTripInstance: string;
  encUnassignedStaffPool: string;
  encTripAttendance: string;
  encVehicleTripAudit: string;
  encTripExceptionLog: string;

  // dashboard
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
  encProjectCreation: string;
  encSuperAdminMaster: string;


  encPanchayats: string;
  encAreaTypes: string;
  encHierarchies: string;
};

const plainRoutes: EncryptedRoutes = {
  encAdmins: "admins",
  encAudits: "audits",
  encCities: "cities",
  encCitizenGrivence: "citizen-grievance",
  encCollectionMonitoring: "collection-monitoring",
  encPanchayatBaseCollection: "panchayat-base-collection",
  encWardBaseCollection: "ward-base-collection",
  encComplaint: "complaint",
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
  encProjectCreation: "project-creation",
  encDistricts: "districts",
  encFeedback: "feedback",
  encFuel: "fuel",
  encMainComplaintCategory: "main-complaint-category",
  encMasters: "masters",
  encStaffMasters: "staff-masters",
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
  encWasteManagementMaster: "waste-management",
  encWards: "wards",
  encCollectionPoints: "collection-points",
  encWasteTypes: "waste-types",
  encDateReport: "date-report",
  encDayReport: "day-report",
  encWorkforceManagement: "workforce-management",
  encZones: "zones",
  encRoutePlans: "route-plans",
  encSupervisorZoneMap: "supervisor-zone-map",
  encSupervisorZoneAccessAudit: "supervisor-zone-access-audit",
  encTransportMaster: "transport-master",
  encMainScreenType: "mainscreen-type",
  encUserScreenAction: "userscreen-action",
  encMainScreen: "mainscreens",
  encUserScreen: "userscreens",
  encUserScreenPermission: "userscreenpermissions",
  encTripDefinition: "trip-definition",
  encDailyTripAssignment: "daily-trip-assignment",
  encDailyTripLog: "daily-trip-log",
  encBinLoadLog: "bin-load-log",
  encCustomerTag: "customer-tag",
  encHouseholdPickupEvent: "household-pickup-event",
  encZonePropertyLoadTracker: "zone-property-load-tracker",
  encTripInstance: "trip-instance",
  encUnassignedStaffPool: "unassigned-staff-pool",
  encTripAttendance: "trip-attendance",
  encVehicleTripAudit: "vehicle-trip-audit",
  encTripExceptionLog: "trip-exception-log",

  // palakkad

  encPanchayats: "panchayats",
  encAreaTypes: "area-types",
  encHierarchies: "hierarchies",

  //dashboard

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
