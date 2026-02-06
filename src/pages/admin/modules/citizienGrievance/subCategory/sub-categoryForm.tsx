import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import { api } from "@/api";
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

  // Load dropdown
  useEffect(() => {
    api.get("main-category/").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMainList(list);
    });
  }, []);

  // Load edit data
  useEffect(() => {
    if (isEdit) {
      api.get(`sub-category/${id}/`).then(res => {
        const d = res.data.data || res.data;
        setName(d.name);
        setMainCategory(String(d.mainCategory));
        setIsActive(d.is_active);
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const payload: Record<string, any> = {
      name,
      is_active: isActive,
    };

    if (mainCategory) {
      const numeric = Number(mainCategory);
      payload.mainCategory = Number.isNaN(numeric) ? mainCategory : numeric;
    }

    try {
      if (isEdit) {
        await api.patch(`sub-category/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.sub_category_form.updated"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("sub-category/", payload);
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
