// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { useTranslation } from "react-i18next";

// import {
//   ChevronDown,
//   LayoutGrid,
//   Settings,
//   Layers3,
//   Archive,
//   Users,
//   UserCircle,
//   Truck,
//   Navigation,
//   Recycle,
//   AlertTriangle,
//   Building2,
//   BarChart3,
// } from "lucide-react";

// import { useSidebar } from "@/contexts/SideBarContext";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { decryptSegment } from "@/utils/routeCrypto";

// const {
//   encMasters,
//   encContinents,
//   encCountries,
//   encBins,
//   encStates,
//   encDistricts,
//   encCities,
//   encWards,
//   encCollectionPoints,
//   encWasteTypes,
//   encZones,
//   encProperties,
//   encSubProperties,
//   encStaffCreation,
//   encAdmins,
//   encUserScreen,
//   encUserType,
//   encUserCreation,
//   encCustomerMaster,
//   encCustomerCreation,
//   encReport,
//   encMonthlyDistance,
//   encTripSummary,
//   encWasteCollectedSummary,
//   encCitizenGrivence,
//   encComplaint,
//   encFeedback,
//   encTransportMaster,
//   encRoutePlans,
//   encFuel,
//   encVehicleCreation,
//   encVehicleHistory,
//   encVehicleTrack,
//   encVehicleTracking,
//   encVehicleType,
//   encCollectionMonitoring,
//   encPanchayatBaseCollection,
//   encWardBaseCollection,
//   encWasteCollectedData,
//   encWasteManagementMaster,
//   encWorkforceManagement,
//   encStaffUserType,
//   encMainComplaintCategory,
//   encSubComplaintCategory,
//   encMainScreenType,
//   encUserScreenAction,
//   encMainScreen,
//   encUserScreenPermission,
//   encStaffMasters,
//   encStaffTemplate,
//   encAlternativeStaffTemplate,
//   encStaffTemplateAudit,
//   encSupervisorZoneMap,
//   encSupervisorZoneAccessAudit,
//   encTripDefinition,
//   encBinLoadLog,
//   encCustomerTag,
//   encHouseholdPickupEvent,
//   encZonePropertyLoadTracker,
//   encTripInstance,
//   encUnassignedStaffPool,
//   encTripAttendance,
//   encVehicleTripAudit,
//   encTripExceptionLog,
//   encCompanyCreation,
//   encProjectCreation,
//   encSuperAdminMaster,


//   encPanchayats,
//   encAreaTypes,
//   encHierarchies,
// } = getEncryptedRoute();

// type NavItem = {
//   nameKey: string;
//   icon: React.ReactNode;
//   path?: string;
//   subItems?: { nameKey: string; path: string }[];
// };

// /* =====================
//    MENU DEFINITIONS
// ===================== */

// const navItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.dashboard",
//     icon: <LayoutGrid size={18} />,
//     path: "/admin",
//   },
// ];

// const superadminMasterItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.superAdmin_masters",
//     icon: <Settings size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.company",
//         path: `/${encSuperAdminMaster}/${encCompanyCreation}`,
//       },
//       {
//         nameKey: "admin.nav.project",
//         path: `/${encSuperAdminMaster}/${encProjectCreation}`,
//       },
//     ],
//   },
// ];

// const commonMasterItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.common_masters",
//     icon: <Settings size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.continent",
//         path: `/${encMasters}/${encContinents}`,
//       },
//       { nameKey: "admin.nav.country", path: `/${encMasters}/${encCountries}` },
//       { nameKey: "admin.nav.state", path: `/${encMasters}/${encStates}` },
//     ],
//   },
// ];

// const masterItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.masters",
//     icon: <Layers3 size={18} />,
//     subItems: [

//       { nameKey: "admin.nav.district", path: `/${encMasters}/${encDistricts}` },
//       { nameKey: "admin.nav.city", path: `/${encMasters}/${encCities}` },
//       { nameKey: "admin.nav.zone", path: `/${encMasters}/${encZones}` },
//       { nameKey: "admin.nav.ward", path: `/${encMasters}/${encWards}` },
      
      


//       { nameKey: "admin.nav.panchayat", path: `/${encMasters}/${encPanchayats}` },
//       { nameKey: "admin.nav.area_type", path: `/${encMasters}/${encAreaTypes}` },
//       { nameKey: "admin.nav.hierarchy", path: `/${encMasters}/${encHierarchies}` },

//     ],
//   },
// ];

// const wasteTypeItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.wastetype",
//     icon: <Users size={18}/>,
//     subItems: [
//       {
//         nameKey: "admin.nav.property",
//         path: `/${encMasters}/${encProperties}`,
//       },
//       {
//         nameKey: "admin.nav.sub_property",
//         path: `/${encMasters}/${encSubProperties}`,
//       },
//     ]
//   }
// ]

// const assetItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.assets",
//     icon: <Users size={18}/>,
//     subItems: [
//       { nameKey: "admin.nav.bin_creation", path: `/${encMasters}/${encBins}` },
//       { nameKey: "admin.nav.collection_point", path: `/${encMasters}/${encCollectionPoints}` },
//       { nameKey: "common.waste_type", path: `/${encMasters}/${encWasteTypes}` },
//     ]
//   }
// ]

// const screenManagementItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.screenManagements",
//     icon: <Settings size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.main_screen_type",
//         path: `/${encAdmins}/${encMainScreenType}`,
//       },
//       {
//         nameKey: "admin.nav.main_screen",
//         path: `/${encAdmins}/${encMainScreen}`,
//       },
//       {
//         nameKey: "admin.nav.user_screen",
//         path: `/${encAdmins}/${encUserScreen}`,
//       },
//       {
//         nameKey: "admin.nav.user_screen_action",
//         path: `/${encAdmins}/${encUserScreenAction}`,
//       },
//       {
//         nameKey: "admin.nav.companywise_user_screen_permission",
//         path: `/${encAdmins}/${encUserScreenPermission}`,
//       },
//       { 
//         nameKey: "admin.nav.user_type", 
//         path: `/${encAdmins}/${encUserType}` 
//       },
//       {
//         nameKey: "admin.nav.staff_user_type",
//         path: `/${encAdmins}/${encStaffUserType}`,
//       },
//     ],
//   },
// ];

