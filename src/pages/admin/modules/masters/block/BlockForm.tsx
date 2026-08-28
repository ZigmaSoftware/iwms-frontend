import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { blockApi, wardApi } from "@/helpers/admin";
import type { SelectOption } from "@/types";
import { AutoDetectLocationButton } from "@/components/common/AutoDetectLocationButton";
import { blockSchema } from "@/schemas/masters/block.schema";
import { requireWhenVisible } from "@/schemas/shared/visibility";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

const BLOCK_FIELDS: Record<string, string[]> = {
  ward_id: ["ward_id", "ward"],
  block_name: ["block_name", "name"],
  description: ["description"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  is_active: ["is_active"],
};

const normalizeNullable = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return normalizeNullable(v.unique_id ?? v.id ?? v.value);
  const raw = String(v).trim();
  if (!raw) return null;
  const inParentheses = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  return inParentheses?.[1] ?? raw;
};

const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> =>
    !!item && typeof item === "object" && !Array.isArray(item));
  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) return maybeResults.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)
    );
  }
  return [];
};

const normalizeLabel = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

const resolveId = (items: SelectOption[], id: string | null, name?: string | null): string | null => {
  if (id && items.some((x) => x.value === id)) return id;
  if (!name) return id;
  return items.find((x) => normalizeLabel(x.label) === normalizeLabel(name))?.value ?? id;
};

export default function BlockForm() {
  const { showField, filterPayload } = useFieldVisibility("masters", "blocks", BLOCK_FIELDS);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const {
    companyUniqueId, projectId, projects, companies, isSuperAdmin, loggedInCompanyUniqueId,
    setProjectId, onCompanyChange, applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const [blockName, setBlockName] = useState("");
  const [wardId, setWardId] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [pendingWard, setPendingWard] = useState("");

  const [allWards, setAllWards] = useState<SelectOption[]>([]);

  const { encMasters, encBlocks } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encMasters, encBlocks);

  useEffect(() => {
    let cancelled = false;
    const config = companyUniqueId && projectId
      ? { params: { company_id: companyUniqueId, project_id: projectId } }
      : undefined;
    wardApi.readAll(config).then((res: any) => {
      if (cancelled) return;
      setAllWards(toRecordList(res).map((x: any) => ({
        value: normalizeNullable(x.unique_id) ?? "",
        label: String(x.ward_name ?? ""),
      })).filter((x) => x.value && x.label));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId]);

  useEffect(() => {
    if (pendingWard && allWards.length > 0 && allWards.some((w) => w.value === pendingWard)) {
      setWardId(pendingWard);
      setPendingWard("");
    }
  }, [pendingWard, allWards]);

  const [recordData, setRecordData] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    blockApi.read(id).then((res: any) => {
      if (cancelled) return;
      setRecordData(res);
      setLoadingRecord(false);
    }).catch((err: any) => {
      if (cancelled) return;
      setLoadingRecord(false);
      Swal.fire({ icon: "error", title: "Error", text: String(err?.response?.data ?? err?.message ?? "Failed to load record") });
    });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit || !recordData) return;
    const data = recordData as any;
    setBlockName(data.block_name ?? "");
    setDescription(data.description ?? "");
    setLatitude(data.latitude ?? "");
    setLongitude(data.longitude ?? "");
    setIsActive(Boolean(data.is_active));
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);

    const rawWardId = normalizeNullable(data.ward_id ?? data.ward);
    const resolvedWard = resolveId(allWards, rawWardId, data.ward_name ?? null);

    if (resolvedWard) { setWardId(resolvedWard); setPendingWard(resolvedWard); }
  }, [isEdit, recordData, applyCompanyProjectFromRecord, allWards]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldValues = {
      ward_id: wardId,
      block_name: blockName,
      description,
      latitude,
      longitude,
      is_active: isActive,
    };
    const schema = requireWhenVisible(blockSchema, showField);
    const validation = parseWithSchema(schema, fieldValues);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});

    if (!companyUniqueId) { Swal.fire("Error", "Company is required", "error"); return; }
    if (!projectId) { Swal.fire("Error", "Project is required", "error"); return; }

    const rawPayload = {
      block_name: blockName,
      company_id: companyUniqueId,
      project_id: projectId,
      ward_id: wardId,
      description: description || null,
      latitude: latitude || null,
      longitude: longitude || null,
      is_active: isActive,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await blockApi.update(id, payload);
        Swal.fire("Success", "Updated successfully", "success");
      } else {
        await blockApi.create(payload);
        Swal.fire("Success", "Created successfully", "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch {
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Block" : "Add Block"}>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">

        <div>
          <Label>Company *</Label>
          <Select
            value={companyUniqueId}
            onValueChange={(value) => { onCompanyChange(value); setWardId(""); }}
            disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loggedInCompanyUniqueId ? "Company from logged-in profile" : isSuperAdmin ? "Select Company" : "Only super admin can select company"} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Project *</Label>
          <Select value={projectId} onValueChange={setProjectId} disabled={!companyUniqueId || projects.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {showField("ward_id") && (
          <div>
            <Label>Ward *</Label>
            <Select value={wardId} onValueChange={(value) => { setWardId(value); setFieldErrors((prev) => ({ ...prev, ward_id: "" })); }}>
              <SelectTrigger><SelectValue placeholder="Select Ward" /></SelectTrigger>
              <SelectContent>
                {allWards.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.ward_id} />
          </div>
        )}

        {showField("block_name") && (
          <div>
            <Label>Block Name *</Label>
            <Input value={blockName} onChange={(e) => { setBlockName(e.target.value); setFieldErrors((prev) => ({ ...prev, block_name: "" })); }} required />
            <FieldError message={fieldErrors.block_name} />
          </div>
        )}

        {showField("description") && (
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}

        {showField("latitude") && (
          <div>
            <Label>Latitude</Label>
            <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
        )}

        {showField("longitude") && (
          <div>
            <Label>Longitude</Label>
            <div className="flex items-center gap-2">
              <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              <AutoDetectLocationButton
                onDetected={({ latitude: lat, longitude: lng }) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />
            </div>
          </div>
        )}

        {showField("is_active") && (
          <div>
            <Label>Status</Label>
            <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting || loadingRecord}>{isEdit ? "Update" : "Save"}</Button>
          <Button type="button" variant="destructive" onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}>
            Cancel
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
