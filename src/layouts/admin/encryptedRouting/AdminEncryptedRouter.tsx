import { useMemo, type ComponentType } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { decryptSegment } from "@/utils/routeCrypto";

// Import your actual page components
import ContinentList from "@/pages/admin/modules/masters/continent/ContinentListPage";
import ContinentForm from "@/pages/admin/modules/masters/continent/ContinentForm";
import CountryList from "@/pages/admin/modules/masters/country/CountryListPage";
import CountryForm from "@/pages/admin/modules/masters/country/CountryForm";
import StateList from "@/pages/admin/modules/masters/state/StateListPage";
import StateForm from "@/pages/admin/modules/masters/state/StateForm";
import DistrictList from "@/pages/admin/modules/masters/district/DistrictListPage";
import DistrictForm from "@/pages/admin/modules/masters/district/DistrictForm";
import CityList from "@/pages/admin/modules/masters/city/CityListPage";
import CityForm from "@/pages/admin/modules/masters/city/CityForm";
import ZoneList from "@/pages/admin/modules/masters/zone/ZoneListPage";
import ZoneForm from "@/pages/admin/modules/masters/zone/ZoneForm";
import WardList from "@/pages/admin/modules/masters/ward/WardListPage";
import WardForm from "@/pages/admin/modules/masters/ward/WardForm";
import PropertyList from "@/pages/admin/modules/masters/property/PropertyListPage";
import PropertyForm from "@/pages/admin/modules/masters/property/PropertyForm";
import SubPropertyList from "@/pages/admin/modules/masters/subproperty/SubPropertyListPage";
import SubPropertyForm from "@/pages/admin/modules/masters/subproperty/SubPropertyForm";
import BinListPage from "@/pages/admin/modules/masters/bin/BinListPage";
import BinForm from "@/pages/admin/modules/masters/bin/BinForm";
import StaffCreationList from "@/pages/admin/modules/staffMasters/staffCreation/staffcreationlist";
import StaffCreationForm from "@/pages/admin/modules/staffMasters/staffCreation/staffcreationForm";
// Admin
import UserTypeList from "@/pages/admin/modules/admin/userType/user-typeList";
import UserTypeForm from "@/pages/admin/modules/admin/userType/user-typeForm";
import UserCreationList from "@/pages/admin/modules/admin/userCreation/user-creationList";
import UserCreationForm from "@/pages/admin/modules/admin/userCreation/user-creationForm";
// Customer Master
import CustomerCreationList from "@/pages/admin/modules/customerMasters/customerCreations/customerCreationListPage";
import CustomerCreationForm from "@/pages/admin/modules/customerMasters/customerCreations/customerCreationForm";
import CustomerTagList from "@/pages/admin/modules/customerMasters/customerTag/customerTagList";
import CustomerTagForm from "@/pages/admin/modules/customerMasters/customerTag/customerTagForm";
import HouseholdPickupEventList from "@/pages/admin/modules/customerMasters/householdPickupEvent/householdPickupEventList";
import HouseholdPickupEventForm from "@/pages/admin/modules/customerMasters/householdPickupEvent/householdPickupEventForm";