// const roleAssignsItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.roleAssigns",
//     icon: <Settings size={18} />,
//     subItems: [
      
//       { nameKey: "admin.nav.user_type", path: `/${encAdmins}/${encUserType}` },
//       {
//         nameKey: "admin.nav.staff_user_type",
//         path: `/${encAdmins}/${encStaffUserType}`,
//       },
//     ],
//   },
// ]

// const userCreationMasters: NavItem[] = [
//   {
//     nameKey: "admin.nav.user_creations",
//     icon: <Users size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.staff_creation",
//         path: `/${encStaffMasters}/${encStaffCreation}`,
//       },
//       {
//         nameKey: "admin.nav.staff_template",
//         path: `/${encStaffMasters}/${encStaffTemplate}`,
//       },
//       {
//         nameKey: "admin.nav.alternative_staff_template",
//         path: `/${encStaffMasters}/${encAlternativeStaffTemplate}`,
//       },
   
//       {
//         nameKey: "admin.nav.supervisor_zone_map",
//         path: `/${encStaffMasters}/${encSupervisorZoneMap}`,
//       },
//       {
//         nameKey: "admin.nav.unassigned_staff_pool",
//         path: `/${encStaffMasters}/${encUnassignedStaffPool}`,
//       },
//     ],
//   },
// ];

// const processItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.process_items",
//     icon: <Truck size={18} />,
//     subItems: [




//             {
//         nameKey: "admin.nav.route_plans",
//         path: `/${encStaffMasters}/${encRoutePlans}`,
//       },
//             {
//         nameKey: "admin.nav.zone_property_load_tracker",
//         path: `/${encTransportMaster}/${encZonePropertyLoadTracker}`,
//       },



//     ],
//   },
// ];

// const customerMasters: NavItem[] = [
//   {
//     nameKey: "admin.nav.customer_masters",
//     icon: <UserCircle size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.customer_creation",
//         path: `/${encCustomerMaster}/${encCustomerCreation}`,
//       },
//                   {
//         nameKey: "admin.nav.waste_collected_data",
//         path: `/${encWasteManagementMaster}/${encWasteCollectedData}`,
//       },
//             {
//         nameKey: "admin.nav.feedback",
//         path: `/${encCitizenGrivence}/${encFeedback}`,
//       },

      
//       {
//         nameKey: "admin.nav.customer_tag",
//         path: `/${encCustomerMaster}/${encCustomerTag}`,
//       },
//       {
//         nameKey: "admin.nav.household_pickup_event",
//         path: `/${encCustomerMaster}/${encHouseholdPickupEvent}`,
//       },

//     ],
//   },
// ];

// const citizenGrievanceItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.citizen_grievance",
//     icon: <AlertTriangle size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.complaints",
//         path: `/${encCitizenGrivence}/${encComplaint}`,
//       },
//       {
//         nameKey: "admin.nav.main_category",
//         path: `/${encCitizenGrivence}/${encMainComplaintCategory}`,
//       },
//       {
//         nameKey: "admin.nav.sub_category",
//         path: `/${encCitizenGrivence}/${encSubComplaintCategory}`,
//       },

//     ],
//   },
// ];

// const transportMastersItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.transport_masters",
//     icon: <Truck size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.vehicle_type",
//         path: `/${encTransportMaster}/${encVehicleType}`,
//       },
//       {
//         nameKey: "admin.nav.vehicle_creation",
//         path: `/${encTransportMaster}/${encVehicleCreation}`,
//       },
//       {
//         nameKey: "admin.nav.trip_definition",
//         path: `/${encTransportMaster}/${encTripDefinition}`,
//       },

//       {
//         nameKey: "admin.nav.trip_instance",
//         path: `/${encTransportMaster}/${encTripInstance}`,
//       },
//             {
//         nameKey: "admin.nav.trip_attendance",
//         path: `/${encTransportMaster}/${encTripAttendance}`,
//       },
//             { nameKey: "admin.nav.fuel", path: `/${encTransportMaster}/${encFuel}` },





//     ],
//   },
// ];

// const auditItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.audit_items",
//     icon: <Truck size={18} />,
//     subItems: [

//       {
//         nameKey: "admin.nav.vehicle_trip_audit",
//         path: `/${encTransportMaster}/${encVehicleTripAudit}`,
//       },
//             {
//         nameKey: "admin.nav.trip_exception_log",
//         path: `/${encTransportMaster}/${encTripExceptionLog}`,
//       },

//             {
//         nameKey: "admin.nav.bin_load_log",
//         path: `/${encTransportMaster}/${encBinLoadLog}`,
//       },
//             {
//         nameKey: "admin.nav.supervisor_zone_access_audit",
//         path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`,
//       },
//          {
//         nameKey: "admin.nav.staff_template_audit",
//         path: `/${encStaffMasters}/${encStaffTemplateAudit}`,
//       },

//     ],
//   },
// ];

// const vehicleTrackingItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.vehicle_tracking",
//     icon: <Navigation size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.vehicle_tracking",
//         path: `/${encVehicleTracking}/${encVehicleTrack}`,
//       },
//       {
//         nameKey: "admin.nav.vehicle_history",
//         path: `/${encVehicleTracking}/${encVehicleHistory}`,
//       },
//     ],
//   },
// ];

// const wasteManagementMasters: NavItem[] = [
//   {
//     nameKey: "admin.nav.waste_management",
//     icon: <Recycle size={18} />,
//     subItems: [

