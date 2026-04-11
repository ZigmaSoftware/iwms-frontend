// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { useTranslation } from "react-i18next";
// import { usePermission } from "@/contexts/PermissionContext";

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
// import { USER_ROLE_STORAGE_KEY } from "@/types/roles";


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

// type SidebarSectionKey =
//   | "main"
//   | "superadminMaster"
//   | "commonMaster"
//   | "master"
//   | "wasteType"
//   | "assets"
//   | "screenManagement"
//   | "roleAssigns"
//   | "userCreations"
//   | "processItems"
//   | "customerMasters"
//   | "citizenGrievance"
//   | "transportMasters"
//   | "auditItems"
//   | "vehicleTracking"
//   | "wasteManagement"
//   | "workforceManagement"
//   | "reports";

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
//     icon: <Users size={18} />,
//     subItems: [
//       {
//         nameKey: "admin.nav.property",
//         path: `/${encMasters}/${encProperties}`,
//       },
//       {
//         nameKey: "admin.nav.sub_property",
//         path: `/${encMasters}/${encSubProperties}`,
//       },
//     ],
//   },
// ];

// const assetItems: NavItem[] = [
//   {
//     nameKey: "admin.nav.assets",
//     icon: <Users size={18} />,
//     subItems: [
//       { nameKey: "admin.nav.bin_creation", path: `/${encMasters}/${encBins}` },
      // { nameKey: "admin.nav.collection_point", path: `/${encMasters}/${encCollectionPoints}` },
      // { nameKey: "common.waste_type", path: `/${encMasters}/${encWasteTypes}` },
//     ],
//   },
// ];

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
//         path: `/${encAdmins}/${encUserType}`,
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
// ];

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
//       {
//         nameKey: "admin.nav.route_plans",
//         path: `/${encStaffMasters}/${encRoutePlans}`,
//       },
//       {
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
//       {
//         nameKey: "admin.nav.waste_collected_data",
//         path: `/${encWasteManagementMaster}/${encWasteCollectedData}`,
//       },
//       {
//         nameKey: "admin.nav.feedback",
//         path: `/${encCitizenGrivence}/${encFeedback}`,
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
//       {
//         nameKey: "admin.nav.trip_attendance",
//         path: `/${encTransportMaster}/${encTripAttendance}`,
//       },
//       { nameKey: "admin.nav.fuel", path: `/${encTransportMaster}/${encFuel}` },
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
//       {
//         nameKey: "admin.nav.trip_exception_log",
//         path: `/${encTransportMaster}/${encTripExceptionLog}`,
//       },
//       {
//         nameKey: "admin.nav.bin_load_log",
//         path: `/${encTransportMaster}/${encBinLoadLog}`,
//       },
//       {
//         nameKey: "admin.nav.supervisor_zone_access_audit",
//         path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`,
//       },
//       {
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

// const menuButtonBase =
//   "group flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
// const menuActiveClasses = "border border-sky-200 bg-sky-100 text-sky-900";
// const menuInactiveClasses =
//   "border border-transparent bg-white/80 text-sky-600 hover:border-sky-200 hover:bg-white hover:text-sky-900";
// const subMenuContainerClasses = "mt-2 ml-5 space-y-1 pl-2";
// const subMenuActiveClasses = "bg-sky-100 text-sky-900 font-semibold rounded-lg";
// const subMenuInactiveClasses = "text-sky-600 hover:text-sky-900";

// const AppSidebar: React.FC = () => {
//   const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
//   const location = useLocation();
//   const { t } = useTranslation();
//   const { hasPermission } = usePermission();
//   const showFullSidebar = isExpanded || isMobileOpen;

//   // ✅ Build sidebar sections dynamically based on PERMISSIONS
//   const sidebarSections = useMemo(
//     () => [
//       { key: "main" as const,                items: navItems },
      
    
//       ...(hasPermission("user-creation", "ScreenManagement", "view")
//         ? [{ key: "screenManagement" as const, items: screenManagementItems }]
//         : []),

