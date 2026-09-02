import { useMemo, type ComponentType } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { decryptSegment } from "@/utils/routeCrypto";


// Import your actual page components
import ContinentList from "@/pages/admin/modules/superadmin/commonMasters/continent/ContinentListPage";
import ContinentForm from "@/pages/admin/modules/superadmin/commonMasters/continent/ContinentForm";
import CountryList from "@/pages/admin/modules/superadmin/commonMasters/country/CountryListPage";
import CountryForm from "@/pages/admin/modules/superadmin/commonMasters/country/CountryForm";
import StateList from "@/pages/admin/modules/superadmin/commonMasters/state/StateListPage";
import StateForm from "@/pages/admin/modules/superadmin/commonMasters/state/StateForm";
import DistrictList from "@/pages/admin/modules/masters/district/DistrictListPage";
import DistrictForm from "@/pages/admin/modules/masters/district/DistrictForm";
import CityList from "@/pages/admin/modules/masters/city/CityListPage";
import CityForm from "@/pages/admin/modules/masters/city/CityForm";
import ZoneList from "@/pages/admin/modules/masters/zone/ZoneListPage";
import ZoneForm from "@/pages/admin/modules/masters/zone/ZoneForm";
import WardList from "@/pages/admin/modules/masters/ward/WardListPage";
import WardForm from "@/pages/admin/modules/masters/ward/WardForm";
import DepartmentList from "@/pages/admin/modules/superadmin/staffManagement/department/DepartmentListPage";
import DepartmentForm from "@/pages/admin/modules/superadmin/staffManagement/department/DepartmentForm";
import DesignationList from "@/pages/admin/modules/superadmin/staffManagement/designation/DesignationListPage";
import DesignationForm from "@/pages/admin/modules/superadmin/staffManagement/designation/DesignationForm";
import CollectionPointListPage from "@/pages/admin/modules/core_modules/scheduleSetup/collectionPoint/CollectionPointListPage";
import CollectionPointForm from "@/pages/admin/modules/core_modules/scheduleSetup/collectionPoint/CollectionPointForm";
import PlantListPage from "@/pages/admin/modules/masters/plant/PlantListPage";
import PlantForm from "@/pages/admin/modules/masters/plant/PlantForm";
import WasteTypeListPage from "@/pages/admin/modules/masters/wasteMasters/wasteType/WasteTypeListPage";
import WasteTypeForm from "@/pages/admin/modules/masters/wasteMasters/wasteType/WasteTypeForm";
import BinListPage from "@/pages/admin/modules/masters/wasteMasters/bin/BinListPage";
import BinForm from "@/pages/admin/modules/masters/wasteMasters/bin/BinForm";


import PanchayatListPage from "@/pages/admin/modules/masters/panchayat/PanchayatListPage";
import PanchayatForm from "@/pages/admin/modules/masters/panchayat/PanchayatForm";
import PanchayatLeaderListPage from "@/pages/admin/modules/masters/leaderManagement/panchayatLeader/PanchayatLeaderListPage";
import PanchayatLeaderForm from "@/pages/admin/modules/masters/leaderManagement/panchayatLeader/PanchayatLeaderForm";
import DistrictLeaderListPage from "@/pages/admin/modules/masters/leaderManagement/districtLeader/DistrictLeaderListPage";
import DistrictLeaderForm from "@/pages/admin/modules/masters/leaderManagement/districtLeader/DistrictLeaderForm";

