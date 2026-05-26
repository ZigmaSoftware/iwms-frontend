import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";

import {
  useCitiesQuery,
  useCountriesQuery,
  useCustomerCreationQuery,
  useCreateCustomerCreationMutation,
  useDistrictsQuery,
  usePanchayatsQuery,
  usePropertiesQuery,
  useStatesQuery,
  useSubPropertiesQuery,
  useUpdateCustomerCreationMutation,
  useWardsQuery,
  useZonesQuery,
} from "@/tanstack/admin";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

/* ===============================
   TYPES
================================ */
type Option = { value: string; label: string };

const CUSTOMER_CREATION_FIELDS: Record<string, string[]> = {
  customer_name: ["customer_name", "name"],
  contact_no: ["contact_no", "mobile"],
  username: ["username"],
  email: ["email"],
  password: ["password"],
  building_no: ["building_no"],
  street: ["street"],
  area: ["area"],
  pincode: ["pincode"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  sqft: ["sqft"],
  property_id: ["property_id", "property"],
  sub_property_id: ["sub_property_id", "sub_property"],
  id_proof_type: ["id_proof_type"],
  id_no: ["id_no"],
  country_id: ["country_id", "country"],
  state_id: ["state_id", "state"],
  district_id: ["district_id", "district"],
  city_id: ["city_id", "city"],
  zone_id: ["zone_id", "zone"],
  ward_id: ["ward_id", "ward"],
  panchayat_id: ["panchayat_id", "panchayat"],
  is_active: ["is_active"],
  is_bulkwaste_generator: ["is_bulkwaste_generator"],
  apartment_name: ["apartment_name"],
  block_no: ["block_no"],
  flat_no: ["flat_no"],
  villa_no: ["villa_no"],
  industry_name: ["industry_name"],
  industry_type: ["industry_type"],
};

interface FormDataType {
  customer_name: string;
  contact_no: string;
  username: string;
  email: string;
  password : string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  sqft: string;
  property_id: string;
  sub_property_id: string;
  id_proof_type: string;
  id_no: string;
  country_id: string;
  state_id: string;
  district_id: string;
  city_id: string;
  zone_id: string;
  ward_id: string;
  panchayat_id: string;
  company_id: string;
  project_id: string;
  is_active: boolean;
  is_bulkwaste_generator: boolean;

  // Apartment fields
  apartment_name: string;
  block_no: string;
  flat_no: string;
  // Villa fields
  villa_no: string;
  // Industry fields
  industry_name: string;
  industry_type: string;
}

/* ===============================
   REUSABLE COMPONENTS (OUTSIDE)
================================ */
const ShadcnSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  isRequired = true,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  isRequired?: boolean;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      {label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length > 0 ? (
          options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-500">No options available</div>
        )}
      </SelectContent>
    </Select>
  </div>
);

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-8 bg-white rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-blue-500">
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
  </div>
);

const FormInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  inputMode,
  step,
  isRequired = true,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "decimal";
  step?: string;
  isRequired?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      {label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      step={step}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      autoComplete="off"
    />
  </div>
);