//       { key: "commonMaster" as const,        items: commonMasterItems },
//       { key: "master" as const,              items: masterItems },
//       { key: "wasteType" as const,           items: wasteTypeItems },
//       { key: "assets" as const,              items: assetItems },
//       { key: "roleAssigns" as const,         items: roleAssignsItems },
//       { key: "userCreations" as const,       items: userCreationMasters },
//       { key: "processItems" as const,        items: processItems }, 
//       { key: "customerMasters" as const,     items: customerMasters },
//       { key: "citizenGrievance" as const,   items: citizenGrievanceItems },
//       { key: "transportMasters" as const,    items: transportMastersItems },
//       { key: "auditItems" as const,         items: auditItems },  
//       { key: "vehicleTracking" as const,     items: vehicleTrackingItems },
//       { key: "workforceManagement" as const, items: workforceManagements },
//       { key: "reports" as const,             items: reportItems },
//       ],
//       [hasPermission],  // ✅ Re-compute when permissions change
//   );

//   const [openSubmenu, setOpenSubmenu] = useState<{
//     type: SidebarSectionKey;
//     index: number;
//   } | null>(null);

//   const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
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
//   }, [location, isActive, sidebarSections]);

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
import { usePermission } from "@/contexts/PermissionContext";

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
  encApartmentList,
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
  module?: string;
  screen?: string;
  subItems?: Array<{
    nameKey: string;
    path: string;
    module?: string;
    screen?: string;
  }>;
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
    module: "dashboard",
    screen: "Dashboard",
  },
];

const superadminMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.superAdmin_masters",
    icon: <Settings size={18} />,
    module: "admin",
    screen: "SuperAdminMasters",
    subItems: [
      {
        nameKey: "admin.nav.company",
        path: `/${encSuperAdminMaster}/${encCompanyCreation}`,
        module: "admin",
        screen: "CompanyCreation",
      },
      {
        nameKey: "admin.nav.project",
        path: `/${encSuperAdminMaster}/${encProjectCreation}`,
        module: "admin",
        screen: "ProjectCreation",
      },
    ],
  },
];

const commonMasterItems: NavItem[] = [
  {
    nameKey: "admin.nav.common_masters",
    icon: <Settings size={18} />,
    module: "common-masters",
    screen: "common-masters",
    subItems: [
      {
        nameKey: "admin.nav.continent",
        path: `/${encMasters}/${encContinents}`,
        module: "common-masters",
        screen: "continents",
      },
      {
        nameKey: "admin.nav.country",
        path: `/${encMasters}/${encCountries}`,
        module: "common-masters",
        screen: "countries",
      },
      {
        nameKey: "admin.nav.state",
        path: `/${encMasters}/${encStates}`,
        module: "common-masters",
        screen: "states",
      },
    ],
  },
];

const masterItems: NavItem[] = [
  {
    nameKey: "admin.nav.masters",
    icon: <Layers3 size={18} />,
    module: "masters",
    screen: "masters",
    subItems: [
      {
        nameKey: "admin.nav.district",
        path: `/${encMasters}/${encDistricts}`,
        module: "masters",
        screen: "districts",
      },
      {
        nameKey: "admin.nav.city",
        path: `/${encMasters}/${encCities}`,
        module: "masters",
        screen: "cities",
      },
      {
        nameKey: "admin.nav.zone",
        path: `/${encMasters}/${encZones}`,
        module: "masters",
        screen: "zones",
      },
      {
        nameKey: "admin.nav.ward",
        path: `/${encMasters}/${encWards}`,
        module: "masters",
        screen: "wards",
      },
      {
        nameKey: "admin.nav.panchayat",
        path: `/${encMasters}/${encPanchayats}`,
        module: "masters",
        screen: "panchayats",
      },
      {
        nameKey: "admin.nav.area_type",
        path: `/${encMasters}/${encAreaTypes}`,
        module: "masters",
        screen: "areatypes",
      },
      {
        nameKey: "admin.nav.hierarchy",
        path: `/${encMasters}/${encHierarchies}`,
        module: "masters",
        screen: "hierarchies",
      },
    ],
  },
];

const wasteTypeItems: NavItem[] = [
  {
    nameKey: "admin.nav.wastetype",
    icon: <Users size={18} />,
    module: "waste-types",
    screen: "waste-types",
    subItems: [
      {
        nameKey: "admin.nav.property",
        path: `/${encMasters}/${encProperties}`,
        module: "waste-types",
        screen: "properties",
      },
      {
        nameKey: "admin.nav.sub_property",
        path: `/${encMasters}/${encSubProperties}`,
        module: "waste-types",
        screen: "subproperties",
      },
    ],
  },
];

