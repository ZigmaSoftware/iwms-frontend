import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { getEncryptedRoute } from "@/utils/routeCache";
import { userTypeApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

const { encAdmins, encUserType } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encAdmins}/${encUserType}`;

export default function UserTypeForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const userTypeId = id;
  const isEdit = Boolean(userTypeId);

  const {
    companyUniqueId,
    loggedInCompanyUniqueId,
    isSuperAdmin,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  /* -----------------------------------------------------------
     LOAD RECORD FOR EDIT
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!isEdit) return;

    const loadData = async () => {
      try {
        const res = await userTypeApi.get(userTypeId as string);
        const data = res?.data || res;

        setName(data.name);
        setIsActive(data.is_active);
        applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
      } catch {
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: t("common.load_failed"),
        });
      }
    };

    loadData();
  }, [isEdit, userTypeId, applyCompanyProjectFromRecord, t]);

  /* -----------------------------------------------------------
     SUBMIT HANDLER
  ----------------------------------------------------------- */
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

    const payload = {
      name,
      is_active: isActive,
      company_id: companyUniqueId,
    };

    try {
      if (isEdit) {
        // UPDATE
        await userTypeApi.update(userTypeId as string, payload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // CREATE
        await userTypeApi.create(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const message =
        error?.response?.data?.name?.[0] ||
        error?.response?.data?.detail ||
        t("common.save_failed_desc");

      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------------------------
     RENDER UI
  ----------------------------------------------------------- */
  return (
    <div className="p-8">
      <div className=" mx-auto bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit
              ? t("common.edit_item", { item: t("admin.nav.user_type") })
              : t("common.add_item", { item: t("admin.nav.user_type") })}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* User Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("common.item_name", { item: t("admin.nav.user_type") })}{" "}
                <span className="text-red-500">*</span>
              </label>

              <Input
                type="text"
                placeholder={t("common.enter_item_name", {
                  item: t("admin.nav.user_type"),
                })}
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("common.status")} <span className="text-red-500">*</span>
              </label>

              <select
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
                className="w-full px-3 py-2 border border-green-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="true">{t("common.active")}</option>
                <option value="false">{t("common.inactive")}</option>
              </select>
            </div>

          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white font-medium px-6 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>

            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="bg-red-500 text-white font-medium px-6 py-2 rounded hover:bg-red-600 transition"
            >
              {t("common.cancel")}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
