import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { getEncryptedRoute } from "@/utils/routeCache";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { userTypeApi, staffUserTypeApi } from "@/helpers/admin";

const { encAdmins, encStaffUserType } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encAdmins}/${encStaffUserType}`;

type UserType = {
  unique_id: string;
  name: string;
  is_active: boolean;
};

export default function StaffUserTypeForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [selectedUserType, setSelectedUserType] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  /* =========================
     LOAD USER TYPES FIRST
  ========================= */
  const fetchUserTypes = async () => {
    try {
      const res = await userTypeApi.list();
      const list = Array.isArray(res)
        ? res
        : (res as any)?.results ?? [];

      setUserTypes(list);
      return list;
    } catch (error) {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
      throw error;
    }
  };

  /* =========================
     LOAD EDIT DATA
  ========================= */
  const fetchEditData = async (usertypes: UserType[]) => {
    try {
      const res = await staffUserTypeApi.get(id as string);
      const data = (res as any)?.data ?? res;

      setName(data.name ?? "");
      setIsActive(Boolean(data.is_active));

      // ensure selected value exists in dropdown
      const validUserType =
        usertypes.find((u) => u.unique_id === data.usertype_id)
          ?.unique_id ?? "";

      setSelectedUserType(validUserType);
    } catch (error) {
      console.error("Edit Load Failed:", error);
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
      navigate(ENC_LIST_PATH);
    }
  };

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchUserTypes();
        if (isEdit) {
          await fetchEditData(list);
        } else if (list.length > 0) {
          setSelectedUserType(list[0].unique_id);
        }
        setPageReady(true);
      } catch {
        /* handled */
      }
    })();
  }, [id]);

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserType || !name) {
      Swal.fire(t("common.error"), t("common.all_fields_required"), "error");
      return;
    }

    setLoading(true);

    const payload = {
      usertype_id: selectedUserType,
      name,
      is_active: isActive,
    };

    try {
      if (isEdit) {
        await staffUserTypeApi.update(id as string, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await staffUserTypeApi.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      Swal.fire(
        t("common.error"),
        error.response?.data?.name?.[0] ??
          error.response?.data?.usertype_id?.[0] ??
          t("common.invalid_data"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     GUARD
  ========================= */
  if (!pageReady) return null;

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="p-8">
      <div className=" mx-auto bg-white rounded-xl shadow-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {isEdit
              ? t("common.edit_item", { item: t("admin.nav.staff_user_type") })
              : t("common.add_item", { item: t("admin.nav.staff_user_type") })}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* USER TYPE */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.nav.user_type")}{" "}
                <span className="text-red-500">*</span>
              </label>

              <Select
                value={selectedUserType}
                onValueChange={setSelectedUserType}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("common.select_item_placeholder", {
                      item: t("admin.nav.user_type"),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {userTypes.map((u) => (
                    <SelectItem key={u.unique_id} value={u.unique_id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* STAFF ROLE */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.staff_user_type.role_label")}{" "}
                <span className="text-red-500">*</span>
              </label>

              <Select value={name} onValueChange={setName}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.select_role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    {t("admin.roles.admin")}
                  </SelectItem>
                  <SelectItem value="operator">
                    {t("admin.roles.operator")}
                  </SelectItem>
                  <SelectItem value="driver">
                    {t("admin.roles.driver")}
                  </SelectItem>
                  <SelectItem value="user">
                    {t("admin.roles.user")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* STATUS */}
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium mb-1">
              {t("common.status")} <span className="text-red-500">*</span>
            </label>

            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  {t("common.active")}
                </SelectItem>
                <SelectItem value="false">
                  {t("common.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              {loading ? t("common.saving") : t("common.update")}
            </button>

            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="bg-red-600 text-white px-6 py-2 rounded"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
