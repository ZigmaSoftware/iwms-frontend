import { useEffect, useMemo, useState } from "react";
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
  type MainCategoryRecord,
  type SubCategoryPayload,
  useMainCategoriesQuery,
  useCreateSubCategoryMutation,
  useSubCategoryQuery,
  useUpdateSubCategoryMutation,
} from "@/tanstack/admin";

const { encCitizenGrivence, encSubComplaintCategory } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encCitizenGrivence}/${encSubComplaintCategory}`;

type SubCategoryEditorProps = {
  initialPayload: {
    name: string;
    mainCategory: string;
    is_active: boolean;
    company_id?: string;
  };
  mainList: MainCategoryRecord[];
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: SubCategoryPayload) => Promise<void>;
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

function SubCategoryEditor({
  initialPayload,
  mainList,
  isEdit,
  isSubmitting,
  onCancel,
  onSubmit,
}: SubCategoryEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialPayload.name);
  const [mainCategory, setMainCategory] = useState(initialPayload.mainCategory);
  const [isActive, setIsActive] = useState(initialPayload.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: SubCategoryPayload = {
      name,
      is_active: isActive,
      company_id: initialPayload.company_id,
    };

    if (mainCategory) {
      const numeric = Number(mainCategory);
      payload.mainCategory = Number.isNaN(numeric) ? mainCategory : numeric;
    }

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mainCategory">
            {t("admin.citizen_grievance.sub_category_form.main_category")}{" "}
            <span className="text-red-500">*</span>
          </Label>

          <Select
            value={mainCategory}
            onValueChange={(val) => setMainCategory(val)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="input-validate w-full" id="mainCategory">
              <SelectValue
                placeholder={t("admin.citizen_grievance.sub_category_form.main_category_placeholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {mainList.map((m) => (
                <SelectItem key={String(m.unique_id)} value={String(m.unique_id)}>
                  {m.main_categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="name">
            {t("admin.citizen_grievance.sub_category_form.sub_category_name")}{" "}
            <span className="text-red-500">*</span>
          </Label>

          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("admin.citizen_grievance.sub_category_form.sub_category_placeholder")}
            className="input-validate w-full"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="isActive">
            {t("admin.citizen_grievance.sub_category_form.active_status")}{" "}
            <span className="text-red-500">*</span>
          </Label>

          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(val) => setIsActive(val === "true")}
            disabled={isSubmitting}
          >
            <SelectTrigger className="input-validate w-full" id="isActive">
              <SelectValue placeholder={t("admin.citizen_grievance.sub_category_form.status_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEdit
              ? t("admin.citizen_grievance.sub_category_form.updating")
              : t("admin.citizen_grievance.sub_category_form.saving")
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

export default function SubComplaintCategoryForm() {
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

  const subCategoryQuery = useSubCategoryQuery(id);
  const mainCategoriesQuery = useMainCategoriesQuery(companyUniqueId);
  const createSubCategoryMutation = useCreateSubCategoryMutation(companyUniqueId);
  const updateSubCategoryMutation = useUpdateSubCategoryMutation(companyUniqueId);
  const isSubmitting =
    createSubCategoryMutation.isPending || updateSubCategoryMutation.isPending;

  useEffect(() => {
    if (!subCategoryQuery.data) {
      return;
    }

    applyCompanyProjectFromRecord(
      subCategoryQuery.data as unknown as Record<string, unknown>
    );
  }, [applyCompanyProjectFromRecord, subCategoryQuery.data]);

  useEffect(() => {
    if (!subCategoryQuery.isError && !mainCategoriesQuery.isError) {
      return;
    }

    const error = subCategoryQuery.error ?? mainCategoriesQuery.error;
    Swal.fire(
      t("common.error"),
      extractErrorMessage(error, t("common.load_failed")),
      "error"
    );
  }, [
    mainCategoriesQuery.error,
    mainCategoriesQuery.isError,
    subCategoryQuery.error,
    subCategoryQuery.isError,
    t,
  ]);

  const mainList = useMemo(
    () => (mainCategoriesQuery.data ?? []).filter((item) => item.is_active === true),
    [mainCategoriesQuery.data]
  );

  const handleSubmit = async (payload: SubCategoryPayload) => {
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
        await updateSubCategoryMutation.mutateAsync({
          id: id as string,
          payload: {
            ...payload,
            company_id: companyUniqueId,
          },
        });
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.sub_category_form.updated"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createSubCategoryMutation.mutateAsync({
          ...payload,
          company_id: companyUniqueId,
        });
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.sub_category_form.added"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("admin.citizen_grievance.sub_category_form.save_failed")),
        "error"
      );
    }
  };

  if (isEdit && subCategoryQuery.isPending && !subCategoryQuery.data) {
    return (
      <ComponentCard
        title={t("admin.citizen_grievance.sub_category_form.title_edit")}
      >
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  const initialPayload = subCategoryQuery.data
    ? {
        name: String(subCategoryQuery.data.name ?? ""),
        mainCategory: String(subCategoryQuery.data.mainCategory ?? ""),
        is_active: Boolean(subCategoryQuery.data.is_active),
        company_id: companyUniqueId,
      }
    : {
        name: "",
        mainCategory: "",
        is_active: true,
        company_id: companyUniqueId,
      };

  const formKey = isEdit
    ? String(subCategoryQuery.data?.unique_id ?? id)
    : "new-sub-category";

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.citizen_grievance.sub_category_form.title_edit")
          : t("admin.citizen_grievance.sub_category_form.title_add")
      }
    >
      <SubCategoryEditor
        key={formKey}
        initialPayload={initialPayload}
        mainList={mainList}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onCancel={() => navigate(ENC_LIST_PATH)}
        onSubmit={handleSubmit}
      />
    </ComponentCard>
  );
}
