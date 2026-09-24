import { lazy, type ComponentType } from "react";

// Route-level code splitting: every module page below is fetched only when
// its route is actually visited, instead of ~150 page chunks all shipping
// in the admin bundle up front. Extracted out of AdminEncryptedRouter.tsx
// so that file stays a thin resolver and this data-only module stays easy
// to scan/diff.
const ContinentList = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/continent/ContinentListPage"));
const ContinentForm = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/continent/ContinentForm"));
const CountryList = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/country/CountryListPage"));
const CountryForm = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/country/CountryForm"));
const StateList = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/state/StateListPage"));
const StateForm = lazy(() => import("@/pages/admin/modules/superadmin/commonMasters/state/StateForm"));
const DistrictList = lazy(() => import("@/pages/admin/modules/masters/district/DistrictListPage"));
const DistrictForm = lazy(() => import("@/pages/admin/modules/masters/district/DistrictForm"));
const CityList = lazy(() => import("@/pages/admin/modules/masters/city/CityListPage"));
const CityForm = lazy(() => import("@/pages/admin/modules/masters/city/CityForm"));
const ZoneList = lazy(() => import("@/pages/admin/modules/masters/zone/ZoneListPage"));
const ZoneForm = lazy(() => import("@/pages/admin/modules/masters/zone/ZoneForm"));
const WardList = lazy(() => import("@/pages/admin/modules/masters/ward/WardListPage"));
const WardForm = lazy(() => import("@/pages/admin/modules/masters/ward/WardForm"));
const DepartmentList = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/department/DepartmentListPage"));
const DepartmentForm = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/department/DepartmentForm"));
const DesignationList = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/designation/DesignationListPage"));
const DesignationForm = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/designation/DesignationForm"));
const CollectionPointListPage = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/collectionPoint/CollectionPointListPage"));
const CollectionPointForm = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/collectionPoint/CollectionPointForm"));
const PlantListPage = lazy(() => import("@/pages/admin/modules/masters/plant/PlantListPage"));
const PlantForm = lazy(() => import("@/pages/admin/modules/masters/plant/PlantForm"));
const WasteTypeListPage = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/wasteType/WasteTypeListPage"));
const WasteTypeForm = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/wasteType/WasteTypeForm"));
const BinListPage = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/bin/BinListPage"));
const BinForm = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/bin/BinForm"));
const PanchayatListPage = lazy(() => import("@/pages/admin/modules/masters/panchayat/PanchayatListPage"));
const PanchayatForm = lazy(() => import("@/pages/admin/modules/masters/panchayat/PanchayatForm"));
const PanchayatLeaderListPage = lazy(() => import("@/pages/admin/modules/masters/leaderManagement/panchayatLeader/PanchayatLeaderListPage"));
const PanchayatLeaderForm = lazy(() => import("@/pages/admin/modules/masters/leaderManagement/panchayatLeader/PanchayatLeaderForm"));
const DistrictLeaderListPage = lazy(() => import("@/pages/admin/modules/masters/leaderManagement/districtLeader/DistrictLeaderListPage"));
const DistrictLeaderForm = lazy(() => import("@/pages/admin/modules/masters/leaderManagement/districtLeader/DistrictLeaderForm"));
const PropertyList = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/property/PropertyListPage"));
const PropertyForm = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/property/PropertyForm"));
const SubPropertyList = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/subproperty/SubPropertyListPage"));
const SubPropertyForm = lazy(() => import("@/pages/admin/modules/masters/wasteMasters/subproperty/SubPropertyForm"));
const StaffCreationList = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/staffCreation/staffcreationlist"));
const StaffCreationForm = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/staffCreation/staffcreationForm"));
const UserTypeList = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/userType/user-typeList"));
const UserTypeForm = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/userType/user-typeForm"));
const CustomerCreationList = lazy(() => import("@/pages/admin/modules/masters/customerMasters/customerCreations/customerCreationListPage"));
const CustomerCreationForm = lazy(() => import("@/pages/admin/modules/masters/customerMasters/customerCreations/customerCreationForm"));
const ApartmentListPage = lazy(() => import("@/pages/admin/modules/masters/customerMasters/customerCreations/apartmentListpage"));
const HouseholdPickupEventList = lazy(() => import("@/pages/admin/modules/masters/customerMasters/householdPickupEvent/householdPickupEventList"));
const HouseholdPickupEventForm = lazy(() => import("@/pages/admin/modules/masters/customerMasters/householdPickupEvent/householdPickupEventForm"));
const TripSummary = lazy(() => import("@/pages/admin/modules/reports/tripsummary/tripsummary"));
const MonthlyDistance = lazy(() => import("@/pages/admin/modules/reports/monthlydistance/monthlydistance"));
const WasteSummary = lazy(() => import("@/pages/admin/modules/reports/wasteCollectedSummary/wastesummary"));
const MonthlyWasteComparisonListPage = lazy(() => import("@/pages/admin/modules/reports/wasteReports/monthlyWasteComparison/MonthlyWasteComparisonListPage"));
const TicketList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketList"));
const TicketForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketForm"));
const TicketDetail = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/tickets/TicketDetail"));
const FeedbackList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/feedback/FeedbackList"));
const FuelList = lazy(() => import("@/pages/admin/modules/masters/transportMasters/fuel/fuelListPage"));
const FuelForm = lazy(() => import("@/pages/admin/modules/masters/transportMasters/fuel/fuelForm"));
const VehicleTypeCreation = lazy(() => import("@/pages/admin/modules/masters/transportMasters/vehicleTypecreation/vehicle-typeCreationList"));
const VehicleTypeCreationForm = lazy(() => import("@/pages/admin/modules/masters/transportMasters/vehicleTypecreation/vechicle-typeCreationForm"));
const VehicleCreationListPage = lazy(() => import("@/pages/admin/modules/masters/transportMasters/vehicleCreation/vehicleCreationListPage"));
const VehicleCreationForm = lazy(() => import("@/pages/admin/modules/masters/transportMasters/vehicleCreation/vehicleCreationForm"));
const TripPlanList = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/tripPlan/tripPlanList"));
const TripPlanForm = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/tripPlan/tripPlanForm"));
const VehicleTracking = lazy(() => import("@/pages/admin/modules/vehicletracking/vehicletrack/vehicletracking"));
const VehicleHistory = lazy(() => import("@/pages/admin/modules/vehicletracking/vehiclehistory/vehiclehistory"));
const WorkforceManagement = lazy(() => import("@/pages/admin/modules/workforcemanagement/workforcemanagement"));
const DateReport = lazy(() => import("@/pages/admin/modules/workforcemanagement/datereport"));
const DayReport = lazy(() => import("@/pages/admin/modules/workforcemanagement/dayreport"));
const DailyTripAssignmentList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripAssignment/dailyTripAssignmentList"));
const DailyTripAssignmentForm = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripAssignment/dailyTripAssignmentForm"));
const DailyTripCollectionPointList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripCollectionPoint/dailyTripCollectionPointList"));
const DailyTripCollectionPointForm = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripCollectionPoint/dailyTripCollectionPointForm"));
const DailyTripHouseholdCollectionList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripHouseholdCollection/dailyTripHouseholdCollectionList"));
const DailyTripTracking = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripTracking/DailyTripTracking"));
const StaticRouteMap = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/staticRouteMap/StaticRouteMap"));
const SchedulerConfigPage = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/schedulerConfig/SchedulerConfigPage"));
const DailyTripLogList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/dailyTripLogList"));
const PanchayatBaseCollectionListPage = lazy(() => import("@/pages/admin/modules/wasteManagementMasters/panchayatbasecollection/PanchayatBaseCollectionListPage"));
const WardBaseCollectionListPage = lazy(() => import("@/pages/admin/modules/wasteManagementMasters/wardbasecollection/WardBaseCollectionListPage"));
const WasteCollectedDataList = lazy(() => import("@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataListPage"));
const WasteCollectedForm = lazy(() => import("@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataForm"));
const StaffUserTypeForm = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/staffUserType/staffUserTypeForm"));
const StaffUserTypeList = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/staffUserType/staffUserTypeList"));
const ProjectStaffHierarchyForm = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/projectStaffHierarchy/projectStaffHierarchyForm"));
const ProjectStaffHierarchyList = lazy(() => import("@/pages/admin/modules/superadmin/roleManagement/projectStaffHierarchy/projectStaffHierarchyList"));
const CategoryList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/category/CategoryList"));
const CategoryForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/category/CategoryForm"));
const SubcategoryList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/subcategory/SubcategoryList"));
const SubcategoryForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/subcategory/SubcategoryForm"));
const ModuleList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/ModuleList"));
const ModuleForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/ModuleForm"));
const PriorityList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/PriorityList"));
const PriorityForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/PriorityForm"));
const StatusList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/StatusList"));
const StatusForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/StatusForm"));
const SourceList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/SourceList"));
const SourceForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/SourceForm"));
const MyTasks = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/dashboard/MyTasks"));
const SlaRuleList = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/SlaRuleList"));
const SlaRuleForm = lazy(() => import("@/pages/admin/modules/core_modules/complaintManagement/masters/SlaRuleForm"));
const MainScreenTypeList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/mainScreenType/mainScreenTypeList"));
const MainScreenTypeForm = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/mainScreenType/mainScreenTypeForm"));
const UserScreenActionList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreenAction/userScreenActionList"));
const UserScreenActionForm = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreenAction/userScreenActionForm"));
const MainScreenList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/mainScreen/mainScreenList"));
const MainScreenForm = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/mainScreen/mainScreenForm"));
const UserScreenList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreen/userScreenList"));
const UserScreenForm = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreen/userScreenForm"));
const UserScreenPermissionForm = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreenPermission/userScreenPermissionForm"));
const UserScreenPermissionList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/userScreenPermission/userScreenPermissionList"));
const StaffAccessConfigList = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/staffAccessConfiguration/StaffAccessConfigList"));
const StaffAccessConfigForm = lazy(() => import("@/pages/admin/modules/superadmin/staffManagement/staffAccessConfiguration/StaffAccessConfigForm"));
const AppModuleList = lazy(() => import("@/pages/admin/modules/superadmin/screenManagement/appModules/AppModuleList"));
const CustomerAccessConfigList = lazy(() => import("@/pages/admin/modules/masters/customerMasters/customerAccessConfiguration/CustomerAccessConfigList"));
const StaffTemplateList = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/staffTemplate/staffTemplateList"));
const StaffTemplateForm = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/staffTemplate/staffTemplateForm"));
const AlternativeStaffTemplateList = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/alternativeStaffTemplate/alternativeStaffTemplateList"));
const AlternativeStaffTemplateForm = lazy(() => import("@/pages/admin/modules/core_modules/scheduleSetup/alternativeStaffTemplate/alternativeStaffTemplateForm"));
const BinCollectionEventList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/binCollectionEvent/binCollectionEventList"));
const BinCollectionEventForm = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/binCollectionEvent/binCollectionEventForm"));
const VehicleBreakdownList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/vehicleBreakdown/vehicleBreakdownList"));
const TripDelayReportList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/tripDelayReport/tripDelayReportList"));
const TripRetripRequestList = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/tripRetripRequest/tripRetripRequestList"));
const VehicleBreakdownForm = lazy(() => import("@/pages/admin/modules/core_modules/dailyOperations/vehicleBreakdown/vehicleBreakdownForm"));
const DailyWasteComparisonList = lazy(() => import("@/pages/admin/modules/reports/wasteReports/dailyWasteComparison/dailyWasteComparisonList"));
const CommonAuditList = lazy(() => import("@/pages/admin/modules/superadmin/audits/commonAudit/commonAuditList"));
const LoginAuditList = lazy(() => import("@/pages/admin/modules/superadmin/audits/loginAudit/loginAuditList"));
const CompanyList = lazy(() => import("@/pages/admin/modules/superadminMasters/company/companyListPage"));
const CompanyListForm = lazy(() => import("@/pages/admin/modules/superadminMasters/company/companyForm"));
const ProjectList = lazy(() => import("@/pages/admin/modules/superadminMasters/project/projectListPage"));
const ProjectForm = lazy(() => import("@/pages/admin/modules/superadminMasters/project/projectForm"));
const ExternalAttendanceList = lazy(() => import("@/pages/admin/modules/core_modules/attendance/ExternalAttendanceList"));

