import { useEffect, useState, useCallback, useMemo } from "react";
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
   TYPES & CONSTANTS
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
  is_active: boolean;
}

const INITIAL_FORM_STATE: FormDataType = {
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
  is_active: true,
};

const ID_PROOF_OPTIONS = [
  { value: "AADHAAR", key: "id_proof_aadhaar" },
  { value: "VOTER_ID", key: "id_proof_voter" },
  { value: "PAN_CARD", key: "id_proof_pan" },
  { value: "DL", key: "id_proof_dl" },
  { value: "PASSPORT", key: "id_proof_passport" },
];

const REQUIRED_FIELDS = [
  "customer_name",
  "contact_no",
  "email",
  "username",
  "building_no",
  "street",
  "area",
  "pincode",
  "latitude",
  "longitude",
  "sqft",
  "id_proof_type",
  "id_no",
  "country_id",
  "state_id",
  "district_id",
  "city_id",
  "zone_id",
  "ward_id",
  "property_id",
  "sub_property_id",
] as (keyof FormDataType)[];

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

  /* ===============================
     STATE
  ================================ */
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormDataType>(INITIAL_FORM_STATE);
  const [isActive, setIsActive] = useState(true);

  const [dropdowns, setDropdowns] = useState({
    wards: [] as any[],
    zones: [] as any[],
    cities: [] as any[],
    districts: [] as any[],
    states: [] as any[],
    countries: [] as any[],
    properties: [] as any[],
    subProperties: [] as any[],
    panchayats: [] as any[],
  });

  /* ===============================
     UTILITY FUNCTIONS
  ================================ */
  const resolveId = useCallback((obj: any): string => {
    return String(obj?.unique_id ?? obj?.id ?? "");
  }, []);

  const normalize = useCallback((arr: any[]): any[] => {
    return arr.filter((item) => item?.is_active !== false && item?.is_deleted !== true);
  }, []);

  // Updated update function - simpler and more direct
