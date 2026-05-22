import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getEncryptedRoute } from "@/utils/routeCache";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type RoleTypeOption,
  useCreateStaffUserTypeMutation,
  useRoleTypeChoicesQuery,
  useStaffUserTypeQuery,
  useUpdateStaffUserTypeMutation,
  useUserTypesQuery,
  useCreateContractorUserTypeMutation,
  useUpdateContractorUserTypeMutation,
  useContractorRoleTypesQuery,
  useContractorUserTypeQuery,
} from "@/tanstack/admin";

const { encAdmins, encStaffUserType } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encAdmins}/${encStaffUserType}`;

type UserType = {
  unique_id: string;
  name: string;
  is_active: boolean;
};

const prettifyRoleLabel = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function StaffUserTypeForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [roleTypes, setRoleTypes] = useState<RoleTypeOption[]>([]);
  const [selectedUserType, setSelectedUserType] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pageReady, setPageReady] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const selectedUserTypeName = userTypes
    .find((u) => u.unique_id === selectedUserType)
    ?.name?.toLowerCase() ?? "";
  const isContractor = selectedUserTypeName === "contractor";

  const userTypesQuery = useUserTypesQuery();
  const staffRoleChoicesQuery = useRoleTypeChoicesQuery();
  const contractorRoleChoicesQuery = useContractorRoleTypesQuery();
  const roleTypeChoicesQuery = isContractor ? contractorRoleChoicesQuery : staffRoleChoicesQuery;

  const staffUserTypeQuery = useStaffUserTypeQuery(!isContractor && isEdit ? (id as string) : null);
  const contractorUserTypeQuery = useContractorUserTypeQuery(isContractor && isEdit ? (id as string) : null);

  const createStaffUserTypeMutation = useCreateStaffUserTypeMutation();
  const updateStaffUserTypeMutation = useUpdateStaffUserTypeMutation();
  const createContractorUserTypeMutation = useCreateContractorUserTypeMutation();
  const updateContractorUserTypeMutation = useUpdateContractorUserTypeMutation();

  const loading = isContractor
    ? createContractorUserTypeMutation.isPending || updateContractorUserTypeMutation.isPending
    : createStaffUserTypeMutation.isPending || updateStaffUserTypeMutation.isPending;

  /* =========================
     Swap role choices when user type changes (after page is ready)
  ========================= */
  useEffect(() => {
    if (!pageReady) return;
    const roles = roleTypeChoicesQuery.data ?? [];
    setRoleTypes(roles);
    setName(roles[0]?.value ?? "");
  }, [selectedUserType]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    if (pageReady) return;

    const editQuery = isContractor ? contractorUserTypeQuery : staffUserTypeQuery;

    if (userTypesQuery.isError || staffRoleChoicesQuery.isError || contractorRoleChoicesQuery.isError || editQuery.isError) {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
      navigate(ENC_LIST_PATH);
      return;
    }

    if (userTypesQuery.isPending || staffRoleChoicesQuery.isPending || contractorRoleChoicesQuery.isPending) return;
    if (isEdit && editQuery.isPending) return;

    const ut = (userTypesQuery.data ?? []) as unknown as UserType[];
    setUserTypes(ut);

    if (ut.length > 0 && !selectedUserType) {
      setSelectedUserType(ut[0].unique_id);
    }

    const roles = roleTypeChoicesQuery.data ?? [];
    setRoleTypes(roles);

    if (isEdit) {
      const data = editQuery.data as any;
      if (!data) return;

      const roleValue = String(data.name ?? "").trim();
      setName(roleValue);
      setIsActive(Boolean(data.is_active));

      if (data.usertype_id) {
        setSelectedUserType(data.usertype_id);
      }

      if (roleValue && !roles.some((role: RoleTypeOption) => role.value === roleValue)) {
        setRoleTypes((prev) => [
          ...prev,
          { value: roleValue, label: prettifyRoleLabel(roleValue) },
        ]);
      }
    } else {
      if (!name && roles.length > 0) {
        setName(roles[0].value);
      }
    }

    setPageReady(true);
  }, [
    isEdit,
    isContractor,
    name,
    navigate,
    pageReady,
    staffRoleChoicesQuery.data,
    staffRoleChoicesQuery.isError,
    staffRoleChoicesQuery.isPending,
    contractorRoleChoicesQuery.data,
    contractorRoleChoicesQuery.isError,
    contractorRoleChoicesQuery.isPending,
    roleTypeChoicesQuery.data,
    selectedUserType,
    staffUserTypeQuery.data,
    staffUserTypeQuery.isError,
    staffUserTypeQuery.isPending,
    contractorUserTypeQuery.data,
    contractorUserTypeQuery.isError,
    contractorUserTypeQuery.isPending,
    t,
    userTypesQuery.data,
    userTypesQuery.isError,
    userTypesQuery.isPending,
  ]);

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserType || !name) {
      Swal.fire(t("common.error"), t("common.all_fields_required"), "error");
      return;
    }

    const payload = {
      usertype_id: selectedUserType,
      name,
      is_active: isActive,
    };

    try {
      if (isContractor) {
        if (isEdit) {
          await updateContractorUserTypeMutation.mutateAsync({ id: id as string, payload });
        } else {
          await createContractorUserTypeMutation.mutateAsync(payload);
        }
      } else {
        if (isEdit) {
          await updateStaffUserTypeMutation.mutateAsync({ id: id as string, payload });
        } else {
          await createStaffUserTypeMutation.mutateAsync(payload);
        }
      }

      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      Swal.fire(
        t("common.error"),
        error.response?.data?.name?.[0] ??
          error.response?.data?.usertype_id?.[0] ??
          t("common.invalid_data"),
        "error"
      );
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
                  {roleTypes.length === 0 ? (
                    <SelectItem value="__no_roles__" disabled>
                      {t("common.not_available")}
                    </SelectItem>
                  ) : (
                    roleTypes.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))
                  )}
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
          <div className="flex justify-end gap-3 mt-6">
            <Button type="submit" disabled={loading}>
              {loading
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
      </div>
    </div>
  );
}