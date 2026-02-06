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

const {
  encMasters,
  encContinents,
  encCountries,
  encBins,
  encStates,
  encDistricts,
  encCities,
  encWards,
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
} = getEncryptedRoute();

type NavItem = {
  nameKey: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { nameKey: string; path: string }[];
};

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

const adminItems: NavItem[] = [
  {
    nameKey: "admin.nav.admin",
    icon: <Settings size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.main_screen_type",
        path: `/${encAdmins}/${encMainScreenType}`,
      },
      {
        nameKey: "admin.nav.user_screen_action",
        path: `/${encAdmins}/${encUserScreenAction}`,
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
        nameKey: "admin.nav.user_screen_permission",
        path: `/${encAdmins}/${encUserScreenPermission}`,
      },
      { nameKey: "admin.nav.user_type", path: `/${encAdmins}/${encUserType}` },
      {
        nameKey: "admin.nav.user_creation",
        path: `/${encAdmins}/${encUserCreation}`,
      },
      {
        nameKey: "admin.nav.staff_user_type",
        path: `/${encAdmins}/${encStaffUserType}`,
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

    ],
  },
];

const assets: NavItem[] = [
  {
    nameKey: "admin.nav.assets",
    icon: <Users size={18}/>,
    subItems: [
      {
        nameKey: "admin.nav.property",
        path: `/${encMasters}/${encProperties}`,
      },
      {
        nameKey: "admin.nav.sub_property",
        path: `/${encMasters}/${encSubProperties}`,
      },
    ]
  }
]

const staffMasters: NavItem[] = [
  {
    nameKey: "admin.nav.staff_master",
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
        nameKey: "admin.nav.staff_template_audit",
        path: `/${encStaffMasters}/${encStaffTemplateAudit}`,
      },
      {
        nameKey: "admin.nav.route_plans",
        path: `/${encStaffMasters}/${encRoutePlans}`,
      },
      {
        nameKey: "admin.nav.supervisor_zone_map",
        path: `/${encStaffMasters}/${encSupervisorZoneMap}`,
      },
      {
        nameKey: "admin.nav.supervisor_zone_access_audit",
        path: `/${encStaffMasters}/${encSupervisorZoneAccessAudit}`,
      },
      {
        nameKey: "admin.nav.unassigned_staff_pool",
        path: `/${encStaffMasters}/${encUnassignedStaffPool}`,
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
        nameKey: "admin.nav.customer_tag",
        path: `/${encCustomerMaster}/${encCustomerTag}`,
      },
      {
        nameKey: "admin.nav.household_pickup_event",
        path: `/${encCustomerMaster}/${encHouseholdPickupEvent}`,
      },
    ],
  },
];