const update = useCallback(
  (key: keyof FormDataType, value: any) => {
    setFormData((prev) => {
      if (prev[key] === value) return prev; // prevent unnecessary re-render
      return { ...prev, [key]: value };
    });
  },
  []
);
  /* ===============================
     CASCADING FILTER LOGIC
  ================================ */
  const filteredStates = useMemo(
    () =>
      dropdowns.states.filter((s) => !formData.country_id || s.country_id === formData.country_id),
    [dropdowns.states, formData.country_id]
  );

  const filteredDistricts = useMemo(
    () =>
      dropdowns.districts.filter(
        (d) => !formData.state_id || d.state_id === formData.state_id
      ),
    [dropdowns.districts, formData.state_id]
  );

  const filteredCities = useMemo(
    () =>
      dropdowns.cities.filter(
        (c) => !formData.district_id || c.district_id === formData.district_id
      ),
    [dropdowns.cities, formData.district_id]
  );

  const filteredZones = useMemo(
    () =>
      dropdowns.zones.filter((z) => !formData.city_id || z.city_id === formData.city_id),
    [dropdowns.zones, formData.city_id]
  );

  const filteredWards = useMemo(
    () =>
      dropdowns.wards.filter((w) => !formData.zone_id || w.zone_id === formData.zone_id),
    [dropdowns.wards, formData.zone_id]
  );

  const filteredPanchayats = useMemo(
    () =>
      dropdowns.panchayats.filter(
        (p) =>
          (!formData.district_id || p.district_id === formData.district_id) &&
          (!formData.city_id || p.city_id === formData.city_id)
      ),
    [dropdowns.panchayats, formData.district_id, formData.city_id]
  );

  const filteredSubProperties = useMemo(
    () =>
      dropdowns.subProperties.filter(
        (sp) => !formData.property_id || sp.property_id === formData.property_id
      ),
    [dropdowns.subProperties, formData.property_id]
  );

  /* ===============================
     HANDLERS - CASCADING DROPDOWNS
  ================================ */
  const handleCountryChange = useCallback((v: string) => {
    update("country_id", v);
    update("state_id", "");
    update("district_id", "");
    update("city_id", "");
    update("zone_id", "");
    update("ward_id", "");
    update("panchayat_id", "");
  }, [update]);

  const handleStateChange = useCallback((v: string) => {
    update("state_id", v);
    update("district_id", "");
    update("city_id", "");
    update("zone_id", "");
    update("ward_id", "");
    update("panchayat_id", "");
  }, [update]);

  const handleDistrictChange = useCallback((v: string) => {
    update("district_id", v);
    update("city_id", "");
    update("zone_id", "");
    update("ward_id", "");
    update("panchayat_id", "");
  }, [update]);

  const handleCityChange = useCallback((v: string) => {
    update("city_id", v);
    update("zone_id", "");
    update("ward_id", "");
    update("panchayat_id", "");
  }, [update]);

  const handleZoneChange = useCallback((v: string) => {
    update("zone_id", v);
    update("ward_id", "");
    update("panchayat_id", "");
  }, [update]);

  const handleWardChange = useCallback((v: string) => {
    update("ward_id", v);
    update("panchayat_id", "");
  }, [update]);

  const handlePropertyChange = useCallback((v: string) => {
    update("property_id", v);
    update("sub_property_id", "");
  }, [update]);

  /* ===============================
     DATA FETCHING
  ================================ */
  const fetchDropdowns = useCallback(async () => {
    try {
      const [
        wards,
        zones,
        cities,
        districts,
        states,
        countries,
        properties,
        subProperties,
        panchayats,
      ] = await Promise.all([
        wardApi.list(),
        zoneApi.list(),
        cityApi.list(),
        districtApi.list(),
        stateApi.list(),
        countryApi.list(),
        propertiesApi.list(),
        subPropertiesApi.list(),
        panchayatApi.list(),
      ]);

      setDropdowns({
        wards: normalize(wards),
        zones: normalize(zones),
        cities: normalize(cities),
        districts: normalize(districts),
        states: normalize(states),
        countries: normalize(countries),
        properties: normalize(properties),
        subProperties: normalize(subProperties),
        panchayats: normalize(panchayats),
      });
    } catch (err) {
      console.error("Failed to fetch dropdowns:", err);
      Swal.fire("Error", "Failed to load location data", "error");
    }
  }, [normalize]);

  /* ===============================
     LIFECYCLE
  ================================ */
  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    if (isEdit && id) {
      customerCreationApi
        .get(id)
        .then((res) => {
          const data = res as any;
          setFormData((prev) => ({ ...prev, ...res }));
          setIsActive(data.is_active ?? true);
        })
        .catch(() =>
          Swal.fire(
            t("common.error"),
            t("admin.customer_creation.load_failed"),
            "error"
          )
        );
    }
  }, [id, isEdit, t]);

  /* ===============================
     VALIDATION
  ================================ */
  const validateForm = useCallback((): boolean => {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!formData[field]) {
        const fieldLabel = String(field).replace(/_/g, " ");
        Swal.fire(t("common.warning"), `${fieldLabel} is required`, "warning");
        return false;
      }
    }

    // Contact validation
    if (!/^\d{10}$/.test(formData.contact_no)) {
      Swal.fire(
        t("admin.customer_creation.invalid_contact_title"),
        t("admin.customer_creation.invalid_contact_desc"),
        "warning"
      );
      return false;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire("Invalid Email", "Please enter a valid email address", "warning");
      return false;
    }

    // Pincode validation
    if (!/^\d{6}$/.test(formData.pincode)) {
      Swal.fire(
        t("admin.customer_creation.invalid_pincode_title"),
        t("admin.customer_creation.invalid_pincode_desc"),
        "warning"
      );
      return false;
    }

    // Latitude & Longitude validation
    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Swal.fire(
        t("admin.customer_creation.invalid_coordinates_title"),
        t("admin.customer_creation.invalid_coordinates_desc"),
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
  }, [formData, t]);

  /* ===============================
     SUBMIT
  ================================ */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      const payload = {
        ...formData,
        latitude: String(parseFloat(formData.latitude)),
        longitude: String(parseFloat(formData.longitude)),
        sqft: String(parseFloat(formData.sqft)),
        is_active: isActive,
      };

      try {
        setLoading(true);
        if (isEdit) {
          await customerCreationApi.update(id as string, payload);
        } else {
          await customerCreationApi.create(payload);
        }

        Swal.fire(
          t("common.success"),
          t("admin.customer_creation.save_success"),
          "success"
        );
        navigate(ENC_LIST_PATH);
      } catch (err) {
        console.error("Submit error:", err);
        Swal.fire(t("common.save_failed"), t("common.save_failed_desc"), "error");
      } finally {
        setLoading(false);
      }
    },
    [formData, isActive, isEdit, id, validateForm, navigate, ENC_LIST_PATH, t]
  );

  /* ===============================
     COMPONENTS
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
    <div>
      <Label>
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
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
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </div>
  );

  /* ===============================
     RENDER
  ================================ */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.customer_creation.title_edit")
          : t("admin.customer_creation.title_add")
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PERSONAL INFORMATION SECTION */}
        <FormSection title="Personal Information">
          <div>
            <Label>
              {t("admin.customer_creation.customer_name")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              placeholder="Enter full name"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("admin.customer_creation.contact_no")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.contact_no}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                update("contact_no", numericValue);
              }}
              placeholder="10 digit mobile number"
              maxLength={10}
              type="text"
              inputMode="numeric"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              Username
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.username}
              onChange={(e) => update("username", e.target.value)}
              placeholder="Enter username"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              Email Address
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full"
            />
          </div>
        </FormSection>

        {/* ADDRESS INFORMATION SECTION */}
        <FormSection title="Address Information">
          <div>
            <Label>
              {t("common.building_no")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.building_no}
              onChange={(e) => update("building_no", e.target.value)}
              placeholder="e.g., 13A"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("common.street")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.street}
              onChange={(e) => update("street", e.target.value)}
              placeholder="e.g., Main Street"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("common.area")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.area}
              onChange={(e) => update("area", e.target.value)}
              placeholder="e.g., Village Center"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("common.pincode")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.pincode}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, "");
                update("pincode", numericValue);
              }}
              placeholder="6 digit pincode"
              maxLength={6}
              type="text"
              inputMode="numeric"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("common.latitude")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={formData.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              placeholder="e.g., 13.0827"
              className="w-full"
            />
          </div>
          <div>
            <Label>
              {t("common.longitude")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={formData.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              placeholder="e.g., 80.2707"
              className="w-full"
            />
          </div>
        </FormSection>

        {/* PROPERTY INFORMATION SECTION */}
        <FormSection title="Property Information">
          <div>
            <Label>
              Square Feet (Sqft)
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.sqft}
              onChange={(e) => update("sqft", e.target.value)}
              placeholder="e.g., 1200.50"
              className="w-full"
            />
          </div>
          <ShadcnSelect
            label={t("admin.customer_creation.property")}
            value={formData.property_id}
            onChange={handlePropertyChange}
            placeholder={t("admin.customer_creation.property_placeholder")}
            options={dropdowns.properties.map((p) => ({
              value: resolveId(p),
              label: p.property_name,
            }))}
          />
          <ShadcnSelect
            label={t("admin.customer_creation.sub_property")}
            value={formData.sub_property_id}
            onChange={(v) => update("sub_property_id", v)}
            placeholder={t("admin.customer_creation.sub_property_placeholder")}
            options={filteredSubProperties.map((sp) => ({
              value: resolveId(sp),
              label: sp.sub_property_name,
            }))}
          />
        </FormSection>

        {/* IDENTIFICATION SECTION */}
        <FormSection title="Identification">
          <ShadcnSelect
            label={t("admin.customer_creation.id_proof_type")}
            value={formData.id_proof_type}
            onChange={(v) => update("id_proof_type", v)}
            placeholder={t("admin.customer_creation.id_proof_placeholder")}
            options={ID_PROOF_OPTIONS.map((opt) => ({
              value: opt.value,
              label: t(`admin.customer_creation.${opt.key}`),
            }))}
          />
          <div className="md:col-span-2">
            <Label>
              {t("admin.customer_creation.id_no")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={formData.id_no}
              onChange={(e) => update("id_no", e.target.value)}
              placeholder="Enter identification number"
              className="w-full"
            />
          </div>
        </FormSection>

        {/* LOCATION HIERARCHY SECTION - CASCADING DROPDOWNS */}
        <FormSection title="Location Details">
          <ShadcnSelect
            label={t("common.country")}
            value={formData.country_id}
            onChange={handleCountryChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.country") })}
            options={dropdowns.countries.map((c) => ({
              value: resolveId(c),
              label: c.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.state")}
            value={formData.state_id}
            onChange={handleStateChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.state") })}
            options={filteredStates.map((s) => ({
              value: resolveId(s),
              label: s.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.district")}
            value={formData.district_id}
            onChange={handleDistrictChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
            options={filteredDistricts.map((d) => ({
              value: resolveId(d),
              label: d.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.city")}
            value={formData.city_id}
            onChange={handleCityChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
            options={filteredCities.map((c) => ({
              value: resolveId(c),
              label: c.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.zone")}
            value={formData.zone_id}
            onChange={handleZoneChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.zone") })}
            options={filteredZones.map((z) => ({
              value: resolveId(z),
              label: z.zone_name || z.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.ward")}
            value={formData.ward_id}
            onChange={handleWardChange}
            placeholder={t("common.select_item_placeholder", { item: t("common.ward") })}
            options={filteredWards.map((w) => ({
              value: resolveId(w),
              label: w.ward_name || w.name,
            }))}
          />

          <ShadcnSelect
            label={t("common.panchayat")}
            value={formData.panchayat_id}
            onChange={(v) => update("panchayat_id", v)}
            placeholder={t("common.select_item_placeholder", { item: t("common.panchayat") })}
            options={filteredPanchayats.map((p) => ({
              value: resolveId(p),
              label: p.panchayat_name || p.name,
            }))}
            isRequired={false}
          />
        </FormSection>

        {/* STATUS SECTION */}
        <FormSection title="Status">
          <div>
            <Label>
              {t("common.status")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-medium transition duration-200"
          >
            {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded font-medium transition duration-200"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}