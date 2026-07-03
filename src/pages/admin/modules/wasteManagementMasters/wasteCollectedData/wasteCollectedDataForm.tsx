import type { Customer } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { customerCreationApi, wasteCollectionApi, dailyTripAssignmentApi, dailyTripHouseholdCollectionApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";


type WasteTypeOption = { unique_id: string; waste_type_name: string };

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

// Map a waste type name to the fixed model field key
const wasteTypeToField = (name: string): "wet_waste" | "dry_waste" | "mixed_waste" | null => {
  const n = name.toLowerCase();
  if (n.includes("wet")) return "wet_waste";
  if (n.includes("dry")) return "dry_waste";
  if (n.includes("mix")) return "mixed_waste";
  return null;
};

export default function WasteCollectedForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const isEdit = Boolean(id);

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, loggedInCompanyUniqueId,
    setProjectId, onCompanyChange, applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encScheduleMasters, encWasteCollectedData } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encScheduleMasters, encWasteCollectedData);

  /* ── form fields ── */
  const [customerId, setCustomerId] = useState("");
  const [tripAssignmentId, setTripAssignmentId] = useState("");
  // Per-waste-type amounts keyed by field name — stored as strings so the input can be cleared mid-edit
  const [wasteAmounts, setWasteAmounts] = useState<Record<string, string>>({
    wet_waste: "", dry_waste: "", mixed_waste: "",
  });

  /* ── dropdown / derived data ── */
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [tripAssignments, setTripAssignments] = useState<{ value: string; label: string; raw: any }[]>([]);
  // Waste types from the selected trip assignment
  const [assignmentWasteTypes, setAssignmentWasteTypes] = useState<WasteTypeOption[]>([]);
  const [fetchingCustomers, setFetchingCustomers] = useState(false);
  const [loadingAssignmentData, setLoadingAssignmentData] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending values for async hydration in edit mode
  const [pendingProjectCandidates, setPendingProjectCandidates] = useState<{
    projectUniqueId: string; projectId: string; projectName: string;
  } | null>(null);
  const [pendingCustomerCandidates, setPendingCustomerCandidates] = useState<{
    customerUniqueId: string; customerId: string; customerName: string;
  } | null>(null);
  const [pendingTripAssignmentId, setPendingTripAssignmentId] = useState("");

  const userChangedTripRef = useRef(false);

  const resolveCustomerId = (c: Customer) => String(c.unique_id ?? c.id);

  /* ── load trip assignments ── */
  useEffect(() => {
    if (!companyUniqueId) { setTripAssignments([]); return; }
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    dailyTripAssignmentApi.readAll({ params })
      .then((res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.results ?? [];
        setTripAssignments(list.map((a) => ({
          value: String(a.unique_id),
          label: String(a.unique_id),
          raw: a,
        })));
      })
      .catch(() => {});
  }, [companyUniqueId, projectId]);

  /* ── load all customers ── */
  useEffect(() => {
    if (!companyUniqueId) { setAllCustomers([]); setFilteredCustomers([]); return; }
    let cancelled = false;
    setFetchingCustomers(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    customerCreationApi.readAll({ params })
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : res?.results ?? [];
        setAllCustomers(list);
        setFilteredCustomers(list); // default: all customers visible
      })
      .catch(() => { if (!cancelled) Swal.fire(t("common.error"), t("common.load_failed"), "error"); })
      .finally(() => { if (!cancelled) setFetchingCustomers(false); });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId, t]);

  /* ── when trip assignment changes: filter customers + derive waste types ── */
  useEffect(() => {
    if (!tripAssignmentId || tripAssignmentId === "__none__") {
      // No assignment — show all customers, show all three waste fields
      setFilteredCustomers(allCustomers);
      setAssignmentWasteTypes([]);
      if (userChangedTripRef.current) {
        setCustomerId("");
        setWasteAmounts({ wet_waste: "", dry_waste: "", mixed_waste: "" });
      }
      return;
    }

    const raw = tripAssignments.find((a) => a.value === tripAssignmentId)?.raw;

    // Derive waste types from trip assignment's waste_types array
    const wts: WasteTypeOption[] = Array.isArray(raw?.waste_types)
      ? raw.waste_types.filter((w: any) => w?.unique_id && w?.waste_type_name)
      : [];
    setAssignmentWasteTypes(wts);

    if (userChangedTripRef.current) {
      setWasteAmounts({ wet_waste: "", dry_waste: "", mixed_waste: "" });
    }

    // Filter customers to those who are household stops in this assignment
    setLoadingAssignmentData(true);
    (dailyTripHouseholdCollectionApi.readAll({ params: { trip_assignment_id: tripAssignmentId } }) as Promise<any[]>)
      .then((stops: any) => {
        const stopList: any[] = Array.isArray(stops) ? stops : (stops as any)?.results ?? [];
        if (stopList.length === 0) {
          // No household stops — show all customers
          setFilteredCustomers(allCustomers);
        } else {
          const allowedIds = new Set(
            stopList.map((s: any) =>
              String(s.customer?.unique_id ?? s.customer_id ?? "")
            ).filter(Boolean)
          );
          const filtered = allCustomers.filter((c) => allowedIds.has(resolveCustomerId(c)));
          setFilteredCustomers(filtered.length > 0 ? filtered : allCustomers);

          // Auto-select first customer if user changed trip
          if (userChangedTripRef.current && filtered.length > 0) {
            setCustomerId(resolveCustomerId(filtered[0]));
          }
        }
      })
      .catch(() => { setFilteredCustomers(allCustomers); })
      .finally(() => {
        setLoadingAssignmentData(false);
        userChangedTripRef.current = false;
      });
  }, [tripAssignmentId, tripAssignments, allCustomers]);

  /* ── edit mode: load record ── */
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    wasteCollectionApi.read(id)
      .then((res: any) => {
        if (cancelled) return;
        setWasteAmounts({
          wet_waste: res.wet_waste != null ? String(res.wet_waste) : "",
          dry_waste: res.dry_waste != null ? String(res.dry_waste) : "",
          mixed_waste: res.mixed_waste != null ? String(res.mixed_waste) : "",
        });
        applyCompanyProjectFromRecord(res as unknown as Record<string, unknown>);
        setPendingProjectCandidates({
          projectUniqueId: String(res.project_unique_id ?? res.project?.unique_id ?? ""),
          projectId: String(res.project_id ?? ""),
          projectName: String(res.project_name ?? res.project?.name ?? ""),
        });
        setPendingCustomerCandidates({
          customerUniqueId: String(res.customer_unique_id ?? res.customer?.unique_id ?? ""),
          customerId: String(res.customer ?? res.customer_id ?? ""),
          customerName: String(res.customer_name ?? res.customer?.customer_name ?? ""),
        });
        const tripId = String(res.trip_assignment_id ?? res.trip_assignment?.unique_id ?? "");
        if (tripId && tripId !== "null") setPendingTripAssignmentId(tripId);
        setLoadingRecord(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadingRecord(false);
        Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? t("common.load_failed") });
      });
    return () => { cancelled = true; };
  }, [id, isEdit, applyCompanyProjectFromRecord, t]);

  /* ── flush pending project ── */
  useEffect(() => {
    if (!pendingProjectCandidates || projects.length === 0) return;
    const { projectUniqueId, projectId: rawId, projectName } = pendingProjectCandidates;
    let match = projects.find((p) => projectUniqueId && p.value === projectUniqueId);
    if (!match) match = projects.find((p) => rawId && p.value === rawId);
    if (!match && projectName)
      match = projects.find((p) => p.label.toLowerCase() === projectName.toLowerCase());
    if (match) setProjectId(match.value);
    setPendingProjectCandidates(null);
  }, [projects, pendingProjectCandidates, setProjectId]);

  /* ── flush pending trip assignment ── */
  useEffect(() => {
    if (!pendingTripAssignmentId || tripAssignments.length === 0) return;
    if (tripAssignments.some((a) => a.value === pendingTripAssignmentId)) {
      setTripAssignmentId(pendingTripAssignmentId);
      setPendingTripAssignmentId("");
    }
  }, [pendingTripAssignmentId, tripAssignments]);

  /* ── flush pending customer ── */
  useEffect(() => {
    if (!pendingCustomerCandidates || filteredCustomers.length === 0) return;
    const { customerUniqueId, customerId: rawId, customerName } = pendingCustomerCandidates;
    let match = filteredCustomers.find((c) => customerUniqueId && resolveCustomerId(c) === customerUniqueId);
    if (!match) match = filteredCustomers.find((c) => rawId && resolveCustomerId(c) === rawId);
    if (!match && customerName)
      match = filteredCustomers.find((c) => c.customer_name.toLowerCase() === customerName.toLowerCase());
    if (match) setCustomerId(resolveCustomerId(match));
    setPendingCustomerCandidates(null);
  }, [filteredCustomers, pendingCustomerCandidates]);

  const selectedCustomer = filteredCustomers.find((c) => resolveCustomerId(c) === customerId)
    ?? allCustomers.find((c) => resolveCustomerId(c) === customerId);

  // Which waste type inputs to show: assignment's types if selected, otherwise all three
  const visibleWasteTypes: WasteTypeOption[] = assignmentWasteTypes.length > 0
    ? assignmentWasteTypes
    : [
        { unique_id: "wet", waste_type_name: "Wet Waste" },
        { unique_id: "dry", waste_type_name: "Dry Waste" },
        { unique_id: "mix", waste_type_name: "Mixed Waste" },
      ];

  const totalQuantity = (parseFloat(wasteAmounts.wet_waste) || 0) + (parseFloat(wasteAmounts.dry_waste) || 0) + (parseFloat(wasteAmounts.mixed_waste) || 0);

  // Location display: show zone or panchayat (not both)
  const hasZone = Boolean(selectedCustomer?.zone_name);
  const hasPanchayat = Boolean(selectedCustomer?.panchayat_name);

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyUniqueId || !projectId) {
      Swal.fire(t("common.warning"), "Company and project are required", "warning");
      return;
    }
    if (!customerId) {
      Swal.fire(t("common.warning"), t("admin.waste_collected_data.customer_required"), "warning");
      return;
    }

    const payload: Record<string, unknown> = {
      company_id_input: companyUniqueId,
      project_id_input: projectId,
      customer: customerId,
      wet_waste: parseFloat(wasteAmounts.wet_waste) || 0,
      dry_waste: parseFloat(wasteAmounts.dry_waste) || 0,
      mixed_waste: parseFloat(wasteAmounts.mixed_waste) || 0,
      total_quantity: totalQuantity,
      trip_assignment_id: tripAssignmentId || null,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await wasteCollectionApi.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await wasteCollectionApi.create(payload);
        Swal.fire(t("common.success"), t("admin.waste_collected_data.save_success"), "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.save_failed"), extractError(err) ?? t("common.save_failed_desc"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={isEdit ? t("admin.waste_collected_data.title_edit") : t("admin.waste_collected_data.title_add")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Company */}
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select
                value={companyUniqueId}
                onChange={(e) => { onCompanyChange(e.target.value); setCustomerId(""); setTripAssignmentId(""); }}
                disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loggedInCompanyUniqueId
                    ? t("common.company_from_profile")
                    : t("common.select_item_placeholder", { item: t("admin.nav.company") })}
                </option>
                {companies.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <Label>{t("admin.nav.project")}</Label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setCustomerId(""); setTripAssignmentId(""); }}
                disabled={!companyUniqueId || projects.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {companyUniqueId
                    ? t("common.select_item_placeholder", { item: t("admin.nav.project") })
                    : "Select a company first"}
                </option>
                {projects.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Trip Assignment */}
            <div>
              <Label>Trip Assignment</Label>
              <Select
                value={tripAssignmentId}
                onChange={(v) => {
                  userChangedTripRef.current = true;
                  setTripAssignmentId(v === "__none__" ? "" : v);
                }}
                options={[{ value: "__none__", label: "None (no assignment)" }, ...tripAssignments]}
                placeholder="Select Trip Assignment (optional)"
                disabled={!projectId}
              />
            </div>

            {/* Customer — filtered to assignment's household stops */}
            <div>
              <Label>
                {t("admin.waste_collected_data.customer")}
                <span className="text-red-500"> *</span>
              </Label>
              <Select
                value={customerId}
                onChange={setCustomerId}
                options={filteredCustomers.map((c) => ({
                  value: resolveCustomerId(c),
                  label: c.customer_name,
                }))}
                placeholder={
                  fetchingCustomers || loadingAssignmentData
                    ? "Loading..."
                    : filteredCustomers.length === 0 && tripAssignmentId
                      ? "No customers in this trip"
                      : "Select customer"
                }
                disabled={fetchingCustomers || loadingAssignmentData || !projectId}
              />
            </div>

            {/* Address */}
            <div>
              <Label>{t("admin.waste_collected_data.customer_address")}</Label>
              <Input
                disabled
                className="bg-gray-100"
                value={
                  selectedCustomer
                    ? [selectedCustomer.building_no, selectedCustomer.street, selectedCustomer.area]
                        .filter(Boolean).join(", ")
                    : ""
                }
              />
            </div>

            {/* Zone — only if customer has zone, not panchayat */}
            {hasZone && !hasPanchayat && (
              <div>
                <Label>{t("admin.waste_collected_data.customer_zone")}</Label>
                <Input disabled className="bg-gray-100" value={selectedCustomer?.zone_name || ""} />
              </div>
            )}

            {/* Panchayat (PLB) — only if customer has panchayat */}
            {hasPanchayat && (
              <div>
                <Label>{t("admin.waste_collected_data.customer_panchayat")}</Label>
                <Input disabled className="bg-gray-100" value={selectedCustomer?.panchayat_name || ""} />
              </div>
            )}

            {/* Ward */}
            {selectedCustomer?.ward_name && (
              <div>
                <Label>{t("admin.waste_collected_data.customer_ward")}</Label>
                <Input disabled className="bg-gray-100" value={selectedCustomer.ward_name} />
              </div>
            )}

            {/* City */}
            <div>
              <Label>{t("admin.waste_collected_data.customer_city")}</Label>
              <Input disabled className="bg-gray-100" value={selectedCustomer?.city_name || ""} />
            </div>

            {/* District */}
            <div>
              <Label>{t("admin.waste_collected_data.customer_district")}</Label>
              <Input disabled className="bg-gray-100" value={selectedCustomer?.district_name || ""} />
            </div>

            {/* State */}
            <div>
              <Label>{t("admin.waste_collected_data.customer_state")}</Label>
              <Input disabled className="bg-gray-100" value={selectedCustomer?.state_name || ""} />
            </div>

          </div>

          {/* Waste Type inputs — dynamic based on trip assignment */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Waste Collection
              {assignmentWasteTypes.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  (types from trip assignment)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleWasteTypes.map((wt) => {
                const field = wasteTypeToField(wt.waste_type_name);
                if (!field) return null;
                return (
                  <div key={wt.unique_id}>
                    <Label>{wt.waste_type_name} (kg)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={wasteAmounts[field] ?? ""}
                      onChange={(e) =>
                        setWasteAmounts((prev) => ({
                          ...prev,
                          [field]: e.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}

              {/* Total */}
              <div>
                <Label>{t("admin.waste_collected_data.total_quantity")} (kg)</Label>
                <Input disabled className="bg-gray-100" value={totalQuantity.toFixed(2)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting || loadingRecord}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
              className="rounded-lg bg-red-400 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