import PropertyList from "@/pages/admin/modules/masters/wasteMasters/property/PropertyListPage";
import PropertyForm from "@/pages/admin/modules/masters/wasteMasters/property/PropertyForm";
import SubPropertyList from "@/pages/admin/modules/masters/wasteMasters/subproperty/SubPropertyListPage";
import SubPropertyForm from "@/pages/admin/modules/masters/wasteMasters/subproperty/SubPropertyForm";
import StaffCreationList from "@/pages/admin/modules/superadmin/staffManagement/staffCreation/staffcreationlist";
import StaffCreationForm from "@/pages/admin/modules/superadmin/staffManagement/staffCreation/staffcreationForm";
// Admin
import UserTypeList from "@/pages/admin/modules/superadmin/roleManagement/userType/user-typeList";
import UserTypeForm from "@/pages/admin/modules/superadmin/roleManagement/userType/user-typeForm";
// Customer Master
import CustomerCreationList from "@/pages/admin/modules/masters/customerMasters/customerCreations/customerCreationListPage";
import CustomerCreationForm from "@/pages/admin/modules/masters/customerMasters/customerCreations/customerCreationForm";
import ApartmentListPage from "@/pages/admin/modules/masters/customerMasters/customerCreations/apartmentListpage";
import HouseholdPickupEventList from "@/pages/admin/modules/masters/customerMasters/householdPickupEvent/householdPickupEventList";
import HouseholdPickupEventForm from "@/pages/admin/modules/masters/customerMasters/householdPickupEvent/householdPickupEventForm";

// Reports (Single components)
import TripSummary from "@/pages/admin/modules/reports/tripsummary/tripsummary";
import MonthlyDistance from "@/pages/admin/modules/reports/monthlydistance/monthlydistance";
import WasteSummary from "@/pages/admin/modules/reports/wasteCollectedSummary/wastesummary";
import MonthlyWasteComparisonListPage from "@/pages/admin/modules/reports/wasteReports/monthlyWasteComparison/MonthlyWasteComparisonListPage";
import TicketList from "@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketList";
import TicketForm from "@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketForm";
import TicketDetail from "@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketDetail";
import FeedbackList from "@/pages/admin/modules/core_modules/complaintManagement/feedback/FeedbackList";
import FuelList from "@/pages/admin/modules/masters/transportMasters/fuel/fuelListPage";
import FuelForm from "@/pages/admin/modules/masters/transportMasters/fuel/fuelForm";
import VehicleTypeCreation from "@/pages/admin/modules/masters/transportMasters/vehicleTypecreation/vehicle-typeCreationList";
import VehicleTypeCreationForm from "@/pages/admin/modules/masters/transportMasters/vehicleTypecreation/vechicle-typeCreationForm";
import VehicleCreationListPage from "@/pages/admin/modules/masters/transportMasters/vehicleCreation/vehicleCreationListPage";
import VehicleCreationForm from "@/pages/admin/modules/masters/transportMasters/vehicleCreation/vehicleCreationForm";
import TripPlanList from "@/pages/admin/modules/core_modules/scheduleSetup/tripPlan/tripPlanList";
import TripPlanForm from "@/pages/admin/modules/core_modules/scheduleSetup/tripPlan/tripPlanForm";
import VehicleTracking from "@/pages/admin/modules/vehicletracking/vehicletrack/vehicletracking";
import VehicleHistory from "@/pages/admin/modules/vehicletracking/vehiclehistory/vehiclehistory";
import WorkforceManagement from "@/pages/admin/modules/workforcemanagement/workforcemanagement";
import DateReport from "@/pages/admin/modules/workforcemanagement/datereport";
import DayReport from "@/pages/admin/modules/workforcemanagement/dayreport";
import DailyTripAssignmentList from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripAssignment/dailyTripAssignmentList"
import DailyTripAssignmentForm from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripAssignment/dailyTripAssignmentForm";
import DailyTripCollectionPointList from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripCollectionPoint/dailyTripCollectionPointList";
import DailyTripCollectionPointForm from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripCollectionPoint/dailyTripCollectionPointForm";
import DailyTripHouseholdCollectionList from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripHouseholdCollection/dailyTripHouseholdCollectionList";
import DailyTripTracking from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripTracking/DailyTripTracking";
import StaticRouteMap from "@/pages/admin/modules/core_modules/dailyOperations/staticRouteMap/StaticRouteMap";
import SchedulerConfigPage from "@/pages/admin/modules/core_modules/dailyOperations/schedulerConfig/SchedulerConfigPage";
import DailyTripLogList from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/dailyTripLogList";

import PanchayatBaseCollectionListPage from "@/pages/admin/modules/wasteManagementMasters/panchayatbasecollection/PanchayatBaseCollectionListPage";
import WardBaseCollectionListPage from "@/pages/admin/modules/wasteManagementMasters/wardbasecollection/WardBaseCollectionListPage";
import WasteCollectedDataList from "@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataListPage";
import WasteCollectedForm from "@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataForm";
import StaffUserTypeForm from "@/pages/admin/modules/superadmin/roleManagement/staffUserType/staffUserTypeForm";
import StaffUserTypeList from "@/pages/admin/modules/superadmin/roleManagement/staffUserType/staffUserTypeList";

