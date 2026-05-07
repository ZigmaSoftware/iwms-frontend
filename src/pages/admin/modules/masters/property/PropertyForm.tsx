import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import {
  usePropertyQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  type PropertyPayload,
} from "@/tanstack/admin/queries/wastetype/property";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import type { PropertyEditorProps } from "./types";

const { encMasters, encProperties } = getEncryptedRoute();

const ENC_LIST_PATH = `/${encMasters}/${encProperties}`;

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(", ");
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  return fallback;
};

function PropertyEditor({
  initialPayload,
  isEdit,
  isSubmitting,
  onCancel,
  onSubmit,
}: PropertyEditorProps) {
  const { t } = useTranslation();
  const [propertyName, setPropertyName] = useState(initialPayload.property_name);
  const [isActive, setIsActive] = useState(initialPayload.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = propertyName.trim();

    if (!trimmedName) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    await onSubmit({
      property_name: trimmedName,
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/*Property Name */}
        <div>
          <Label htmlFor="name">
            {t("common.item_name", { item: t("admin.nav.property") })}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="propertyName"
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder={t("common.enter_item_name", {
              item: t("admin.nav.property"),
            })}
            className="input-validate w-full"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Active Status */}
        <div>
          <Label htmlFor="isActive">
            {t("common.status")} <span className="text-red-500">*</span>
          </Label>
          <Select
            id="isActive"
            value={isActive ? "true" : "false"}
            onChange={(val) => setIsActive(val === "true")}
            options={[
              { value: "true", label: t("common.active") },
              { value: "false", label: t("common.inactive") },
            ]}
            className="input-validate w-full"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? isEdit
              ? t("common.updating")
              : t("common.saving")
            : isEdit
              ? t("common.update")
              : t("common.save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

function PropertyForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { applyCompanyProjectFromRecord } = useCompanyProjectSelection({
    isEdit,
  });

  const propertyQuery = usePropertyQuery(id);
  const createPropertyMutation = useCreatePropertyMutation();
  const updatePropertyMutation = useUpdatePropertyMutation();

  const isSubmitting =
    createPropertyMutation.isPending || updatePropertyMutation.isPending;

  const title = isEdit
    ? t("common.edit_item", { item: t("admin.nav.property") })
    : t("common.add_item", { item: t("admin.nav.property") });

  // Apply company/project from data
  useEffect(() => {
    if (!propertyQuery.data) {
      return;
    }

    applyCompanyProjectFromRecord(
      propertyQuery.data as unknown as Record<string, unknown>
    );
  }, [applyCompanyProjectFromRecord, propertyQuery.data]);

  // Handle fetch error
  useEffect(() => {
    if (!propertyQuery.isError) {
      return;
    }

    Swal.fire(
      t("common.error"),
      extractErrorMessage(propertyQuery.error, t("common.load_failed")),
      "error"
    );
  }, [propertyQuery.error, propertyQuery.isError, t]);

  const submitProperty = async (payload: PropertyPayload) => {
    try {
      if (isEdit) {
        await updatePropertyMutation.mutateAsync({
          id: id as string,
          payload,
        });
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createPropertyMutation.mutateAsync(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: extractErrorMessage(error, t("common.save_failed_desc")),
      });
    }
  };

  if (isEdit && propertyQuery.isPending && !propertyQuery.data) {
    return (
      <ComponentCard title={title}>
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  const initialPayload: PropertyPayload = propertyQuery.data
    ? {
        property_name: String(propertyQuery.data.property_name ?? ""),
        is_active: Boolean(propertyQuery.data.is_active),
      }
    : {
        property_name: "",
        is_active: true,
      };

  const formKey = isEdit
    ? String(propertyQuery.data?.unique_id ?? id)
    : "new-property";

  return (
    <ComponentCard title={title}>
      <PropertyEditor
        key={formKey}
        initialPayload={initialPayload}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onCancel={() => navigate(ENC_LIST_PATH)}
        onSubmit={submitProperty}
      />
    </ComponentCard>
  );
}

export default PropertyForm;