const transportMasters: NavItem[] = [
  {
    nameKey: "admin.nav.transport_masters",
    icon: <Truck size={18} />,
    subItems: [
      { nameKey: "admin.nav.fuel", path: `/${encTransportMaster}/${encFuel}` },
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
        nameKey: "admin.nav.bin_load_log",
        path: `/${encTransportMaster}/${encBinLoadLog}`,
      },
      {
        nameKey: "admin.nav.trip_instance",
        path: `/${encTransportMaster}/${encTripInstance}`,
      },
      {
        nameKey: "admin.nav.zone_property_load_tracker",
        path: `/${encTransportMaster}/${encZonePropertyLoadTracker}`,
      },
      {
        nameKey: "admin.nav.trip_attendance",
        path: `/${encTransportMaster}/${encTripAttendance}`,
      },
      {
        nameKey: "admin.nav.vehicle_trip_audit",
        path: `/${encTransportMaster}/${encVehicleTripAudit}`,
      },
      {
        nameKey: "admin.nav.trip_exception_log",
        path: `/${encTransportMaster}/${encTripExceptionLog}`,
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

const binItems: NavItem[] = [
  {
    nameKey: "admin.nav.bin_master",
    icon: <Archive size={18} />,
    subItems: [
      { nameKey: "admin.nav.bin_creation", path: `/${encMasters}/${encBins}` },
    ],
  },
];

const wasteManagementMasters: NavItem[] = [
  {
    nameKey: "admin.nav.waste_management",
    icon: <Recycle size={18} />,
    subItems: [
      {
        nameKey: "admin.nav.waste_collected_data",
        path: `/${encWasteManagementMaster}/${encWasteCollectedData}`,
      },
      {
        nameKey: "admin.nav.collection_monitoring",
        path: `/${encWasteManagementMaster}/${encCollectionMonitoring}`,
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
      {
        nameKey: "admin.nav.feedback",
        path: `/${encCitizenGrivence}/${encFeedback}`,
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
const menuActiveClasses =
  "border border-sky-200 bg-sky-100 text-sky-900";
const menuInactiveClasses =
  "border border-transparent bg-white/80 text-sky-600 hover:border-sky-200 hover:bg-white hover:text-sky-900";
const subMenuContainerClasses = "mt-2 ml-5 space-y-1 pl-2";
const subMenuActiveClasses = "bg-sky-100 text-sky-900 font-semibold rounded-lg";
const subMenuInactiveClasses = "text-sky-600 hover:text-sky-900";

// const subMenuContainerClasses =
//   "mt-2 ml-5 space-y-1 rounded-[14px] border-l-2 border-sky-200 bg-white/80 px-3 py-2";
// const subMenuActiveClasses = "bg-sky-100 text-sky-900 font-semibold";
// const subMenuInactiveClasses =
//   "text-sky-600 hover:text-sky-900 hover:bg-sky-50";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { t } = useTranslation();
  const showFullSidebar = isExpanded || isMobileOpen;

  const [openSubmenu, setOpenSubmenu] = useState<{
    type:
      | "main"
      | "admin"
      | "commonMaster"
      | "master"
      | "staffMaster"
      | "entry"
      | "report"
      | "others"
      | "transportMaster"
      | "customerMaster"
      | "vehicleTracking"
      | "binMaster"
      | "wasteManagementMaster"
      | "citizenGrievance"
      | "workforceManagement";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
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

      // If decoding fails, fall back to direct path match (e.g., plain routes)
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

    const menus: Record<string, NavItem[]> = {
      main: navItems,
      admin: adminItems,
      commonMaster: commonMasterItems,
      master: masterItems,
      staffMaster: staffMasters,
      entry: [],
      citizenGrievance: citizenGrievanceItems,
      transportMaster: transportMasters,
      customerMaster: customerMasters,
      vehicleTracking: vehicleTrackingItems,
      binMaster: binItems,
      wasteManagementMaster: wasteManagementMasters,
      report: reportItems,
      workforceManagement: workforceManagements,
    };

    Object.entries(menus).forEach(([type, items]) => {
      items.forEach((nav, index) => {
        nav.subItems?.forEach((sub) => {
          if (isActive(sub.path, true)) {
            matched = true;
            if (!skipAutoOpenSubmenuKeys.has(sub.nameKey)) {
              setOpenSubmenu({ type: type as any, index });
            }
          }
        });
      });
    });

    if (!matched) setOpenSubmenu(null);
  }, [location, isActive]);

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

  const handleSubmenuToggle = (index: number, type: any) => {
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

  const renderMenuItems = (items: NavItem[], type: any) => (
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
      className={`mt-10 fixed top-0 left-0 z-50 h-screen border-r bg-white text-sky-900 transition-all duration-300 ease-out ${
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
            <div>{renderMenuItems(navItems, "main")}</div>
            <div>{renderMenuItems(adminItems, "admin")}</div>
            <div>{renderMenuItems(commonMasterItems, "commonMaster")}</div>
            <div>{renderMenuItems(masterItems, "master")}</div>
            <div>{renderMenuItems(staffMasters, "staffMaster")}</div>
            <div>{renderMenuItems(customerMasters, "customerMaster")}</div>
            <div>{renderMenuItems(transportMasters, "transportMaster")}</div>
            <div>
              {renderMenuItems(vehicleTrackingItems, "vehicleTracking")}
            </div>
            <div>{renderMenuItems(binItems, "binMaster")}</div>
            <div>
              {renderMenuItems(wasteManagementMasters, "wasteManagementMaster")}
            </div>
            <div>
              {renderMenuItems(citizenGrievanceItems, "citizenGrievance")}
            </div>
            <div>
              {renderMenuItems(workforceManagements, "workforceManagement")}
            </div>
            <div>{renderMenuItems(reportItems, "report")}</div>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
