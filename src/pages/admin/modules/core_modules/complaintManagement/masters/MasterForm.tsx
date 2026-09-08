/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "@/lib/notify";
import ComponentCard from "@/components/common/ComponentCard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import {
  complaintCategoryApi,
  complaintPriorityApi,
  complaintSourceApi,
  complaintSubcategoryApi,
} from "@/features/complaintTicketing/api";
import { departmentApi, projectStaffHierarchyApi } from "@/helpers/admin";
import { asArray, errorText, idOf } from "../utils";
import { buildComplaintMasterSchema } from "@/schemas/core_modules/complaintManagement/complaintMaster.schema";
import { toSwalMessage } from "@/lib/zodErrors";
import { capitalize } from "@/utils/capitalize";
import { MASTER_CONFIG, type MasterKind } from "./masterConfig";
import { FormSelect } from "@/components/common/FormSelect";
import { CompanyProjectFields } from "@/components/common/CompanyProjectFields";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import type { ComplaintSlaEscalationLevel } from "@/features/complaintTicketing/types";
import type { ProjectStaffHierarchyRow } from "@/pages/admin/modules/superadmin/roleManagement/projectStaffHierarchy/types";

type Props = {
  kind: MasterKind;
  /**
   * Module segment the Cancel/after-save redirect returns to. Defaults to
   * `complaint-ticket`; the SUPER ADMIN Complaint Types screen passes
   * `complaint-masters` so saving returns to that screen's tab rather than
   * the Desk's view-only list.
   */
  moduleSegment?: string;
};

const emptyForm = {
  code: "",
  name: "",
  description: "",
  category: "",
  module: "",
  priority: "",
  subcategory: "",
  source: "",
  default_priority: "",
  default_department: "",
  requires_location: true,
  requires_media: false,
  requires_address_change_detail: false,
  is_sensitive: false,
  is_final: false,
  allow_reopen: false,
  working_hours_only: false,
  is_active: true,
};

