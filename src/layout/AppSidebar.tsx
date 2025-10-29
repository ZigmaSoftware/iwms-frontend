import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Main menu
const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/" },
];

// Admin menu
const adminItems: NavItem[] = [
  { icon: <CalenderIcon />, name: "Calendar", path: "/calendar" },
  { icon: <UserCircleIcon />, name: "User Profile", path: "/profile" },
  {
    name: "Forms",
    icon: <ListIcon />,
    subItems: [{ name: "Form Elements", path: "/form-elements" }],
  },
  {
    name: "Tables",
    icon: <TableIcon />,
    subItems: [{ name: "Basic Tables", path: "/basic-tables" }],
  },
  {
    name: "Pages",
    icon: <PageIcon />,
    subItems: [
      { name: "Blank Page", path: "/blank" },
      { name: "404 Error", path: "/error-404" },
    ],
  },
];

// Example Master menu
const masterItems: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Masters",
    subItems: [
      { name: "Continent", path: "/masters/continents" },
      { name: "Country", path: "/masters/countries" },
      { name: "State", path: "/masters/states" },
      { name: "District", path: "/masters/districts" },
      { name: "City", path: "/masters/cities" },
      { name: "Zone", path: "/masters/zones" },
      { name: "Ward", path: "/masters/wards" },
    ],
  },
];

// Transport Master
const transportMasters: NavItem[] = [
  {
    icon: <ListIcon />,
    name: "Transport Masters",
    subItems: [{ name: "Fuel", path: "/transportMasters/fuels" }],
  },
];

// Example Entry menu
const entryItems: NavItem[] = [
  {
    icon: <TableIcon />,
    name: "Entry Item",
    subItems: [{ name: "Entry Example", path: "/entry-example" }],
  },
];

// Example Report menu
const reportItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Reports",
    subItems: [{ name: "Report Example", path: "/report-example" }],
  },
];

// Others menu
const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart" },
      { name: "Bar Chart", path: "/bar-chart" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts" },
      { name: "Avatar", path: "/avatars" },
      { name: "Badge", path: "/badge" },
      { name: "Buttons", path: "/buttons" },
      { name: "Images", path: "/images" },
      { name: "Videos", path: "/videos" },
    ],
  },
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin" },
      { name: "Sign Up", path: "/signup" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type:
      | "main"
      | "admin"
      | "master"
      | "entry"
      | "report"
      | "others"
      | "transportMaster";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Auto-open submenu when matching route
  useEffect(() => {
    let submenuMatched = false;

    const menus: Record<string, NavItem[]> = {
      main: navItems,
      admin: adminItems,
      master: masterItems,
      entry: entryItems,
      transportMaster: transportMasters,
      report: reportItems,
      others: othersItems,
    };

    Object.entries(menus).forEach(([menuType, items]) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as
                  | "main"
                  | "admin"
                  | "master"
                  | "transportMaster"
                  | "entry"
                  | "report"
                  | "others",

                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  // Measure submenu heights
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType:
      | "main"
      | "admin"
      | "master"
      | "transportMaster"
      | "entry"
      | "report"
      | "others"
  ) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (
    items: NavItem[],
    menuType:
      | "main"
      | "admin"
      | "master"
      | "transportMaster"
      | "entry"
      | "report"
      | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden w-[160px] h-auto mx-auto"
                src="/logo.png"
                alt="Logo"
              />
              <img
                className="hidden dark:block w-[160px] h-auto mx-auto"
                src="/logo.png"
                alt="Logo"
              />
            </>
          ) : (
            <img src="/logo.png" alt="Logo" className="w-8 h-8 mx-auto" />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6 flex flex-col gap-6">
          <div>{renderMenuItems(navItems, "main")}</div>
          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">Admin</h2>
            {renderMenuItems(adminItems, "admin")}
          </div>
          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">Master</h2>
            {renderMenuItems(masterItems, "master")}
          </div>
          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">
              Transport Masters
            </h2>
            {renderMenuItems(transportMasters, "transportMaster")}
          </div>
          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">Entry</h2>
            {renderMenuItems(entryItems, "entry")}
          </div>

          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">Report</h2>
            {renderMenuItems(reportItems, "report")}
          </div>
          <div>
            <h2 className="mb-4 text-xs uppercase text-gray-400">Others</h2>
            {renderMenuItems(othersItems, "others")}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
