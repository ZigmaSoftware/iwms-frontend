import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import {
  cityApi,
  countryApi,
  customerCreationApi,
  districtApi,
  propertiesApi,
  stateApi,
  subPropertiesApi,
  wardApi,
  zoneApi,
  panchayatApi,
  companyApi,
  projectApi,
} from "@/helpers/admin";

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

/* ===============================
   TYPES
================================ */
type Option = { value: string; label: string };

interface FormDataType {
  customer_name: string;
  contact_no: string;
  username: string;
  email: string;
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  isRequired?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      {label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Select value={value || undefined} onValueChange={onChange}>
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

/* ===============================
   MAIN COMPONENT
================================ */
export default function CustomerCreationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encCustomerMaster}/${encCustomerCreation}`;

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    customer_name: "",
    contact_no: "",
    username: "",
    email: "",
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
  const [dropdowns, setDropdowns] = useState<any>({
    wards: [],
    zones: [],
    cities: [],
    districts: [],
    states: [],
    countries: [],
    properties: [],
    subProperties: [],
    panchayats: [],
    companies: [],
    projects: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await Promise.all([
          wardApi.list(),
          zoneApi.list(),
          cityApi.list(),
          districtApi.list(),
          stateApi.list(),
          countryApi.list(),
          propertiesApi.list(),
          subPropertiesApi.list(),
          panchayatApi.list(),
          companyApi.list(),
          projectApi.list(),
        ]);

        setDropdowns({
          wards: normalize(data[0]),
          zones: normalize(data[1]),
          cities: normalize(data[2]),
          districts: normalize(data[3]),
          states: normalize(data[4]),
          countries: normalize(data[5]),
          properties: normalize(data[6]),
          subProperties: normalize(data[7]),
          panchayats: normalize(data[8]),
          companies: normalize(data[9]),
          projects: normalize(data[10]),
        });
      } catch (err) {
        console.error("Failed to fetch dropdowns:", err);
        Swal.fire("Error", "Failed to load location data", "error");
      }
    })();
  }, []);

  /* ===============================
     LOAD EXISTING DATA (EDIT MODE)
  ================================ */
  useEffect(() => {
    if (!isEdit || !id) return;

    customerCreationApi
      .get(id)
      .then((res) => {
        setFormData((prev) => ({ ...prev, ...res }));
      })
      .catch(() =>
        Swal.fire(
          t("common.error"),
          t("admin.customer_creation.load_failed"),
          "error"
        )
      );
  }, [id, isEdit, t]);

  /* ===============================
     FILTERS
  ================================ */
  const filteredStates = useMemo(
    () => dropdowns.states.filter((s: any) => !formData.country_id || s.country_id === formData.country_id),
    [dropdowns.states, formData.country_id]
  );

  const filteredDistricts = useMemo(
    () => dropdowns.districts.filter((d: any) => !formData.state_id || d.state_id === formData.state_id),
    [dropdowns.districts, formData.state_id]
  );

  const filteredCities = useMemo(
    () => dropdowns.cities.filter((c: any) => !formData.district_id || c.district_id === formData.district_id),
    [dropdowns.cities, formData.district_id]
  );

  const filteredZones = useMemo(
    () => dropdowns.zones.filter((z: any) => !formData.city_id || z.city_id === formData.city_id),
    [dropdowns.zones, formData.city_id]
  );

  const filteredWards = useMemo(
    () => dropdowns.wards.filter((w: any) => !formData.zone_id || w.zone_id === formData.zone_id),
    [dropdowns.wards, formData.zone_id]
  );

  const filteredPanchayats = useMemo(
    () =>
      dropdowns.panchayats.filter(
        (p: any) =>
          (!formData.district_id || p.district_id === formData.district_id) &&
          (!formData.city_id || p.city_id === formData.city_id)
      ),
    [dropdowns.panchayats, formData.district_id, formData.city_id]
  );

  const filteredSubProperties = useMemo(
    () =>
      dropdowns.subProperties.filter(
        (sp: any) => !formData.property_id || sp.property_id === formData.property_id
      ),
    [dropdowns.subProperties, formData.property_id]
  );

  const filteredProjects = useMemo(
    () =>
      dropdowns.projects.filter(
        (p: any) => !formData.company_id || p.company_unique_id === formData.company_id
      ),
    [dropdowns.projects, formData.company_id]
  );

  /* ===============================
     VALIDATION
  ================================ */
  const validateForm = (): boolean => {
    // Check required fields (company_id and project_id are mandatory)
    const requiredFields = [
      "customer_name", "contact_no", "email", "username", "building_no", "street",
      "area", "pincode", "latitude", "longitude", "sqft", "id_proof_type", "id_no",
      "country_id", "state_id", "district_id", "city_id", "zone_id", "ward_id",
      "property_id", "sub_property_id", "company_id", "project_id"
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof FormDataType]) {
        const fieldLabel = String(field).replace(/_/g, " ");
        Swal.fire(t("common.warning") || "Warning", `${fieldLabel} is required`, "warning");
        return false;
      }
    }

    // Contact validation (10 digits)
    if (!/^\d{10}$/.test(formData.contact_no)) {
      Swal.fire(
        t("admin.customer_creation.invalid_contact_title") || "Invalid Contact",
        t("admin.customer_creation.invalid_contact_desc") || "Please enter a valid 10-digit contact number",
        "warning"
      );
      return false;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire("Invalid Email", "Please enter a valid email address", "warning");
      return false;
    }

    // Pincode validation (6 digits)
    if (!/^\d{6}$/.test(formData.pincode)) {
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
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Swal.fire(
        t("admin.customer_creation.invalid_coordinates_title") || "Invalid Coordinates",
        t("admin.customer_creation.invalid_coordinates_desc") || "Please enter valid latitude and longitude",
        "warning"
      );
      return false;
    }

    // Square feet validation
    const sqftValue = parseFloat(formData.sqft);
    if (isNaN(sqftValue) || sqftValue <= 0) {
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

    const payload = {
      ...formData,
      latitude: String(parseFloat(formData.latitude)),
      longitude: String(parseFloat(formData.longitude)),
      sqft: String(parseFloat(formData.sqft)),
    };

    try {
      setLoading(true);
      if (isEdit) {
        await customerCreationApi.update(id as string, payload);
      } else {
        await customerCreationApi.create(payload);
      }

      Swal.fire(
        t("common.success") || "Success",
        t("admin.customer_creation.save_success") || "Saved successfully",
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (err) {
      console.error("Submit error:", err);
      Swal.fire(t("common.error") || "Error", t("admin.customer_creation.save_failed") || "Failed to save", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     RENDER
  ================================ */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.customer_creation.title_edit") || "Edit Customer"
          : t("admin.customer_creation.title_add") || "Add Customer"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        <FormSection title={t("admin.customer_creation.personal_info") || "Personal Information"}>
          <FormInput
            label={t("admin.customer_creation.customer_name") || "Customer Name"}
            value={formData.customer_name}
            onChange={(e) => update("customer_name", e.target.value)}
            placeholder="Enter full name"
          />
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
          <FormInput
            label={t("admin.customer_creation.username") || "Username"}
            value={formData.username}
            onChange={(e) => update("username", e.target.value)}
            placeholder="Enter username"
          />
          <FormInput
            label={t("admin.customer_creation.email") || "Email Address"}
            value={formData.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Enter email address"
            type="email"
          />
        </FormSection>

        <FormSection title={t("admin.customer_creation.address_info") || "Address Information"}>
          <FormInput
            label={t("common.building_no") || "Building No"}
            value={formData.building_no}
            onChange={(e) => update("building_no", e.target.value)}
            placeholder="e.g., 13A"
          />
          <FormInput
            label={t("common.street") || "Street"}
            value={formData.street}
            onChange={(e) => update("street", e.target.value)}
            placeholder="e.g., Main Street"
          />
          <FormInput
            label={t("common.area") || "Area"}
            value={formData.area}
            onChange={(e) => update("area", e.target.value)}
            placeholder="e.g., Village Center"
          />
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
          <FormInput
            label={t("common.latitude") || "Latitude"}
            value={formData.latitude}
            onChange={(e) => update("latitude", e.target.value)}
            placeholder="e.g., 13.0827"
            type="number"
            step="0.0001"
          />
          <FormInput
            label={t("common.longitude") || "Longitude"}
            value={formData.longitude}
            onChange={(e) => update("longitude", e.target.value)}
            placeholder="e.g., 80.2707"
            type="number"
            step="0.0001"
          />
        </FormSection>

        <FormSection title={t("admin.customer_creation.property_info") || "Property Information"}>
          <FormInput
            label={t("admin.customer_creation.sqft") || "Square Feet (Sqft)"}
            value={formData.sqft}
            onChange={(e) => update("sqft", e.target.value)}
            placeholder="e.g., 1200.50"
            type="number"
            step="0.01"
          />
          <ShadcnSelect
            label={t("admin.customer_creation.property") || "Property"}
            value={formData.property_id}
            onChange={(v: string) => {
              update("property_id", v);
              update("sub_property_id", "");
            }}
            options={dropdowns.properties.map((p: any) => ({
              value: resolveId(p),
              label: p.property_name,
            }))}
            placeholder={t("admin.customer_creation.property_placeholder") || "Select property"}
          />
          <ShadcnSelect
            label={t("admin.customer_creation.sub_property") || "Sub Property"}
            value={formData.sub_property_id}
            onChange={(v: string) => update("sub_property_id", v)}
            options={filteredSubProperties.map((sp: any) => ({
              value: resolveId(sp),
              label: sp.sub_property_name,
            }))}
            placeholder={t("admin.customer_creation.sub_property_placeholder") || "Select sub property"}
          />
        </FormSection>

        <FormSection title={t("admin.customer_creation.identification") || "Identification"}>
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
          <div className="md:col-span-2">
            <FormInput
              label={t("admin.customer_creation.id_no") || "ID Number"}
              value={formData.id_no}
              onChange={(e) => update("id_no", e.target.value)}
              placeholder="Enter identification number"
            />
          </div>
        </FormSection>

        <FormSection title={t("admin.customer_creation.company_project_info") || "Company & Project Information"}>
          <ShadcnSelect
            label={t("admin.customer_creation.company") || "Company"}
            value={formData.company_id}
            onChange={(v: string) => {
              update("company_id", v);
              update("project_id", "");
            }}
            options={dropdowns.companies.map((c: any) => ({
              value: resolveId(c),
              label: c.name,
            }))}
            placeholder={t("admin.customer_creation.company_placeholder") || "Select company"}
            isRequired={true}
          />
          <ShadcnSelect
            label={t("admin.customer_creation.project") || "Project"}
            value={formData.project_id}
            onChange={(v: string) => update("project_id", v)}
            options={filteredProjects.map((p: any) => ({
              value: resolveId(p),
              label: p.name,
            }))}
            placeholder={t("admin.customer_creation.project_placeholder") || "Select project"}
            isRequired={true}
          />
        </FormSection>

        <FormSection title={t("admin.customer_creation.location_details") || "Location Details"}>
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
          <ShadcnSelect
            label={t("common.zone") || "Zone"}
            value={formData.zone_id}
            onChange={(v: string) => {
              update("zone_id", v);
              update("ward_id", "");
              update("panchayat_id", "");
            }}
            options={filteredZones.map((z: any) => ({
              value: resolveId(z),
              label: z.zone_name || z.name,
            }))}
            placeholder={t("common.select_item_placeholder", { item: t("common.zone") }) || "Select zone"}
          />
          <ShadcnSelect
            label={t("common.ward") || "Ward"}
            value={formData.ward_id}
            onChange={(v: string) => {
              update("ward_id", v);
              update("panchayat_id", "");
            }}
            options={filteredWards.map((w: any) => ({
              value: resolveId(w),
              label: w.ward_name || w.name,
            }))}
            placeholder={t("common.select_item_placeholder", { item: t("common.ward") }) || "Select ward"}
          />
          <ShadcnSelect
            label={t("common.panchayat") || "Panchayat"}
            value={formData.panchayat_id}
            onChange={(v: string) => update("panchayat_id", v)}
            options={filteredPanchayats.map((p: any) => ({
              value: resolveId(p),
              label: p.panchayat_name || p.name,
            }))}
            placeholder={t("common.select_item_placeholder", { item: t("common.panchayat") }) || "Select panchayat"}
            isRequired={false}
          />
        </FormSection>

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

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-md font-medium transition duration-200 flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
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
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
          >
            {t("common.cancel") || "Cancel"}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}