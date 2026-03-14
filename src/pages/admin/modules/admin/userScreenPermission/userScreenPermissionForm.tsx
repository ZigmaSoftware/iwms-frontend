import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

import { encryptSegment } from "@/utils/routeCrypto";

const ENC_LIST_PATH = `/${encryptSegment("admins")}/${encryptSegment(
  "userscreenpermissions"
)}`;

import {
  staffUserTypeApi,
  mainScreenApi,
  userScreenApi,
  userScreenActionApi,
  userScreenPermissionApi
} from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";


type Option = {
  value: string;
  label: string;
  userTypeId?: string;
};

export default function UserScreenPermissionForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Only staffTypeId in route now
  const params = useParams();
  const staffTypeId = params.id;

  const isEdit = Boolean(staffTypeId);
  const {
    companyUniqueId,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit });

  const [staffUserTypeId, setStaffUserTypeId] = useState("");
  const [mainScreenId, setMainScreenId] = useState("");
  const [description, setDescription] = useState("");
  const [userTypeId, setUserTypeId] = useState("");
  const [assignedStaffTypeIds, setAssignedStaffTypeIds] = useState<Set<string>>(new Set());

  const [staffUserTypes, setStaffUserTypes] = useState<Option[]>([]);
  const [mainScreens, setMainScreens] = useState<Option[]>([]);
  const [allUserScreens, setAllUserScreens] = useState<any[]>([]);
  const [actions, setActions] = useState<Option[]>([]);

  const [screenMatrix, setScreenMatrix] = useState<
    { userscreen_id: string; userscreen_name: string; actions: string[] }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  /* -----------------------------------------------------------
     LOAD DROPDOWNS
  ----------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingData(true);

        const [sut, ms, us, ac] = await Promise.all([
          staffUserTypeApi.list(),
          mainScreenApi.list(),
          userScreenApi.list(),
          userScreenActionApi.list(),
        ]);

        setStaffUserTypes(
          sut.map((x: any) => ({
            value: x.unique_id,
            label: x.name,
            userTypeId: x.usertype_id,
          }))
        );

        setMainScreens(
          ms.map((x: any) => ({
            value: x.unique_id,
            label: x.mainscreen_name,
          }))
        );

        setAllUserScreens(us);

        setActions(
          ac.map((x: any) => ({ value: x.unique_id, label: x.action_name }))
        );
      } catch {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      } finally {
        setLoadingData(false);
      }
    };

    load();
  }, [t]);

  /* -----------------------------------------------------------
     LOAD ASSIGNED STAFF TYPES BY COMPANY
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!companyUniqueId) {
      setAssignedStaffTypeIds(new Set());
      return;
    }

    const loadAssignedStaffTypes = async () => {
      try {
        const permissions = await userScreenPermissionApi.list({
          params: { company_id: companyUniqueId },
        });

        const assignedIds = new Set(
          permissions
            .map((permission: any) =>
              String(permission?.staffusertype_id ?? "").trim()
            )
            .filter(Boolean)
        );

        setAssignedStaffTypeIds(assignedIds);
      } catch {
        setAssignedStaffTypeIds(new Set());
      }
    };

    loadAssignedStaffTypes();
  }, [companyUniqueId]);

  /* -----------------------------------------------------------
     EDIT MODE — Prefill only StaffUserType
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!isEdit || !staffTypeId) return;

    setStaffUserTypeId(staffTypeId);
    setMainScreenId(""); // User must select manually
    setScreenMatrix([]); // Reset table
  }, [isEdit, staffTypeId]);

  /* -----------------------------------------------------------
     LOAD PERMISSIONS AFTER USER SELECTS MAIN SCREEN
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!companyUniqueId || !staffUserTypeId || !mainScreenId) return;

    const loadPermissions = async () => {
      try {
        let formatted: any = null;

        // TRY TO LOAD PERMISSIONS
        try {
          formatted = await userScreenPermissionApi.get(
            `by-staff-format/?company_id=${encodeURIComponent(
              companyUniqueId
            )}&staffusertype_id=${encodeURIComponent(
              staffUserTypeId
            )}&mainscreen_id=${encodeURIComponent(mainScreenId)}`
          );
        } catch {
          // backend returns 404 → treat as no permissions
          formatted = { screens: [], description: "" };
        }

        // ---- ALWAYS LOAD ALL USER SCREENS FOR THIS MAIN SCREEN ----
        const fullScreens = allUserScreens.filter(
          (u: any) => u.mainscreen_id === mainScreenId
        );

        // map DB permissions
        const dbMap = new Map<string, { actions?: string[] }>(
          (formatted.screens || []).map((s: any) => [s.userscreen_id, s])
        );

        // Merge full list + permissions
        const matrix = fullScreens.map((scr: any) => ({
          userscreen_id: scr.unique_id,
          userscreen_name: scr.userscreen_name,
          actions: dbMap.get(scr.unique_id)?.actions || [], // prefill or empty
        }));

        setDescription(formatted.description || "");
        setScreenMatrix(matrix);
      } catch (err) {
        console.error("Permission Load Failed:", err);
        Swal.fire(t("common.error"), t("admin.user_screen_permission.load_matrix_failed"), "error");
      }
    };

    loadPermissions();
  }, [companyUniqueId, staffUserTypeId, mainScreenId, allUserScreens, t]);

  /* -----------------------------------------------------------
     AUTO SET USER TYPE
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!staffUserTypeId || staffUserTypes.length === 0) return;

    const sut = staffUserTypes.find((s) => s.value === staffUserTypeId);
    setUserTypeId(sut?.userTypeId || "");
  }, [staffUserTypeId, staffUserTypes]);

  /* -----------------------------------------------------------
     LIST TOGGLE FUNCTIONS
  ----------------------------------------------------------- */
  const handleActionToggle = (
    screenId: string,
    actionId: string,
    checked: boolean
  ) => {
    setScreenMatrix((prev) =>
      prev.map((row) =>
        row.userscreen_id === screenId
          ? {
              ...row,
              actions: checked
                ? [...row.actions, actionId]
                : row.actions.filter((a) => a !== actionId),
            }
          : row
      )
    );
  };

  const handleSelectAll = (screenId: string, checked: boolean) => {
    const allActions = actions.map((a) => a.value);
    setScreenMatrix((prev) =>
      prev.map((row) =>
        row.userscreen_id === screenId
          ? { ...row, actions: checked ? allActions : [] }
          : row
      )
    );
  };

  /* -----------------------------------------------------------
     SUBMIT
  ----------------------------------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!staffUserTypeId) missingFields.push(t("admin.nav.staff_user_type"));
    if (!mainScreenId) missingFields.push(t("admin.nav.main_screen"));

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning"
      );
      return;
    }

    const payload = {
      company_id: companyUniqueId,
      staffusertype_id: staffUserTypeId,
      mainscreen_id: mainScreenId,
      screens: screenMatrix,
      description: description.trim(),
      usertype_id: userTypeId,
    };

    try {
      setLoading(true);

      await userScreenPermissionApi.action(
        `bulk-sync-multi/${staffUserTypeId}`,
        payload
      );

      Swal.fire(
        t("common.success"),
        t("admin.user_screen_permission.save_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch {
      Swal.fire(t("common.error"), t("common.save_failed_desc"), "error");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  if (loadingData) {
    return (
      <ComponentCard title={t("common.loading")}>
        <div className="flex justify-center items-center py-12 text-gray-500">
          {t("admin.user_screen_permission.loading_message")}
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })
          : t("common.add_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label>{t("admin.nav.company")} *</Label>
            <Select
              value={companyUniqueId}
              onValueChange={(value) => {
                onCompanyChange(value);
                setMainScreenId("");
                setScreenMatrix([]);
                setDescription("");
                if (!isEdit) setStaffUserTypeId("");
              }}
              disabled={
                Boolean(loggedInCompanyUniqueId) ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companies.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.company"),
                  })}
                />
              </SelectTrigger>

              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin.nav.staff_user_type")} *</Label>

            <Select
              value={staffUserTypeId}
              onValueChange={(v) => {
                if (assignedStaffTypeIds.has(v) && !isEdit) {
                  Swal.fire(
                    t("admin.user_screen_permission.permission_exists_title"),
                    t("admin.user_screen_permission.permission_exists_body"),
                    "info"
                  );
                  navigate(
                    `/${encryptSegment("admins")}/${encryptSegment(
                      "userscreenpermissions"
                    )}/${v}/edit${
                      companyUniqueId
                        ? `?company_unique_id=${encodeURIComponent(companyUniqueId)}`
                        : ""
                    }`
                  );
                  return;
                }

                setStaffUserTypeId(v);
              }}
              disabled={isEdit || !companyUniqueId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.staff_user_type"),
                  })}
                />
              </SelectTrigger>

              <SelectContent>
                {staffUserTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin.nav.main_screen")} *</Label>
            <Select
              value={mainScreenId}
              onValueChange={setMainScreenId}
              disabled={!companyUniqueId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.main_screen"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {mainScreens.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* PERMISSION TABLE */}
        {screenMatrix.length > 0 && (
          <div className="mt-6 border rounded-lg overflow-x-auto bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("common.s_no")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("admin.nav.user_screen")}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    {t("admin.user_screen_permission.all")}
                  </th>

                  {actions.map((act) => (
                    <th
                      key={act.value}
                      className="px-4 py-3 text-center text-sm font-semibold"
                    >
                      {act.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {screenMatrix.map((row, i) => {
                  const allChecked = row.actions.length === actions.length;

                  return (
                    <tr
                      key={row.userscreen_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {row.userscreen_name}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            handleSelectAll(row.userscreen_id, e.target.checked)
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {actions.map((act) => (
                        <td key={act.value} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.actions.includes(act.value)}
                            onChange={(e) =>
                              handleActionToggle(
                                row.userscreen_id,
                                act.value,
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {screenMatrix.length === 0 && mainScreenId && (
          <div className="mt-6 p-8 border rounded-lg bg-gray-50 text-center text-gray-500">
            {t("admin.user_screen_permission.no_screens")}
          </div>
        )}

        {mainScreenId && (
          <div className="mt-6">
            <Label>{t("common.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("common.description_optional")}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="submit"
            disabled={loading || !companyUniqueId || !staffUserTypeId || !mainScreenId}
          >
            {loading
              ? t("common.saving")
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
    </ComponentCard>
  );
}