// Reports (Single components)
import TripSummary from "@/pages/admin/modules/reports/tripsummary/tripsummary";
import MonthlyDistance from "@/pages/admin/modules/reports/monthlydistance/monthlydistance";
import WasteSummary from "@/pages/admin/modules/reports/wasteCollectedSummary/wastesummary";
import ComplaintsList from "@/pages/admin/modules/citizienGrievance/complaints/complaintsList";
import ComplaintAddForm from "@/pages/admin/modules/citizienGrievance/complaints/complaintsForm";
import ComplaintEditForm from "@/pages/admin/modules/citizienGrievance/complaints/complaintsEditForm";
import FeedBackFormList from "@/pages/admin/modules/citizienGrievance/feedback/feedBackFormListPage";
import FeedBackForm from "@/pages/admin/modules/citizienGrievance/feedback/feedBackForm";
import FuelList from "@/pages/admin/modules/transportMasters/fuel/fuelListPage";
import FuelForm from "@/pages/admin/modules/transportMasters/fuel/fuelForm";
import VehicleTypeCreation from "@/pages/admin/modules/transportMasters/vehicleTypecreation/vehicle-typeCreationList";
import VehicleTypeCreationForm from "@/pages/admin/modules/transportMasters/vehicleTypecreation/vechicle-typeCreationForm";
import VehicleCreationListPage from "@/pages/admin/modules/transportMasters/vehicleCreation/vehicleCreationListPage";
import VehicleCreationForm from "@/pages/admin/modules/transportMasters/vehicleCreation/vehicleCreationForm";
import TripDefinitionList from "@/pages/admin/modules/transportMasters/tripDefinition/tripDefinitionList";
import TripDefinitionForm from "@/pages/admin/modules/transportMasters/tripDefinition/tripDefinitionForm";
import BinLoadLogList from "@/pages/admin/modules/transportMasters/binLoadLog/binLoadLogList";
import BinLoadLogForm from "@/pages/admin/modules/transportMasters/binLoadLog/binLoadLogForm";
import TripInstanceList from "@/pages/admin/modules/transportMasters/tripInstance/tripInstanceList";
import TripInstanceForm from "@/pages/admin/modules/transportMasters/tripInstance/tripInstanceForm";
import ZonePropertyLoadTrackerList from "@/pages/admin/modules/transportMasters/zonePropertyLoadTracker/zonePropertyLoadTrackerList";
import ZonePropertyLoadTrackerForm from "@/pages/admin/modules/transportMasters/zonePropertyLoadTracker/zonePropertyLoadTrackerForm";
import TripAttendanceList from "@/pages/admin/modules/transportMasters/tripAttendance/tripAttendanceList";
import TripAttendanceForm from "@/pages/admin/modules/transportMasters/tripAttendance/tripAttendanceForm";
import VehicleTripAuditList from "@/pages/admin/modules/transportMasters/vehicleTripAudit/vehicleTripAuditList";
import VehicleTripAuditForm from "@/pages/admin/modules/transportMasters/vehicleTripAudit/vehicleTripAuditForm";
import TripExceptionLogList from "@/pages/admin/modules/transportMasters/tripExceptionLog/tripExceptionLogList";
import TripExceptionLogForm from "@/pages/admin/modules/transportMasters/tripExceptionLog/tripExceptionLogForm";
import RoutePlanListPage from "@/pages/admin/modules/staffMasters/routeplan/routeplanlist";
import RoutePlanForm from "@/pages/admin/modules/staffMasters/routeplan/routeplanform";
import VehicleTracking from "@/pages/admin/modules/vehicletracking/vehicletrack/vehicletracking";
import VehicleHistory from "@/pages/admin/modules/vehicletracking/vehiclehistory/vehiclehistory";
import WorkforceManagement from "@/pages/admin/modules/workforcemanagement/workforcemanagement";
import DateReport from "@/pages/admin/modules/workforcemanagement/datereport";
import DayReport from "@/pages/admin/modules/workforcemanagement/dayreport";

import WasteCollectionMonitor from "@/pages/admin/modules/wasteManagementMasters/collectionMonitoring/collectionMonitoring";
import WasteCollectedDataList from "@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataListPage";
import WasteCollectedForm from "@/pages/admin/modules/wasteManagementMasters/wasteCollectedData/wasteCollectedDataForm";
import StaffUserTypeForm from "@/pages/admin/modules/admin/staffUserType/staffUserTypeForm";
import StaffUserTypeList from "@/pages/admin/modules/admin/staffUserType/staffUserTypeList";