const assetItems: NavItem[] = [
  {
    nameKey: "admin.nav.assets",
    icon: <Users size={18} />,
    module: "assets",
    screen: "assets",
    subItems: [
      {
        nameKey: "admin.nav.bin_creation",
        path: `/${encMasters}/${encBins}`,
        module: "assets",
        screen: "bins",
      },
      {
        nameKey: "admin.nav.collection_point",
        path: `/${encMasters}/${encCollectionPoints}`,
        module: "assets",
        screen: "collectionpoints",
      },
      {
        nameKey: "common.waste_type", 
        path: `/${encMasters}/${encWasteTypes}`,
        module: "assets",
        screen: "wastetypes",
      }
    ],
  },
];

const screenManagementItems: NavItem[] = [
  {
    nameKey: "admin.nav.screenManagements",
    icon: <Settings size={18} />,
    module: "screen-managements",
    screen: "screen-managements",
    subItems: [
      {
        nameKey: "admin.nav.main_screen_type",
        path: `/${encAdmins}/${encMainScreenType}`,
        module: "screen-managements",
        screen: "mainscreentype",
      },
      {
        nameKey: "admin.nav.main_screen",
        path: `/${encAdmins}/${encMainScreen}`,
        module: "screen-managements",
        screen: "mainscreens",
      },
      {
        nameKey: "admin.nav.user_screen",
        path: `/${encAdmins}/${encUserScreen}`,
        module: "screen-managements",
        screen: "userscreens",
      },
      {
        nameKey: "admin.nav.user_screen_action",
        path: `/${encAdmins}/${encUserScreenAction}`,
        module: "screen-managements",
        screen: "userscreen-action",
      },
      {
        nameKey: "admin.nav.companywise_user_screen_permission",
        path: `/${encAdmins}/${encUserScreenPermission}`,
        module: "screen-managements",
        screen: "companywisescreenpermissions",
      },
    ],
  },
];

const roleAssignsItems: NavItem[] = [
  {
    nameKey: "admin.nav.roleAssigns",
    icon: <Settings size={18} />,
    module: "role-assigns",
    screen: "role-assigns",
    subItems: [
      {
        nameKey: "admin.nav.user_type",
        path: `/${encAdmins}/${encUserType}`,
        module: "role-assigns",
        screen: "user-type",
      },
      {
        nameKey: "admin.nav.staff_user_type",
        path: `/${encAdmins}/${encStaffUserType}`,
        module: "role-assigns",
        screen: "staffusertypes",
      },
    ],
  },
];

const userCreationMasters: NavItem[] = [
  {
    nameKey: "admin.nav.user_creations",
    icon: <Users size={18} />,
    module: "user-creations",
    screen: "user-creations",
    subItems: [
      {
        nameKey: "admin.nav.staff_creation",
        path: `/${encStaffMasters}/${encStaffCreation}`,
        module: "user-creations",
        screen: "staffcreation",
      },
      {
        nameKey: "admin.nav.staff_template",
        path: `/${encStaffMasters}/${encStaffTemplate}`,
        module: "user-creations",
        screen: "stafftemplate-creation",
      },
      {
        nameKey: "admin.nav.alternative_staff_template",
        path: `/${encStaffMasters}/${encAlternativeStaffTemplate}`,
        module: "user-creations",
        screen: "alternative-stafftemplate",
      },
      {
        nameKey: "admin.nav.supervisor_zone_map",
        path: `/${encStaffMasters}/${encSupervisorZoneMap}`,
        module: "user-creations",
        screen: "supervisor-zone-map",
      },
      {
        nameKey: "admin.nav.unassigned_staff_pool",
        path: `/${encStaffMasters}/${encUnassignedStaffPool}`,
        module: "user-creations",
        screen: "unassigned-staff-pool",
      },
    ],
  },
];