export default function MasterForm({ kind, moduleSegment }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  // Which kinds carry company/project (migrations 0002 and 0003). Priority,
  // status, source, language and module stay global — they are code-keyed
  // vocabularies the routing and SLA resolvers look up by code.
  const isScoped =
    kind === "category" || kind === "subcategory" || kind === "slaRule";
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit: Boolean(id) });
  const routes = getEncryptedRoute();
  const config = MASTER_CONFIG[kind];
  const routeBase = moduleSegment ?? routes.encComplaintTicket;
  const { listPath } = createCrudRoutePaths(routeBase, routes[config.routeKey]);
  const [searchParams] = useSearchParams();
  // A subcategory created via the merged Categories & Subcategories screen's
  // "Add Subcategory" button (which links here with `?category=<id>`) should
  // return there with that category still selected, not to the standalone
  // Subcategories list.
  const prefillCategoryId = kind === "subcategory" ? searchParams.get("category") : null;
  const returnPath = prefillCategoryId
    ? `${createCrudRoutePaths(routeBase, routes.encComplaintCategories).listPath}?selected=${prefillCategoryId}`
    : listPath;
  // The merged Categories & Subcategories screen links "Add Subcategory" here
  // with `?category=<id>` so the driver doesn't have to re-pick the category
  // they were already looking at. Only applies to a fresh subcategory (an
  // edit load below overwrites `category` with the record's own value).
  const [form, setForm] = useState(() =>
    kind === "subcategory" && searchParams.get("category")
      ? { ...emptyForm, category: searchParams.get("category") ?? "" }
      : emptyForm,
  );
  const [categories, setCategories] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  // Per-hierarchy-level resolve windows for the SLA rule. Auto-populated
  // from the selected project's ProjectStaffHierarchy — level/role are
  // read-only. `enabled` controls whether this level participates in
  // escalation for this rule at all: a ticket starts at the lowest enabled
  // level and only hops through other enabled levels above it, so e.g.
  // unchecking Driver/Operator makes a ticket start straight at Supervisor.
  // resolve_within_minutes is kept as a string so an in-progress "" doesn't
  // get coerced to 0 while typing.
  const [escalationLevels, setEscalationLevels] = useState<
    { level: number; staffusertype_name: string; enabled: boolean; resolve_within_minutes: string }[]
  >([]);
  const [hierarchyRows, setHierarchyRows] = useState<ProjectStaffHierarchyRow[]>([]);
  // enabled/resolve-minutes values loaded from an existing record, keyed by
  // level — merged onto the hierarchy-derived rows once the hierarchy loads.
  const [savedEscalationLevels, setSavedEscalationLevels] = useState<
    Record<number, { enabled: boolean; resolve_within_minutes: string }>
  >({});

  const api = useMemo(() => config.api(), [config]);

  useEffect(() => {
    MASTER_CONFIG.module.api().readAll().then((res) => setModules(asArray(res))).catch(() => {});
    complaintCategoryApi.readAll().then((res) => setCategories(asArray(res))).catch(() => {});
    complaintPriorityApi.readAll().then((res) => setPriorities(asArray(res))).catch(() => {});
    complaintSubcategoryApi.readAll().then((res) => setSubcategories(asArray(res))).catch(() => {});
    complaintSourceApi.readAll().then((res) => setSources(asArray(res))).catch(() => {});
    // Default Department picker only matters for the Category form, but it's
    // cheap enough to preload alongside everything else above.
    departmentApi.readAll().then((res) => setDepartments(asArray(res))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.read(id).then((record: any) => {
      // Show the tenancy the row actually has, not the logged-in default —
      // otherwise editing a row would silently move it to another project.
      if (isScoped) applyCompanyProjectFromRecord(record);
      setForm({
        code: record.module_code ?? record.category_code ?? record.subcategory_code ?? record.priority_code ?? record.status_code ?? record.source_code ?? "",
        name: record.module_name ?? record.category_name ?? record.subcategory_name ?? record.priority_name ?? record.status_name ?? record.source_name ?? "",
        description: record.description ?? "",
        category: idOf(record.category),
        module: idOf(record.module),
        priority: idOf(record.priority),
        subcategory: idOf(record.subcategory),
        source: idOf(record.source),
        default_priority: idOf(record.default_priority),
        default_department: idOf(record.default_department),
        requires_location: record.requires_location ?? true,
        requires_media: Boolean(record.requires_media),
        requires_address_change_detail: Boolean(record.requires_address_change_detail),
        is_sensitive: Boolean(record.is_sensitive),
        is_final: Boolean(record.is_final),
        allow_reopen: Boolean(record.allow_reopen),
        working_hours_only: Boolean(record.working_hours_only),
        is_active: record.is_active !== false,
      });
      if (kind === "slaRule") {
        const saved = (record.escalation_levels ?? []) as ComplaintSlaEscalationLevel[];
        setSavedEscalationLevels(
          Object.fromEntries(
            saved.map((row) => [
              row.level,
              {
                enabled: row.is_enabled !== false,
                resolve_within_minutes: String(row.resolve_within_minutes ?? ""),
              },
            ]),
          ),
        );
      }
    }).catch((err) => Swal.fire("Error", errorText(err, "Unable to load record"), "error"));
  }, [api, id, isScoped, applyCompanyProjectFromRecord, kind]);

  // The SLA rule's escalation-level rows are driven entirely by the selected
  // project's staff hierarchy — one row per hierarchy level, role/level
  // read-only. Re-derive the rows whenever the project or the loaded
  // hierarchy changes, carrying over any resolve-minutes value already typed
  // or previously saved for that level.
  useEffect(() => {
    if (kind !== "slaRule" || !projectId) {
      setHierarchyRows([]);
      return;
    }
    let cancelled = false;
    projectStaffHierarchyApi
      .readAll({ params: { project: projectId } })
      .then((res: any) => {
        if (cancelled) return;
        setHierarchyRows(asArray<ProjectStaffHierarchyRow>(res));
      })
      .catch(() => {
        if (!cancelled) setHierarchyRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, projectId]);

  useEffect(() => {
    if (kind !== "slaRule") return;
    setEscalationLevels((prev) => {
      const prevByLevel = Object.fromEntries(prev.map((row) => [row.level, row]));
      return [...hierarchyRows]
        .sort((a, b) => a.level - b.level)
        .map((row) => {
          const carried = prevByLevel[row.level];
          const saved = savedEscalationLevels[row.level];
          return {
            level: row.level,
            staffusertype_name: row.staffusertype_name || "-",
            enabled: carried?.enabled ?? saved?.enabled ?? true,
            resolve_within_minutes:
              carried?.resolve_within_minutes ?? saved?.resolve_within_minutes ?? "",
          };
        });
    });
    // Only re-derive when the hierarchy itself changes (project switch or
    // initial load) — not on every keystroke/toggle, which already updates
    // `escalationLevels` directly via `setEscalationLevelField`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, hierarchyRows, savedEscalationLevels]);

  const setEscalationLevelMinutes = (index: number, value: string) =>
    setEscalationLevels((prev) =>
      prev.map((row, i) => (i === index ? { ...row, resolve_within_minutes: value } : row)),
    );
  const setEscalationLevelEnabled = (index: number, enabled: boolean) =>
    setEscalationLevels((prev) => prev.map((row, i) => (i === index ? { ...row, enabled } : row)));

  const setValue = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = buildComplaintMasterSchema(kind).safeParse(form);
    if (!result.success) {
      Swal.fire("Invalid fields", toSwalMessage(result.error), "warning");
      return;
    }

    const common = { is_active: form.is_active };
    const payload: Record<string, unknown> =
      kind === "module"
        ? {
            ...common,
            module_code: form.code.trim().toUpperCase(),
            module_name: form.name.trim(),
            description: form.description,
          }
        : kind === "category"
        ? {
            ...common,
            category_code: form.code.trim().toUpperCase(),
            category_name: form.name.trim(),
            module: form.module || null,
            description: form.description,
            default_priority: form.default_priority || null,
            default_department: form.default_department || null,
            requires_location: form.requires_location,
            requires_media: form.requires_media,
            requires_address_change_detail: form.requires_address_change_detail,
            is_sensitive: form.is_sensitive,
          }
        : kind === "subcategory"
          ? {
              ...common,
              category: form.category,
              subcategory_code: form.code.trim().toUpperCase(),
              subcategory_name: form.name.trim(),
              default_priority: form.default_priority || null,
            }
          : kind === "priority"
            ? { ...common, priority_code: form.code.trim().toUpperCase(), priority_name: form.name.trim(), description: form.description }
            : kind === "status"
              ? { ...common, status_code: form.code.trim().toUpperCase(), status_name: form.name.trim(), is_final: form.is_final, allow_reopen: form.allow_reopen }
              : kind === "source"
                ? { ...common, source_code: form.code.trim().toUpperCase(), source_name: form.name.trim() }
                : {
                    ...common,
                    category: form.category,
                    subcategory: form.subcategory || null,
                    priority: form.priority,
                    source: form.source || null,
                    working_hours_only: form.working_hours_only,
                    escalation_levels: escalationLevels
                      .filter((row) => row.resolve_within_minutes !== "")
                      .map((row) => ({
                        level: row.level,
                        is_enabled: row.enabled,
                        resolve_within_minutes: Number(row.resolve_within_minutes),
                      })),
                  };

    if (isScoped) {
      // A scoped master saved without a tenancy is created unscoped and then
      // disappears from every company-filtered list, so refuse rather than
      // write a row nobody can find.
      if (!companyUniqueId) {
        Swal.fire("Company required", "Select a company before saving.", "warning");
        return;
      }
      if (!projectId) {
        Swal.fire("Project required", "Select a project before saving.", "warning");
        return;
      }
      payload.company_id = companyUniqueId;
      payload.project_id = projectId;
    }

    setSaving(true);
    try {
      if (id) await api.update(id, payload);
      else await api.create(payload);
      Swal.fire("Saved", `${config.title} saved successfully.`, "success");
      navigate(returnPath);
    } catch (err) {
      Swal.fire("Error", errorText(err, "Save failed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComponentCard title={`${id ? "Edit" : "Add"} ${config.title}`}>
      <form onSubmit={save} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {isScoped && (
          <CompanyProjectFields
            companyUniqueId={companyUniqueId}
            projectId={projectId}
            companies={companies}
            projects={projects}
            isSuperAdmin={isSuperAdmin}
            loggedInCompanyUniqueId={loggedInCompanyUniqueId}
            onCompanyChange={onCompanyChange}
            setProjectId={setProjectId}
          />
        )}
        {kind === "slaRule" && (
          <>
            <div>
              <Label>Category</Label>
              <FormSelect
                value={form.category}
                onChange={(v) => setValue("category", v)}
                options={categories.map((item) => ({ value: String(item.unique_id), label: capitalize(item.category_name) }))}
                required
                placeholder={"Select category"}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <FormSelect
                value={form.priority}
                onChange={(v) => setValue("priority", v)}
                options={priorities.map((item) => ({ value: String(item.unique_id), label: capitalize(item.priority_name) }))}
                required
                placeholder={"Select priority"}
              />
            </div>
          </>
        )}
        {kind === "subcategory" && (
          <div>
            <Label>Category</Label>
            <FormSelect
              value={form.category}
              onChange={(v) => setValue("category", v)}
              options={categories.map((item) => ({ value: String(item.unique_id), label: capitalize(item.category_name) }))}
              required
              placeholder={"Select category"}
            />
          </div>
        )}
        {kind !== "slaRule" && <div>
          <Label>Code</Label>
          <Input value={form.code} onChange={(e) => setValue("code", e.target.value)} required />
        </div>}
        {kind !== "slaRule" && <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setValue("name", e.target.value)} required />
        </div>}
        {kind === "category" && (
          <div>
            <Label>Module</Label>
            <FormSelect
              value={form.module}
              onChange={(v) => setValue("module", v)}
              options={modules.map((item) => ({ value: String(item.unique_id), label: capitalize(item.module_name) }))}
              placeholder={"None"}
            />
          </div>
        )}
        {["category", "subcategory"].includes(kind) && (
          <div>
            <Label>Default Priority</Label>
            <FormSelect
              value={form.default_priority}
              onChange={(v) => setValue("default_priority", v)}
              options={priorities.map((item) => ({ value: String(item.unique_id), label: capitalize(item.priority_name) }))}
              placeholder={"None"}
            />
          </div>
        )}
        {kind === "category" && (
          <div>
            <Label>Default Department</Label>
            <FormSelect
              value={form.default_department}
              onChange={(v) => setValue("default_department", v)}
              options={departments.map((item) => ({ value: String(item.unique_id), label: capitalize(item.department_name) }))}
              placeholder={"None"}
            />
          </div>
        )}
        {kind === "slaRule" && (
          <>
            <div>
              <Label>Subcategory</Label>
              <FormSelect
                value={form.subcategory}
                onChange={(v) => setValue("subcategory", v)}
                options={subcategories
                  .filter((item) => !form.category || idOf(item.category) === form.category)
                  .map((item) => ({ value: String(item.unique_id), label: capitalize(item.subcategory_name) }))}
                placeholder="Any"
              />
            </div>
            <div>
              <Label>Source</Label>
              <FormSelect
                value={form.source}
                onChange={(v) => setValue("source", v)}
                options={sources.map((item) => ({ value: String(item.unique_id), label: capitalize(item.source_name) }))}
                placeholder={"Any"}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Escalation Levels</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                One row per level of the selected project&apos;s staff hierarchy — role and level
                come from Project Staff Hierarchy. Enable only the levels that should take part:
                a ticket starts at the lowest enabled level and, if not resolved in time, hops to
                the next enabled level above it — disabled levels (e.g. Driver, Operator) are
                skipped entirely.
              </p>
              {!projectId && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a project above to load its escalation levels.
                </p>
              )}
              {projectId && escalationLevels.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  This project has no staff hierarchy configured yet — set one up under Project
                  Staff Hierarchy first.
                </p>
              )}
              {escalationLevels.length > 0 && (
                <div className="mt-2 space-y-2">
                  {escalationLevels.map((row, index) => (
                    <div key={row.level} className="flex items-center gap-2">
                      <label className="flex w-10 items-center justify-center">
                        <Checkbox
                          checked={row.enabled}
                          onCheckedChange={(checked) => setEscalationLevelEnabled(index, checked === true)}
                        />
                      </label>
                      <div className="w-16 text-sm font-medium text-muted-foreground">
                        L{row.level}
                      </div>
                      <div className="w-48 text-sm">{row.staffusertype_name}</div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Resolve within minutes"
                          disabled={!row.enabled}
                          value={row.resolve_within_minutes}
                          onChange={(e) => setEscalationLevelMinutes(index, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {["module", "category", "priority"].includes(kind) && (
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setValue("description", e.target.value)} />
          </div>
        )}
        <div className="md:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_active} onCheckedChange={(checked) => setValue("is_active", checked === true)} /> Active
          </label>
          {kind === "category" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.requires_location} onCheckedChange={(checked) => setValue("requires_location", checked === true)} /> Requires location
            </label>
          )}
          {kind === "category" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.requires_media} onCheckedChange={(checked) => setValue("requires_media", checked === true)} /> Requires media
            </label>
          )}
          {kind === "status" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_final} onCheckedChange={(checked) => setValue("is_final", checked === true)} /> Final status
            </label>
          )}
          {kind === "status" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.allow_reopen} onCheckedChange={(checked) => setValue("allow_reopen", checked === true)} /> Allow reopen
            </label>
          )}
          {kind === "slaRule" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.working_hours_only} onCheckedChange={(checked) => setValue("working_hours_only", checked === true)} /> Working hours only
            </label>
          )}
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(returnPath)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
