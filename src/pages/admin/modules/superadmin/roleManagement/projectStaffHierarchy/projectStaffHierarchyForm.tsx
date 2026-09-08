import type { ProjectOption, StaffUserTypeOption } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getEncryptedRoute } from "@/utils/routeCache";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectApi, projectStaffHierarchyApi, staffUserTypeApi } from "@/helpers/admin";

const { encAdmins, encProjectStaffHierarchy } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(
  encAdmins,
  encProjectStaffHierarchy,
);

const toList = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.results)) return record.results as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
};

const normalizeIdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeIdValue(record.unique_id ?? record.id ?? record.value);
  }
  return String(value).trim();
};

export default function ProjectStaffHierarchyForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [staffUserTypes, setStaffUserTypes] = useState<StaffUserTypeOption[]>([]);

  const [projectId, setProjectId] = useState("");
  const [staffUserTypeId, setStaffUserTypeId] = useState("");
  const [reportsToId, setReportsToId] = useState("");
  const [level, setLevel] = useState("1");
  const [isActive, setIsActive] = useState(true);

  const [pageReady, setPageReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      projectApi.readAll(),
      staffUserTypeApi.readAll(),
      isEdit && id ? projectStaffHierarchyApi.read(id) : Promise.resolve(null),
    ])
      .then(([projectsRes, staffUserTypesRes, record]: any) => {
        if (cancelled) return;

        setProjects(toList<ProjectOption>(projectsRes));
        setStaffUserTypes(toList<StaffUserTypeOption>(staffUserTypesRes));

        if (record) {
          setProjectId(normalizeIdValue(record.project_id));
          setStaffUserTypeId(normalizeIdValue(record.staffusertype_id));
          setReportsToId(normalizeIdValue(record.reports_to_staffusertype_id));
          setLevel(String(record.level ?? "1"));
          setIsActive(Boolean(record.is_active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
        }
      })
      .finally(() => {
        if (!cancelled) setPageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const reportsToOptions = staffUserTypes.filter(
    (type) => type.unique_id !== staffUserTypeId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !staffUserTypeId) {
      Swal.fire(t("common.error"), t("common.all_fields_required"), "error");
      return;
    }

    const payload = {
      project_id: projectId,
      staffusertype_id: staffUserTypeId,
      reports_to_staffusertype_id: reportsToId || null,
      level: Number(level) || 1,
      is_active: isActive,
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await projectStaffHierarchyApi.update(id as string, payload);
      } else {
        await projectStaffHierarchyApi.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success",
      );
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const data = error?.response?.data;
      const message =
        data?.non_field_errors?.[0] ??
        data?.staffusertype_id?.[0] ??
        data?.reports_to_staffusertype_id?.[0] ??
        data?.project_id?.[0] ??
        (typeof data === "string" ? data : t("common.invalid_data"));
      Swal.fire(t("common.error"), message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pageReady) return null;

  return (
    <div className="p-8">
      <div className="mx-auto bg-white rounded-xl shadow-md border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {isEdit
              ? t("common.edit_item", { item: t("admin.nav.project_staff_hierarchy") })
              : t("common.add_item", { item: t("admin.nav.project_staff_hierarchy") })}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PROJECT */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.nav.project")} <span className="text-red-500">*</span>
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("common.select_item_placeholder", {
                      item: t("admin.nav.project"),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.unique_id} value={project.unique_id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* STAFF USER TYPE (FROM) */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.nav.staff_user_type")} <span className="text-red-500">*</span>
              </label>
              <Select
                value={staffUserTypeId}
                onValueChange={(val) => {
                  setStaffUserTypeId(val);
                  if (val === reportsToId) setReportsToId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("common.select_item_placeholder", {
                      item: t("admin.nav.staff_user_type"),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {staffUserTypes.map((type) => (
                    <SelectItem key={type.unique_id} value={type.unique_id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* REPORTS TO */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.project_staff_hierarchy.reports_to")}
              </label>
              <Select
                value={reportsToId || "__none__"}
                onValueChange={(val) => setReportsToId(val === "__none__" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("common.select_item_placeholder", {
                      item: t("admin.project_staff_hierarchy.reports_to"),
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("admin.project_staff_hierarchy.top_of_chain")}
                  </SelectItem>
                  {reportsToOptions.map((type) => (
                    <SelectItem key={type.unique_id} value={type.unique_id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LEVEL */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("admin.project_staff_hierarchy.level")} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              />
            </div>
          </div>

          {/* STATUS */}
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium mb-1">
              {t("common.status")} <span className="text-red-500">*</span>
            </label>
            <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEdit
                  ? t("common.updating")
                  : t("common.saving")
                : isEdit
                ? t("common.update")
                : t("common.save")}
            </Button>

            <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
