export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type Id = string;

export type SelectOption = {
  value: string;
  label: string;
};

export type LocationData = {
  country: string;
  state: string;
  city: string;
  zone: string;
  ward: string;
  vehicles: Array<{
    vehicle_no: string;
    lat: number;
    lng: number;
    status: string;
    speed: number;
    driver: string;
  }>;
};

export type ComplaintData = {
  id: string;
  title: string;
  status: string;
  priority: string;
  timestamp: string;
  year: string;
};

export type ActivityData = {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: string;
};

export type KPIData = {
  label: string;
  value: number;
  trend?: number;
  icon?: string;
  unit?: string;
};

export type ModuleType =
  | "collection"
  | "d2d"
  | "resource"
  | "weighbridge"
  | "waste"
  | "landfill"
  | "grievance"
  | "attendance"
  | "asset";