//       {
//         nameKey: "admin.nav.collection_monitoring",
//         path: `/${encWasteManagementMaster}/${encCollectionMonitoring}`,
//       },
//       {
//         nameKey: "admin.nav.panchayat_base_collection",
//         path: `/${encWasteManagementMaster}/${encPanchayatBaseCollection}`,
//       },
//       {
//         nameKey: "admin.nav.ward_base_collection",
//         path: `/${encWasteManagementMaster}/${encWardBaseCollection}`,
//       },
//     ],
//   },
// ];


// const workforceManagements: NavItem[] = [
//   {
//     nameKey: "admin.nav.workforce_management",
//     icon: <Building2 size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.workforce_management",
//         path: `/${encWorkforceManagement}/${encWorkforceManagement}`,
//       },
//     ],
//   },
// ];

// const reportItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.reports",
//     icon: <BarChart3 size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.trip_summary",
//         path: `/${encReport}/${encTripSummary}`,
//       },
//       {
//         nameKey: "admin.nav.monthly_distance",
//         path: `/${encReport}/${encMonthlyDistance}`,
//       },
//       {
//         nameKey: "admin.nav.waste_collected_summary",
//         path: `/${encReport}/${encWasteCollectedSummary}`,
//       },
//     ],
//   },
// ];

// const sidebarSections = [
//   { key: "main", items: navItems },
//   { key: "superadminMaster", items: superadminMasterItems},
//   { key: "commonMaster", items: commonMasterItems },
//   { key: "master", items: masterItems },
//   { key: "wasteType", items: wasteTypeItems },
//   { key: "assets", items: assetItems },
//   { key: "screenManagement", items: screenManagementItems },
//   { key: "roleAssigns", items: roleAssignsItems },
//   { key: "userCreations", items: userCreationMasters },
//   { key: "processItems", items: processItems },
//   { key: "customerMasters", items: customerMasters },
//   { key: "citizenGrievance", items: citizenGrievanceItems },
//   { key: "transportMasters", items: transportMastersItems },
//   { key: "auditItems", items: auditItems },
//   { key: "vehicleTracking", items: vehicleTrackingItems },
//   { key: "wasteManagement", items: wasteManagementMasters },
//   { key: "workforceManagement", items: workforceManagements },
//   { key: "reports", items: reportItems },
// ] as const;

// type SidebarSectionKey = (typeof sidebarSections)[number]["key"];

// const menuButtonBase =
//   "group flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
// const menuActiveClasses =
//   "border border-sky-200 bg-sky-100 text-sky-900";
// const menuInactiveClasses =
//   "border border-transparent bg-white/80 text-sky-600 hover:border-sky-200 hover:bg-white hover:text-sky-900";
// const subMenuContainerClasses = "mt-2 ml-5 space-y-1 pl-2";
// const subMenuActiveClasses = "bg-sky-100 text-sky-900 font-semibold rounded-lg";
// const subMenuInactiveClasses = "text-sky-600 hover:text-sky-900";

// const AppSidebar: React.FC = () => {
//   const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
//   const location = useLocation();
//   const { t } = useTranslation();
//   const showFullSidebar = isExpanded || isMobileOpen;

//   const [openSubmenu, setOpenSubmenu] = useState<{
//     type: SidebarSectionKey;
//     index: number;
//   } | null>(null);

//   const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
//     {},
//   );
//   const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

//   const currentDecodedPath = useMemo(() => {
//     const [master, module] = location.pathname.split("/").filter(Boolean);
//     return {
//       master: decryptSegment(master || "") ?? null,
//       module: decryptSegment(module || "") ?? null,
//     };
//   }, [location.pathname]);

//   const isActive = useCallback(
//     (path: string, allowNestedRoutes = false) => {
//       if (!path) return false;

//       const segments = path.split("/").filter(Boolean);
//       const [encMaster, encModule] = segments;
//       const decodedMaster = decryptSegment(encMaster || "");
//       const decodedModule = decryptSegment(encModule || "");

//       // If decoding fails, fall back to direct path match (e.g., plain routes)
//       if (!decodedMaster && !decodedModule) {
//         if (location.pathname === path) return true;
//         return (
//           allowNestedRoutes &&
//           location.pathname.startsWith(path.endsWith("/") ? path : `${path}/`)
//         );
//       }

//       if (decodedMaster !== currentDecodedPath.master) return false;
//       if (!decodedModule) return true;

//       if (currentDecodedPath.module === decodedModule) return true;
//       return (
//         allowNestedRoutes &&
//         currentDecodedPath.module?.startsWith(decodedModule)
//       );
//     },
//     [currentDecodedPath, location.pathname],
//   );

//   useEffect(() => {
//     let matched = false;
//     const skipAutoOpenSubmenuKeys = new Set([
//       "admin.nav.vehicle_tracking",
//       "admin.nav.vehicle_history",
//       "admin.nav.collection_monitoring",
//     ]);

//     sidebarSections.forEach((section) => {
//       section.items.forEach((nav, index) => {
//         nav.subItems?.forEach((sub) => {
//           if (isActive(sub.path, true)) {
//             matched = true;
//             if (!skipAutoOpenSubmenuKeys.has(sub.nameKey)) {
//               setOpenSubmenu({ type: section.key, index });
//             }
//           }
//         });
//       });
//     });

//     if (!matched) setOpenSubmenu(null);
//   }, [location, isActive]);

//   useEffect(() => {
//     if (openSubmenu) {
//       const key = `${openSubmenu.type}-${openSubmenu.index}`;
//       const el = subMenuRefs.current[key];
//       if (el) {
//         setSubMenuHeight((prev) => ({
//           ...prev,
//           [key]: el.scrollHeight || 0,
//         }));
//       }
//     }
//   }, [openSubmenu]);

//   const handleSubmenuToggle = (index: number, type: SidebarSectionKey) => {
//     if (!showFullSidebar) {
//       toggleSidebar();
//       setOpenSubmenu({ type, index });
//       return;
//     }

