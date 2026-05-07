import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { api } from "@/api";
import { normalizeList } from "@/utils/forms";

type SelectOption = { value: string; label: string };

type TripAttendanceFormState = {
  trip_instance_id: string;
  staff_id: string;
  vehicle_id: string;
  attendance_time: string;
  latitude: string;
  longitude: string;
  source: string;
};

type TripInstanceRecord = {
  unique_id: string;
  trip_no?: string;
  vehicle_id?: string;
  staff_template_id?: string;
  status?: string;
};

type StaffTemplateRecord = {
  unique_id: string;
  driver_id?: string;
  operator_id?: string;
};

const sourceOptions: SelectOption[] = [
  { value: "MOBILE", label: "Mobile" },
  { value: "VEHICLE_CAM", label: "Vehicle Camera" },
];

const toOptions = (items: any[], valueKey: string, labelKey: string, fallbackKey?: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.[fallbackKey ?? ""] ?? item?.[valueKey] ?? ""),
    }))
    .filter((option) => option.value);

const toDateTimeLocal = (value?: string | null) => (value ? String(value).slice(0, 16) : "");

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

export default function TripAttendanceForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);

  const tripAttendanceApi = adminApi.tripAttendances;
  const tripInstanceApi = adminApi.tripInstances;
  const staffTemplateApi = adminApi.staffTemplateCreation;
  const userApi = adminApi.usersCreation;
  const vehicleApi = adminApi.vehicleCreations;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [tripInstanceRecords, setTripInstanceRecords] = useState<TripInstanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<SelectOption[]>([]);
  const [staffRecords, setStaffRecords] = useState<any[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<Record<string, StaffTemplateRecord>>({});
  const [tripInstanceMeta, setTripInstanceMeta] = useState<
    Record<string, { vehicle_id?: string; staff_template_id?: string; status?: string }>
  >({});

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TripAttendanceFormState>({
    trip_instance_id: "",
    staff_id: "",
    vehicle_id: "",
    attendance_time: "",
    latitude: "",
    longitude: "",
    source: "",
  });

  const { encTransportMaster, encTripAttendance } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encTripAttendance}`;
  const stateRecord = (location.state as { record?: Partial<TripAttendanceFormState> & { photo?: string } } | null)
    ?.record;

  const backendOrigin = useMemo(
    () => api.defaults.baseURL?.replace(/\/api\/desktop\/?$/, "") || "",
    []
  );

  useEffect(() => {
    setFetching(true);
    Promise.all([
      tripInstanceApi.list(),
      staffTemplateApi.list(),
      userApi.list(),
      vehicleApi.list(),
    ])
      .then(([tripRes, staffRes, userRes, vehicleRes]) => {
        const trips = normalizeList(tripRes) as TripInstanceRecord[];
        const templates = normalizeList(staffRes) as StaffTemplateRecord[];

        setTripInstanceRecords(trips);
        setVehicles(toOptions(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
        setStaffRecords(normalizeList(userRes));
        setStaffTemplates(
          templates.reduce<Record<string, StaffTemplateRecord>>((acc, template) => {
            if (template?.unique_id) {
              acc[String(template.unique_id)] = template;
            }
            return acc;
          }, {})
        );
        setTripInstanceMeta(
          trips.reduce<Record<string, { vehicle_id?: string; staff_template_id?: string; status?: string }>>(
            (acc, trip) => {
              if (trip?.unique_id) {
                acc[String(trip.unique_id)] = {
                  vehicle_id: trip.vehicle_id ?? undefined,
                  staff_template_id: trip.staff_template_id ?? undefined,
                  status: trip.status ?? undefined,
                };
              }
              return acc;
            },
            {}
          )
        );
      })
      .catch((error) => {
        const message = extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [staffTemplateApi, t, tripInstanceApi, userApi, vehicleApi]);

  useEffect(() => {
    if (!isEdit || !stateRecord) return;

    setFormData({
      trip_instance_id: stateRecord?.trip_instance_id ?? "",
      staff_id: stateRecord?.staff_id ?? "",
      vehicle_id: stateRecord?.vehicle_id ?? "",
      attendance_time: stateRecord?.attendance_time ?? "",
      latitude: stateRecord?.latitude ? String(stateRecord.latitude) : "",
      longitude: stateRecord?.longitude ? String(stateRecord.longitude) : "",
      source: stateRecord?.source ?? "",
    });

    const photoValue = (stateRecord as { photo?: string })?.photo;
    if (photoValue) {
      setPhotoPreview(photoValue.startsWith("http") ? photoValue : `${backendOrigin}${photoValue}`);
    }
  }, [backendOrigin, isEdit, stateRecord]);

  useEffect(() => {
    if (!isEdit || !id) return;

    tripAttendanceApi
      .get(id)
      .then((res: any) => {
        setFormData({
          trip_instance_id: res?.trip_instance_id ?? "",
          staff_id: res?.staff_id ?? "",
          vehicle_id: res?.vehicle_id ?? "",
          attendance_time: res?.attendance_time ?? "",
          latitude: res?.latitude !== undefined && res?.latitude !== null ? String(res.latitude) : "",
          longitude: res?.longitude !== undefined && res?.longitude !== null ? String(res.longitude) : "",
          source: res?.source ?? "",
        });

        if (res?.photo) {
          setPhotoPreview(res.photo.startsWith("http") ? res.photo : `${backendOrigin}${res.photo}`);
        }
      })
      .catch((error) => {
        const message = extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      });
  }, [backendOrigin, id, isEdit, t, tripAttendanceApi]);

  useEffect(() => {
    if (!photoFile) return;
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  const tripOptions = useMemo(() => {
    const list = isEdit
      ? tripInstanceRecords
      : tripInstanceRecords.filter((trip) => trip.status === "IN_PROGRESS");
    return toOptions(list, "unique_id", "trip_no", "unique_id");
  }, [isEdit, tripInstanceRecords]);

  const staffOptions = useMemo(() => {
    const staffByRole = staffRecords.filter((staff) => {
      const role = String(staff?.staffusertype_name ?? "").toLowerCase();
      return role === "operator" || role === "driver";
    });

    if (!formData.trip_instance_id) {
      return toOptions(staffByRole, "unique_id", "staff_name", "unique_id");
    }

    const tripMeta = tripInstanceMeta[formData.trip_instance_id];
    const template = tripMeta?.staff_template_id ? staffTemplates[tripMeta.staff_template_id] : undefined;
    const allowedIds = [template?.operator_id, template?.driver_id].filter(Boolean) as string[];

    if (!allowedIds.length) {
      return toOptions(staffByRole, "unique_id", "staff_name", "unique_id");
    }

    return toOptions(
      staffByRole.filter((staff) => allowedIds.includes(String(staff?.unique_id ?? ""))),
      "unique_id",
      "staff_name",
      "unique_id"
    );
  }, [formData.trip_instance_id, staffRecords, staffTemplates, tripInstanceMeta]);

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

  useEffect(() => {
    if (!formData.trip_instance_id || !formData.staff_id) return;
    const tripMeta = tripInstanceMeta[formData.trip_instance_id];
    const template = tripMeta?.staff_template_id ? staffTemplates[tripMeta.staff_template_id] : undefined;
    const allowedIds = [template?.operator_id, template?.driver_id].filter(Boolean) as string[];

    if (allowedIds.length && !allowedIds.includes(formData.staff_id)) {
      setFormData((prev) => ({ ...prev, staff_id: "" }));
    }
  }, [formData.staff_id, formData.trip_instance_id, staffTemplates, tripInstanceMeta]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      (!isEdit && (
        !formData.trip_instance_id ||
        !formData.staff_id ||
        !formData.vehicle_id
      )) ||
      formData.latitude === "" ||
      formData.longitude === "" ||
      !formData.source
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Swal.fire(t("common.warning"), t("common.invalid_data"), "warning");
      return;
    }

    setLoading(true);
    try {
      const multipartConfig = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (isEdit && id) {
        const updateBody = new FormData();
        updateBody.append("latitude", String(latitude));
        updateBody.append("longitude", String(longitude));
        updateBody.append("source", formData.source);
        if (photoFile) {
          updateBody.append("photo", photoFile);
        }

        await tripAttendanceApi.update(id, updateBody, multipartConfig);
      } else {
        const createBody = new FormData();
        createBody.append("trip_instance_id", formData.trip_instance_id);
        createBody.append("staff_id", formData.staff_id);
        createBody.append("vehicle_id", formData.vehicle_id);
        createBody.append("latitude", String(latitude));
        createBody.append("longitude", String(longitude));
        createBody.append("source", formData.source);
        if (photoFile) {
          createBody.append("photo", photoFile);
        }

        await tripAttendanceApi.create(createBody, multipartConfig);
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
    } finally {
      setLoading(false);
    }
  };

  const tripMeta = formData.trip_instance_id
    ? tripInstanceMeta[formData.trip_instance_id]
    : undefined;
  const isVehicleLocked = Boolean(isEdit || (tripMeta?.vehicle_id && formData.trip_instance_id));

  return (
    <div className="p-3">
      <ComponentCard
        title={
          isEdit
            ? t("admin.trip_attendance.title_edit")
            : t("admin.trip_attendance.title_add")
        }
        desc={t("admin.trip_attendance.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.trip_attendance.trip_instance")}</Label>
              <Select
                value={formData.trip_instance_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, trip_instance_id: value }))
                }
                options={tripOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || isEdit}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.staff")}</Label>
              <Select
                value={formData.staff_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, staff_id: value }))}
                options={staffOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || isEdit}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.vehicle")}</Label>
              <Select
                value={formData.vehicle_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, vehicle_id: value }))}
                options={vehicles}
                placeholder={t("common.select_option")}
                disabled={fetching || isVehicleLocked}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.attendance_time")}</Label>
              <Input
                type="datetime-local"
                value={toDateTimeLocal(formData.attendance_time)}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.latitude")}</Label>
              <Input
                type="number"
                value={formData.latitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder={t("admin.trip_attendance.latitude")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.longitude")}</Label>
              <Input
                type="number"
                value={formData.longitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder={t("admin.trip_attendance.longitude")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_attendance.source")}</Label>
              <Select
                value={formData.source}
                onChange={(value) => setFormData((prev) => ({ ...prev, source: value }))}
                options={sourceOptions.map((option) => ({
                  value: option.value,
                  label:
                    option.value === "MOBILE"
                      ? t("admin.trip_attendance.source_mobile")
                      : t("admin.trip_attendance.source_vehicle_cam"),
                }))}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>{t("admin.trip_attendance.photo")}</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400"
                  >
                    {t("admin.staff_creation.photo_choose")}
                  </button>
                  <span className="text-sm text-gray-500">
                    {photoFile?.name || t("admin.staff_creation.photo_none")}
                  </span>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (!file) {
                      setPhotoFile(null);
                      return;
                    }
                    if (!file.type.startsWith("image/")) {
                      Swal.fire(
                        t("admin.staff_creation.invalid_photo_title"),
                        t("admin.staff_creation.invalid_photo_desc"),
                        "warning"
                      );
                      event.target.value = "";
                      setPhotoFile(null);
                      return;
                    }
                    setPhotoFile(file);
                  }}
                />
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={t("admin.trip_attendance.photo")}
                    className="h-24 w-24 rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-xs text-gray-500">
                    {t("admin.staff_creation.photo_none")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>

            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