const PasswordInput = ({
  label,
  value,
  onChange,
  placeholder,
  isRequired = true,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  isRequired?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {show ? (
            // Eye-off icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
            </svg>
          ) : (
            // Eye icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

/* ===============================
   STEP 1: PROPERTY SELECTION COMPONENT
================================ */
const PropertySelectionStep = ({
  properties,
  subProperties,
  selectedProperty,
  selectedSubProperty,
  onPropertyChange,
  onSubPropertyChange,
  onNext,
  showField,
  t,
}: {
  properties: any[];
  subProperties: any[];
  selectedProperty: string;
  selectedSubProperty: string;
  onPropertyChange: (v: string) => void;
  onSubPropertyChange: (v: string) => void;
  onNext: () => void;
  showField: (fieldKey: string) => boolean;
  t: any;
}) => {
  const filteredSubProps = subProperties.filter(
    (sp: any) => !selectedProperty || String(sp.property_id ?? sp.property) === selectedProperty
  );

  const isStepComplete =
    (!showField("property_id") || selectedProperty) &&
    (!showField("sub_property_id") || selectedSubProperty);

  return (
    <ComponentCard title={t("admin.customer_creation.select_property_subproperty") || "Select Property & Sub-Property"}>
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📌 {t("admin.customer_creation.step_1_info") || "Step 1 of 2: Please select a Property and Sub-Property to proceed"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showField("property_id") && (
            <ShadcnSelect
              label={t("admin.customer_creation.property") || "Property"}
              value={selectedProperty}
              onChange={onPropertyChange}
              options={properties.map((p: any) => ({
                value: String(p?.unique_id ?? p?.id ?? ""),
                label: p.property_name,
              }))}
              placeholder={t("admin.customer_creation.property_placeholder") || "Select property"}
            />
          )}

          {showField("sub_property_id") && (
            <ShadcnSelect
              label={t("admin.customer_creation.sub_property") || "Sub Property"}
              value={selectedSubProperty}
              onChange={onSubPropertyChange}
              options={filteredSubProps.map((sp: any) => ({
                value: String(sp?.unique_id ?? sp?.id ?? ""),
                label: sp.sub_property_name,
              }))}
              placeholder={t("admin.customer_creation.sub_property_placeholder") || "Select sub property"}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            disabled={!isStepComplete}
            onClick={onNext}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
          >
            {t("common.next") || "Next"}
          </button>
        </div>
      </div>
    </ComponentCard>
  );
};

/* ===============================
   MAIN COMPONENT
================================ */
export default function CustomerCreationForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } = useFieldVisibility(
    "customer-master",
    "customer-creation",
    CUSTOMER_CREATION_FIELDS,
  );
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encCustomerMaster}/${encCustomerCreation}`;

  // TanStack Query hooks
  const customerQuery = useCustomerCreationQuery(isEdit ? id : null);
  const createMutation = useCreateCustomerCreationMutation();
  const updateMutation = useUpdateCustomerCreationMutation();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
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
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  const [step, setStep] = useState(isEdit ? 1 : 0); // 0 = property selection, 1 = form
  const tOrFallback = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [formData, setFormData] = useState<FormDataType>({
    customer_name: "",
    contact_no: "",
    username: "",
    email: "",
    password: "",
    building_no: "",
    street: "",
    area: "",
    pincode: "",
    latitude: "",
    longitude: "",
    sqft: "",
    property_id: "",
    sub_property_id: "",
    id_proof_type: "",
    id_no: "",
    country_id: "",
    state_id: "",
    district_id: "",
    city_id: "",
    zone_id: "",
    ward_id: "",
    panchayat_id: "",
    company_id: "",
    project_id: "",
    is_active: true,
    is_bulkwaste_generator: false,
    // Property type specific fields
    apartment_name: "",
    block_no: "",
    flat_no: "",
    villa_no: "",
    industry_name: "",
    industry_type: "",
  });

  const resolveId = (o: any) => String(o?.unique_id ?? o?.id ?? "");
  const normalize = (arr: any[]) =>
    arr.filter((i) => i?.is_active !== false && i?.is_deleted !== true);

  const update = (key: keyof FormDataType, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  /* ===============================
     DROPDOWNS
  ================================ */
  const wardsQuery = useWardsQuery();
  const zonesQuery = useZonesQuery();
  const citiesQuery = useCitiesQuery();
  const districtsQuery = useDistrictsQuery();
  const statesQuery = useStatesQuery();
  const countriesQuery = useCountriesQuery();
  const propertiesQuery = usePropertiesQuery();
  const subPropertiesQuery = useSubPropertiesQuery();
  const panchayatsQuery = usePanchayatsQuery();

  const dropdowns = useMemo(
    () => ({
      wards: normalize(wardsQuery.data ?? []),
      zones: normalize(zonesQuery.data ?? []),
      cities: normalize(citiesQuery.data ?? []),
      districts: normalize(districtsQuery.data ?? []),
      states: normalize(statesQuery.data ?? []),
      countries: normalize(countriesQuery.data ?? []),
      properties: normalize(propertiesQuery.data ?? []),
      subProperties: normalize(subPropertiesQuery.data ?? []),
      panchayats: normalize(panchayatsQuery.data ?? []),
    }),
    [
      wardsQuery.data,
      zonesQuery.data,
      citiesQuery.data,
      districtsQuery.data,
      statesQuery.data,
      countriesQuery.data,
      propertiesQuery.data,
      subPropertiesQuery.data,
      panchayatsQuery.data,
    ]
  );

  useEffect(() => {
    const failedQuery = [
      wardsQuery,
      zonesQuery,
      citiesQuery,
      districtsQuery,
      statesQuery,
      countriesQuery,
      propertiesQuery,
      subPropertiesQuery,
      panchayatsQuery,
    ].find((query) => query.isError);

    if (!failedQuery) return;

    console.error("Failed to fetch customer dropdowns:", failedQuery.error);
    Swal.fire("Error", "Failed to load customer form data", "error");
  }, [
    wardsQuery.isError,
    zonesQuery.isError,
    citiesQuery.isError,
    districtsQuery.isError,
    statesQuery.isError,
    countriesQuery.isError,
    propertiesQuery.isError,
    subPropertiesQuery.isError,
    panchayatsQuery.isError,
  ]);

  /* ===============================
     LOAD EXISTING DATA (EDIT MODE)
  ================================ */
  useEffect(() => {
    if (!customerQuery.data) return;

    const data = customerQuery.data;
    setFormData((prev) => ({
      ...prev,
      customer_name: String(data.customer_name ?? ""),
      contact_no: String(data.contact_no ?? ""),
      username: String(data.username ?? ""),
      email: String(data.email ?? ""),
      password: "",
      building_no: String(data.building_no ?? ""),
      street: String(data.street ?? ""),
      area: String(data.area ?? ""),
      pincode: String(data.pincode ?? ""),
      latitude: String(data.latitude ?? ""),
      longitude: String(data.longitude ?? ""),
      sqft: String(data.sqft ?? ""),
      property_id: String(data.property_id ?? ""),
      sub_property_id: String(data.sub_property_id ?? ""),
      id_proof_type: String(data.id_proof_type ?? ""),
      id_no: String(data.id_no ?? ""),
      country_id: String(data.country_id ?? ""),
      state_id: String(data.state_id ?? ""),
      district_id: String(data.district_id ?? ""),
      city_id: String(data.city_id ?? ""),
      zone_id: String(data.zone_id ?? ""),
      ward_id: String(data.ward_id ?? ""),
      panchayat_id: String(data.panchayat_id ?? ""),
      company_id: String(data.company_id ?? ""),
      project_id: String(data.project_id ?? ""),
      is_active: Boolean(data.is_active),
      is_bulkwaste_generator: Boolean(data.is_bulkwaste_generator),
      apartment_name: String(data.apartment_name ?? ""),
      block_no: String(data.block_no ?? ""),
      flat_no: String(data.flat_no ?? ""),
      villa_no: String(data.villa_no ?? ""),
      industry_name: String(data.industry_name ?? ""),
      industry_type: String(data.industry_type ?? ""),
    }));
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [applyCompanyProjectFromRecord, customerQuery.data]);

  /* ===============================
     FILTERS
  ================================ */
  const filteredStates = useMemo(
    () => dropdowns.states.filter((s: any) => !formData.country_id || String(s.country_id ?? s.country) === formData.country_id),
    [dropdowns.states, formData.country_id]
  );

  const filteredDistricts = useMemo(
    () => dropdowns.districts.filter((d: any) => !formData.state_id || String(d.state_id ?? d.state) === formData.state_id),
    [dropdowns.districts, formData.state_id]
  );

  const filteredCities = useMemo(
    () => dropdowns.cities.filter((c: any) => !formData.district_id || String(c.district_id ?? c.district) === formData.district_id),
    [dropdowns.cities, formData.district_id]
  );

  const filteredZones = useMemo(
    () => dropdowns.zones.filter((z: any) => !formData.city_id || String(z.city_id ?? z.city) === formData.city_id),
    [dropdowns.zones, formData.city_id]
  );

  const filteredWards = useMemo(
    () => dropdowns.wards.filter((w: any) => !formData.zone_id || String(w.zone_id ?? w.zone) === formData.zone_id),
    [dropdowns.wards, formData.zone_id]
  );

  const filteredPanchayats = useMemo(
    () =>
      dropdowns.panchayats.filter(
        (p: any) =>
          (!formData.district_id || String(p.district_id ?? p.district) === formData.district_id) &&
          (!formData.city_id || String(p.city_id ?? p.city) === formData.city_id)
      ),
    [dropdowns.panchayats, formData.district_id, formData.city_id]
  );

  /* ===============================
     SUB_PROPERTY TYPE DETECTION
  ================================ */
  const selectedSubProperty = useMemo(
    () => dropdowns.subProperties.find(
      (sp: any) => resolveId(sp) === formData.sub_property_id
    ),
    [formData.sub_property_id, dropdowns.subProperties]
  );

  const subName = selectedSubProperty?.sub_property_name?.toLowerCase() || "";
  const isIndividual = subName.includes("individual") || subName.includes("house");
  const isApartment = subName.includes("apartment");
  const isVilla = subName.includes("villa");
  const isIndustry = subName.includes("industry");
  // const zoneOrWardSelected  = Boolean(formData.zone_id || formData.ward_id);
  // const panchayatSelected   = Boolean(formData.panchayat_id);
  const isPanchayatSelected = Boolean(formData.panchayat_id);
  const isZoneOrWardSelected = Boolean(formData.zone_id || formData.ward_id);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* ===============================
     VALIDATION
  ================================ */
  const validateForm = (): boolean => {
    // Check required fields (company_id and project_id are mandatory)
    const requiredFields = [
      "customer_name", "contact_no", "email", "username",
       "pincode", "latitude", "longitude", "sqft", "id_proof_type", "id_no",
      "country_id", "state_id", "district_id", "city_id",  
      "property_id", "sub_property_id",
      ...(!isEdit ? ["password"] : []),
    ].flat();

    const missingFields = getMissingRequiredFields(
      requiredFields,
      (fieldKey) => formData[fieldKey as keyof FormDataType],
    );

    if (missingFields.length > 0) {
      for (const field of missingFields) {
        const fieldLabel = String(field).replace(/_/g, " ");
        Swal.fire(t("common.warning") || "Warning", `${fieldLabel} is required`, "warning");
        return false;
      }
    }

    if (!companyUniqueId || !projectId) {
      Swal.fire(t("common.warning") || "Warning", "Company and project are required", "warning");
      return false;
    }

    // Contact validation (10 digits)
    if (showField("contact_no") && !/^\d{10}$/.test(formData.contact_no)) {
      Swal.fire(
        t("admin.customer_creation.invalid_contact_title") || "Invalid Contact",
        t("admin.customer_creation.invalid_contact_desc") || "Please enter a valid 10-digit contact number",
        "warning"
      );
      return false;
    }

    // Email validation
    if (showField("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire("Invalid Email", "Please enter a valid email address", "warning");
      return false;
    }

    // the password validation block:
    if (showField("password") && !isEdit && formData.password.length < 8) {
      Swal.fire("Weak Password", "Password must be at least 8 characters", "warning");
      return false;
    }

    // Pincode validation (6 digits)
    if (showField("pincode") && !/^\d{6}$/.test(formData.pincode)) {
      Swal.fire(
        t("admin.customer_creation.invalid_pincode_title") || "Invalid Pincode",
        t("admin.customer_creation.invalid_pincode_desc") || "Please enter a valid 6-digit pincode",
        "warning"
      );
      return false;
    }

    // Latitude & Longitude validation
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    if (
      (showField("latitude") || showField("longitude")) &&
      (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180)
    ) {
      Swal.fire(
        t("admin.customer_creation.invalid_coordinates_title") || "Invalid Coordinates",
        t("admin.customer_creation.invalid_coordinates_desc") || "Please enter valid latitude and longitude",
        "warning"
      );
      return false;
    }

    // Square feet validation
    const sqftValue = parseFloat(formData.sqft);
    if (showField("sqft") && (isNaN(sqftValue) || sqftValue <= 0)) {
      Swal.fire("Invalid Square Feet", "Please enter a valid square feet value", "warning");
      return false;
    }

    return true;
  };

  /* ===============================
     SUBMIT
  ================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const rawPayload = {
      ...formData,
      company_id: companyUniqueId,
      project_id: projectId,
      latitude: showField("latitude") ? String(parseFloat(formData.latitude)) : formData.latitude,
      longitude: showField("longitude") ? String(parseFloat(formData.longitude)) : formData.longitude,
      sqft: showField("sqft") ? String(parseFloat(formData.sqft)) : formData.sqft,
      ...(isEdit && !formData.password ? { password: undefined } : {}), // Only include password for new records
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]);

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: id as string,
          payload: payload as any,
        });
      } else {
        await createMutation.mutateAsync(payload as any);
      }

      Swal.fire(
        t("common.success") || "Success",
        t("admin.customer_creation.save_success") || "Saved successfully",
        "success"
      );
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err) {
      console.error("Submit error:", err);
      Swal.fire(t("common.error") || "Error", t("admin.customer_creation.save_failed") || "Failed to save", "error");
    }
  };

  /* ===============================
     RENDER
  ================================ */

  // Show property selection step first (unless in edit mode)
  if (step === 0) {
    return (
      <PropertySelectionStep
        properties={dropdowns.properties}
        subProperties={dropdowns.subProperties}
        selectedProperty={formData.property_id}
        selectedSubProperty={formData.sub_property_id}
        onPropertyChange={(v: string) => {
          update("property_id", v);
          update("sub_property_id", "");
        }}
        onSubPropertyChange={(v: string) => update("sub_property_id", v)}
        onNext={() => setStep(1)}
        showField={showField}
        t={t}
      />
    );
  }

  // Show form step (step 1)
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.customer_creation.title_edit") || "Edit Customer"
          : t("admin.customer_creation.title_add") || "Add Customer"
      }
    >
      {/* Step indicator for new records */}
      {!isEdit && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📍 {t("admin.customer_creation.step_2_info") || "Step 2 of 2: Fill in the customer details"}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <FormSection title={t("admin.customer_creation.personal_info") || "Personal Information"}>
          {showField("customer_name") && (
            <FormInput
              label={t("admin.customer_creation.customer_name") || "Customer Name"}
              value={formData.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Enter full name"
            />
          )}
          {showField("contact_no") && (
            <FormInput
              label={t("admin.customer_creation.contact_no") || "Contact Number"}
              value={formData.contact_no}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                update("contact_no", numericValue);
              }}
              placeholder="10 digit mobile number"
              maxLength={10}
              inputMode="numeric"
            />
          )}
          {showField("username") && (
            <FormInput
              label={t("login.username") || "Username"}
              value={formData.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="Enter username"
            />
          )}
          {showField("email") && (
            <FormInput
              label={t("admin.customer_creation.email") || "Email Address"}
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="Enter email address"
              type="email"
            />
          )}
          
          {showField("password") && (
            <PasswordInput
              label={t("login.password") || "Password"}
              value={formData.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current password" : "Enter password (min 8 chars)"}
              isRequired={!isEdit}
            />
          )}
        </FormSection>

        <FormSection title={t("admin.customer_creation.address_info") || "Address Information"}>
          {/* INDIVIDUAL HOUSE */}
          {isIndividual && (
            <>
              {showField("building_no") && (
                <FormInput
                  label={t("common.building_no") || "Building No"}
                  value={formData.building_no}
                  onChange={(e) => update("building_no", e.target.value)}
                  placeholder="e.g., 13A"
                />
              )}
              {showField("street") && (
                <FormInput
                  label={t("common.street") || "Street"}
                  value={formData.street}
                  onChange={(e) => update("street", e.target.value)}
                  placeholder="e.g., Main Street"
                />
              )}
              {showField("area") && (
                <FormInput
                  label={t("common.area") || "Area"}
                  value={formData.area}
                  onChange={(e) => update("area", e.target.value)}
                  placeholder="e.g., Village Center"
                />
              )}
            </>
          )}

          {/* APARTMENT */}
          {isApartment && (
            <>
              {showField("apartment_name") && (
                <FormInput
                  label="Apartment Name"
                  value={formData.apartment_name}
                  onChange={(e) => update("apartment_name", e.target.value)}
                  placeholder="Enter apartment name"
                  isRequired={false}
                />
              )}
              {showField("block_no") && (
                <FormInput
                  label="Block No"
                  value={formData.block_no}
                  onChange={(e) => update("block_no", e.target.value)}
                  placeholder="Enter block number"
                  isRequired={false}
                />
              )}
              {showField("flat_no") && (
                <FormInput
                  label="Flat No"
                  value={formData.flat_no}
                  onChange={(e) => update("flat_no", e.target.value)}
                  placeholder="Enter flat number"
                  isRequired={false}
                />
              )}
            </>
          )}

          {/* VILLA */}
          {isVilla && (
            <>
              {showField("street") && (
                <FormInput
                  label={t("common.street") || "Street"}
                  value={formData.street}
                  onChange={(e) => update("street", e.target.value)}
                  placeholder="e.g., Main Street"
                />
              )}
              {showField("area") && (
                <FormInput
                  label={t("common.area") || "Area"}
                  value={formData.area}
                  onChange={(e) => update("area", e.target.value)}
                  placeholder="e.g., Village Center"
                />
              )}
              {showField("villa_no") && (
                <FormInput
                  label="Villa No"
                  value={formData.villa_no}
                  onChange={(e) => update("villa_no", e.target.value)}
                  placeholder="Enter villa number"
                  isRequired={false}
                />
              )}
            </>
          )}

          {/* INDUSTRY */}
          {isIndustry && (
            <>
              {showField("industry_name") && (
                <FormInput
                  label="Industry Name"
                  value={formData.industry_name}
                  onChange={(e) => update("industry_name", e.target.value)}
                  placeholder="Enter industry name"
                  isRequired={false}
                />
              )}
              {showField("industry_type") && (
                <FormInput
                  label="Industry Type"
                  value={formData.industry_type}
                  onChange={(e) => update("industry_type", e.target.value)}
                  placeholder="Enter industry type"
                  isRequired={false}
                />
              )}
              {showField("area") && (
                <FormInput
                  label={t("common.area") || "Area"}
                  value={formData.area}
                  onChange={(e) => update("area", e.target.value)}
                  placeholder="e.g., Industrial Zone"
                />
              )}
            </>
          )}

          {showField("pincode") && (
            <FormInput
              label={t("common.pincode") || "Pincode"}
              value={formData.pincode}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                update("pincode", numericValue);
              }}
              placeholder="6 digit pincode"
              maxLength={6}
              inputMode="numeric"
            />
          )}
          {showField("latitude") && (
            <FormInput
              label={t("common.latitude") || "Latitude"}
              value={formData.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              placeholder="e.g., 13.0827"
              type="number"
              step="0.0001"
            />
          )}
          {showField("longitude") && (
            <FormInput
              label={t("common.longitude") || "Longitude"}
              value={formData.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              placeholder="e.g., 80.2707"
              type="number"
              step="0.0001"
            />
          )}
        </FormSection>

        <FormSection title={t("admin.customer_creation.property_info") || "Property Information"}>
          {/* Display selected property and sub-property (read-only in form step) */}
          {!isEdit && (showField("property_id") || showField("sub_property_id")) && (
            <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {showField("property_id") && (
                    <p className="text-sm text-gray-600">
                      {t("admin.customer_creation.selected_property") || "Selected Property"}:{" "}
                      <span className="font-semibold text-gray-800">
                        {dropdowns.properties.find((p: any) => String(p?.unique_id ?? p?.id ?? "") === formData.property_id)?.property_name || "-"}
                      </span>
                    </p>
                  )}
                  {showField("sub_property_id") && (
                    <p className="text-sm text-gray-600">
                      {t("admin.customer_creation.selected_sub_property") || "Selected Sub-Property"}:{" "}
                      <span className="font-semibold text-gray-800">
                        {dropdowns.subProperties.find((sp: any) => String(sp?.unique_id ?? sp?.id ?? "") === formData.sub_property_id)?.sub_property_name || "-"}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition"
                >
                  {t("common.change") || "Change"}
                </button>
              </div>
            </div>
          )}

          {showField("sqft") && (
            <FormInput
              label={t("admin.customer_creation.sqft") || "Square Feet (Sqft)"}
              value={formData.sqft}
              onChange={(e) => update("sqft", e.target.value)}
              placeholder="e.g., 1200.50"
              type="number"
              step="0.01"
            />
          )}
          {showField("is_bulkwaste_generator") && (
            <ShadcnSelect
              label={tOrFallback("admin.customer_creation.bulk_waste_generator", "Bulk Waste Generator")}
              value={formData.is_bulkwaste_generator ? "true" : "false"}
              onChange={(v: string) => update("is_bulkwaste_generator", v === "true")}
              options={[
                { value: "true", label: tOrFallback("common.yes", "Yes") },
                { value: "false", label: tOrFallback("common.no", "No") },
              ]}
              placeholder={tOrFallback("admin.customer_creation.bulk_waste_generator_placeholder", "Select option")}
              isRequired={false}
            />
          )}
        </FormSection>

        <FormSection title={t("admin.customer_creation.identification") || "Identification"}>
          {showField("id_proof_type") && (
            <ShadcnSelect
              label={t("admin.customer_creation.id_proof_type") || "ID Proof Type"}
              value={formData.id_proof_type}
              onChange={(v: string) => update("id_proof_type", v)}
              options={[
                { value: "AADHAAR", label: t("admin.customer_creation.id_proof_aadhaar") || "Aadhaar" },
                { value: "VOTER_ID", label: t("admin.customer_creation.id_proof_voter") || "Voter ID" },
                { value: "PAN_CARD", label: t("admin.customer_creation.id_proof_pan") || "PAN Card" },
                { value: "DL", label: t("admin.customer_creation.id_proof_dl") || "Driving License" },
                { value: "PASSPORT", label: t("admin.customer_creation.id_proof_passport") || "Passport" },
              ]}
              placeholder={t("admin.customer_creation.id_proof_placeholder") || "Select ID proof type"}
            />
          )}
          {showField("id_no") && (
            <div className="md:col-span-2">
              <FormInput
                label={t("admin.customer_creation.id_no") || "ID Number"}
                value={formData.id_no}
                onChange={(e) => update("id_no", e.target.value)}
                placeholder="Enter identification number"
              />
            </div>
          )}
        </FormSection>

        <FormSection title={t("admin.customer_creation.company_project_info") || "Company & Project Information"}>
          <ShadcnSelect
            label={t("admin.nav.company") || "Company"}
            value={companyUniqueId}
            onChange={(v: string) => {
              onCompanyChange(v);
            }}
            options={companies}
            placeholder={t("admin.nav.company_placeholder") || "Select company"}
            isRequired={true}
            disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId)}
          />
          <ShadcnSelect
            label={t("admin.nav.project") || "Project"}
            value={projectId}
            onChange={setProjectId}
            options={projects}
            placeholder={t("admin.nav.project_placeholder") || "Select project"}
            isRequired={true}
            disabled={!companyUniqueId || projects.length === 0}
          />
        </FormSection>

        <FormSection title={t("admin.customer_creation.location_details") || "Location Details"}>
          {showField("country_id") && (
            <ShadcnSelect
              label={t("common.country") || "Country"}
              value={formData.country_id}
              onChange={(v: string) => {
                update("country_id", v);
                update("state_id", "");
                update("district_id", "");
                update("city_id", "");
                update("zone_id", "");
                update("ward_id", "");
                update("panchayat_id", "");
              }}
              options={dropdowns.countries.map((c: any) => ({
                value: resolveId(c),
                label: c.name,
              }))}
              placeholder={t("common.select_item_placeholder", { item: t("common.country") }) || "Select country"}
            />
          )}
          {showField("state_id") && (
            <ShadcnSelect
              label={t("common.state") || "State"}
              value={formData.state_id}
              onChange={(v: string) => {
                update("state_id", v);
                update("district_id", "");
                update("city_id", "");
                update("zone_id", "");
                update("ward_id", "");
                update("panchayat_id", "");
              }}
              options={filteredStates.map((s: any) => ({
                value: resolveId(s),
                label: s.name,
              }))}
              placeholder={t("common.select_item_placeholder", { item: t("common.state") }) || "Select state"}
            />
          )}
          {showField("district_id") && (
            <ShadcnSelect
              label={t("common.district") || "District"}
              value={formData.district_id}
              onChange={(v: string) => {
                update("district_id", v);
                update("city_id", "");
                update("zone_id", "");
                update("ward_id", "");
                update("panchayat_id", "");
              }}
              options={filteredDistricts.map((d: any) => ({
                value: resolveId(d),
                label: d.name,
              }))}
              placeholder={t("common.select_item_placeholder", { item: t("common.district") }) || "Select district"}
            />
          )}
          {showField("city_id") && (
            <ShadcnSelect
              label={t("common.city") || "City"}
              value={formData.city_id}
              onChange={(v: string) => {
                update("city_id", v);
                update("zone_id", "");
                update("ward_id", "");
                update("panchayat_id", "");
              }}
              options={filteredCities.map((c: any) => ({
                value: resolveId(c),
                label: c.name,
              }))}
              placeholder={t("common.select_item_placeholder", { item: t("common.city") }) || "Select city"}
            />
          )}
          {/* ── ZONE ── */}
          {showField("zone_id") && (
            <ShadcnSelect
              label={t("common.zone") || "Zone"}
              value={formData.zone_id || "__none__"}
              disabled={isPanchayatSelected}
              onChange={(v: string) => {
                const next = v === "__none__" ? "" : v;
                update("zone_id", next);
                update("ward_id", "");
                update("panchayat_id", "");
              }}
              options={[
                { value: "__none__", label: t("common.not_available") || "N/A" },
                ...filteredZones.map((z: any) => ({
                  value: resolveId(z),
                  label: z.zone_name || z.name,
                })),
              ]}
              placeholder={t("common.select_item_placeholder", { item: t("common.zone") }) || "Select zone"}
              isRequired={false}
            />
          )}

          {/* ── WARD ── */}
          {showField("ward_id") && (
            <ShadcnSelect
              label={t("common.ward") || "Ward"}
              value={formData.ward_id || "__none__"}
              disabled={isPanchayatSelected}
              onChange={(v: string) => {
                const next = v === "__none__" ? "" : v;
                update("ward_id", next);
                if (next) update("panchayat_id", "");
              }}
              options={[
                { value: "__none__", label: t("common.not_available") || "N/A" },
                ...filteredWards.map((w: any) => ({
                  value: resolveId(w),
                  label: w.ward_name || w.name,
                })),
              ]}
              placeholder={t("common.select_item_placeholder", { item: t("common.ward") }) || "Select ward"}
              isRequired={false}
            />
          )}

          {/* ── PANCHAYAT ── */}
          {showField("panchayat_id") && (
            <ShadcnSelect
              label={t("admin.nav.panchayat") || "Panchayat"}
              value={formData.panchayat_id || "__none__"}
              disabled={isZoneOrWardSelected}
              onChange={(v: string) => {
                const next = v === "__none__" ? "" : v;
                update("panchayat_id", next);
                if (next) {
                  update("zone_id", "");
                  update("ward_id", "");
                }
              }}
              options={[
                { value: "__none__", label: t("common.not_available") || "N/A" },
                ...filteredPanchayats.map((p: any) => ({
                  value: resolveId(p),
                  label: p.panchayat_name || p.name,
                })),
              ]}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") }) || "Select panchayat"}
              isRequired={false}
            />
          )}
        </FormSection>

        {showField("is_active") && (
          <FormSection title={t("common.status") || "Status"}>
            <ShadcnSelect
              label={t("common.status") || "Status"}
              value={formData.is_active ? "true" : "false"}
              onChange={(v: string) => update("is_active", v === "true")}
              options={[
                { value: "true", label: t("common.active") || "Active" },
                { value: "false", label: t("common.inactive") || "Inactive" },
              ]}
              placeholder={t("common.select_status") || "Select status"}
            />
          </FormSection>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
          <div className="flex gap-3">
            {!isEdit && (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
              >
                {t("common.back") || "Back"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
            >
              {t("common.cancel") || "Cancel"}
            </button>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-md font-medium transition duration-200 flex items-center justify-center min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("common.saving") || "Saving..."}
              </>
            ) : isEdit ? (
              t("common.update") || "Update"
            ) : (
              t("common.save") || "Save"
            )}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
