import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

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
import ComponentCard from "@/components/common/ComponentCard";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  type MainCategoryPayload,
  useCreateMainCategoryMutation,
  useMainCategoryQuery,
  useUpdateMainCategoryMutation,
} from "@/tanstack/admin";

const { encCitizenGrivence, encMainComplaintCategory } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encCitizenGrivence}/${encMainComplaintCategory}`;

type MainCategoryEditorProps = {
  initialPayload: MainCategoryPayload;
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: MainCategoryPayload) => Promise<void>;
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

function MainCategoryEditor({
  initialPayload,
  isEdit,
  isSubmitting,
  onCancel,
  onSubmit,
}: MainCategoryEditorProps) {
  const { t } = useTranslation();
  const [mainCategoryName, setMainCategoryName] = useState(
    initialPayload.main_categoryName ?? ""
  );
  const [isActive, setIsActive] = useState(initialPayload.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = mainCategoryName.trim();
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: t("admin.citizen_grievance.main_category_form.missing_title"),
        text: t("admin.citizen_grievance.main_category_form.missing_message"),
      });
      return;
    }

    await onSubmit({
      main_categoryName: name,
      is_active: isActive,
      company_id: initialPayload.company_id,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="mainCategoryName">
            {t("admin.citizen_grievance.main_category_form.category_name")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="mainCategoryName"
            type="text"
            required
            value={mainCategoryName}
            onChange={(e) => setMainCategoryName(e.target.value)}
            placeholder={t("admin.citizen_grievance.main_category_form.category_placeholder")}
            className="input-validate w-full"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="isActive">
            {t("admin.citizen_grievance.main_category_form.active_status")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(val) => setIsActive(val === "true")}
            disabled={isSubmitting}
          >
            <SelectTrigger className="input-validate w-full" id="isActive">
              <SelectValue placeholder={t("admin.citizen_grievance.main_category_form.status_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEdit
              ? t("admin.citizen_grievance.main_category_form.updating")
              : t("admin.citizen_grievance.main_category_form.saving")
            : isEdit
              ? t("common.update")
              : t("common.save")}
        </Button>

        <Button type="button" variant="destructive" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

export function MainComplaintCategoryForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    companyUniqueId,
    loggedInCompanyUniqueId,
    isSuperAdmin,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const mainCategoryQuery = useMainCategoryQuery(id);
  const createMainCategoryMutation = useCreateMainCategoryMutation(companyUniqueId);
  const updateMainCategoryMutation = useUpdateMainCategoryMutation(companyUniqueId);
  const isSubmitting =
    createMainCategoryMutation.isPending || updateMainCategoryMutation.isPending;

  useEffect(() => {
    if (!mainCategoryQuery.data) {
      return;
    }

    applyCompanyProjectFromRecord(
      mainCategoryQuery.data as unknown as Record<string, unknown>
    );
  }, [applyCompanyProjectFromRecord, mainCategoryQuery.data]);

  useEffect(() => {
    if (!mainCategoryQuery.isError) {
      return;
    }

    Swal.fire({
      icon: "error",
      title: t("admin.citizen_grievance.main_category_form.load_failed"),
      text: extractErrorMessage(mainCategoryQuery.error, t("common.load_failed")),
    });
  }, [mainCategoryQuery.error, mainCategoryQuery.isError, t]);

  const handleSubmit = async (payload: MainCategoryPayload) => {
    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required",
        "error"
      );
      return;
    }

    try {
      if (isEdit) {
        await updateMainCategoryMutation.mutateAsync({
          id: id as string,
          payload: {
            ...payload,
            company_id: companyUniqueId,
          },
        });
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.main_category_form.updated"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createMainCategoryMutation.mutateAsync({
          ...payload,
          company_id: companyUniqueId,
        });
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.main_category_form.added"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("admin.citizen_grievance.main_category_form.save_failed")),
        "error"
      );
    }
  };

  if (isEdit && mainCategoryQuery.isPending && !mainCategoryQuery.data) {
    return (
      <ComponentCard
        title={t("admin.citizen_grievance.main_category_form.title_edit")}
      >
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  const initialPayload: MainCategoryPayload = mainCategoryQuery.data
    ? {
        main_categoryName: String(mainCategoryQuery.data.main_categoryName ?? ""),
        is_active: Boolean(mainCategoryQuery.data.is_active),
        company_id: companyUniqueId,
      }
    : {
        main_categoryName: "",
        is_active: true,
        company_id: companyUniqueId,
      };

  const formKey = isEdit
    ? String(mainCategoryQuery.data?.unique_id ?? id)
    : "new-main-category";

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.citizen_grievance.main_category_form.title_edit")
          : t("admin.citizen_grievance.main_category_form.title_add")
      }
    >
      <MainCategoryEditor
        key={formKey}
        initialPayload={initialPayload}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onCancel={() => navigate(ENC_LIST_PATH)}
        onSubmit={handleSubmit}
      />
    </ComponentCard>
  );
}
