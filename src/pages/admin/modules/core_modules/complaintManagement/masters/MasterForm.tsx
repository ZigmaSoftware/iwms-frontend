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
  complaintTeamApi,
} from "@/features/complaintTicketing/api";
import { departmentApi, staffCreationApi } from "@/helpers/admin";
import { asArray, errorText, idOf } from "../utils";
import { buildComplaintMasterSchema } from "@/schemas/core_modules/complaintManagement/complaintMaster.schema";
import { toSwalMessage } from "@/lib/zodErrors";
import { capitalize } from "@/utils/capitalize";
import { MASTER_CONFIG, type MasterKind } from "./masterConfig";
import { FormSelect } from "@/components/common/FormSelect";
import { CompanyProjectFields } from "@/components/common/CompanyProjectFields";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

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
  default_team: "",
  requires_location: true,
  requires_media: false,
  requires_address_change_detail: false,
  is_sensitive: false,
  is_final: false,
  allow_reopen: false,
  is_field_team: false,
  escalation_level: "1",
  department: "",
  lead_staff: "",
  escalates_to: "",
  assign_within_minutes: "",
  resolve_within_minutes: "",
  working_hours_only: false,
  escalation_after_minutes: "",
  is_active: true,
};

export default function MasterForm({ kind, moduleSegment }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  // Which kinds carry company/project (migrations 0002 and 0003). Priority,
  // status, source, language and module stay global — they are code-keyed
  // vocabularies the routing and SLA resolvers look up by code.
  const isScoped =
    kind === "team" || kind === "category" || kind === "subcategory" || kind === "slaRule";
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
  const [teams, setTeams] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffOptions, setStaffOptions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const api = useMemo(() => config.api(), [config]);

  useEffect(() => {
    MASTER_CONFIG.module.api().readAll().then((res) => setModules(asArray(res))).catch(() => {});
    complaintCategoryApi.readAll().then((res) => setCategories(asArray(res))).catch(() => {});
    complaintPriorityApi.readAll().then((res) => setPriorities(asArray(res))).catch(() => {});
    complaintSubcategoryApi.readAll().then((res) => setSubcategories(asArray(res))).catch(() => {});
    complaintSourceApi.readAll().then((res) => setSources(asArray(res))).catch(() => {});
    complaintTeamApi.readAll().then((res) => setTeams(asArray(res))).catch(() => {});
    // Department/Lead Staff pickers only matter for the Team form, but they're
    // cheap enough to preload alongside everything else above.
    departmentApi.readAll().then((res) => setDepartments(asArray(res))).catch(() => {});
    staffCreationApi.readAll({ params: { active_status: 1 } }).then((res) => setStaffOptions(asArray(res))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api.read(id).then((record: any) => {
      // Show the tenancy the row actually has, not the logged-in default —
      // otherwise editing a row would silently move it to another project.
      if (isScoped) applyCompanyProjectFromRecord(record);
      setForm({
        code: record.module_code ?? record.category_code ?? record.subcategory_code ?? record.priority_code ?? record.status_code ?? record.source_code ?? record.team_code ?? "",
        name: record.module_name ?? record.category_name ?? record.subcategory_name ?? record.priority_name ?? record.status_name ?? record.source_name ?? record.team_name ?? "",
        description: record.description ?? "",
        category: idOf(record.category),
        module: idOf(record.module),
        priority: idOf(record.priority),
        subcategory: idOf(record.subcategory),
        source: idOf(record.source),
        default_priority: idOf(record.default_priority),
        default_team: idOf(record.default_team),
        requires_location: record.requires_location ?? true,
        requires_media: Boolean(record.requires_media),
        requires_address_change_detail: Boolean(record.requires_address_change_detail),
        is_sensitive: Boolean(record.is_sensitive),
        is_final: Boolean(record.is_final),
        allow_reopen: Boolean(record.allow_reopen),
        is_field_team: Boolean(record.is_field_team),
        escalation_level: String(record.escalation_level ?? 1),
        department: idOf(record.department),
        lead_staff: idOf(record.lead_staff),
        escalates_to: idOf(record.escalates_to),
        assign_within_minutes: String(record.assign_within_minutes ?? ""),
        resolve_within_minutes: String(record.resolve_within_minutes ?? ""),
        working_hours_only: Boolean(record.working_hours_only),
        escalation_after_minutes: String(record.escalation_after_minutes ?? ""),
        is_active: record.is_active !== false,
      });
    }).catch((err) => Swal.fire("Error", errorText(err, "Unable to load record"), "error"));
  }, [api, id, isScoped, applyCompanyProjectFromRecord]);

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
            default_team: form.default_team || null,
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
                : kind === "team"
                ? {
                    ...common,
                    team_code: form.code.trim().toUpperCase(),
                    team_name: form.name.trim(),
                    department: form.department || null,
                    lead_staff: form.lead_staff || null,
                    escalates_to: form.escalates_to || null,
                    escalation_level: Number(form.escalation_level || 1),
                    is_field_team: form.is_field_team,
                  }
                : {
                    ...common,
                    category: form.category,
                    subcategory: form.subcategory || null,
                    priority: form.priority,
                    source: form.source || null,
                    assign_within_minutes: form.assign_within_minutes ? Number(form.assign_within_minutes) : null,
                    resolve_within_minutes: form.resolve_within_minutes ? Number(form.resolve_within_minutes) : null,
                    working_hours_only: form.working_hours_only,
                    escalation_after_minutes: form.escalation_after_minutes ? Number(form.escalation_after_minutes) : null,
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
            <Label>Default Team</Label>
            <FormSelect
              value={form.default_team}
              onChange={(v) => setValue("default_team", v)}
              options={teams.map((item) => ({ value: String(item.unique_id), label: capitalize(item.team_name) }))}
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
            <div>
              <Label>Assign Within Minutes</Label>
              <Input type="number" value={form.assign_within_minutes} onChange={(e) => setValue("assign_within_minutes", e.target.value)} />
            </div>
            <div>
              <Label>Resolve Within Minutes</Label>
              <Input type="number" value={form.resolve_within_minutes} onChange={(e) => setValue("resolve_within_minutes", e.target.value)} />
            </div>
            <div>
              <Label>Escalation After Minutes</Label>
              <Input type="number" value={form.escalation_after_minutes} onChange={(e) => setValue("escalation_after_minutes", e.target.value)} />
            </div>
          </>
        )}
        {kind === "team" && (
          <>
            <div>
              <Label>Department</Label>
              <FormSelect
                value={form.department}
                onChange={(v) => setValue("department", v)}
                options={departments.map((item) => ({ value: String(item.unique_id), label: capitalize(item.department_name) }))}
                placeholder={"None"}
              />
            </div>
            <div>
              <Label>Lead Staff</Label>
              <FormSelect
                value={form.lead_staff}
                onChange={(v) => setValue("lead_staff", v)}
                options={staffOptions}
                placeholder={"None"}
              />
            </div>
            <div>
              <Label>Escalates To</Label>
              <FormSelect
                value={form.escalates_to}
                onChange={(v) => setValue("escalates_to", v)}
                options={teams
                  .filter((team) => team.unique_id !== id)
                  .map((item) => ({ value: String(item.unique_id), label: capitalize(item.team_name) }))}
                placeholder="None"
              />
            </div>
            <div>
              <Label>Escalation Level</Label>
              <Input type="number" value={form.escalation_level} onChange={(e) => setValue("escalation_level", e.target.value)} />
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
          {kind === "team" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_field_team} onCheckedChange={(checked) => setValue("is_field_team", checked === true)} /> Field team
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