const processItems: NavItem[] = [
  {
    nameKey: "admin.nav.process_items",
    icon: <Truck size={18} />,
    module: "process",
    screen: "process",
    subItems: [
      {
        nameKey: "admin.nav.route_plans",
        path: `/${encStaffMasters}/${encRoutePlans}`,
        module: "process",
        screen: "route-plans",
      },
      {
        nameKey: "admin.nav.zone_property_load_tracker",
        path: `/${encTransportMaster}/${encZonePropertyLoadTracker}`,
        module: "process",
        screen: "zone-property-load-tracker",
      },
    ],
  },
];

const customerMasters: NavItem[] = [
  {
    nameKey: "admin.nav.customer_masters",
    icon: <UserCircle size={18} />,
    module: "customers",
    screen: "customers",
    subItems: [
      {
        nameKey: "admin.nav.customer_creation",
        path: `/${encCustomerMaster}/${encCustomerCreation}`,
        module: "customers",
        screen: "customercreations",
      },
      {
        nameKey: "admin.nav.apartment_list",
        path: `/${encCustomerMaster}/${encApartmentList}`,
        module: "customers",
        screen: "customercreations",
      },
      {
        nameKey: "admin.nav.waste_collected_data",
        path: `/${encWasteManagementMaster}/${encWasteCollectedData}`,
        module: "customers",
        screen: "wastecollections",
      },
      {
        nameKey: "admin.nav.feedback",
        path: `/${encCitizenGrivence}/${encFeedback}`,
        module: "customers",
        screen: "feedbacks",
      },
    ],
  },
];

const citizenGrievanceItems: NavItem[] = [
  {
    nameKey: "admin.nav.citizen_grievance",
    icon: <AlertTriangle size={18} />,
    module: "grivences",
    screen: "grivences",
    subItems: [
      {
        nameKey: "admin.nav.complaints",
        path: `/${encCitizenGrivence}/${encComplaint}`,
        module: "grivences",
        screen: "complaints",
      },
      {
        nameKey: "admin.nav.main_category",
        path: `/${encCitizenGrivence}/${encMainComplaintCategory}`,
        module: "grivences",
        screen: "main-category",
      },
      {
        nameKey: "admin.nav.sub_category",
        path: `/${encCitizenGrivence}/${encSubComplaintCategory}`,
        module: "grivences",
        screen: "sub-category",
      },
    ],
  },
];

const transportMastersItems: NavItem[] = [
  {
    nameKey: "admin.nav.transport_masters",
    icon: <Truck size={18} />,
    module: "transport-masters",
    screen: "transport-masters",
    subItems: [
      {
        nameKey: "admin.nav.vehicle_type",
        path: `/${encTransportMaster}/${encVehicleType}`,
        module: "transport-masters",
        screen: "vehicle-type",
      },
      {
        nameKey: "admin.nav.vehicle_creation",
        path: `/${encTransportMaster}/${encVehicleCreation}`,
        module: "transport-masters",
        screen: "vehicle-creation",
      },
      {
        nameKey: "admin.nav.trip_definition",
        path: `/${encTransportMaster}/${encTripDefinition}`,
        module: "transport-masters",
        screen: "trip-definition",
      },
      {
        nameKey: "admin.nav.trip_instance",
        path: `/${encTransportMaster}/${encTripInstance}`,
        module: "transport-masters",
        screen: "trip-instance",
      },
      {
        nameKey: "admin.nav.trip_attendance",
        path: `/${encTransportMaster}/${encTripAttendance}`,
        module: "transport-masters",
        screen: "trip-attendance",
      },
      {
        nameKey: "admin.nav.fuel",
        path: `/${encTransportMaster}/${encFuel}`,
        module: "transport-masters",
        screen: "fuels",
      },
    ],
  },
];