//     setOpenSubmenu((prev) =>
//       prev && prev.type === type && prev.index === index
//         ? null
//         : { type, index },
//     );
//   };

//   const renderMenuItems = (items: NavItem[], type: SidebarSectionKey) => (
//     <ul className="flex flex-col gap-2">
//       {items.map((nav, index) => {
//         const isSubmenuOpen =
//           openSubmenu?.type === type && openSubmenu?.index === index;
//         return (
//           <li key={nav.path ?? nav.nameKey}>
//             {nav.subItems ? (
//               <button
//                 onClick={() => handleSubmenuToggle(index, type)}
//                 className={`${menuButtonBase} ${
//                   isSubmenuOpen ? menuActiveClasses : menuInactiveClasses
//                 }`}
//               >
//                 <span
//                   className={`menu-item-icon-size ${!showFullSidebar ? "mx-auto" : ""} text-emerald-600`}
//                 >
//                   {nav.icon}
//                 </span>
 
//                 {showFullSidebar && (
//                   <>
//                     <span className="text-sm font-semibold text-emerald-900">
//                       {t(nav.nameKey)}
//                     </span>
//                     <ChevronDown
//                       className={`ml-auto h-5 w-5 transition-transform ${
//                         isSubmenuOpen
//                           ? "rotate-180 text-emerald-700"
//                           : "text-emerald-500"
//                       }`}
//                     />
//                   </>
//                 )}
//               </button>
//             ) : (
//               nav.path && (
//                 <Link
//                   to={nav.path}
//                   className={`${menuButtonBase} ${
//                     isActive(nav.path, true)
//                       ? menuActiveClasses
//                       : menuInactiveClasses
//                   }`}
//                 >
//                   <span
//                     className={`menu-item-icon-size ${!showFullSidebar ? "mx-auto" : ""} text-emerald-600`}
//                   >
//                     {nav.icon}
//                   </span>
//                   {showFullSidebar && (
//                     <span className="text-sm font-semibold text-emerald-900">
//                       {t(nav.nameKey)}
//                     </span>
//                   )}
//                 </Link>
//               )
//             )}

//             {nav.subItems && showFullSidebar && (
//               <div
//                 ref={(el) => {
//                   subMenuRefs.current[`${type}-${index}`] = el;
//                 }}
//                 className="overflow-hidden transition-all duration-300"
//                 style={{
//                   height: isSubmenuOpen
//                     ? `${subMenuHeight[`${type}-${index}`]}px`
//                     : "0px",
//                 }}
//               >
//                 <ul className={subMenuContainerClasses}>
//                   {nav.subItems.map((subItem) => (
//                     <li key={subItem.path}>
//                       <Link
//                         to={subItem.path}
//                         className={`block px-3 py-1.5 text-sm font-medium transition-colors ${
//                           isActive(subItem.path, true)
//                             ? subMenuActiveClasses
//                             : subMenuInactiveClasses
//                         }`}
//                       >
//                         {t(subItem.nameKey)}
//                       </Link>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </li>
//         );
//       })}
//     </ul>
//   );

//   return (
//     <aside
//       className={`mt-10 fixed top-0 left-0 z-50 h-[calc(100vh-2.5rem)] border-r bg-white text-sky-900 transition-all duration-300 ease-out ${
//         showFullSidebar ? "w-[300px]" : "w-[140px]"
//       } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
//     >
//       <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent opacity-80" />
//       <div className="flex h-full flex-col px-4 pb-6 pt-6">
//         {showFullSidebar && (
//           <div className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-sky-500">
//             Admin Navigation
//           </div>
//         )}
//         <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
//           <nav className="flex flex-col gap-4">
//             {sidebarSections.map((section) => (
//               <div key={section.key}>
//                 {renderMenuItems(section.items, section.key)}
//               </div>
//             ))}
//           </nav>
//         </div>
//       </div>
//     </aside>
//   );
// };

// export default AppSidebar;



import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  ChevronDown,
  LayoutGrid,
  Settings,
  Layers3,
  Archive,
  Users,
  UserCircle,
  Truck,
  Navigation,
  Recycle,
  AlertTriangle,
  Building2,
  BarChart3,
} from "lucide-react";

import { useSidebar } from "@/contexts/SideBarContext";
import { getEncryptedRoute } from "@/utils/routeCache";
import { decryptSegment } from "@/utils/routeCrypto";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import { getCurrentCompanyUniqueId } from "@/utils/projectContext";
import { userScreenApi, userScreenPermissionApi } from "@/helpers/admin";

const {
  encMasters,
  encContinents,
  encCountries,
  encBins,
  encStates,
  encDistricts,
  encCities,
  encWards,
  encCollectionPoints,
  encWasteTypes,
  encZones,
  encProperties,
  encSubProperties,
  encStaffCreation,
  encAdmins,
  encUserScreen,
  encUserType,
  encUserCreation,
  encCustomerMaster,
  encCustomerCreation,
  encReport,
  encMonthlyDistance,
  encTripSummary,
  encWasteCollectedSummary,
  encCitizenGrivence,
  encComplaint,
  encFeedback,
  encTransportMaster,
  encRoutePlans,
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
  encMainComplaintCategory,
  encSubComplaintCategory,
  encMainScreenType,
  encUserScreenAction,
  encMainScreen,
  encUserScreenPermission,
  encStaffMasters,
  encStaffTemplate,
  encAlternativeStaffTemplate,
  encStaffTemplateAudit,
  encSupervisorZoneMap,
  encSupervisorZoneAccessAudit,
  encTripDefinition,
  encBinLoadLog,
  encCustomerTag,
  encHouseholdPickupEvent,
  encZonePropertyLoadTracker,
  encTripInstance,
  encUnassignedStaffPool,
  encTripAttendance,
  encVehicleTripAudit,
  encTripExceptionLog,
  encCompanyCreation,
  encProjectCreation,
  encSuperAdminMaster,
  encPanchayats,
  encAreaTypes,
  encHierarchies,
} = getEncryptedRoute();