import MainComplaintCategoryList from "@/pages/admin/modules/citizienGrievance/mainCategory/main-categoryList";
import { MainComplaintCategoryForm } from "@/pages/admin/modules/citizienGrievance/mainCategory/main-categoryForm";
import SubCategoryComplaintList from "@/pages/admin/modules/citizienGrievance/subCategory/sub-categoryList";
import SubCategoryComplaintForm from "@/pages/admin/modules/citizienGrievance/subCategory/sub-categoryForm";
import MainScreenTypeList from "@/pages/admin/modules/admin/mainScreenType/mainScreenTypeList";
import MainScreenTypeForm from "@/pages/admin/modules/admin/mainScreenType/mainScreenTypeForm";
import UserScreenActionList from "@/pages/admin/modules/admin/userScreenAction/userScreenActionList";
import UserScreenActionForm from "@/pages/admin/modules/admin/userScreenAction/userScreenActionForm";
import MainScreenList from "@/pages/admin/modules/admin/mainScreen/mainScreenList";
import MainScreenForm from "@/pages/admin/modules/admin/mainScreen/mainScreenForm";
import UserScreenList from "@/pages/admin/modules/admin/userScreen/userScreenList";
import UserScreenForm from "@/pages/admin/modules/admin/userScreen/userScreenForm";
import UserScreenPermissionForm from "@/pages/admin/modules/admin/userScreenPermission/userScreenPermissionForm";
import UserScreenPermissionList from "@/pages/admin/modules/admin/userScreenPermission/userScreenPermissionList";
import StaffTemplateList from "@/pages/admin/modules/staffMasters/staffTemplate/staffTemplateList";
import StaffTemplateForm from "@/pages/admin/modules/staffMasters/staffTemplate/staffTemplateForm";
import AlternativeStaffTemplateList from "@/pages/admin/modules/staffMasters/alternativeStaffTemplate/alternativeStaffTemplateList";
import AlternativeStaffTemplateForm from "@/pages/admin/modules/staffMasters/alternativeStaffTemplate/alternativeStaffTemplateForm";
import StaffTemplateAuditList from "@/pages/admin/modules/staffMasters/staffTemplateAudit/staffTemplateAuditList";
import StaffTemplateAuditForm from "@/pages/admin/modules/staffMasters/staffTemplateAudit/staffTemplateAuditForm";
import SupervisorZoneMapList from "@/pages/admin/modules/staffMasters/supervisorZoneMap/supervisorZoneMapList";
import SupervisorZoneMapForm from "@/pages/admin/modules/staffMasters/supervisorZoneMap/supervisorZoneMapForm";
import SupervisorZoneAccessAuditList from "@/pages/admin/modules/staffMasters/supervisorZoneAccessAudit/supervisorZoneAccessAuditList";
import SupervisorZoneAccessAuditForm from "@/pages/admin/modules/staffMasters/supervisorZoneAccessAudit/supervisorZoneAccessAuditForm";
import UnassignedStaffPoolList from "@/pages/admin/modules/staffMasters/unassignedStaffPool/unassignedStaffPoolList";
import UnassignedStaffPoolForm from "@/pages/admin/modules/staffMasters/unassignedStaffPool/unassignedStaffPoolForm";


type ModuleComponent = ComponentType | undefined;

type RouteConfig = {
  list?: ModuleComponent;
  form?: ModuleComponent;
  editForm?: ModuleComponent;
  component?: ModuleComponent;
};

type RouteMap = Record<string, Record<string, RouteConfig>>;