const auditItems: NavItem[] = [
  {
    nameKey: "admin.nav.audit_items",
    icon: <Truck size={18} />,
    module: "audits",
    screen: "audits",
    subItems: [
      {
        nameKey: "admin.nav.vehicle_trip_audit",
        path: `/${encTransportMaster}/${encVehicleTripAudit}`,
        module: "audits",
        screen: "vehicle-trip-audit",
      },
      {
        nameKey: "admin.nav.trip_exception_log",
        path: `/${encTransportMaster}/${encTripExceptionLog}`,
        module: "audits",
        screen: "trip-exception-log",
      },
      {
        nameKey: "admin.nav.bin_load_log",
        path: `/${encTransportMaster}/${encBinLoadLog}`,
        module: "audits",
        screen: "bin-load-log",
      },
      {
        nameKey: "admin.nav.supervisor_zone_access_audit",
        path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`,
        module: "audits",
        screen: "supervisor-zone-access-audit",
      },
      {
        nameKey: "admin.nav.staff_template_audit",
        path: `/${encStaffMasters}/${encStaffTemplateAudit}`,
        module: "audits",
        screen: "stafftemplate-audit-log",
      },
    ],
  },
];

const vehicleTrackingItems: NavItem[] = [
  {
    nameKey: "admin.nav.vehicle_tracking",
    icon: <Navigation size={18} />,
    module: "vehicle-tracking",
    screen: "VehicleTracking",
    subItems: [
      {
        nameKey: "admin.nav.vehicle_tracking",
        path: `/${encVehicleTracking}/${encVehicleTrack}`,
        module: "vehicle-tracking",
        screen: "VehicleTrack",
      },
      {
        nameKey: "admin.nav.vehicle_history",
        path: `/${encVehicleTracking}/${encVehicleHistory}`,
        module: "vehicle-tracking",
        screen: "VehicleHistory",
      },
    ],
  },
];

const wasteManagementMasters: NavItem[] = [
  {
    nameKey: "admin.nav.waste_management",
    icon: <Recycle size={18} />,
    module: "waste-management",
    screen: "WasteManagement",
    subItems: [
      {
        nameKey: "admin.nav.collection_monitoring",
        path: `/${encWasteManagementMaster}/${encCollectionMonitoring}`,
        module: "waste-management",
        screen: "CollectionMonitoring",
      },
      {
        nameKey: "admin.nav.panchayat_base_collection",
        path: `/${encWasteManagementMaster}/${encPanchayatBaseCollection}`,
        module: "waste-management",
        screen: "PanchayatBaseCollection",
      },
      {
        nameKey: "admin.nav.ward_base_collection",
        path: `/${encWasteManagementMaster}/${encWardBaseCollection}`,
        module: "waste-management",
        screen: "WardBaseCollection",
      },
    ],
  },
];

const workforceManagements: NavItem[] = [
  {
    nameKey: "admin.nav.workforce_management",
    icon: <Building2 size={18} />,
    module: "workforce",
    screen: "WorkforceManagement",
    subItems: [
      {
        nameKey: "admin.nav.workforce_management",
        path: `/${encWorkforceManagement}/${encWorkforceManagement}`,
        module: "workforce",
        screen: "WorkforceManagement",
      },
    ],
  },
];

const reportItems: NavItem[] = [
  {
    nameKey: "admin.nav.reports",
    icon: <BarChart3 size={18} />,
    module: "reports",
    screen: "Reports",
    subItems: [
      {
        nameKey: "admin.nav.trip_summary",
        path: `/${encReport}/${encTripSummary}`,
        module: "reports",
        screen: "TripSummary",
      },
      {
        nameKey: "admin.nav.monthly_distance",
        path: `/${encReport}/${encMonthlyDistance}`,
        module: "reports",
        screen: "MonthlyDistance",
      },
      {
        nameKey: "admin.nav.waste_collected_summary",
        path: `/${encReport}/${encWasteCollectedSummary}`,
        module: "reports",
        screen: "WasteCollectedSummary",
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

// ✅ Helper: Check if user is superadmin
const isSuperAdminUser = (): boolean => {
  const roleFromStorage = localStorage.getItem("user_role");
  return roleFromStorage === "superadmin" || roleFromStorage === "super_admin";
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const showFullSidebar = isExpanded || isMobileOpen;

  // ✅ Detect if current user is superadmin
  const isSuperAdmin = useMemo(() => isSuperAdminUser(), []);

  // ✅ Check permission with proper logging
  const checkPermission = useCallback(
    (module: string | undefined, screen: string | undefined): boolean => {
      if (!module || !screen) return true;
      const allowed = hasPermission(module, screen, "show");
      return allowed;
    },
    [hasPermission]
  );

  // ✅ Filter sub-items: only show items with permission
  const filterSubItems = (
    subItems: NavItem["subItems"]
  ): NavItem["subItems"] => {
    if (!subItems) return undefined;

    // Superadmin sees all items
    if (isSuperAdmin) return subItems;

    // Regular users: only show items they have permission for
    return subItems.filter((sub) => {
      const allowed = checkPermission(sub.module, sub.screen);
      console.log(
        `[Filter SubItem] ${sub.nameKey} (${sub.module}/${sub.screen}) = ${allowed}`
      );
      return allowed;
    });
  };

  // ✅ Check if menu item should be shown
  const hasVisibleContent = (
    item: NavItem,
    filteredSubItems: NavItem["subItems"]
  ): boolean => {

    if (item.nameKey === "admin.nav.dashboard") {
    return true;
  }
    // If no subItems, check direct permission or show if no permission needed
    if (!item.subItems || item.subItems.length === 0) {
      if (!item.module || !item.screen) return true;
      const allowed = checkPermission(item.module, item.screen);
      console.log(
        `[Show Item] ${item.nameKey} (no children, ${item.module}/${item.screen}) = ${allowed}`
      );
      return allowed;
    }

    // If has subItems, show only if filtered children exist
    const hasChildren = !!(filteredSubItems && filteredSubItems.length > 0);
    console.log(
      `[Show Item] ${item.nameKey} (parent, has ${filteredSubItems?.length || 0} children) = ${hasChildren}`
    );
    return hasChildren;
  };

  // ✅ Build sidebar sections with strict filtering
  const sidebarSections = useMemo(
    () => {
      const allSections = [
        { key: "main" as const, items: navItems },
        { key: "superadminMaster" as const, items: superadminMasterItems },
        { key: "commonMaster" as const, items: commonMasterItems },
        { key: "master" as const, items: masterItems },
        { key: "wasteType" as const, items: wasteTypeItems },
        { key: "assets" as const, items: assetItems },
        { key: "screenManagement" as const, items: screenManagementItems },
        { key: "roleAssigns" as const, items: roleAssignsItems },
        { key: "userCreations" as const, items: userCreationMasters },
        { key: "processItems" as const, items: processItems },
        { key: "customerMasters" as const, items: customerMasters },
        { key: "citizenGrievance" as const, items: citizenGrievanceItems },
        { key: "transportMasters" as const, items: transportMastersItems },
        { key: "auditItems" as const, items: auditItems },
        { key: "vehicleTracking" as const, items: vehicleTrackingItems },
        { key: "wasteManagement" as const, items: wasteManagementMasters },
        { key: "workforceManagement" as const, items: workforceManagements },
        { key: "reports" as const, items: reportItems },
      ];

      // ✅ If superadmin, show ALL sections with ALL items
      if (isSuperAdmin) {
        console.log("[Sidebar] SuperAdmin detected - showing all sections");
        return allSections.filter((section) => section.items.length > 0);
      }

      // ✅ For regular users: strict filtering
      console.log("[Sidebar] Regular user - applying permission filters");
      return allSections
        .map((section) => {
          // Filter items within section
          const filteredItems = section.items
            .map((item) => {
              const filteredSubItems = filterSubItems(item.subItems);
              return {
                ...item,
                subItems: filteredSubItems,
              };
            })
            .filter((item) => hasVisibleContent(item, item.subItems));

          return {
            ...section,
            items: filteredItems,
          };
        })
        .filter((section) => section.items.length > 0); // Only show sections with visible items
    },
    [hasPermission, isSuperAdmin, checkPermission]
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: SidebarSectionKey;
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
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
    [currentDecodedPath, location.pathname]
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
        : { type, index }
    );
  };

  const renderMenuItems = (items: NavItem[], type: SidebarSectionKey) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => {
        const isSubmenuOpen =
          openSubmenu?.type === type && openSubmenu?.index === index;
        return (
          <li key={nav.path ?? nav.nameKey}>
            {nav.subItems && nav.subItems.length > 0 ? (
              <button
                onClick={() => handleSubmenuToggle(index, type)}
                className={`${menuButtonBase} ${
                  isSubmenuOpen ? menuActiveClasses : menuInactiveClasses
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    !showFullSidebar ? "mx-auto" : ""
                  } text-emerald-600`}
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
                    className={`menu-item-icon-size ${
                      !showFullSidebar ? "mx-auto" : ""
                    } text-emerald-600`}
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

            {nav.subItems && nav.subItems.length > 0 && showFullSidebar && (
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