type NavItem = {
  nameKey: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { nameKey: string; path: string }[];
};

type LoginProfile = {
  user_type?: string;
  staffusertype_unique_id?: string;
  company_unique_id?: string;
};

type PermissionRow = {
  unique_id?: string;
  userscreen_id?: string;
  userscreenaction_id?: string;
  is_active?: boolean;
};

type UserScreenRow = {
  unique_id?: string;
  folder_name?: string;
  is_active?: boolean;
};

type SidebarSectionKey =
  | "main"
  | "superadminMaster"
  | "commonMaster"
  | "master"
  | "wasteType"
  | "assets"
  | "screenManagement"
  | "roleAssigns"
  | "userCreations"
  | "processItems"
  | "customerMasters"
  | "citizenGrievance"
  | "transportMasters"
  | "auditItems"
  | "vehicleTracking"
  | "wasteManagement"
  | "workforceManagement"
  | "reports";

/* =====================
   MENU DEFINITIONS
===================== */

const navItems: NavItem[] = [
  {
    nameKey: "admin.nav.dashboard",
    icon: <LayoutGrid size={18} />,
    path: "/admin",
  },
];

const superadminMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.superAdmin_masters",
    icon: <Settings size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.company",
        path: `/${encSuperAdminMaster}/${encCompanyCreation}`,
      },
      {
        nameKey: "admin.nav.project",
        path: `/${encSuperAdminMaster}/${encProjectCreation}`,
      },
    ],
  },
];

const commonMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.common_masters",
    icon: <Settings size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.continent",
        path: `/${encMasters}/${encContinents}`,
      },
      { nameKey: "admin.nav.country", path: `/${encMasters}/${encCountries}` },
      { nameKey: "admin.nav.state", path: `/${encMasters}/${encStates}` },
    ],
  },
];

const masterItems: NavItem[] = [
  {
    nameKey: "admin.nav.masters",
    icon: <Layers3 size={18} />,
    subItems: [
      { nameKey: "admin.nav.district", path: `/${encMasters}/${encDistricts}` },
      { nameKey: "admin.nav.city", path: `/${encMasters}/${encCities}` },
      { nameKey: "admin.nav.zone", path: `/${encMasters}/${encZones}` },
      { nameKey: "admin.nav.ward", path: `/${encMasters}/${encWards}` },
      { nameKey: "admin.nav.panchayat", path: `/${encMasters}/${encPanchayats}` },
      { nameKey: "admin.nav.area_type", path: `/${encMasters}/${encAreaTypes}` },
      { nameKey: "admin.nav.hierarchy", path: `/${encMasters}/${encHierarchies}` },
    ],
  },
];

const wasteTypeItems: NavItem[] = [
  {
    nameKey: "admin.nav.wastetype",
    icon: <Users size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.property",
        path: `/${encMasters}/${encProperties}`,
      },
      {
        nameKey: "admin.nav.sub_property",
        path: `/${encMasters}/${encSubProperties}`,
      },
    ],
  },
];

const assetItems: NavItem[] = [
  {
    nameKey: "admin.nav.assets",
    icon: <Users size={18} />,
    subItems: [
      { nameKey: "admin.nav.bin_creation", path: `/${encMasters}/${encBins}` },
      { nameKey: "admin.nav.collection_point", path: `/${encMasters}/${encCollectionPoints}` },
      { nameKey: "common.waste_type", path: `/${encMasters}/${encWasteTypes}` },
    ],
  },
];

const screenManagementItems: NavItem[] = [
  {
    nameKey: "admin.nav.screenManagements",
    icon: <Settings size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.main_screen_type",
        path: `/${encAdmins}/${encMainScreenType}`,
      },
      {
        nameKey: "admin.nav.main_screen",
        path: `/${encAdmins}/${encMainScreen}`,
      },
      {
        nameKey: "admin.nav.user_screen",
        path: `/${encAdmins}/${encUserScreen}`,
      },
      {
        nameKey: "admin.nav.user_screen_action",
        path: `/${encAdmins}/${encUserScreenAction}`,
      },
      {
        nameKey: "admin.nav.companywise_user_screen_permission",
        path: `/${encAdmins}/${encUserScreenPermission}`,
      },
      {
        nameKey: "admin.nav.user_type",
        path: `/${encAdmins}/${encUserType}`,
      },
      {
        nameKey: "admin.nav.staff_user_type",
        path: `/${encAdmins}/${encStaffUserType}`,
      },
    ],
  },
];

const roleAssignsItems: NavItem[] = [
  {
    nameKey: "admin.nav.roleAssigns",
    icon: <Settings size={18} />,
    subItems: [
      { nameKey: "admin.nav.user_type", path: `/${encAdmins}/${encUserType}` },
      {
        nameKey: "admin.nav.staff_user_type",
        path: `/${encAdmins}/${encStaffUserType}`,
      },
    ],
  },
];

const userCreationMasters: NavItem[] = [
  {
    nameKey: "admin.nav.user_creations",
    icon: <Users size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.staff_creation",
        path: `/${encStaffMasters}/${encStaffCreation}`,
      },
      {
        nameKey: "admin.nav.staff_template",
        path: `/${encStaffMasters}/${encStaffTemplate}`,
      },
      {
        nameKey: "admin.nav.alternative_staff_template",
        path: `/${encStaffMasters}/${encAlternativeStaffTemplate}`,
      },
      {
        nameKey: "admin.nav.supervisor_zone_map",
        path: `/${encStaffMasters}/${encSupervisorZoneMap}`,
      },
      {
        nameKey: "admin.nav.unassigned_staff_pool",
        path: `/${encStaffMasters}/${encUnassignedStaffPool}`,
      },
    ],
  },
];

