import { getEncryptedRoute } from "@/utils/routeCache";
import { decryptSegment } from "@/utils/routeCrypto";

export type RouteEntry = {
  path: string;
  nameKey: string;
  parentNameKey?: string;
};

let _cache: RouteEntry[] | null = null;

const getDecodedRouteKey = (pathname: string): string | null => {
  const [masterSegment, moduleSegment] = pathname.split("/").filter(Boolean);
  if (!masterSegment || !moduleSegment) return null;

  const master = decryptSegment(masterSegment) ?? masterSegment;
  const moduleName = decryptSegment(moduleSegment) ?? moduleSegment;
  return `${master}/${moduleName}`;
};

export function buildNavRouteMap(): RouteEntry[] {
  if (_cache) return _cache;

  const {
    encAttendance,
    encMasters,
    encAudits,
    encContinents,
    encCountries,
    encDepartments,
    encDesignations,
    encStates,
    encDistricts,
    encCities,
    encWards,
    encBlocks,
    encCollectionPoints,
    encPlants,
    encWasteTypes,
    encZones,
    encProperties,
    encSubProperties,
    encStaffCreation,
    encAdmins,
    encUserScreen,
    encUserType,
    encCustomerMaster,
    encCustomerCreation,
    encApartmentList,
    encReport,
    encMonthlyDistance,
    encTripSummary,
    encWasteCollectedSummary,
    encMonthlyWasteComparison,
    encComplaintTicket,
    encComplaint,
    encComplaintModules,
    encComplaintCategories,
    encComplaintSubcategories,
    encComplaintPriorities,
    encComplaintStatuses,
    encComplaintSources,
    encComplaintTeams,
    encComplaintSlaRules,
    encFeedback,
    encTransportMaster,
    encFuel,
    encVehicleCreation,
    encVehicleHistory,
    encVehicleTrack,
    encVehicleTracking,
    encVehicleType,
    encCollectionMonitoring,
    encPanchayatBaseCollection,
    encWardBaseCollection,
    encWasteCollectedData,
    encWasteManagementMaster,
    encWorkforceManagement,
    encStaffUserType,
    encMainScreenType,
    encUserScreenAction,
    encMainScreen,
    encUserScreenPermission,
    encStaffAccessConfiguration,
    encStaffMasters,
    encStaffTemplate,
    encAlternativeStaffTemplate,
    encStaffTemplateAudit,
    encCommonAudit,
    encLoginAudits,
    encSupervisorZoneMap,
    encSupervisorZoneAccessAudit,
    encTripPlans,
    encZonePropertyLoadTracker,
    encVehicleTripAudit,
    encTripExceptionLog,
    encCompanyCreation,
    encProjectCreation,
    encSuperAdminMaster,
    encPanchayats,
    encPanchayatLeaders,
    encDistrictLeaders,
  
    encBins,
    encScheduleMasters,
    encScheduleSetup,
    encScheduleOperations,
    encDailyTripAssignment,
    encDailyTripCollectionPoint,
    encDailyTripTracking,
    encStaticRouteMap,
    encBinCollectionEvent,
    encDailyTripLog,
    encDailyWasteComparison,
    encSchedulerConfig,
    encVehicleBreakdown,
    encTripRetripRequest,
    encTripDelayReport,
  } = getEncryptedRoute();

  _cache = [
    { path: "/admin", nameKey: "admin.nav.dashboard" },
    { path: `/${encAttendance}/${encAttendance}`, nameKey: "admin.nav.attendance" },
    // SuperAdmin Masters
    { path: `/${encSuperAdminMaster}/${encCompanyCreation}`, nameKey: "admin.nav.company", parentNameKey: "admin.nav.superAdmin_masters" },
    { path: `/${encSuperAdminMaster}/${encProjectCreation}`, nameKey: "admin.nav.project", parentNameKey: "admin.nav.superAdmin_masters" },
    // Common Masters
    { path: `/${encMasters}/${encContinents}`, nameKey: "admin.nav.continent", parentNameKey: "admin.nav.common_masters" },
    { path: `/${encMasters}/${encCountries}`, nameKey: "admin.nav.country", parentNameKey: "admin.nav.common_masters" },
    { path: `/${encMasters}/${encStates}`, nameKey: "admin.nav.state", parentNameKey: "admin.nav.common_masters" },
    // Masters — CRT hierarchy order (SWM Rules 2026)
    // Org / Department Setup
    { path: `/${encMasters}/${encDepartments}`, nameKey: "admin.nav.department", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encDesignations}`, nameKey: "admin.nav.designation", parentNameKey: "admin.nav.masters" },
    // Administrative / Geographic Hierarchy
    { path: `/${encMasters}/${encDistricts}`, nameKey: "admin.nav.district", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encZones}`, nameKey: "admin.nav.zone", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encCities}`, nameKey: "admin.nav.city", parentNameKey: "admin.nav.masters" },

    // Operational / Field Level
    { path: `/${encMasters}/${encWards}`, nameKey: "admin.nav.ward", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encBlocks}`, nameKey: "admin.nav.block", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encPanchayats}`, nameKey: "admin.nav.panchayat", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encPanchayatLeaders}`, nameKey: "admin.nav.panchayat_leader", parentNameKey: "admin.nav.masters" },
    { path: `/${encMasters}/${encDistrictLeaders}`, nameKey: "admin.nav.district_leader", parentNameKey: "admin.nav.masters" },
    // Waste Types
    { path: `/${encMasters}/${encProperties}`, nameKey: "admin.nav.property", parentNameKey: "admin.nav.wastetype" },
    { path: `/${encMasters}/${encSubProperties}`, nameKey: "admin.nav.sub_property", parentNameKey: "admin.nav.wastetype" },
    // Assets
    { path: `/${encMasters}/${encCollectionPoints}`, nameKey: "admin.nav.collection_point", parentNameKey: "admin.nav.assets" },
    { path: `/${encMasters}/${encWasteTypes}`, nameKey: "common.waste_type", parentNameKey: "admin.nav.assets" },
    { path: `/${encMasters}/${encBins}`, nameKey: "common.bins", parentNameKey: "admin.nav.assets" },
    { path: `/${encMasters}/${encPlants}`, nameKey: "admin.nav.plant", parentNameKey: "admin.nav.masters" },
    // Screen Managements
    { path: `/${encAdmins}/${encMainScreenType}`, nameKey: "admin.nav.main_screen_type", parentNameKey: "admin.nav.screenManagements" },
    { path: `/${encAdmins}/${encMainScreen}`, nameKey: "admin.nav.main_screen", parentNameKey: "admin.nav.screenManagements" },
    { path: `/${encAdmins}/${encUserScreen}`, nameKey: "admin.nav.user_screen", parentNameKey: "admin.nav.screenManagements" },
    { path: `/${encAdmins}/${encUserScreenAction}`, nameKey: "admin.nav.user_screen_action", parentNameKey: "admin.nav.screenManagements" },
    { path: `/${encAdmins}/${encUserScreenPermission}`, nameKey: "admin.nav.companywise_user_screen_permission", parentNameKey: "admin.nav.screenManagements" },
    // Role Assigns
    { path: `/${encAdmins}/${encUserType}`, nameKey: "admin.nav.user_type", parentNameKey: "admin.nav.roleAssigns" },
    { path: `/${encAdmins}/${encStaffUserType}`, nameKey: "admin.nav.staff_user_type", parentNameKey: "admin.nav.roleAssigns" },
    // User Creations
    { path: `/${encStaffMasters}/${encStaffCreation}`, nameKey: "admin.nav.staff_creation", parentNameKey: "admin.nav.user_creations" },
    { path: `/${encStaffMasters}/${encStaffTemplate}`, nameKey: "admin.nav.staff_template", parentNameKey: "admin.nav.user_creations" },
    { path: `/${encStaffMasters}/${encAlternativeStaffTemplate}`, nameKey: "admin.nav.alternative_staff_template", parentNameKey: "admin.nav.user_creations" },
    { path: `/${encStaffMasters}/${encSupervisorZoneMap}`, nameKey: "admin.nav.supervisor_zone_map", parentNameKey: "admin.nav.user_creations" },
    { path: `/${encAdmins}/${encStaffAccessConfiguration}`, nameKey: "admin.nav.staff_access_configuration", parentNameKey: "admin.nav.user_creations" },
    // Process Items
    { path: `/${encTransportMaster}/${encZonePropertyLoadTracker}`, nameKey: "admin.nav.zone_property_load_tracker", parentNameKey: "admin.nav.process_items" },
    // Customer Masters
    { path: `/${encCustomerMaster}/${encCustomerCreation}`, nameKey: "admin.nav.customer_creation", parentNameKey: "admin.nav.customer_masters" },
    { path: `/${encCustomerMaster}/${encApartmentList}`, nameKey: "admin.nav.apartment_list", parentNameKey: "admin.nav.customer_masters" },
    { path: `/${encComplaintTicket}/${encFeedback}`, nameKey: "admin.nav.feedback", parentNameKey: "admin.nav.customer_masters" },
    // Complaint Ticketing
    { path: `/${encComplaintTicket}/${encComplaint}`, nameKey: "admin.nav.complaint_tickets", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintModules}`, nameKey: "admin.nav.modules", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintCategories}`, nameKey: "admin.nav.categories", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintSubcategories}`, nameKey: "admin.nav.subcategories", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintPriorities}`, nameKey: "admin.nav.priorities", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintStatuses}`, nameKey: "admin.nav.statuses", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintSources}`, nameKey: "admin.nav.sources", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintTeams}`, nameKey: "admin.nav.teams", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encComplaintSlaRules}`, nameKey: "admin.nav.sla_rules", parentNameKey: "admin.nav.complaint_ticket" },
    { path: `/${encComplaintTicket}/${encFeedback}`, nameKey: "admin.nav.feedback", parentNameKey: "admin.nav.complaint_ticket" },
    // Transport Masters
    { path: `/${encTransportMaster}/${encVehicleType}`, nameKey: "admin.nav.vehicle_type", parentNameKey: "admin.nav.transport_masters" },
    { path: `/${encTransportMaster}/${encVehicleCreation}`, nameKey: "admin.nav.vehicle_creation", parentNameKey: "admin.nav.transport_masters" },
    { path: `/${encTransportMaster}/${encTripPlans}`, nameKey: "admin.nav.trip_plans", parentNameKey: "admin.nav.transport_masters" },
    { path: `/${encTransportMaster}/${encFuel}`, nameKey: "admin.nav.fuel", parentNameKey: "admin.nav.transport_masters" },
    // Schedule Setup (split from the legacy "schedule-masters" group)
    { path: `/${encScheduleSetup}/${encStaffTemplate}`, nameKey: "admin.nav.staff_template", parentNameKey: "admin.nav.schedule_setup" },
    { path: `/${encScheduleSetup}/${encAlternativeStaffTemplate}`, nameKey: "admin.nav.alternative_staff_template", parentNameKey: "admin.nav.schedule_setup" },
    { path: `/${encScheduleSetup}/${encCollectionPoints}`, nameKey: "admin.nav.collection_point", parentNameKey: "admin.nav.schedule_setup" },
    { path: `/${encScheduleSetup}/${encTripPlans}`, nameKey: "admin.nav.trip_plans", parentNameKey: "admin.nav.schedule_setup" },
    // Schedule Operations (split from the legacy "schedule-masters" group)
    { path: `/${encScheduleOperations}/${encDailyTripAssignment}`, nameKey: "admin.nav.daily_trip_plan", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encDailyTripCollectionPoint}`, nameKey: "admin.nav.daily_trip_collection_point", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encDailyTripTracking}`, nameKey: "admin.nav.daily_trip_tracking", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encStaticRouteMap}`, nameKey: "admin.nav.static_route_map", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encBinCollectionEvent}`, nameKey: "admin.nav.bin_collection_event", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encWasteCollectedData}`, nameKey: "admin.nav.waste_collected_data", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encDailyTripLog}`, nameKey: "admin.nav.daily_trip_log", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encVehicleBreakdown}`, nameKey: "Vehicle Breakdown", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encTripRetripRequest}`, nameKey: "admin.nav.trip_retrip_request", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encTripDelayReport}`, nameKey: "Trip Delays", parentNameKey: "admin.nav.schedule_operations" },
    { path: `/${encScheduleOperations}/${encSchedulerConfig}`, nameKey: "admin.nav.scheduler_config", parentNameKey: "admin.nav.schedule_operations" },
    // Waste reports still use the legacy encrypted schedule-masters route.
    // Keep both entries in the breadcrumb map because these are the paths used
    // by the sidebar (the reports-master aliases below remain valid too).
    { path: `/${encScheduleMasters}/${encDailyWasteComparison}`, nameKey: "Daily Waste Comparison", parentNameKey: "admin.nav.waste_reports" },
    { path: `/${encScheduleMasters}/${encMonthlyWasteComparison}`, nameKey: "admin.nav.monthly_waste_comparison", parentNameKey: "admin.nav.waste_reports" },
    // Audits
    { path: `/${encAudits}/${encCommonAudit}`, nameKey: "admin.nav.common_audit", parentNameKey: "admin.nav.audit_items" },
    { path: `/${encAudits}/${encLoginAudits}`, nameKey: "admin.nav.login_audit", parentNameKey: "admin.nav.audit_items" },
    { path: `/${encTransportMaster}/${encVehicleTripAudit}`, nameKey: "admin.nav.vehicle_trip_audit", parentNameKey: "admin.nav.audit_items" },
    { path: `/${encTransportMaster}/${encTripExceptionLog}`, nameKey: "admin.nav.trip_exception_log", parentNameKey: "admin.nav.audit_items" },
    { path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`, nameKey: "admin.nav.supervisor_zone_access_audit", parentNameKey: "admin.nav.audit_items" },
    { path: `/${encStaffMasters}/${encStaffTemplateAudit}`, nameKey: "admin.nav.staff_template_audit", parentNameKey: "admin.nav.audit_items" },
    // Vehicle Tracking
    { path: `/${encVehicleTracking}/${encVehicleTrack}`, nameKey: "admin.nav.vehicle_tracking", parentNameKey: "admin.nav.vehicle_tracking" },
    { path: `/${encVehicleTracking}/${encVehicleHistory}`, nameKey: "admin.nav.vehicle_history", parentNameKey: "admin.nav.vehicle_tracking" },
    // Waste Management
    { path: `/${encWasteManagementMaster}/${encCollectionMonitoring}`, nameKey: "admin.nav.collection_monitoring", parentNameKey: "admin.nav.waste_management" },
    { path: `/${encWasteManagementMaster}/${encPanchayatBaseCollection}`, nameKey: "admin.nav.panchayat_base_collection", parentNameKey: "admin.nav.waste_management" },
    { path: `/${encWasteManagementMaster}/${encWardBaseCollection}`, nameKey: "admin.nav.ward_base_collection", parentNameKey: "admin.nav.waste_management" },
    // Workforce Management
    { path: `/${encWorkforceManagement}/${encWorkforceManagement}`, nameKey: "admin.nav.workforce_management", parentNameKey: "admin.nav.workforce_management" },
    // Reports
    { path: `/${encReport}/${encTripSummary}`, nameKey: "admin.nav.trip_summary", parentNameKey: "admin.nav.reports" },
    { path: `/${encReport}/${encMonthlyDistance}`, nameKey: "admin.nav.monthly_distance", parentNameKey: "admin.nav.reports" },
    { path: `/${encReport}/${encWasteCollectedSummary}`, nameKey: "admin.nav.waste_collected_summary", parentNameKey: "admin.nav.reports" },
    { path: `/${encReport}/${encMonthlyWasteComparison}`, nameKey: "admin.nav.monthly_waste_comparison", parentNameKey: "admin.nav.reports" },
  ];

  return _cache;
}

/**
 * Match by the decrypted master/module identity instead of ciphertext.
 * CryptoJS passphrase encryption uses a fresh salt, so the same route gets a
 * different encrypted string after a full browser refresh.
 */
export function findNavRoute(pathname: string): RouteEntry | undefined {
  if (pathname === "/admin") {
    return buildNavRouteMap().find((route) => route.path === "/admin");
  }

  const currentRouteKey = getDecodedRouteKey(pathname);
  if (!currentRouteKey) return undefined;

  return buildNavRouteMap().find(
    (route) =>
      route.path !== "/admin" &&
      getDecodedRouteKey(route.path) === currentRouteKey,
  );
}
