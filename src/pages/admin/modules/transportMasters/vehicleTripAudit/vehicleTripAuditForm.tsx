import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { adminApi } from "@/helpers/admin/registry";
import {
  type VehicleTripAuditPayload,
  useVehicleTripAuditQuery,
  useCreateVehicleTripAuditMutation,
  useUpdateVehicleTripAuditMutation,
} from "@/tanstack/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";

const tripInstanceQueryKey = ["masters", "trip_instances"] as const;
const vehicleCreationQueryKey = ["masters", "vehicle_creations"] as const;

type SelectOption = { value: string; label: string };

type VehicleTripAuditFormState = {
  trip_instance_id: string;
  vehicle_id: string;
  gps_lat: string;
  gps_lon: string;
  avg_speed: string;
  idle_seconds: string;
  captured_at: string;
};

type TripInstanceRecord = {
  unique_id: string;
  trip_no?: string;
  vehicle_id?: string;
  status?: string;
};

type VehicleTripAuditEditorProps = {
  formData: VehicleTripAuditFormState;
  tripOptions: SelectOption[];
  vehicles: SelectOption[];
  fetching: boolean;
  isEdit: boolean;
  isSubmitting: boolean;
  isVehicleLocked: boolean;
  onChange: (updates: Partial<VehicleTripAuditFormState>) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => Promise<void>;
};

const toOptions = (
  items: any[],
  valueKey: string,
  labelKey: string,
  fallbackKey?: string
): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(
        item?.[labelKey] ?? item?.[fallbackKey ?? ""] ?? item?.[valueKey] ?? ""
      ),
    }))
    .filter((option) => option.value);

const toDateTimeLocal = (value?: string | null) =>
  value ? String(value).slice(0, 16) : "";

const formatGpsArray = (value: any): string => {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
};

const parseGpsArray = (value: string): number[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  let parsed: any;
  if (trimmed.startsWith("[")) {
    parsed = JSON.parse(trimmed);
  } else {
    parsed = trimmed.split(",").map((item) => item.trim());
  }

  if (!Array.isArray(parsed)) {
    throw new Error("GPS array must be a list");
  }

  const numbers = parsed.map((item) => Number(item));
  if (numbers.some((item) => !Number.isFinite(item))) {
    throw new Error("GPS array must be numeric values");
  }

  return numbers;
};

const extractErrorMessage = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

