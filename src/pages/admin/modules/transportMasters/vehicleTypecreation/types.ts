export type VehicleTypePayload = Record<string, unknown>;

export type VehicleTypeRecord = {
  unique_id: string;
  vehicleType: string;
  description?: string | null;
  is_active: boolean;
};
