import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

import { getEncryptedRoute } from "@/utils/routeCache";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  useSubPropertyQuery,
  useCreateSubPropertyMutation,
  useUpdateSubPropertyMutation,
  type SubPropertyPayload,
} from "@/tanstack/admin/queries/wastetype/subProperty";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { usePropertiesQuery } from "@/tanstack/admin/queries/wastetype/property";
import type { SubPropertyEditorProps } from "./types";

const { encMasters, encSubProperties } = getEncryptedRoute();

const ENC_LIST_PATH = `/${encMasters}/${encSubProperties}`;

const SUB_PROPERTY_FIELDS: Record<string, string[]> = {
  property_id: ["property_id"],
  sub_property_name: ["sub_property_name"],
  is_active: ["is_active"],
};

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

function SubPropertyEditor({
  initialPayload,
  properties,
  isEdit,
  isSubmitting,
  onCancel,
  onSubmit,
}: SubPropertyEditorProps) {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } =
    useFieldVisibility("masters", "sub-properties", SUB_PROPERTY_FIELDS);
  const [subPropertyName, setSubPropertyName] = useState(initialPayload.sub_property_name);
  const [propertyId, setPropertyId] = useState<string>(String(initialPayload.property_id ?? ""));
  const [isActive, setIsActive] = useState(initialPayload.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = subPropertyName.trim();
    const fieldValues: Record<string, unknown> = {
      sub_property_name: trimmedName,
      property_id: propertyId,
    };

    if (
      getMissingRequiredFields(
        ["sub_property_name", "property_id"],
        (fieldKey) => fieldValues[fieldKey],
      ).length > 0
    ) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.all_fields_required"),
      });
      return;
    }

    const rawPayload = {
      sub_property_name: trimmedName,
      property_id: propertyId,
      is_active: isActive,
    };

    await onSubmit(filterPayload(rawPayload) as SubPropertyPayload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showField("property_id") && (
          <div>
            <Label htmlFor="property">
              {t("admin.nav.property")} *
            </Label>

            <Select
              value={propertyId || ""}
              onValueChange={(val) => setPropertyId(val)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="property" className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.property"),
                  })}
                />
              </SelectTrigger>

              <SelectContent>
                {properties
                  ?.filter((p) => p.is_active === true)
                  .map((p) => (
                    <SelectItem key={p.unique_id} value={String(p.unique_id)}>
                      {p.property_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showField("sub_property_name") && (
          <div>
            <Label htmlFor="subPropertyName">
              {t("common.item_name", { item: t("admin.nav.sub_property") })} *
            </Label>
            <Input
              id="subPropertyName"
              type="text"
              className="input-validate w-full"
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.sub_property"),
              })}
              value={subPropertyName}
              onChange={(e) => setSubPropertyName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        {showField("is_active") && (
          <div>
            <Label htmlFor="isActive">{t("common.status")} *</Label>

            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
              disabled={isSubmitting}
            >
              <SelectTrigger id="isActive" className="input-validate w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50"
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

export default function SubPropertyForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { applyCompanyProjectFromRecord } = useCompanyProjectSelection({
    isEdit,
  });

  const subPropertyQuery = useSubPropertyQuery(id);
  const propertiesQuery = usePropertiesQuery();
  const createSubPropertyMutation = useCreateSubPropertyMutation();
  const updateSubPropertyMutation = useUpdateSubPropertyMutation();

  const isSubmitting =
    createSubPropertyMutation.isPending || updateSubPropertyMutation.isPending;

  const title = isEdit
    ? t("common.edit_item", { item: t("admin.nav.sub_property") })
    : t("common.add_item", { item: t("admin.nav.sub_property") });

  // Apply company/project from data
  useEffect(() => {
    if (!subPropertyQuery.data) {
      return;
    }

    applyCompanyProjectFromRecord(
      subPropertyQuery.data as unknown as Record<string, unknown>
    );
  }, [applyCompanyProjectFromRecord, subPropertyQuery.data]);

  // Handle subproperty fetch error
  useEffect(() => {
    if (!subPropertyQuery.isError) {
      return;
    }

    Swal.fire(
      t("common.error"),
      extractErrorMessage(subPropertyQuery.error, t("common.load_failed")),
      "error"
    );
  }, [subPropertyQuery.error, subPropertyQuery.isError, t]);

  // Handle properties fetch error
  useEffect(() => {
    if (!propertiesQuery.isError) {
      return;
    }

    Swal.fire(
      t("common.error"),
      extractErrorMessage(propertiesQuery.error, t("common.fetch_failed")),
      "error"
    );
  }, [propertiesQuery.error, propertiesQuery.isError, t]);

  const submitSubProperty = async (payload: SubPropertyPayload) => {
    try {
      if (isEdit) {
        await updateSubPropertyMutation.mutateAsync({ id: id as string, payload });
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        await createSubPropertyMutation.mutateAsync(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1400,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error: unknown) {
      const message = extractErrorMessage(error, t("common.save_failed_desc"));
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: message,
      });
    }
  };

  if (isEdit && subPropertyQuery.isPending && !subPropertyQuery.data) {
    return (
      <ComponentCard title={title}>
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  const initialPayload: SubPropertyPayload = subPropertyQuery.data
    ? {
        sub_property_name: String(subPropertyQuery.data.sub_property_name ?? ""),
        property_id: subPropertyQuery.data.property_id ?? subPropertyQuery.data.property ?? "",
        is_active: Boolean(subPropertyQuery.data.is_active),
      }
    : {
        sub_property_name: "",
        property_id: "",
        is_active: true,
      };

  const formKey = isEdit
    ? String(subPropertyQuery.data?.unique_id ?? id)
    : "new-sub-property";

  return (
    <ComponentCard title={title}>
      <SubPropertyEditor
        key={formKey}
        initialPayload={initialPayload}
        properties={propertiesQuery.data ?? []}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onCancel={() => navigate(ENC_LIST_PATH)}
        onSubmit={submitSubProperty}
      />
    </ComponentCard>
  );
}
