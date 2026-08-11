/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Loader2, MapPinned, UserRound } from "lucide-react";
import Swal from "@/lib/notify";
import ComponentCard from "@/components/common/ComponentCard";
import AutoDetectLocationButton from "@/components/form/AutoDetectLocationButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { adminApi } from "@/helpers/admin/registry";
import {
  complaintCategoryApi,
  complaintPriorityApi,
  complaintSourceApi,
  complaintStatusApi,
  complaintSubcategoryApi,
  complaintTicketApi,
  geoApi,
} from "@/features/complaintTicketing/api";
import type { GeoOption, LocalBodyOption } from "@/features/complaintTicketing/types";
import { asArray, errorText } from "../utils";
import { ticketSchema } from "@/schemas/core_modules/complaintManagement/ticket.schema";
import { toSwalMessage } from "@/lib/zodErrors";
import { capitalize } from "@/utils/capitalize";
import { scopeFieldState } from "@/pages/admin/modules/masters/shared/dataScopeOptions";

const STEPS = [
  { label: "Citizen", icon: UserRound },
  { label: "Complaint", icon: ClipboardList },
  { label: "Location", icon: MapPinned },
  { label: "Review", icon: CheckCircle2 },
] as const;
const REVIEW_STEP = STEPS.length - 1;

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-md border !border-[#22a855] !bg-[#22a855] px-5 py-2 text-sm font-semibold !text-white shadow-sm transition hover:!bg-[#1a8a44] disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-md border !border-[#22a855] !bg-white px-4 py-2 text-sm font-semibold !text-[#22a855] transition hover:!bg-[#e8f8ee] dark:!bg-transparent dark:hover:!bg-[#22a855]/10";
const CANCEL_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md border !border-[#f7192b] !bg-[#f7192b] px-4 py-2 text-sm font-semibold !text-white transition hover:!bg-[#d91626]";

const reviewRow = (label: string, value?: string | null) => (
  <div className="flex justify-between gap-4 border-b border-gray-100 py-1.5 text-sm last:border-0 dark:border-gray-800">
    <span className="text-gray-500">{label}</span>
    <span className="text-right font-medium text-gray-800 dark:text-gray-200">{value?.trim() ? value : "—"}</span>
  </div>
);

const reviewCard = (title: string, icon: React.ReactNode, body: React.ReactNode) => (
  <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
      {icon}
      {title}
    </div>
    {body}
  </div>
);

export default function TicketWizardForm() {
  const navigate = useNavigate();
  const { encComplaintTicket, encComplaint } = getEncryptedRoute();
  const { listPath } = createCrudRoutePaths(encComplaintTicket, encComplaint);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [states, setStates] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [panchayats, setPanchayats] = useState<LocalBodyOption[]>([]);
  const [zones, setZones] = useState<LocalBodyOption[]>([]);
  const [wards, setWards] = useState<LocalBodyOption[]>([]);
  const [form, setForm] = useState({
    customer: "",
    wa_phone: "",
    profile_name: "",
    source: "",
    category: "",
    waste_types: [] as string[],
    subcategory: "",
    priority: "",
    status: "",
    title: "",
    description: "",
    incident_type: "other",
    trip_reference: "",
    driver_reference: "",
    operator_reference: "",
    vehicle_reference: "",
    other_reference: "",
    location_text: "",
    latitude: "",
    longitude: "",
    state: "",
    district: "",
    panchayat: "",
    zone: "",
    ward: "",
  });

  useEffect(() => {
    Promise.all([
      adminApi.customerCreations.readAll().catch(() => []),
      complaintCategoryApi.readAll().catch(() => []),
      complaintSubcategoryApi.readAll().catch(() => []),
      complaintPriorityApi.readAll().catch(() => []),
      complaintStatusApi.readAll().catch(() => []),
      complaintSourceApi.readAll().catch(() => []),
      adminApi.wasteTypes.readAll().catch(() => []),
    ]).then(([customerRows, categoryRows, subcategoryRows, priorityRows, statusRows, sourceRows, wasteTypeRows]) => {
      setCustomers(asArray(customerRows));
      setCategories(asArray(categoryRows));
      setSubcategories(asArray(subcategoryRows));
      setPriorities(asArray(priorityRows));
      setStatuses(asArray(statusRows));
      setSources(asArray(sourceRows));
      setWasteTypes(asArray(wasteTypeRows));
      setForm((prev) => ({
        ...prev,
        priority: asArray<any>(priorityRows)[0]?.unique_id ?? "",
        status: asArray<any>(statusRows).find((item) => item.status_code === "SUBMITTED")?.unique_id ?? asArray<any>(statusRows)[0]?.unique_id ?? "",
        source: asArray<any>(sourceRows).find((item) => item.source_code === "ADMIN")?.unique_id ?? asArray<any>(sourceRows)[0]?.unique_id ?? "",
      }));
    });
    geoApi.states().then(setStates).catch(() => setStates([]));
    geoApi.districts().then(setDistricts).catch(() => setDistricts([]));
  }, []);

  // Data Scope — when the logged-in staff's own scope pins a level to
  // exactly one value, that field shows pre-filled and non-editable instead
  // of an editable dropdown. Several scoped values (or none) leave the
  // field editable as before.
  const stateScope = scopeFieldState("state");
  const districtScope = scopeFieldState("district");
  const panchayatScope = scopeFieldState("panchayat");
  const wardScope = scopeFieldState("ward");

  useEffect(() => {
    const patch: Partial<typeof form> = {};
    if (stateScope.mode === "locked" && !form.state) patch.state = stateScope.options[0].value;
    if (districtScope.mode === "locked" && !form.district) patch.district = districtScope.options[0].value;
    if (panchayatScope.mode === "locked" && !form.panchayat) patch.panchayat = panchayatScope.options[0].value;
    if (wardScope.mode === "locked" && !form.ward) patch.ward = wardScope.options[0].value;
    if (Object.keys(patch).length) setForm((prev) => ({ ...prev, ...patch }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stateScope.mode,
    districtScope.mode,
    panchayatScope.mode,
    wardScope.mode,
    form.state,
    form.district,
    form.panchayat,
    form.ward,
  ]);

  useEffect(() => {
    if (!form.district) {
      setPanchayats([]);
      setZones([]);
      setWards([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      geoApi.panchayats(form.district).catch(() => []),
      geoApi.zones(form.district).catch(() => []),
    ]).then(([panchayatRows, zoneRows]) => {
      if (!cancelled) {
        setPanchayats(panchayatRows);
        setZones(zoneRows);
      }
    }).catch(() => {
      if (!cancelled) {
        setPanchayats([]);
        setZones([]);
      }
    });
    return () => { cancelled = true; };
  }, [form.district]);

  useEffect(() => {
    if (!form.zone && !form.panchayat) {
      setWards([]);
      return;
    }
    let cancelled = false;
    geoApi.wards(form.zone || undefined, form.panchayat || undefined).then((rows) => { if (!cancelled) setWards(rows); }).catch(() => { if (!cancelled) setWards([]); });
    return () => { cancelled = true; };
  }, [form.zone, form.panchayat]);

  const setValue = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleWasteType = (id: string) =>
    setForm((prev) => ({
      ...prev,
      waste_types: prev.waste_types.includes(id)
        ? prev.waste_types.filter((item) => item !== id)
        : [...prev.waste_types, id],
    }));
  const filteredSubcategories = form.category ? subcategories.filter((item) => String(item.category) === form.category) : subcategories;
  const filteredDistricts = form.state ? districts.filter((item) => item.state_id === form.state) : districts;
  const filteredPanchayats = form.district ? panchayats.filter((item) => !item.district_id || item.district_id === form.district) : panchayats;
  const filteredZones = form.panchayat ? zones.filter((item) => !item.panchayat_id || item.panchayat_id === form.panchayat) : zones;
  const filteredWards = wards;

  const onStateChange = (value: string) => {
    setForm((prev) => ({ ...prev, state: value, district: "", panchayat: "", zone: "", ward: "" }));
    setPanchayats([]);
    setZones([]);
    setWards([]);
  };

  const onDistrictChange = async (value: string) => {
    setForm((prev) => ({ ...prev, district: value, panchayat: "", zone: "", ward: "" }));
    setPanchayats([]);
    setZones([]);
    setWards([]);
    if (value) {
      const [panchayatRows, zoneRows] = await Promise.all([
        geoApi.panchayats(value).catch(() => []),
        geoApi.zones(value).catch(() => []),
      ]);
      setPanchayats(panchayatRows);
      setZones(zoneRows);
    }
  };

  const onPanchayatChange = async (value: string) => {
    setForm((prev) => ({ ...prev, panchayat: value, zone: "", ward: "" }));
    setWards([]);
    if (form.district) {
      const zoneRows = await geoApi.zones(form.district, value || undefined).catch(() => []);
      setZones(zoneRows);
    }
  };

  const onZoneChange = async (value: string) => {
    setForm((prev) => ({ ...prev, zone: value, ward: "" }));
    const wardRows = await geoApi.wards(value || undefined, form.panchayat || undefined).catch(() => []);
    setWards(wardRows);
  };

  const onWardChange = (value: string) => setForm((prev) => ({ ...prev, ward: value }));

  const entityId = (value: unknown): string => {
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return String(record.unique_id ?? record.id ?? "");
    }
    return value == null ? "" : String(value);
  };

  const onCustomer = (id: string) => {
    const customer = customers.find((item) => String(item.unique_id ?? item.id) === id);
    // Prefill the ticket's location from the customer's own flat geo fields.
    const customerState = entityId(customer?.state_id ?? customer?.state);
    const customerDistrict = entityId(customer?.district_id ?? customer?.district);
    const customerPanchayat = entityId(customer?.panchayat_id ?? customer?.panchayat);
    const customerZone = entityId(customer?.zone_id ?? customer?.zone);
    const customerWard = entityId(customer?.ward_id ?? customer?.ward);
    setForm((prev) => ({
      ...prev,
      customer: id,
      wa_phone: customer?.contact_no ?? customer?.phone ?? customer?.mobile ?? prev.wa_phone,
      profile_name: customer?.customer_name ?? prev.profile_name,
      location_text: [customer?.building_no, customer?.street, customer?.area, customer?.pincode].filter(Boolean).join(", "),
      state: customerState || prev.state,
      district: customerDistrict || prev.district,
      panchayat: customerPanchayat || prev.panchayat,
      zone: customerZone || prev.zone,
      ward: customerWard || prev.ward,
    }));
    setPanchayats([]);
    setZones([]);
    setWards([]);
    if (customerDistrict) {
      geoApi.panchayats(customerDistrict).then(setPanchayats).catch(() => setPanchayats([]));
      geoApi.zones(customerDistrict, customerPanchayat || undefined).then(setZones).catch(() => setZones([]));
      geoApi.wards(customerZone || undefined, customerPanchayat || undefined).then(setWards).catch(() => setWards([]));
    }
  };

  const findLabel = (list: any[], id: string, field: string): string | undefined =>
    list.find((item) => item.unique_id === id)?.[field];

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!(form.profile_name.trim() || form.customer || form.wa_phone.trim())) {
        return "Select a customer or enter a phone number / profile name to continue.";
      }
      return null;
    }
    if (index === 1) {
      if (!form.category) return "Select a category to continue.";
      if (!form.priority) return "Select a priority to continue.";
      if (!form.status) return "Select a status to continue.";
      if (!form.title.trim()) return "Enter a title to continue.";
      return null;
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepError(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (index: number) => {
    if (index <= step) {
      setStepError(null);
      setStep(index);
      return;
    }
    const error = validateStep(step);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    setStep(step + 1);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    // Guard against the browser's implicit Enter-key submission firing this
    // handler while the citizen is still on an earlier wizard step.
    if (step !== REVIEW_STEP) {
      goNext();
      return;
    }
    const validation = ticketSchema.safeParse(form);
    if (!validation.success) {
      Swal.fire("Missing fields", toSwalMessage(validation.error), "warning");
      return;
    }
    const confirmCreate = await Swal.fire({
      title: "Create this ticket?",
      text: "Please confirm you want to create this complaint ticket with the details entered.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, create ticket",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#22a855",
      cancelButtonColor: "#d33",
    });
    if (!confirmCreate.isConfirmed) return;
    setSaving(true);
    try {
      await complaintTicketApi.create({
        wa_phone: form.wa_phone,
        profile_name: form.profile_name,
        source: form.source || null,
        category: form.category,
        waste_types: form.waste_types,
        subcategory: form.subcategory || null,
        priority: form.priority,
        status: form.status,
        title: form.title,
        description: form.description,
        incident_type: form.incident_type,
        trip_reference: form.trip_reference,
        driver_reference: form.driver_reference,
        operator_reference: form.operator_reference,
        vehicle_reference: form.vehicle_reference,
        other_reference: form.other_reference,
        location_text: form.location_text,
        customer: form.customer || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        state: form.state || null,
        district: form.district || null,
        panchayat: form.panchayat || null,
        zone: form.zone || null,
        ward: form.ward || null,
      });
      Swal.fire("Saved", "Ticket created successfully.", "success");
      navigate(listPath);
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to create ticket"), "error");
    } finally {
      setSaving(false);
    }
  };

  const customerLabel = capitalize(customers.find((item) => String(item.unique_id ?? item.id) === form.customer)?.customer_name);

  const renderReview = () => (
    <div className="space-y-6">
      {reviewCard(
        "Citizen",
        <UserRound className="h-4 w-4 text-gray-500" />,
        <>
          {reviewRow("Customer", customerLabel ?? (form.customer ? undefined : "Walk-in / unknown"))}
          {reviewRow("Phone", form.wa_phone)}
          {reviewRow("Profile name", form.profile_name)}
          {reviewRow("Source", capitalize(findLabel(sources, form.source, "source_name")))}
        </>,
      )}

      {reviewCard(
        "Complaint",
        <ClipboardList className="h-4 w-4 text-gray-500" />,
        <>
          {reviewRow("Category", capitalize(findLabel(categories, form.category, "category_name")))}
          {reviewRow(
            "Waste type",
            wasteTypes
              .filter((item) => form.waste_types.includes(item.unique_id))
              .map((item) => capitalize(item.waste_type_name))
              .join(", "),
          )}
          {reviewRow("Subcategory", capitalize(findLabel(subcategories, form.subcategory, "subcategory_name")))}
          {reviewRow("Priority", capitalize(findLabel(priorities, form.priority, "priority_name")))}
          {reviewRow("Status", capitalize(findLabel(statuses, form.status, "status_name")))}
          {reviewRow("Title", form.title)}
          {reviewRow("Description", form.description)}
          {reviewRow("Incident type", capitalize(form.incident_type))}
          {reviewRow("Trip", form.trip_reference)}
          {reviewRow("Driver", form.driver_reference)}
          {reviewRow("Operator", form.operator_reference)}
          {reviewRow("Vehicle", form.vehicle_reference)}
          {reviewRow("Other context", form.other_reference)}
        </>,
      )}

      {reviewCard(
        "Location",
        <MapPinned className="h-4 w-4 text-gray-500" />,
        <>
          {reviewRow("State", capitalize(findLabel(states, form.state, "name")))}
          {reviewRow("District", capitalize(findLabel(districts, form.district, "name")))}
          {reviewRow("Panchayat", capitalize(findLabel(panchayats, form.panchayat, "name")))}
          {reviewRow("Zone", capitalize(findLabel(zones, form.zone, "name")))}
          {reviewRow("Ward", capitalize(findLabel(wards, form.ward, "name")))}
          {reviewRow("Location", form.location_text)}
          {reviewRow("Latitude", form.latitude)}
          {reviewRow("Longitude", form.longitude)}
        </>,
      )}
    </div>
  );

  return (
    <ComponentCard title="Add Complaint Ticket">
      <form
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === "Enter" && step !== REVIEW_STEP && !(event.target instanceof HTMLTextAreaElement)) {
            event.preventDefault();
          }
        }}
        className="space-y-6"
      >

        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
          {STEPS.map(({ label }, index) => {
            const isActive = step === index;
            const isCompleted = index < step;
            const isLocked = index > step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goToStep(index)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "!bg-[#22a855] !text-white shadow-sm"
                    : isCompleted
                      ? "!bg-[#e8f8ee] !text-[#22a855] hover:opacity-90"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : isCompleted
                        ? "!bg-[#22a855] !text-white"
                        : "bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {isCompleted ? "✓" : index + 1}
                </span>
                {label}
                {isLocked && <span className="text-[10px] opacity-60">🔒</span>}
              </button>
            );
          })}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <Label>Customer</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.customer} onChange={(e) => onCustomer(e.target.value)}>
                <option value="">Walk-in / unknown</option>
                {customers.map((item) => <option key={item.unique_id ?? item.id} value={item.unique_id ?? item.id}>{capitalize(item.customer_name)}</option>)}
              </select>
            </div>
            <div><Label>Phone</Label><Input value={form.wa_phone} onChange={(e) => setValue("wa_phone", e.target.value)} /></div>
            <div><Label>Profile Name</Label><Input value={form.profile_name} onChange={(e) => setValue("profile_name", e.target.value)} /></div>
            <div>
              <Label>Source</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.source} onChange={(e) => setValue("source", e.target.value)}>
                <option value="">None</option>
                {sources.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.source_name)}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <Label>Category</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }))} required>
                <option value="">Select category</option>
                {categories.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.category_name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.subcategory} onChange={(e) => setValue("subcategory", e.target.value)}>
                <option value="">None</option>
                {filteredSubcategories.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.subcategory_name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Priority</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.priority} onChange={(e) => setValue("priority", e.target.value)} required>
                <option value="">Select priority</option>
                {priorities.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.priority_name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.status} onChange={(e) => setValue("status", e.target.value)} required>
                <option value="">Select status</option>
                {statuses.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.status_name)}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <Label>Waste Type</Label>
              <div className="flex flex-wrap gap-2">
                {wasteTypes.length === 0 && <p className="text-sm text-gray-500">No waste types configured.</p>}
                {wasteTypes.map((item) => {
                  const id = item.unique_id;
                  const isSelected = form.waste_types.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleWasteType(id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        isSelected
                          ? "!border-[#22a855] !bg-[#22a855] !text-white"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:bg-transparent dark:text-gray-300"
                      }`}
                    >
                      {capitalize(item.waste_type_name)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-3"><Label>Title</Label><Input value={form.title} onChange={(e) => setValue("title", e.target.value)} required /></div>
            <div className="md:col-span-3"><Label>Description</Label><textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={4} value={form.description} onChange={(e) => setValue("description", e.target.value)} /></div>
            <div>
              <Label>Complaint / Incident Type</Label>
              <select
                className="h-11 w-full rounded-md border px-3 text-sm"
                value={form.incident_type}
                onChange={(e) => setValue("incident_type", e.target.value)}
              >
                <option value="public">Public Grievance</option>
                <option value="trip">Trip Related</option>
                <option value="driver">Driver Related</option>
                <option value="operator">Operator Related</option>
                <option value="vehicle">Vehicle Related</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><Label>Trip Reference</Label><Input placeholder="Trip ID / trip plan code" value={form.trip_reference} onChange={(e) => setValue("trip_reference", e.target.value)} /></div>
            <div><Label>Vehicle Reference</Label><Input placeholder="Vehicle number / ID" value={form.vehicle_reference} onChange={(e) => setValue("vehicle_reference", e.target.value)} /></div>
            <div><Label>Driver Reference</Label><Input placeholder="Driver name / staff ID" value={form.driver_reference} onChange={(e) => setValue("driver_reference", e.target.value)} /></div>
            <div><Label>Operator Reference</Label><Input placeholder="Operator name / staff ID" value={form.operator_reference} onChange={(e) => setValue("operator_reference", e.target.value)} /></div>
            <div><Label>Other Context</Label><Input placeholder="Any additional operational reference" value={form.other_reference} onChange={(e) => setValue("other_reference", e.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <Label>State</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.state} onChange={(e) => onStateChange(e.target.value)}>
                <option value="">Select state</option>
                {states.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.name)}</option>)}
              </select>
            </div>
            <div>
              <Label>District</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.district} onChange={(e) => onDistrictChange(e.target.value)} disabled={!form.state}>
                <option value="">{form.state ? "Select district" : "Select a state first"}</option>
                {filteredDistricts.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Panchayat</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.panchayat} onChange={(e) => onPanchayatChange(e.target.value)} disabled={!form.district}>
                <option value="">{form.district ? "Select panchayat" : "Select a district first"}</option>
                {filteredPanchayats.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Zone</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.zone} onChange={(e) => onZoneChange(e.target.value)} disabled={!form.district}>
                <option value="">{form.district ? "Select zone" : "Select a district first"}</option>
                {filteredZones.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.name)}</option>)}
              </select>
            </div>
            <div>
              <Label>Ward</Label>
              <select className="h-11 w-full rounded-md border px-3 text-sm" value={form.ward} onChange={(e) => onWardChange(e.target.value)} disabled={!form.zone && !form.panchayat}>
                <option value="">{form.zone || form.panchayat ? "Select ward" : "Select zone or panchayat first"}</option>
                {filteredWards.map((item) => <option key={item.unique_id} value={item.unique_id}>{capitalize(item.name)}</option>)}
              </select>
            </div>
            <div className="md:col-span-3"><Label>Location</Label><Input value={form.location_text} onChange={(e) => setValue("location_text", e.target.value)} /></div>
            <div><Label>Latitude</Label><Input value={form.latitude} onChange={(e) => setValue("latitude", e.target.value)} /></div>
            <div><Label>Longitude</Label><Input value={form.longitude} onChange={(e) => setValue("longitude", e.target.value)} /></div>
            <div className="flex items-end">
              <AutoDetectLocationButton
                onDetected={({ latitude, longitude }) => {
                  setValue("latitude", String(latitude));
                  setValue("longitude", String(longitude));
                }}
              />
            </div>
          </div>
        )}

        {step === REVIEW_STEP && renderReview()}

        <div className="flex flex-col gap-2">
          {stepError && (
            <p className="max-w-full whitespace-normal break-words text-left text-sm font-medium text-red-600 dark:text-red-400">
              {stepError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className={CANCEL_BUTTON_CLASS} onClick={() => navigate(listPath)}>Cancel</button>
            {step > 0 && (
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={goBack}>← Back</button>
            )}
            {step < REVIEW_STEP ? (
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={goNext}>Next →</button>
            ) : (
              <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Confirm & Save"}
              </button>
            )}
          </div>
        </div>
      </form>
    </ComponentCard>
  );
}
