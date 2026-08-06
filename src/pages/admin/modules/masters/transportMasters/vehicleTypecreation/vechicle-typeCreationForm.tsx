import type { VehicleTypePayload } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { vehicleTypeCreationSchema } from "@/schemas/masters/transportMasters/vehicleTypeCreation.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";


const { encTransportMaster, encVehicleType } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(encTransportMaster, encVehicleType);

const toStr = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function VehicleTypeCreationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [vehicleTypeName, setVehicleTypeName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const extractErr = useCallback(
    (error: unknown): string => {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;

      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>)
          .map(([key, value]) =>
            Array.isArray(value)
              ? `${key}: ${value.join(", ")}`
              : `${key}: ${String(value)}`
          )
          .join("\n");
      }
      if (err.message) return err.message;
      return t("common.unexpected_error");
    },
    [t]
  );

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    adminApi.vehicleTypes.read(id)
      .then((res: any) => {
        if (cancelled) return;
        const data = res as Record<string, unknown>;
        setVehicleTypeName(toStr(data.vehicleType));
        setDescription(toStr(data.description));
        setIsActive(Boolean(data.is_active));
      })
      .catch((err: any) => {
        if (cancelled) return;
        Swal.fire(
          t("admin.vehicle_type.load_failed_title"),
          extractErr(err),
          "error"
        );
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldValues = {
      vehicleType: vehicleTypeName.trim(),
      description: description.trim(),
      is_active: isActive,
    };
    const validation = parseWithSchema(vehicleTypeCreationSchema, fieldValues);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      Swal.fire(
        t("common.warning"),
        `${t("common.please_fill")}: ${t("admin.vehicle_type.label")}`,
        "warning"
      );
      return;
    }
    setFieldErrors({});

    const payload: VehicleTypePayload = {
      vehicleType: vehicleTypeName.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.vehicleTypes.update(id, payload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await adminApi.vehicleTypes.create(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.vehicle_type.title_edit")
          : t("admin.vehicle_type.title_add")
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        noValidate
      >
        {/* Vehicle Type Name */}
        <div>
          <Label>
            {t("admin.vehicle_type.label")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            value={vehicleTypeName}
            onChange={(e) => {
              setVehicleTypeName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, vehicleType: "" }));
            }}
            placeholder={t("admin.vehicle_type.placeholder")}
            required
          />
          <FieldError message={fieldErrors.vehicleType} />
        </div>

        {/* Status */}
        <div>
          <Label>
            {t("common.status")} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(value) => setIsActive(value === "true")}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue placeholder={t("common.select_status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label>{t("common.description")}</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("common.description_optional")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(ENC_LIST_PATH)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