import CategoryList from "@/pages/admin/modules/core_modules/complaintManagement/category/CategoryList";
import CategoryForm from "@/pages/admin/modules/core_modules/complaintManagement/category/CategoryForm";
import SubcategoryList from "@/pages/admin/modules/core_modules/complaintManagement/subcategory/SubcategoryList";
import SubcategoryForm from "@/pages/admin/modules/core_modules/complaintManagement/subcategory/SubcategoryForm";
import ModuleList from "@/pages/admin/modules/core_modules/complaintManagement/masters/ModuleList";
import ModuleForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/ModuleForm";
import PriorityList from "@/pages/admin/modules/core_modules/complaintManagement/masters/PriorityList";
import PriorityForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/PriorityForm";
import StatusList from "@/pages/admin/modules/core_modules/complaintManagement/masters/StatusList";
import StatusForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/StatusForm";
import SourceList from "@/pages/admin/modules/core_modules/complaintManagement/masters/SourceList";
import SourceForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/SourceForm";
import TeamList from "@/pages/admin/modules/core_modules/complaintManagement/masters/TeamList";
import TeamForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/TeamForm";
import SlaRuleList from "@/pages/admin/modules/core_modules/complaintManagement/masters/SlaRuleList";
import SlaRuleForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/SlaRuleForm";
import MainScreenTypeList from "@/pages/admin/modules/superadmin/screenManagement/mainScreenType/mainScreenTypeList";
import MainScreenTypeForm from "@/pages/admin/modules/superadmin/screenManagement/mainScreenType/mainScreenTypeForm";
import UserScreenActionList from "@/pages/admin/modules/superadmin/screenManagement/userScreenAction/userScreenActionList";
import UserScreenActionForm from "@/pages/admin/modules/superadmin/screenManagement/userScreenAction/userScreenActionForm";
import MainScreenList from "@/pages/admin/modules/superadmin/screenManagement/mainScreen/mainScreenList";
import MainScreenForm from "@/pages/admin/modules/superadmin/screenManagement/mainScreen/mainScreenForm";
import UserScreenList from "@/pages/admin/modules/superadmin/screenManagement/userScreen/userScreenList";
import UserScreenForm from "@/pages/admin/modules/superadmin/screenManagement/userScreen/userScreenForm";
import UserScreenPermissionForm from "@/pages/admin/modules/superadmin/screenManagement/userScreenPermission/userScreenPermissionForm";
import UserScreenPermissionList from "@/pages/admin/modules/superadmin/screenManagement/userScreenPermission/userScreenPermissionList";
import StaffAccessConfigList from "@/pages/admin/modules/superadmin/staffManagement/staffAccessConfiguration/StaffAccessConfigList";
import StaffAccessConfigForm from "@/pages/admin/modules/superadmin/staffManagement/staffAccessConfiguration/StaffAccessConfigForm";
import StaffTemplateList from "@/pages/admin/modules/core_modules/scheduleSetup/staffTemplate/staffTemplateList";
import StaffTemplateForm from "@/pages/admin/modules/core_modules/scheduleSetup/staffTemplate/staffTemplateForm";
import AlternativeStaffTemplateList from "@/pages/admin/modules/core_modules/scheduleSetup/alternativeStaffTemplate/alternativeStaffTemplateList";
import AlternativeStaffTemplateForm from "@/pages/admin/modules/core_modules/scheduleSetup/alternativeStaffTemplate/alternativeStaffTemplateForm";
import BinCollectionEventList from "@/pages/admin/modules/core_modules/dailyOperations/binCollectionEvent/binCollectionEventList";
import BinCollectionEventForm from "@/pages/admin/modules/core_modules/dailyOperations/binCollectionEvent/binCollectionEventForm";
import VehicleBreakdownList from "@/pages/admin/modules/core_modules/dailyOperations/vehicleBreakdown/vehicleBreakdownList";
import TripDelayReportList from "@/pages/admin/modules/core_modules/dailyOperations/tripDelayReport/tripDelayReportList";
import TripRetripRequestList from "@/pages/admin/modules/core_modules/dailyOperations/tripRetripRequest/tripRetripRequestList";
import VehicleBreakdownForm from "@/pages/admin/modules/core_modules/dailyOperations/vehicleBreakdown/vehicleBreakdownForm";
import DailyWasteComparisonList from "@/pages/admin/modules/reports/wasteReports/dailyWasteComparison/dailyWasteComparisonList";
import CommonAuditList from "@/pages/admin/modules/superadmin/audits/commonAudit/commonAuditList";
import LoginAuditList from "@/pages/admin/modules/superadmin/audits/loginAudit/loginAuditList";
import CompanyList from "@/pages/admin/modules/superadminMasters/company/companyListPage";
import CompanyListForm from "@/pages/admin/modules/superadminMasters/company/companyForm";
import ProjectList from "@/pages/admin/modules/superadminMasters/project/projectListPage";
import ProjectForm from "@/pages/admin/modules/superadminMasters/project/projectForm";
import ExternalAttendanceList from "@/pages/admin/modules/core_modules/attendance/ExternalAttendanceList";


