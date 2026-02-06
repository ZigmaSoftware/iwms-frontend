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
const { encCitizenGrivence, encMainComplaintCategory } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encCitizenGrivence}/${encMainComplaintCategory}`;

export function MainComplaintCategoryForm() {
  const { t } = useTranslation();
  const [mainCategoryName, setMainCategoryName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // fetch record
  useEffect(() => {
    if (isEdit) {
      api
        .get(`main-category/${id}/`)
        .then((res) => {
          const data = res.data;
          setMainCategoryName(data.main_categoryName);
          setIsActive(data.is_active);
        })
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: t("admin.citizen_grievance.main_category_form.load_failed"),
          });
        });
    }
  }, [id, isEdit]);

  // submit handler
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const name = mainCategoryName.trim();
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: t("admin.citizen_grievance.main_category_form.missing_title"),
        text: t("admin.citizen_grievance.main_category_form.missing_message"),
      });
      setLoading(false);
      return;
    }

    const payload = { main_categoryName: name, is_active: isActive };

    try {
      if (isEdit) {
        await api.put(`main-category/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.main_category_form.updated"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("main-category/", payload);
        Swal.fire({
          icon: "success",
          title: t("admin.citizen_grievance.main_category_form.added"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);

    } catch (err) {
      const respData = (err as any)?.response?.data;
      const message =
        typeof respData === "string"
          ? respData
          : respData && typeof respData === "object"
            ? Object.entries(respData)
              .map(([k, v]) =>
                Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
              )
              .join("\n")
            : t("admin.citizen_grievance.main_category_form.save_failed");
      Swal.fire(t("common.error"), message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.citizen_grievance.main_category_form.title_edit")
          : t("admin.citizen_grievance.main_category_form.title_add")
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Category Name */}
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
            />
          </div>

          {/* Active Status */}
          <div>
            <Label htmlFor="isActive">
              {t("admin.citizen_grievance.main_category_form.active_status")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? t("admin.citizen_grievance.main_category_form.updating")
                : t("admin.citizen_grievance.main_category_form.saving")
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