// SUPER ADMIN — global complaint configuration (module key "complaint-masters").
// Named exports from one shared module: lazy-load the module once and pick
// the named export per component, so the four tabs still split into their
// own chunk without duplicating the dynamic import.
const CategoryTabList = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.CategoryTabList,
  })),
);
const CategoryTabForm = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.CategoryTabForm,
  })),
);
const SubcategoryTabList = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.SubcategoryTabList,
  })),
);
const SubcategoryTabForm = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.SubcategoryTabForm,
  })),
);
const SlaTabList = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.SlaTabList,
  })),
);
const SlaTabForm = lazy(() =>
  import("@/pages/admin/modules/superadmin/complaintMasters/types/complaintTypeTabs").then((m) => ({
    default: m.SlaTabForm,
  })),
);

export type ModuleComponent = ComponentType | undefined;

export type RouteConfig = {
  list?: ModuleComponent;
  form?: ModuleComponent;
  editForm?: ModuleComponent;
  component?: ModuleComponent;
};

export type RouteMap = Record<string, Record<string, RouteConfig>>;

export const ROUTES: RouteMap = {
  attendance: {
    attendance: { component: ExternalAttendanceList },
  },
  admins: {
    "user-type": { list: UserTypeList, form: UserTypeForm },
    "staff-user-type": { list: StaffUserTypeList, form: StaffUserTypeForm },
    "project-staff-hierarchy": {
      list: ProjectStaffHierarchyList,
      form: ProjectStaffHierarchyForm,
    },
    "mainscreen-type": { list: MainScreenTypeList, form: MainScreenTypeForm },
    "userscreen-action": {
      list: UserScreenActionList,
      form: UserScreenActionForm,
    },
    mainscreens: { list: MainScreenList, form: MainScreenForm },
    userscreens: { list: UserScreenList, form: UserScreenForm },
    userscreenpermissions: {
      list: UserScreenPermissionList,
      form: UserScreenPermissionForm,
    },
    "staff-access-configuration": {
      list: StaffAccessConfigList,
      form: StaffAccessConfigForm,
    },
    "app-modules": { list: AppModuleList },
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
    "panchayat-leaders": {
      list: PanchayatLeaderListPage,
      form: PanchayatLeaderForm,
    },
    plants: { list: PlantListPage, form: PlantForm },
    "district-leaders": {
      list: DistrictLeaderListPage,
      form: DistrictLeaderForm,
    },
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
    "vehicle-type": {
      list: VehicleTypeCreation,
      form: VehicleTypeCreationForm,
    },
    "vehicle-creation": {
      list: VehicleCreationListPage,
      form: VehicleCreationForm,
    },
  },
  // Split from the legacy "schedule-masters" bucket — template/plan setup resources.
  "schedule-setup": {
    "staff-template": { list: StaffTemplateList, form: StaffTemplateForm },
    "alternative-staff-template": {
      list: AlternativeStaffTemplateList,
      form: AlternativeStaffTemplateForm,
    },
    "collection-points": {
      list: CollectionPointListPage,
      form: CollectionPointForm,
    },
    "trip-plans": { list: TripPlanList, form: TripPlanForm },
  },
  // Split from the legacy "schedule-masters" bucket — day-to-day execution resources.
  "schedule-operations": {
    "daily-trip-assignment": {
      list: DailyTripAssignmentList,
      form: DailyTripAssignmentForm,
    },
    "daily-trip-collection-point": {
      list: DailyTripCollectionPointList,
      form: DailyTripCollectionPointForm,
    },
    "daily-trip-household-collection": {
      list: DailyTripHouseholdCollectionList,
    },
    "daily-trip-tracking": { component: DailyTripTracking },
    "static-route-map": { component: StaticRouteMap },
    "bin-collection-event": {
      list: BinCollectionEventList,
      form: BinCollectionEventForm,
    },
    "waste-collected-data": {
      list: WasteCollectedDataList,
      form: WasteCollectedForm,
    },
    "daily-trip-log": { list: DailyTripLogList },
    "vehicle-breakdowns": {
      list: VehicleBreakdownList,
      form: VehicleBreakdownForm,
    },
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
    "customer-creation": {
      list: CustomerCreationList,
      form: CustomerCreationForm,
    },
    "apartment-list": { list: ApartmentListPage },
    "customer-access-configuration": { list: CustomerAccessConfigList },
    "household-pickup-event": {
      list: HouseholdPickupEventList,
      form: HouseholdPickupEventForm,
    },
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
  // SUPER ADMIN — global complaint configuration. Writable; superadmin-only.
  // One screen, three tabs (see complaintTypeTabs.tsx). The seeded reference
  // tables (priority/status/source/language/module) have no screen: they are
  // code-keyed vocabularies the routing and SLA resolvers depend on, so they
  // stay seeder-owned rather than being editable here.
  "complaint-masters": {
    types: { list: CategoryTabList, form: CategoryTabForm },
    categories: { list: CategoryTabList, form: CategoryTabForm },
    subcategories: { list: SubcategoryTabList, form: SubcategoryTabForm },
    "sla-rules": { list: SlaTabList, form: SlaTabForm },
  },
  // CORE MODULES — company/project-scoped entries. The master screens below
  // stay registered so already-open tabs and permission rows keep resolving,
  // but the backend serves their tables view-only for this module (see
  // MODULE_READONLY_RESOURCES); editing happens under "complaint-masters".
  "complaint-ticket": {
    complaint: { list: TicketList, form: TicketForm, editForm: TicketDetail },
    tickets: { list: TicketList, form: TicketForm, editForm: TicketDetail },
    modules: { list: ModuleList, form: ModuleForm },
    categories: { list: CategoryList, form: CategoryForm },
    subcategories: { list: SubcategoryList, form: SubcategoryForm },
    priorities: { list: PriorityList, form: PriorityForm },
    statuses: { list: StatusList, form: StatusForm },
    sources: { list: SourceList, form: SourceForm },
    "my-tasks": { component: MyTasks },
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

export const MASTER_ALIASES: Record<string, string[]> = {
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

export const MODULE_ALIASES: Record<string, string[]> = {
  // Pre-rename module names for the complaint-ticket bucket (see MASTER_ALIASES).
  complaint: ["complaints", "tickets"],
  tickets: ["complaint", "complaints"],
  "main-complaint-category": ["main-category", "categories"],
  "sub-complaint-category": ["sub-category", "subcategories"],
  teams: ["teams"],
  "sla-rules": [
    "sla-rules",
    "sla-rule",
    "sla_rules",
    "slaRules",
    "slarules",
    "sla",
  ],
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