type ModuleComponent = ComponentType | undefined;

type RouteConfig = {
  list?: ModuleComponent;
  form?: ModuleComponent;
  editForm?: ModuleComponent;
  component?: ModuleComponent;
};

type RouteMap = Record<string, Record<string, RouteConfig>>;

const ROUTES: RouteMap = {
  attendance: {
    attendance: { component: ExternalAttendanceList },
  },
  admins: {
    "user-type": { list: UserTypeList, form: UserTypeForm },
    "staff-user-type": { list: StaffUserTypeList, form: StaffUserTypeForm },
    "mainscreen-type": {list: MainScreenTypeList, form: MainScreenTypeForm},
    "userscreen-action": {list:UserScreenActionList, form: UserScreenActionForm },
    "mainscreens": {list: MainScreenList, form: MainScreenForm},
    "userscreens": {list: UserScreenList, form: UserScreenForm},
    "userscreenpermissions": {list: UserScreenPermissionList,form: UserScreenPermissionForm},
    "staff-access-configuration": { list: StaffAccessConfigList, form: StaffAccessConfigForm },
  },
  "superadmin-masters": {
    "company-creation": { list: CompanyList, form: CompanyListForm },
    "project-creation": { list: ProjectList, form: ProjectForm },
  },
  masters: {
    continents: { list: ContinentList, form: ContinentForm },
    countries: { list: CountryList, form: CountryForm },
    states: { list: StateList, form: StateForm },
    districts: { list: DistrictList, form: DistrictForm },
    cities: { list: CityList, form: CityForm },
    zones: { list: ZoneList, form: ZoneForm },
    wards: { list: WardList, form: WardForm },
    bins: { list: BinListPage, form: BinForm },
    "waste-types": { list: WasteTypeListPage, form: WasteTypeForm },
    panchayats: { list: PanchayatListPage, form: PanchayatForm },
    "panchayat-leaders": { list: PanchayatLeaderListPage, form: PanchayatLeaderForm },
    plants: { list: PlantListPage, form: PlantForm },
    "district-leaders": { list: DistrictLeaderListPage, form: DistrictLeaderForm },
    properties: { list: PropertyList, form: PropertyForm },
    "sub-properties": { list: SubPropertyList, form: SubPropertyForm },
  },
  "staff-masters": {
    departments: { list: DepartmentList, form: DepartmentForm },
    designations: { list: DesignationList, form: DesignationForm },
    "staff-creation": { list: StaffCreationList, form: StaffCreationForm },
  },
  "transport-master": {
    fuel: { list: FuelList, form: FuelForm },
    "vehicle-type": { list: VehicleTypeCreation, form: VehicleTypeCreationForm },
    "vehicle-creation": { list: VehicleCreationListPage, form: VehicleCreationForm },
  },
  // Split from the legacy "schedule-masters" bucket — template/plan setup resources.
  "schedule-setup": {
    "staff-template": {list: StaffTemplateList, form: StaffTemplateForm},
    "alternative-staff-template": {list: AlternativeStaffTemplateList, form: AlternativeStaffTemplateForm},
    "collection-points": { list: CollectionPointListPage, form: CollectionPointForm },
    "trip-plans": { list: TripPlanList, form: TripPlanForm },
  },
  // Split from the legacy "schedule-masters" bucket — day-to-day execution resources.
  "schedule-operations": {
    "daily-trip-assignment": { list: DailyTripAssignmentList, form: DailyTripAssignmentForm },
    "daily-trip-collection-point": { list: DailyTripCollectionPointList, form: DailyTripCollectionPointForm },
    "daily-trip-household-collection": { list: DailyTripHouseholdCollectionList },
    "daily-trip-tracking": { component: DailyTripTracking },
    "static-route-map": { component: StaticRouteMap },
    "bin-collection-event": { list: BinCollectionEventList, form: BinCollectionEventForm },
    "waste-collected-data": { list: WasteCollectedDataList, form: WasteCollectedForm },
    "daily-trip-log": { list: DailyTripLogList },
    "vehicle-breakdowns": { list: VehicleBreakdownList, form: VehicleBreakdownForm },
    "retrip-requests": { list: TripRetripRequestList },
    // List-only: a delay is filed from the driver app, never created here.
    "trip-delay-reports": { list: TripDelayReportList },
    "scheduler-config": { component: SchedulerConfigPage },
  },
  // Legacy name — kept alive only for the reporting sub-resources, matching
  // the backend's equivalent split (see base_urls.py); setup/operations
  // resources above are no longer looked up under this key.
  "schedule-masters": {
    "daily-waste-comparisons": { list: DailyWasteComparisonList },
    "monthly-waste-comparison": { list: MonthlyWasteComparisonListPage },
  },
  "customer-master": {
    "customer-creation": { list: CustomerCreationList, form: CustomerCreationForm },
    "apartment-list": { list: ApartmentListPage },
    "household-pickup-event": { list: HouseholdPickupEventList, form: HouseholdPickupEventForm },
  },
  "vehicle-tracking": {
    "vehicle-track": { component: VehicleTracking },
    "vehicle-history": { component: VehicleHistory },
  },
  "waste-management": {
    // "collection-monitoring": { list: CollectionMonitoringListPage, form: CollectionMonitoringForm },
    "panchayat-base-collection": { list: PanchayatBaseCollectionListPage },
    "ward-base-collection": { list: WardBaseCollectionListPage },
  },
  "workforce-management": {
    "workforce-management": { component: WorkforceManagement },
    "date-report": { component: DateReport },
    "day-report": { component: DayReport },
  },
  "complaint-ticket": {
    complaint: { list: TicketList, form: TicketForm, editForm: TicketDetail },
    tickets: { list: TicketList, form: TicketForm, editForm: TicketDetail },
    modules: { list: ModuleList, form: ModuleForm },
    categories: { list: CategoryList, form: CategoryForm },
    subcategories: { list: SubcategoryList, form: SubcategoryForm },
    priorities: { list: PriorityList, form: PriorityForm },
    statuses: { list: StatusList, form: StatusForm },
    sources: { list: SourceList, form: SourceForm },
    teams: { list: TeamList, form: TeamForm },
    "sla-rules": { list: SlaRuleList, form: SlaRuleForm },
    feedback: { list: FeedbackList },
  },
  audits: {
    "common-audit": { list: CommonAuditList },
    "login-audit": { list: LoginAuditList },
    "login-audits": { list: LoginAuditList },
  },
  reports: {
    "trip-summary": { component: TripSummary },
    "monthly-distance": { component: MonthlyDistance },
    "waste-collected-summary": { component: WasteSummary },
    "monthly-waste-comparison": { list: MonthlyWasteComparisonListPage },
  },
};