const ROUTES: RouteMap = {
  admins: {
    "user-type": { list: UserTypeList, form: UserTypeForm },
    "user-creation": { list: UserCreationList, form: UserCreationForm },
    "staff-user-type": { list: StaffUserTypeList, form: StaffUserTypeForm },
    "mainscreen-type": {list: MainScreenTypeList, form: MainScreenTypeForm},
    "userscreen-action": {list:UserScreenActionList, form: UserScreenActionForm },
    "mainscreens": {list: MainScreenList, form: MainScreenForm},
    "userscreens": {list: UserScreenList, form: UserScreenForm},
    "userscreenpermissions": {list: UserScreenPermissionList,form: UserScreenPermissionForm}
  },
  masters: {
    continents: { list: ContinentList, form: ContinentForm },
    countries: { list: CountryList, form: CountryForm },
    bins: { list: BinListPage, form: BinForm },
    states: { list: StateList, form: StateForm },
    districts: { list: DistrictList, form: DistrictForm },
    cities: { list: CityList, form: CityForm },
    zones: { list: ZoneList, form: ZoneForm },
    wards: { list: WardList, form: WardForm },
    properties: { list: PropertyList, form: PropertyForm },
    "sub-properties": { list: SubPropertyList, form: SubPropertyForm },
  },
  "staff-masters": {
    "staff-creation": { list: StaffCreationList, form: StaffCreationForm },
    "staff-template": {list: StaffTemplateList, form: StaffTemplateForm},
    "alternative-staff-template": {list: AlternativeStaffTemplateList, form: AlternativeStaffTemplateForm},
    "staff-template-audit": { list: StaffTemplateAuditList, form: StaffTemplateAuditForm },
    "route-plans": { list: RoutePlanListPage, form: RoutePlanForm },
    "supervisor-zone-map": { list: SupervisorZoneMapList, form: SupervisorZoneMapForm },
    "supervisor-zone-access-audit": { list: SupervisorZoneAccessAuditList, form: SupervisorZoneAccessAuditForm },
    "unassigned-staff-pool": { list: UnassignedStaffPoolList, form: UnassignedStaffPoolForm },
  },
  "transport-master": {
    fuel: { list: FuelList, form: FuelForm },
    "vehicle-type": { list: VehicleTypeCreation, form: VehicleTypeCreationForm },
    "vehicle-creation": { list: VehicleCreationListPage, form: VehicleCreationForm },
    "trip-definition": { list: TripDefinitionList, form: TripDefinitionForm },
    "bin-load-log": { list: BinLoadLogList, form: BinLoadLogForm },
    "trip-instance": { list: TripInstanceList, form: TripInstanceForm },
    "zone-property-load-tracker": { list: ZonePropertyLoadTrackerList, form: ZonePropertyLoadTrackerForm },
    "trip-attendance": { list: TripAttendanceList, form: TripAttendanceForm },
    "vehicle-trip-audit": { list: VehicleTripAuditList, form: VehicleTripAuditForm },
    "trip-exception-log": { list: TripExceptionLogList, form: TripExceptionLogForm },
  },
  "customer-master": {
    "customer-creation": { list: CustomerCreationList, form: CustomerCreationForm },
    "customer-tag": { list: CustomerTagList, form: CustomerTagForm },
    "household-pickup-event": { list: HouseholdPickupEventList, form: HouseholdPickupEventForm },
  },
  "vehicle-tracking": {
    "vehicle-track": { component: VehicleTracking },
    "vehicle-history": { component: VehicleHistory },
  },
  "waste-management": {
    "waste-collected-data": { list: WasteCollectedDataList, form: WasteCollectedForm },
    "collection-monitoring": { component: WasteCollectionMonitor },
  },
  "workforce-management": {
    "workforce-management": { component: WorkforceManagement },
    "date-report": { component: DateReport },
    "day-report": { component: DayReport },
  },
  "citizen-grievance": {
    complaint: { list: ComplaintsList, form: ComplaintAddForm, editForm: ComplaintEditForm },
    "main-complaint-category": { list: MainComplaintCategoryList, form: MainComplaintCategoryForm },
    "sub-complaint-category": { list: SubCategoryComplaintList, form: SubCategoryComplaintForm },
    feedback: { list: FeedBackFormList, form: FeedBackForm },
  },
  reports: {
    "trip-summary": { component: TripSummary },
    "monthly-distance": { component: MonthlyDistance },
    "waste-collected-summary": { component: WasteSummary },
  },
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

  const moduleRoutes = ROUTES[master]?.[moduleName];
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