function VehicleTripAuditEditor({
  formData,
  tripOptions,
  vehicles,
  fetching,
  isEdit,
  isSubmitting,
  isVehicleLocked,
  onChange,
  onCancel,
  onSubmit,
}: VehicleTripAuditEditorProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label>{t("admin.vehicle_trip_audit.trip_instance")}</Label>
          <Select
            value={formData.trip_instance_id}
            onChange={(value) => onChange({ trip_instance_id: value })}
            options={tripOptions}
            placeholder={t("common.select_option")}
            disabled={fetching || isEdit}
            required
          />
        </div>

        <div>
          <Label>{t("admin.vehicle_trip_audit.vehicle")}</Label>
          <Select
            value={formData.vehicle_id}
            onChange={(value) => onChange({ vehicle_id: value })}
            options={vehicles}
            placeholder={t("common.select_option")}
            disabled={fetching || isVehicleLocked}
            required
          />
        </div>

        <div className="md:col-span-2">
          <Label>{t("admin.vehicle_trip_audit.gps_lat")}</Label>
          <Textarea
            value={formData.gps_lat}
            onChange={(e) => onChange({ gps_lat: e.target.value })}
            placeholder={t("admin.vehicle_trip_audit.gps_placeholder")}
            rows={3}
          />
        </div>

        <div className="md:col-span-2">
          <Label>{t("admin.vehicle_trip_audit.gps_lon")}</Label>
          <Textarea
            value={formData.gps_lon}
            onChange={(e) => onChange({ gps_lon: e.target.value })}
            placeholder={t("admin.vehicle_trip_audit.gps_placeholder")}
            rows={3}
          />
        </div>

        <div>
          <Label>{t("admin.vehicle_trip_audit.avg_speed")}</Label>
          <Input
            type="number"
            value={formData.avg_speed}
            onChange={(e) => onChange({ avg_speed: e.target.value })}
            placeholder={t("admin.vehicle_trip_audit.avg_speed")}
          />
        </div>

        <div>
          <Label>{t("admin.vehicle_trip_audit.idle_seconds")}</Label>
          <Input value={formData.idle_seconds} disabled className="bg-gray-100" />
        </div>

        <div>
          <Label>{t("admin.vehicle_trip_audit.captured_at")}</Label>
          <Input
            type="datetime-local"
            value={toDateTimeLocal(formData.captured_at)}
            disabled
            className="bg-gray-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting || fetching}
          className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting
            ? t("common.saving")
            : isEdit
              ? t("common.update")
              : t("common.save")}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default function VehicleTripAuditForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);

  const vehicleTripAuditQuery = useVehicleTripAuditQuery(id);
  const createVehicleTripAuditMutation = useCreateVehicleTripAuditMutation();
  const updateVehicleTripAuditMutation = useUpdateVehicleTripAuditMutation();
  const isSubmitting =
    createVehicleTripAuditMutation.isPending ||
    updateVehicleTripAuditMutation.isPending;

  const tripInstanceApi = adminApi.tripInstances;
  const vehicleApi = adminApi.vehicleCreations;

  const tripInstancesQuery = useQuery({
    queryKey: tripInstanceQueryKey,
    queryFn: () => tripInstanceApi.list(),
  });

  const vehiclesQuery = useQuery({
    queryKey: vehicleCreationQueryKey,
    queryFn: () => vehicleApi.list(),
  });

  const fetching =
    tripInstancesQuery.isPending ||
    vehiclesQuery.isPending;

  const tripInstanceRecords = (normalizeList(
    tripInstancesQuery.data ?? []
  ) as TripInstanceRecord[]) ?? [];
  const vehicles = toOptions(
    normalizeList(vehiclesQuery.data ?? []),
    "unique_id",
    "vehicle_no"
  );

  const tripInstanceMeta = useMemo(
    () =>
      tripInstanceRecords.reduce<
        Record<string, { vehicle_id?: string; status?: string }>
      >((acc, trip) => {
        if (trip?.unique_id) {
          acc[String(trip.unique_id)] = {
            vehicle_id: trip.vehicle_id ?? undefined,
            status: trip.status ?? undefined,
          };
        }
        return acc;
      }, {}),
    [tripInstanceRecords]
  );

  const { encTransportMaster, encVehicleTripAudit } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encVehicleTripAudit}`;
  const stateRecord = (
    location.state as { record?: Partial<VehicleTripAuditFormState> } | null
  )?.record;

  useEffect(() => {
    if (!vehicleTripAuditQuery.isError && !tripInstancesQuery.isError && !vehiclesQuery.isError) {
      return;
    }

    const error =
      vehicleTripAuditQuery.error ??
      tripInstancesQuery.error ??
      vehiclesQuery.error;

    Swal.fire(
      t("common.error"),
      extractErrorMessage(error) ?? t("common.load_failed"),
      "error"
    );
  }, [
    t,
    tripInstancesQuery.error,
    tripInstancesQuery.isError,
    vehicleTripAuditQuery.error,
    vehicleTripAuditQuery.isError,
    vehiclesQuery.error,
    vehiclesQuery.isError,
  ]);

  const initialFormData: VehicleTripAuditFormState = vehicleTripAuditQuery.data
    ? {
        trip_instance_id: vehicleTripAuditQuery.data.trip_instance_id ?? "",
        vehicle_id: vehicleTripAuditQuery.data.vehicle_id ?? "",
        gps_lat: formatGpsArray(vehicleTripAuditQuery.data.gps_lat),
        gps_lon: formatGpsArray(vehicleTripAuditQuery.data.gps_lon),
        avg_speed:
          vehicleTripAuditQuery.data.avg_speed !== undefined &&
          vehicleTripAuditQuery.data.avg_speed !== null
            ? String(vehicleTripAuditQuery.data.avg_speed)
            : "",
        idle_seconds:
          vehicleTripAuditQuery.data.idle_seconds !== undefined &&
          vehicleTripAuditQuery.data.idle_seconds !== null
            ? String(vehicleTripAuditQuery.data.idle_seconds)
            : "",
        captured_at: vehicleTripAuditQuery.data.captured_at ?? "",
      }
    : {
        trip_instance_id: stateRecord?.trip_instance_id ?? "",
        vehicle_id: stateRecord?.vehicle_id ?? "",
        gps_lat: formatGpsArray(stateRecord?.gps_lat),
        gps_lon: formatGpsArray(stateRecord?.gps_lon),
        avg_speed:
          stateRecord?.avg_speed !== undefined && stateRecord?.avg_speed !== null
            ? String(stateRecord.avg_speed)
            : "",
        idle_seconds:
          stateRecord?.idle_seconds !== undefined &&
          stateRecord?.idle_seconds !== null
            ? String(stateRecord.idle_seconds)
            : "",
        captured_at: stateRecord?.captured_at ?? "",
      };

  const [formData, setFormData] = useState<VehicleTripAuditFormState>(
    initialFormData
  );

  useEffect(() => {
    setFormData(initialFormData);
  }, [id, stateRecord, vehicleTripAuditQuery.data]);

  const tripOptions = useMemo(() => {
    const list = isEdit
      ? tripInstanceRecords
      : tripInstanceRecords.filter((trip) => trip.status === "IN_PROGRESS");
    return toOptions(list, "unique_id", "trip_no", "unique_id");
  }, [isEdit, tripInstanceRecords]);

  useEffect(() => {
    if (isEdit) return;

    const tripMeta = tripInstanceMeta[formData.trip_instance_id];
    if (!tripMeta?.vehicle_id) return;

    setFormData((prev) =>
      prev.vehicle_id === tripMeta.vehicle_id
        ? prev
        : { ...prev, vehicle_id: tripMeta.vehicle_id ?? "" }
    );
  }, [formData.trip_instance_id, isEdit, tripInstanceMeta]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !formData.trip_instance_id ||
      !formData.vehicle_id ||
      !formData.gps_lat ||
      !formData.gps_lon ||
      !formData.avg_speed
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    let latValues: number[];
    let lonValues: number[];
    try {
      latValues = parseGpsArray(formData.gps_lat);
      lonValues = parseGpsArray(formData.gps_lon);
    } catch (error: any) {
      Swal.fire(
        t("common.warning"),
        String(error?.message ?? t("common.invalid_data")),
        "warning"
      );
      return;
    }

    if (
      !latValues.length ||
      !lonValues.length ||
      latValues.length !== lonValues.length
    ) {
      Swal.fire(t("common.warning"), t("common.invalid_data"), "warning");
      return;
    }

    const avgSpeed = Number(formData.avg_speed);
    if (!Number.isFinite(avgSpeed)) {
      Swal.fire(t("common.warning"), t("common.invalid_data"), "warning");
      return;
    }

    try {
      if (isEdit && id) {
        const payload: VehicleTripAuditPayload = {
          gps_lat: latValues,
          gps_lon: lonValues,
          avg_speed: avgSpeed,
        };
        await updateVehicleTripAuditMutation.mutateAsync({ id, payload });
      } else {
        const payload: VehicleTripAuditPayload = {
          trip_instance_id: formData.trip_instance_id,
          vehicle_id: formData.vehicle_id,
          gps_lat: latValues,
          gps_lon: lonValues,
          avg_speed: avgSpeed,
        };
        await createVehicleTripAuditMutation.mutateAsync(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const message = extractErrorMessage(error) ?? t("common.save_failed_desc");
      Swal.fire(t("common.save_failed"), message, "error");
    }
  };

  const tripMeta = formData.trip_instance_id
    ? tripInstanceMeta[formData.trip_instance_id]
    : undefined;
  const isVehicleLocked = Boolean(
    isEdit || (tripMeta?.vehicle_id && formData.trip_instance_id)
  );

  const formKey = isEdit
    ? String(vehicleTripAuditQuery.data?.id ?? id)
    : "new-vehicle-trip-audit";

  return (
    <div className="p-3">
      <ComponentCard
        title={
          isEdit
            ? t("admin.vehicle_trip_audit.title_edit")
            : t("admin.vehicle_trip_audit.title_add")
        }
        desc={t("admin.vehicle_trip_audit.subtitle")}
      >
        <VehicleTripAuditEditor
          key={formKey}
          formData={formData}
          tripOptions={tripOptions}
          vehicles={vehicles}
          fetching={fetching}
          isEdit={isEdit}
          isSubmitting={isSubmitting}
          isVehicleLocked={isVehicleLocked}
          onChange={(updates) =>
            setFormData((prev) => ({
              ...prev,
              ...updates,
            }))
          }
          onCancel={() => navigate(ENC_LIST_PATH)}
          onSubmit={handleSubmit}
        />
      </ComponentCard>
    </div>
  );
}