const processItems: NavItem[] = [
  {
    nameKey: "admin.nav.process_items",
    icon: <Truck size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.route_plans",
        path: `/${encStaffMasters}/${encRoutePlans}`,
      },
      {
        nameKey: "admin.nav.zone_property_load_tracker",
        path: `/${encTransportMaster}/${encZonePropertyLoadTracker}`,
      },
    ],
  },
];

const customerMasters: NavItem[] = [
  {
    nameKey: "admin.nav.customer_masters",
    icon: <UserCircle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.customer_creation",
        path: `/${encCustomerMaster}/${encCustomerCreation}`,
      },
      {
        nameKey: "admin.nav.waste_collected_data",
        path: `/${encWasteManagementMaster}/${encWasteCollectedData}`,
      },
      {
        nameKey: "admin.nav.feedback",
        path: `/${encCitizenGrivence}/${encFeedback}`,
      },
    ],
  },
];

const citizenGrievanceItems: NavItem[] = [
  {
    nameKey: "admin.nav.citizen_grievance",
    icon: <AlertTriangle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.complaints",
        path: `/${encCitizenGrivence}/${encComplaint}`,
      },
      {
        nameKey: "admin.nav.main_category",
        path: `/${encCitizenGrivence}/${encMainComplaintCategory}`,
      },
      {
        nameKey: "admin.nav.sub_category",
        path: `/${encCitizenGrivence}/${encSubComplaintCategory}`,
      },
    ],
  },
];

const transportMastersItems: NavItem[] = [
  {
    nameKey: "admin.nav.transport_masters",
    icon: <Truck size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.vehicle_type",
        path: `/${encTransportMaster}/${encVehicleType}`,
      },
      {
        nameKey: "admin.nav.vehicle_creation",
        path: `/${encTransportMaster}/${encVehicleCreation}`,
      },
      {
        nameKey: "admin.nav.trip_definition",
        path: `/${encTransportMaster}/${encTripDefinition}`,
      },
      {
        nameKey: "admin.nav.trip_instance",
        path: `/${encTransportMaster}/${encTripInstance}`,
      },
      {
        nameKey: "admin.nav.trip_attendance",
        path: `/${encTransportMaster}/${encTripAttendance}`,
      },
      { nameKey: "admin.nav.fuel", path: `/${encTransportMaster}/${encFuel}` },
    ],
  },
];

