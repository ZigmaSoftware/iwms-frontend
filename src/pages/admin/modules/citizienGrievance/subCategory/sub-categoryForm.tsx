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
import { subCategoryApi, mainCategoryApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
const { encCitizenGrivence, encSubComplaintCategory } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encCitizenGrivence}/${encSubComplaintCategory}`;

export default function SubComplaintCategoryForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [mainCategory, setMainCategory] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [mainList, setMainList] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    companyUniqueId,
    loggedInCompanyUniqueId,
    isSuperAdmin,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  // Load dropdown - only show active main categories
  useEffect(() => {
    mainCategoryApi.list({ params: { company_id: companyUniqueId } }).then((res) => {
      const list = Array.isArray(res) ? res : [];
      // Filter to only show active main categories
      const activeList = list.filter((item: any) => item.is_active === true);
      setMainList(activeList);
    });
  }, [companyUniqueId]);

  // Load edit data
  useEffect(() => {
    if (isEdit) {
      subCategoryApi.get(id as string).then(res => {
        const d = res?.data || res;
        setName(d.name);
        setMainCategory(String(d.mainCategory));
        setIsActive(d.is_active);
        applyCompanyProjectFromRecord(d as unknown as Record<string, unknown>);
      });
    }
  }, [id, isEdit, applyCompanyProjectFromRecord]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

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

    setLoading(true);

    const payload: Record<string, any> = {
      name,
      is_active: isActive,
      company_id: companyUniqueId,
    };

    if (mainCategory) {
      const numeric = Number(mainCategory);
      payload.mainCategory = Number.isNaN(numeric) ? mainCategory : numeric;
    }

    try {
      if (isEdit) {
        await subCategoryApi.update(id as string, payload);
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.sub_category_form.updated"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await subCategoryApi.create(payload);
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.sub_category_form.added"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);

    } catch (err) {
      Swal.fire(
        t("common.error"),
        t("admin.citizen_grievance.sub_category_form.save_failed"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.citizen_grievance.sub_category_form.title_edit")
          : t("admin.citizen_grievance.sub_category_form.title_add")
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Main Category */}
          <div>
            <Label htmlFor="mainCategory">
              {t("admin.citizen_grievance.sub_category_form.main_category")}{" "}
              <span className="text-red-500">*</span>
            </Label>

            <Select value={mainCategory} onValueChange={(val) => setMainCategory(val)}>
              <SelectTrigger className="input-validate w-full" id="mainCategory">
                <SelectValue
                  placeholder={t("admin.citizen_grievance.sub_category_form.main_category_placeholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {mainList.map((m: any) => (
                  <SelectItem key={m.id ?? m.unique_id} value={String(m.id ?? m.unique_id)}>
                    {m.main_categoryName || m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Category Name */}
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
            />
          </div>

          {/* Active Status */}
          <div>
            <Label htmlFor="isActive">
              {t("admin.citizen_grievance.sub_category_form.active_status")}{" "}
              <span className="text-red-500">*</span>
            </Label>

            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
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

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? t("admin.citizen_grievance.sub_category_form.updating")
                : t("admin.citizen_grievance.sub_category_form.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>

          <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