const MASTER_ALIASES: Record<string, string[]> = {
  "screen-managements": ["admins"],
  "role-assigns": ["admins"],
  "customer-masters": ["customer-master"],
  "transport-masters": ["transport-master"],
  // Legacy bookmarked/cached links whose master still decrypts to
  // "schedule-masters" but whose module was moved into schedule-setup or
  // schedule-operations (see base_urls.py) still resolve via this fallback.
  "schedule-masters": ["schedule-setup", "schedule-operations"],
  "staff-creations": ["staff-masters"],
  "user-creations": ["staff-masters"],
  "process-items": ["staff-masters"],
  audits: ["staff-masters"],
  // "grivences"/"citizen-grievance" are the pre-rename backend/frontend names
  // for the "complaint-ticket" bucket — kept only so already-open/bookmarked
  // tabs still resolve.
  grivences: ["complaint-ticket"],
  "citizen-grievance": ["complaint-ticket"],
  superadmin: ["superadmin-masters"],
  "common-masters": ["masters"],
  "waste-types": ["masters"],
  assets: ["masters"],
  collections: ["waste-management"],
};

const MODULE_ALIASES: Record<string, string[]> = {
  // Pre-rename module names for the complaint-ticket bucket (see MASTER_ALIASES).
  complaint: ["complaints", "tickets"],
  tickets: ["complaint", "complaints"],
  "main-complaint-category": ["main-category", "categories"],
  "sub-complaint-category": ["sub-category", "subcategories"],
  teams: ["teams"],
  "sla-rules": ["sla-rules", "sla-rule", "sla_rules", "slaRules", "slarules", "sla"],
  "sla-rule": ["sla-rules"],
  sla_rules: ["sla-rules"],
  slaRules: ["sla-rules"],
  slarules: ["sla-rules"],
  sla: ["sla-rules"],
  feedback: ["feedbacks"],
  fuel: ["fuels"],
  panchayats: ["panchayat"],
  "collection-points": ["collection-point"],
  "sub-properties": ["subproperties"],
  "staff-user-type": ["staffusertypes"],
  "mainscreen-type": ["mainscreentype"],
  userscreenpermissions: ["companywisescreenpermissions"],
  "company-creation": ["company"],
  "project-creation": ["project"],
  "customer-creation": ["customercreations"],
  "staff-templates": ["staff-template"],
  "alternative-staff-templates": ["alternative-staff-template"],
  "daily-trip-assignments": ["daily-trip-assignment"],
  "daily-trip-collection-points": ["daily-trip-collection-point"],
  "daily-trip-household-collections": ["daily-trip-household-collection"],
  "bin-collection-events": ["bin-collection-event"],
  "daily-trip-logs": ["daily-trip-log"],
};