const auditItems: NavItem[] = [
  {
    nameKey: "admin.nav.audit_items",
    icon: <Truck size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.vehicle_trip_audit",
        path: `/${encTransportMaster}/${encVehicleTripAudit}`,
      },
      {
        nameKey: "admin.nav.trip_exception_log",
        path: `/${encTransportMaster}/${encTripExceptionLog}`,
      },
      {
        nameKey: "admin.nav.bin_load_log",
        path: `/${encTransportMaster}/${encBinLoadLog}`,
      },
      {
        nameKey: "admin.nav.supervisor_zone_access_audit",
        path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`,
      },
      {
        nameKey: "admin.nav.staff_template_audit",
        path: `/${encStaffMasters}/${encStaffTemplateAudit}`,
      },
    ],
  },
];

const vehicleTrackingItems: NavItem[] = [
  {
    nameKey: "admin.nav.vehicle_tracking",
    icon: <Navigation size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.vehicle_tracking",
        path: `/${encVehicleTracking}/${encVehicleTrack}`,
      },
      {
        nameKey: "admin.nav.vehicle_history",
        path: `/${encVehicleTracking}/${encVehicleHistory}`,
      },
    ],
  },
];

const wasteManagementMasters: NavItem[] = [
  {
    nameKey: "admin.nav.waste_management",
    icon: <Recycle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.collection_monitoring",
        path: `/${encWasteManagementMaster}/${encCollectionMonitoring}`,
      },
      {
        nameKey: "admin.nav.panchayat_base_collection",
        path: `/${encWasteManagementMaster}/${encPanchayatBaseCollection}`,
      },
      {
        nameKey: "admin.nav.ward_base_collection",
        path: `/${encWasteManagementMaster}/${encWardBaseCollection}`,
      },
    ],
  },
];

const workforceManagements: NavItem[] = [
  {
    nameKey: "admin.nav.workforce_management",
    icon: <Building2 size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.workforce_management",
        path: `/${encWorkforceManagement}/${encWorkforceManagement}`,
      },
    ],
  },
];

const reportItems: NavItem[] = [
  {
    nameKey: "admin.nav.reports",
    icon: <BarChart3 size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.trip_summary",
        path: `/${encReport}/${encTripSummary}`,
      },
      {
        nameKey: "admin.nav.monthly_distance",
        path: `/${encReport}/${encMonthlyDistance}`,
      },
      {
        nameKey: "admin.nav.waste_collected_summary",
        path: `/${encReport}/${encWasteCollectedSummary}`,
      },
    ],
  },
];

const menuButtonBase =
  "group flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
const menuActiveClasses = "border border-sky-200 bg-sky-100 text-sky-900";
const menuInactiveClasses =
  "border border-transparent bg-white/80 text-sky-600 hover:border-sky-200 hover:bg-white hover:text-sky-900";
const subMenuContainerClasses = "mt-2 ml-5 space-y-1 pl-2";
const subMenuActiveClasses = "bg-sky-100 text-sky-900 font-semibold rounded-lg";
const subMenuInactiveClasses = "text-sky-600 hover:text-sky-900";

const normalizeModuleKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const readLoginProfile = (): LoginProfile | null => {
  if (typeof window === "undefined") return null;

  const rawProfile = localStorage.getItem("profile");
  if (!rawProfile) return null;

  try {
    return JSON.parse(rawProfile) as LoginProfile;
  } catch {
    return null;
  }
};

const getModuleKeyFromPath = (path: string): string => {
  const segments = path.split("/").filter(Boolean);
  const encodedModule = segments[1] ?? "";
  const decodedModule = decryptSegment(encodedModule) ?? encodedModule;
  return normalizeModuleKey(decodedModule);
};

const filterNavItemsByAllowedModules = (
  items: NavItem[],
  allowedModules: Set<string>,
): NavItem[] =>
  items.reduce<NavItem[]>((acc, nav) => {
    if (nav.subItems?.length) {
      const filteredSubItems = nav.subItems.filter((subItem) => {
        const moduleKey = getModuleKeyFromPath(subItem.path);
        return moduleKey.length > 0 && allowedModules.has(moduleKey);
      });

      if (filteredSubItems.length > 0) {
        acc.push({ ...nav, subItems: filteredSubItems });
      }

      return acc;
    }

    if (!nav.path || nav.path === "/admin") {
      acc.push(nav);
      return acc;
    }

    const moduleKey = getModuleKeyFromPath(nav.path);
    if (moduleKey.length > 0 && allowedModules.has(moduleKey)) {
      acc.push(nav);
    }

    return acc;
  }, []);

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const showFullSidebar = isExpanded || isMobileOpen;

  // ✅ Get role from localStorage (stored during login)
  const profile = useMemo(() => readLoginProfile(), []);
  const role = useMemo(() => {
    if (typeof window === "undefined") return null;
    return normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
  }, []);
  const isSuperAdmin = role === "superadmin";

  const companyUniqueId = useMemo(
    () =>
      getCurrentCompanyUniqueId() ??
      String(profile?.company_unique_id ?? "").trim(),
    [profile?.company_unique_id],
  );
  const staffUserTypeId = useMemo(
    () => String(profile?.staffusertype_unique_id ?? "").trim(),
    [profile?.staffusertype_unique_id],
  );
  const isStaffUser = useMemo(() => {
    const userType = String(profile?.user_type ?? "").trim().toLowerCase();
    return userType === "staff" || staffUserTypeId.length > 0;
  }, [profile?.user_type, staffUserTypeId]);
  const shouldFilterByPermissions =
    !isSuperAdmin &&
    isStaffUser &&
    companyUniqueId.length > 0 &&
    staffUserTypeId.length > 0;

  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(
    null,
  );

  useEffect(() => {
    if (!shouldFilterByPermissions) {
      return;
    }

    let isActive = true;

    const fetchPermissionRows = async (): Promise<PermissionRow[]> => {
      const limit = 200;
      const maxRounds = 30;
      const seen = new Set<string>();
      const rows: PermissionRow[] = [];

      for (let round = 0; round < maxRounds; round += 1) {
        const offset = round * limit;
        const chunk = await userScreenPermissionApi.list({
          params: {
            company_id: companyUniqueId,
            staffusertype_id: staffUserTypeId,
            limit,
            offset,
          },
        });

        if (!Array.isArray(chunk) || chunk.length === 0) {
          break;
        }

        let newRows = 0;

        chunk.forEach((item) => {
          const key = String(
            item.unique_id ??
              `${item.userscreen_id ?? ""}__${item.userscreenaction_id ?? ""}`,
          );

          if (!seen.has(key)) {
            seen.add(key);
            rows.push(item);
            newRows += 1;
          }
        });

        if (chunk.length < limit || newRows === 0) {
          break;
        }
      }

      return rows;
    };

    const fetchUserScreens = async (): Promise<UserScreenRow[]> => {
      const limit = 200;
      const maxRounds = 30;
      const seen = new Set<string>();
      const rows: UserScreenRow[] = [];

      for (let round = 0; round < maxRounds; round += 1) {
        const offset = round * limit;
        const chunk = await userScreenApi.list({
          params: {
            company_id: companyUniqueId,
            limit,
            offset,
          },
        });

        if (!Array.isArray(chunk) || chunk.length === 0) {
          break;
        }

        let newRows = 0;

        chunk.forEach((item) => {
          const key = String(item.unique_id ?? "");
          if (!key || seen.has(key)) return;

          seen.add(key);
          rows.push(item);
          newRows += 1;
        });

        if (chunk.length < limit || newRows === 0) {
          break;
        }
      }

      return rows;
    };

    const loadAllowedModules = async () => {
      try {
        const [permissions, userScreens] = await Promise.all([
          fetchPermissionRows(),
          fetchUserScreens(),
        ]);

        const allowedScreenIds = new Set(
          permissions
            .filter((row) => row.is_active !== false)
            .map((row) => String(row.userscreen_id ?? "").trim())
            .filter(Boolean),
        );

        const modules = new Set<string>();

        userScreens.forEach((screen) => {
          const screenId = String(screen.unique_id ?? "").trim();
          if (!screenId || !allowedScreenIds.has(screenId)) return;
          if (screen.is_active === false) return;

          const moduleKey = normalizeModuleKey(
            String(screen.folder_name ?? ""),
          );

          if (moduleKey) {
            modules.add(moduleKey);
          }
        });

        if (isActive) {
          setAllowedModules(modules);
        }
      } catch (error) {
        console.error("Unable to load sidebar permissions", error);
        if (isActive) {
          setAllowedModules(new Set());
        }
      }
    };

    loadAllowedModules();

    return () => {
      isActive = false;
    };
  }, [companyUniqueId, shouldFilterByPermissions, staffUserTypeId]);

  // ✅ Build sidebar sections dynamically based on role
  const baseSidebarSections = useMemo(
    () => [
      { key: "main" as const,                items: navItems },
      { key: "superadminMaster" as const,    items: superadminMasterItems },
      { key: "commonMaster" as const,        items: commonMasterItems },
      { key: "master" as const,              items: masterItems },
      { key: "wasteType" as const,           items: wasteTypeItems },
      { key: "assets" as const,              items: assetItems },

      // ✅ Only visible to superadmin
      ...(isSuperAdmin
        ? [{ key: "screenManagement" as const, items: screenManagementItems }]
        : []),

      { key: "roleAssigns" as const,         items: roleAssignsItems },
      { key: "userCreations" as const,       items: userCreationMasters },
      { key: "processItems" as const,        items: processItems },
      { key: "customerMasters" as const,     items: customerMasters },
      { key: "citizenGrievance" as const,    items: citizenGrievanceItems },
      { key: "transportMasters" as const,    items: transportMastersItems },
      { key: "auditItems" as const,          items: auditItems },
      { key: "vehicleTracking" as const,     items: vehicleTrackingItems },
      { key: "wasteManagement" as const,     items: wasteManagementMasters },
      { key: "workforceManagement" as const, items: workforceManagements },
      { key: "reports" as const,             items: reportItems },
    ],
    [isSuperAdmin],
  );

  const sidebarSections = useMemo(() => {
    if (!shouldFilterByPermissions) {
      return baseSidebarSections;
    }

    const modules = allowedModules ?? new Set<string>();

    return baseSidebarSections
      .map((section) => ({
        ...section,
        items: filterNavItemsByAllowedModules(section.items, modules),
      }))
      .filter((section) => section.items.length > 0);
  }, [allowedModules, baseSidebarSections, shouldFilterByPermissions]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: SidebarSectionKey;
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentDecodedPath = useMemo(() => {
    const [master, module] = location.pathname.split("/").filter(Boolean);
    return {
      master: decryptSegment(master || "") ?? null,
      module: decryptSegment(module || "") ?? null,
    };
  }, [location.pathname]);

  const isActive = useCallback(
    (path: string, allowNestedRoutes = false) => {
      if (!path) return false;

      const segments = path.split("/").filter(Boolean);
      const [encMaster, encModule] = segments;
      const decodedMaster = decryptSegment(encMaster || "");
      const decodedModule = decryptSegment(encModule || "");

      if (!decodedMaster && !decodedModule) {
        if (location.pathname === path) return true;
        return (
          allowNestedRoutes &&
          location.pathname.startsWith(path.endsWith("/") ? path : `${path}/`)
        );
      }

      if (decodedMaster !== currentDecodedPath.master) return false;
      if (!decodedModule) return true;

      if (currentDecodedPath.module === decodedModule) return true;
      return (
        allowNestedRoutes &&
        currentDecodedPath.module?.startsWith(decodedModule)
      );
    },
    [currentDecodedPath, location.pathname],
  );

  useEffect(() => {
    let matched = false;
    const skipAutoOpenSubmenuKeys = new Set([
      "admin.nav.vehicle_tracking",
      "admin.nav.vehicle_history",
      "admin.nav.collection_monitoring",
    ]);

    sidebarSections.forEach((section) => {
      section.items.forEach((nav, index) => {
        nav.subItems?.forEach((sub) => {
          if (isActive(sub.path, true)) {
            matched = true;
            if (!skipAutoOpenSubmenuKeys.has(sub.nameKey)) {
              setOpenSubmenu({ type: section.key, index });
            }
          }
        });
      });
    });

    if (!matched) setOpenSubmenu(null);
  }, [location, isActive, sidebarSections]);

  useEffect(() => {
    if (openSubmenu) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const el = subMenuRefs.current[key];
      if (el) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: el.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, type: SidebarSectionKey) => {
    if (!showFullSidebar) {
      toggleSidebar();
      setOpenSubmenu({ type, index });
      return;
    }

    setOpenSubmenu((prev) =>
      prev && prev.type === type && prev.index === index
        ? null
        : { type, index },
    );
  };

  const renderMenuItems = (items: NavItem[], type: SidebarSectionKey) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => {
        const isSubmenuOpen =
          openSubmenu?.type === type && openSubmenu?.index === index;
        return (
          <li key={nav.path ?? nav.nameKey}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, type)}
                className={`${menuButtonBase} ${
                  isSubmenuOpen ? menuActiveClasses : menuInactiveClasses
                }`}
              >
                <span
                  className={`menu-item-icon-size ${!showFullSidebar ? "mx-auto" : ""} text-emerald-600`}
                >
                  {nav.icon}
                </span>

                {showFullSidebar && (
                  <>
                    <span className="text-sm font-semibold text-emerald-900">
                      {t(nav.nameKey)}
                    </span>
                    <ChevronDown
                      className={`ml-auto h-5 w-5 transition-transform ${
                        isSubmenuOpen
                          ? "rotate-180 text-emerald-700"
                          : "text-emerald-500"
                      }`}
                    />
                  </>
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`${menuButtonBase} ${
                    isActive(nav.path, true)
                      ? menuActiveClasses
                      : menuInactiveClasses
                  }`}
                >
                  <span
                    className={`menu-item-icon-size ${!showFullSidebar ? "mx-auto" : ""} text-emerald-600`}
                  >
                    {nav.icon}
                  </span>
                  {showFullSidebar && (
                    <span className="text-sm font-semibold text-emerald-900">
                      {t(nav.nameKey)}
                    </span>
                  )}
                </Link>
              )
            )}

            {nav.subItems && showFullSidebar && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${type}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: isSubmenuOpen
                    ? `${subMenuHeight[`${type}-${index}`]}px`
                    : "0px",
                }}
              >
                <ul className={subMenuContainerClasses}>
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.path}>
                      <Link
                        to={subItem.path}
                        className={`block px-3 py-1.5 text-sm font-medium transition-colors ${
                          isActive(subItem.path, true)
                            ? subMenuActiveClasses
                            : subMenuInactiveClasses
                        }`}
                      >
                        {t(subItem.nameKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`mt-10 fixed top-0 left-0 z-50 h-[calc(100vh-2.5rem)] border-r bg-white text-sky-900 transition-all duration-300 ease-out ${
        showFullSidebar ? "w-[300px]" : "w-[140px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent opacity-80" />
      <div className="flex h-full flex-col px-4 pb-6 pt-6">
        {showFullSidebar && (
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-sky-500">
            Admin Navigation
          </div>
        )}
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
          <nav className="flex flex-col gap-4">
            {sidebarSections.map((section) => (
              <div key={section.key}>
                {renderMenuItems(section.items, section.key)}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