const resolveRouteConfig = (
  master: string,
  moduleName: string,
): RouteConfig | undefined => {
  const masterCandidates = [master, ...(MASTER_ALIASES[master] ?? [])];
  const moduleCandidates = [moduleName, ...(MODULE_ALIASES[moduleName] ?? [])];

  for (const masterCandidate of masterCandidates) {
    const routeGroup = ROUTES[masterCandidate];
    if (!routeGroup) {
      continue;
    }

    for (const moduleCandidate of moduleCandidates) {
      const routeConfig = routeGroup[moduleCandidate];
      if (routeConfig) {
        return routeConfig;
      }
    }
  }

  return undefined;
};

const resolveComponent = (config: RouteConfig | undefined, mode: "view" | "new" | "edit"): ModuleComponent => {
  if (!config) return undefined;

  if (config.component) return config.component;
  if (mode === "edit") return config.editForm ?? config.form;
  if (mode === "new") return config.form;
  return config.list;
};

export default function AdminEncryptedRouter() {
  const { encMaster, encModule, id } = useParams();
  const location = useLocation();

  const { master, moduleName } = useMemo(() => {
    return {
      master: decryptSegment(encMaster ?? ""),
      moduleName: decryptSegment(encModule ?? ""),
    };
  }, [encMaster, encModule]);

  if (!master || !moduleName) {
    return <Navigate to="/" replace />;
  }

  const moduleRoutes = resolveRouteConfig(master, moduleName);
  if (!moduleRoutes) {
    return <Navigate to="/" replace />;
  }

  const mode: "view" | "new" | "edit" = id ? "edit" : location.pathname.endsWith("/new") ? "new" : "view";
    const Component = resolveComponent(moduleRoutes, mode);

  if (!Component) {
    return <Navigate to="/" replace />;
  }

  return <Component />;
}
