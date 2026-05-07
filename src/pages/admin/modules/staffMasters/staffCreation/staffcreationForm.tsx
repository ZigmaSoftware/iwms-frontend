import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "@/api";
import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import PasswordInput from "@/components/form/input/PasswordInput";
import { getEncryptedRoute } from "@/utils/routeCache";
import { staffCreationApi } from "@/helpers/admin";
import { useCreateStaff, useUpdateStaff } from "@/tanstack/admin/queries/masters/staffCreation";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useTranslation } from "react-i18next";
import {
  countryApi,
  stateApi,
  districtApi,
  cityApi,
  staffUserTypeApi,
  companyApi,
  projectApi,
} from "@/helpers/admin/index";

type Section = "official" | "personal";
type LocationOption = {
  value: string;
  label: string;
  uniqueId?: string;
  countryId?: string;
  countryName?: string;
  stateId?: string;
  stateName?: string;
  districtId?: string;
  districtName?: string;
};

const getGradeOptions = (t: (key: string) => string) => [
  { value: "Grade A", label: t("admin.staff_creation.grade_a") },
  { value: "Grade B", label: t("admin.staff_creation.grade_b") },
  { value: "Grade C", label: t("admin.staff_creation.grade_c") },
  { value: "Grade D", label: t("admin.staff_creation.grade_d") },
];

const getSiteOptions = (t: (key: string) => string) => [
  { value: "Erode (Head Office)", label: t("admin.staff_creation.site_erode") },
  { value: "Coimbatore", label: t("admin.staff_creation.site_coimbatore") },
  { value: "Chennai", label: t("admin.staff_creation.site_chennai") },
  { value: "Hyderabad", label: t("admin.staff_creation.site_hyderabad") },
];

const getSalaryTypeOptions = (t: (key: string) => string) => [
  { value: "Monthly", label: t("admin.staff_creation.salary_monthly") },
  { value: "Daily", label: t("admin.staff_creation.salary_daily") },
  { value: "Contract", label: t("admin.staff_creation.salary_contract") },
];

const getYesNoOptions = (t: (key: string) => string) => [
  { value: "Yes", label: t("common.yes") },
  { value: "No", label: t("common.no") },
];

const getMaritalStatusOptions = (t: (key: string) => string) => [
  { value: "Single", label: t("admin.staff_creation.marital_single") },
  { value: "Married", label: t("admin.staff_creation.marital_married") },
  { value: "Widowed", label: t("admin.staff_creation.marital_widowed") },
  { value: "Divorced", label: t("admin.staff_creation.marital_divorced") },
];

const getGenderOptions = (t: (key: string) => string) => [
  { value: "Male", label: t("admin.staff_creation.gender_male") },
  { value: "Female", label: t("admin.staff_creation.gender_female") },
  { value: "Other", label: t("admin.staff_creation.gender_other") },
];

const getBloodGroupOptions = () => [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const mapLocationOptions = (items: any[]): LocationOption[] =>
  (items ?? [])
    .filter((item) => item?.name && item.is_active !== false)
    .map((item) => ({
      value: item.name,
      label: item.name,
      uniqueId: normalizeId(item.unique_id ?? item.id),
      countryId: normalizeId(item.country_id ?? item.country),
      stateId: normalizeId(item.state_id ?? item.state),
      districtId: normalizeId(item.district_id ?? item.district),
    }));

type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

const formatErrorMessage = (t: (key: string) => string, error: unknown) => {
  if (!error) return t("common.review_fields");
  if (typeof error === "string") return error;

  const data = (error as ErrorWithResponse)?.response?.data;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");

  const payload =
    data && typeof data === "object" && "errors" in data ? (data as any).errors : data;

  if (payload && typeof payload === "object") {
    return Object.entries(payload as Record<string, unknown>)
      .map(([key, value]) =>
        Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${String(value)}`
      )
      .join("\n");
  }

  return t("common.review_fields");
};

const initialFormData = {
  employee_name: "",
  // employee_id: "",
  doj: "",
  department: "",
  designation: "",
  department_id: "",
  designation_id: "",

  grade: "",
  site_name: "",
  biometric_id: "",
  staff_head: "",
  staff_head_id: "",
  employee_known: "",
  salary_type: "",
  active_status: "1",
  staffusertype_id: "",
  username: "",       // ← username field
  password: "",
  office_email: "",
  company_id: "",
  project_id: "",
  marital_status: "",
  dob: "",
  blood_group: "",
  gender: "",
  physically_challenged: "",
  extra_curricular: "",
  present_country: "",
  present_state: "",
  present_district: "",
  present_city: "",
  present_building_no: "",
  present_street: "",
  present_area: "",
  present_pincode: "",
  permanent_country: "",
  permanent_state: "",
  permanent_district: "",
  permanent_city: "",
  permanent_building_no: "",
  permanent_street: "",
  permanent_area: "",
  permanent_pincode: "",
  contact_mobile: "",
  contact_email: "",
  driving_licence_no: "",
  // emergency_contact: "",
  // emergency_mobile: "",
};

export default function StaffCreationForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [section, setSection] = useState<Section>("official");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [countryOptions, setCountryOptions] = useState<LocationOption[]>([]);
  const [stateOptions, setStateOptions] = useState<LocationOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [staffUserTypeOptions, setStaffUserTypeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licencePreview, setLicencePreview] = useState("");
  const licenceInputRef = useRef<HTMLInputElement>(null);
  const [companyOptions, setCompanyOptions] = useState<{ value: string; label: string }[]>([]);
  const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const {
    companyUniqueId,
    loggedInCompanyUniqueId,
    isSuperAdmin,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const { encStaffMasters, encStaffCreation } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encStaffCreation}`;
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const backendOrigin =
    api.defaults.baseURL?.replace(/\/api\/desktop\/?$/, "") || "";

  const gradeOptions = getGradeOptions(t);
  const siteOptions = getSiteOptions(t);
  const salaryTypeOptions = getSalaryTypeOptions(t);
  const yesNoOptions = getYesNoOptions(t);
  const maritalStatusOptions = getMaritalStatusOptions(t);
  const genderOptions = getGenderOptions(t);
  const bloodGroupOptions = getBloodGroupOptions();
  const activeStatusOptions = [
    { value: "1", label: t("common.active") },
    { value: "0", label: t("common.inactive") },
  ];

  const selectedUserType = staffUserTypeOptions.find(
    (opt) => opt.value === formData.staffusertype_id
  );

  const isDriverSelected =
    !!formData.driving_licence_no ||
    !!selectedUserType?.label?.toLowerCase().includes("driver");

  const presentDistrictOptions = useMemo(
    () =>
      districtOptions.filter(
        (option) => !formData.present_state || !option.stateName || option.stateName === formData.present_state
      ),
    [districtOptions, formData.present_state]
  );

  const presentCityOptions = useMemo(
    () =>
      cityOptions.filter(
        (option) => !formData.present_district || !option.districtName || option.districtName === formData.present_district
      ),
    [cityOptions, formData.present_district]
  );

  const permanentDistrictOptions = useMemo(
    () =>
      districtOptions.filter(
        (option) => !formData.permanent_state || !option.stateName || option.stateName === formData.permanent_state
      ),
    [districtOptions, formData.permanent_state]
  );

  const permanentCityOptions = useMemo(
    () =>
      cityOptions.filter(
        (option) => !formData.permanent_district || !option.districtName || option.districtName === formData.permanent_district
      ),
    [cityOptions, formData.permanent_district]
  );

  const filteredProjects = projectOptions.filter(
    (p: any) => !formData.company_id || p.company_id === formData.company_id
  );

  const handleLicenceUpload = (file: File | null) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid File",
        text: "Only JPG, JPEG, PNG, PDF allowed",
      });
      return;
    }

    setLicenceFile(file);

    const fileUrl = URL.createObjectURL(file);
    setLicencePreview(fileUrl);
  };

  useEffect(() => {
    if (!isDriverSelected && !isEdit) {
      setLicenceFile(null);
      setLicencePreview("");
      setFormData((prev) => ({
        ...prev,
        driving_licence_no: "",
      }));
    }
  }, [isDriverSelected]);

  useEffect(() => {
    const loadStaffUserTypes = async () => {
      try {
        console.log("Loading staff user types...");
        const res: any = await staffUserTypeApi.list();
        console.log("Staff user types response:", res);

        const data = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : res?.data?.results ?? [];

        console.log("Staff user types data:", data);

        const options = data.map((item: any) => ({
          value: item.unique_id,
          label: item.name,
        }));

        console.log("Staff user types options:", options);
        setStaffUserTypeOptions(options);
      } catch (err) {
        console.error("Failed to load staff user types", err);
      }
    };

    loadStaffUserTypes();
  }, []);

  useEffect(() => {
    const loadLocationOptions = async () => {
      try {
        const [countries, states, districts, cities, companies, projects] = await Promise.all([
          countryApi.list(),
          stateApi.list(),
          districtApi.list(),
          cityApi.list(),
          companyApi.list(),
          projectApi.list(),
        ]);

        const countryList = mapLocationOptions(countries);
        const stateList = mapLocationOptions(states).map((state) => ({
          ...state,
          countryName: countryList.find((country) => country.uniqueId && country.uniqueId === state.countryId)?.value,
        }));
        const districtList = mapLocationOptions(districts).map((district) => ({
          ...district,
          countryName: countryList.find((country) => country.uniqueId && country.uniqueId === district.countryId)?.value,
          stateName: stateList.find((state) => state.uniqueId && state.uniqueId === district.stateId)?.value,
        }));
        const cityList = mapLocationOptions(cities).map((city) => ({
          ...city,
          countryName: countryList.find((country) => country.uniqueId && country.uniqueId === city.countryId)?.value,
          stateName: stateList.find((state) => state.uniqueId && state.uniqueId === city.stateId)?.value,
          districtName: districtList.find((district) => district.uniqueId && district.uniqueId === city.districtId)?.value,
        }));

        setCountryOptions(countryList);
        setStateOptions(stateList);
        setDistrictOptions(districtList);
        setCityOptions(cityList);
        
        const normalize = (arr: any[]) =>
          arr.filter((i) => i?.is_active !== false && i?.is_deleted !== true);
        
        const companyList = normalize(companies);
        const projectList = normalize(projects);
        
        setCompanyOptions(
          companyList.map((c: any) => ({
            value: String(c?.unique_id ?? c?.id ?? ""),
            label: c.name,
          }))
        );
        setProjectOptions(
          projectList.map((p: any) => ({
            value: String(p?.unique_id ?? p?.id ?? ""),
            label: p.name,
            company_id: p.company_unique_id,
          }))
        );
      } catch (error) {
        console.error("Failed to load location masters", error);
      }
    };

    void loadLocationOptions();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setFetching(true);

    staffCreationApi
      .get(id)
      .then((staff) => {
        setFormData((prev) => ({
          ...prev,

          // Office details
          employee_name: staff.employee_name ?? "",
          doj: staff.doj ?? "",
          department: staff.department ?? "",
          designation: staff.designation ?? "",
          department_id: staff.department_id ?? "",
          designation_id: staff.designation_id ?? "",
          grade: staff.grade ?? "",
          site_name: staff.site_name ?? "",
          biometric_id: staff.biometric_id ?? "",
          staff_head: staff.staff_head ?? "",
          staff_head_id: staff.staff_head_id ?? "",
          employee_known: staff.employee_known ?? "",
          salary_type: staff.salary_type ?? "",
          active_status: staff.active_status ? "1" : "0",

          // Auth
          username: staff.username ?? "",                                          // ← populate on edit
          password: staff.password ?? staff.user_password ?? staff.staff_password ?? "",

          // Personal details (FLAT — NOT nested)
          marital_status:
            staff.marital_status ?? staff.personal_details?.marital_status ?? "",
          dob: staff.dob ?? staff.personal_details?.dob ?? "",
          blood_group:
            staff.blood_group ?? staff.personal_details?.blood_group ?? "",
          gender: staff.gender ?? staff.personal_details?.gender ?? "",
          physically_challenged:
            staff.physically_challenged ??
            staff.personal_details?.physically_challenged ??
            "",
          extra_curricular:
            staff.extra_curricular ?? staff.personal_details?.extra_curricular ?? "",

          present_country: staff.present_address?.country ?? "",
          present_state: staff.present_address?.state ?? "",
          present_district: staff.present_address?.district ?? "",
          present_city: staff.present_address?.city ?? "",
          present_building_no: staff.present_address?.building_no ?? "",
          present_street: staff.present_address?.street ?? "",
          present_area: staff.present_address?.area ?? "",
          present_pincode: staff.present_address?.pincode ?? "",

          // JSON Address — Permanent
          permanent_country: staff.permanent_address?.country ?? "",
          permanent_state: staff.permanent_address?.state ?? "",
          permanent_district: staff.permanent_address?.district ?? "",
          permanent_city: staff.permanent_address?.city ?? "",
          permanent_building_no: staff.permanent_address?.building_no ?? "",
          permanent_street: staff.permanent_address?.street ?? "",
          permanent_area: staff.permanent_address?.area ?? "",
          permanent_pincode: staff.permanent_address?.pincode ?? "",

          // DRIVER and USER TYPE details
          staffusertype_id: staff.staffusertype_id ?? "",
          driving_licence_no: staff.driving_licence_no ?? "",

          // Company and Project
          company_id: String(staff.company_id ?? ""),
          project_id: String(staff.project_id ?? ""),

          // Contact details (FLAT — NOT nested)
          contact_mobile: staff.contact_mobile ?? "",
          contact_email: staff.contact_email ?? "",
        }));

        if (staff.driving_licence_file) {
          setLicencePreview(
            staff.driving_licence_file.startsWith("http")
              ? staff.driving_licence_file
              : `${backendOrigin}${staff.driving_licence_file}`
          );
        }

        applyCompanyProjectFromRecord(staff);

        console.log("Fetched staff data:", staff);
        if (staff.photo) {
          setPhotoPreview(
            staff.photo.startsWith("http")
              ? staff.photo
              : `${backendOrigin}${staff.photo}`
          );
        }
      })
      .catch((error) => {
        console.error("Failed to load staff", error);
        Swal.fire({
          icon: "error",
          title: t("admin.staff_creation.load_failed_title"),
          text:
            error.response?.data?.detail ||
            t("admin.staff_creation.load_failed_desc"),
        });
      })
      .finally(() => setFetching(false));
  }, [backendOrigin, id, isEdit]);

  useEffect(() => {
    if (!photoFile) return;
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    if (!sameAddress) return;
    setFormData((prev) => ({
      ...prev,
      permanent_country: prev.present_country,
      permanent_state: prev.present_state,
      permanent_district: prev.present_district,
      permanent_city: prev.present_city,
      permanent_building_no: prev.present_building_no,
      permanent_street: prev.present_street,
      permanent_area: prev.present_area,
      permanent_pincode: prev.present_pincode,
    }));
  }, [
    sameAddress,
    formData.present_country,
    formData.present_state,
    formData.present_district,
    formData.present_city,
    formData.present_building_no,
    formData.present_street,
    formData.present_area,
    formData.present_pincode,
  ]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: keyof typeof initialFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "present_country") {
        next.present_state = "";
        next.present_district = "";
        next.present_city = "";
      }
      if (field === "present_state") {
        next.present_district = "";
        next.present_city = "";
      }
      if (field === "present_district") {
        next.present_city = "";
      }
      if (field === "permanent_country") {
        next.permanent_state = "";
        next.permanent_district = "";
        next.permanent_city = "";
      }
      if (field === "permanent_state") {
        next.permanent_district = "";
        next.permanent_city = "";
      }
      if (field === "permanent_district") {
        next.permanent_city = "";
      }

      return next;
    });
  };

  const calculateAge = (dobValue: string) => {
    const birthDate = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    return age >= 0 ? age : 0;
  };

  const buildAddressPayload = (prefix: "present" | "permanent") => {
    const address = {
      country: formData[`${prefix}_country` as keyof typeof initialFormData] as string,
      state: formData[`${prefix}_state` as keyof typeof initialFormData] as string,
      district: formData[`${prefix}_district` as keyof typeof initialFormData] as string,
      city: formData[`${prefix}_city` as keyof typeof initialFormData] as string,
      building_no: formData[`${prefix}_building_no` as keyof typeof initialFormData] as string,
      street: formData[`${prefix}_street` as keyof typeof initialFormData] as string,
      area: formData[`${prefix}_area` as keyof typeof initialFormData] as string,
      pincode: formData[`${prefix}_pincode` as keyof typeof initialFormData] as string,
    };

    return Object.values(address).some((value) => Boolean(value)) ? address : null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required",
        "error"
      );
      return;
    }

    if (photoFile && !photoFile.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: t("admin.staff_creation.invalid_photo_title"),
        text: t("admin.staff_creation.invalid_photo_desc"),
      });
      return;
    }

    // ✅ DRIVER VALIDATION
    if (isDriverSelected && !licenceFile && !isEdit) {
      Swal.fire({
        icon: "error",
        title: "Licence Required",
        text: "Driver must upload driving licence",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        employee_name: formData.employee_name,
        doj: formData.doj || null,
        department: formData.department,
        designation: formData.designation,
        department_id: formData.department_id,
        designation_id: formData.designation_id,
        grade: formData.grade,
        site_name: formData.site_name,
        biometric_id: formData.biometric_id,
        staff_head: formData.staff_head,
        staff_head_id: formData.staff_head_id,
        employee_known: formData.employee_known,
        salary_type: formData.salary_type,
        active_status: formData.active_status === "1",
        company_id: formData.company_id || companyUniqueId,
        project_id: formData.project_id || null,
        staffusertype_id: formData.staffusertype_id || null,
        username: formData.username || null,     // ← username in payload

        // Personal
        marital_status: formData.marital_status,
        dob: formData.dob || null,
        blood_group: formData.blood_group,
        gender: formData.gender,
        physically_challenged: formData.physically_challenged,
        extra_curricular: formData.extra_curricular,
        contact_mobile: formData.contact_mobile,
        contact_email: formData.contact_email,
      };

      // ✅ Add password if provided
      console.log("Form password:", formData.password);
      console.log("Is password truthy?", Boolean(formData.password));
      console.log("Payload before password:", payload);
      if (formData.password) {
        payload.password = formData.password;
        console.log("Password added to payload:", payload.password);
      } else {
        console.log("No password provided, skipping...");
      }
      console.log("Payload after password:", payload);

      // ✅ ADD DRIVER FIELD HERE (Correct Placement)
      if (isDriverSelected) {
        payload.driving_licence_no = formData.driving_licence_no || "";
      }

      const presentPayload = buildAddressPayload("present");
      const permanentPayload = buildAddressPayload("permanent");

      if (presentPayload) payload.present_address = presentPayload;
      if (permanentPayload) payload.permanent_address = permanentPayload;

      const formBody = new FormData();

      // Debug: Log all payload entries
      console.log("All payload entries:", Object.entries(payload));

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (typeof value === "object") {
          formBody.append(key, JSON.stringify(value));
        } else {
          formBody.append(key, value);
        }
      });

      // ✅ FILE APPENDS
      if (photoFile) {
        formBody.append("photo", photoFile);
      }

      if (licenceFile) {
        formBody.append("driving_licence_file", licenceFile);
      }

      let response: any;
      const multipartConfig = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (isEdit) {
        if (!id) throw new Error("Missing staff id");
        response = await updateMutation.mutateAsync({ id, payload: formBody });
      } else {
        response = await createMutation.mutateAsync(formBody);
      }

      Swal.fire({
        icon: "success",
        title: isEdit
          ? t("admin.staff_creation.save_success_update")
          : t("admin.staff_creation.save_success_create"),
        text:
          response?.message ||
          response?.data?.message ||
          t("admin.staff_creation.save_success_desc"),
      });

      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      console.error("Failed to save staff", error);
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: formatErrorMessage(t, error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const sectionButtons: { label: string; key: Section }[] = [
    { label: t("admin.staff_creation.section_official"), key: "official" },
    { label: t("admin.staff_creation.section_personal"), key: "personal" },
  ];

  const renderOfficialSection = () => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

      {/* ── Company ── */}
      <div>
        <Label htmlFor="company_id">
          {t("admin.nav.company") || "Company"}
          <span className="text-red-500 ml-1">*</span>
        </Label>
        <Select
          id="company_id"
          value={formData.company_id}
          onChange={(value) => {
            handleSelectChange("company_id", value);
            handleSelectChange("project_id", "");
          }}
          options={companyOptions}
          placeholder={t("admin.nav.company_placeholder") || "Select company"}
        />
      </div>

      {/* ── Project ── */}
      <div>
        <Label htmlFor="project_id">
          {t("admin.nav.project") || "Project"}
          <span className="text-red-500 ml-1">*</span>
        </Label>
        <Select
          id="project_id"
          value={formData.project_id}
          onChange={(value) => handleSelectChange("project_id", value)}
          options={filteredProjects}
          placeholder={t("admin.nav.project_placeholder") || "Select project"}
        />
      </div>
      <div>
        <Label htmlFor="employee_name">
          {t("admin.staff_creation.employee_name")}
        </Label>
        <Input
          id="employee_name"
          value={formData.employee_name}
          onChange={handleInputChange}
          required
        />
      </div>
      {/* <div>
        <Label htmlFor="employee_id">Employee ID</Label>
        <Input
          id="employee_id"
          value={formData.employee_id}
          onChange={handleInputChange}
        />
      </div> */}
      <div>
        <Label htmlFor="doj">{t("admin.staff_creation.doj")}</Label>
        <Input id="doj" type="date" value={formData.doj} onChange={handleInputChange} />
      </div>
      <div>
        <Label htmlFor="department">{t("admin.staff_creation.department_name")}</Label>
        <Input
          id="department"
          value={formData.department}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="designation">{t("admin.staff_creation.designation")}</Label>
        <Input
          id="designation"
          value={formData.designation}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="staffusertype_id">
          {t("admin.staff_creation.staff_user_type")}
        </Label>
        <Select
          id="staffusertype_id"
          value={formData.staffusertype_id}
          onChange={(value) => handleSelectChange("staffusertype_id", value)}
          options={staffUserTypeOptions}
          placeholder={t("admin.staff_creation.staff_user_type_placeholder")}
        />
      </div>

      {/* ── Username ── */}
      <div>
        <Label htmlFor="username">
          {t("admin.staff_creation.username")}
        </Label>
        <Input
          id="username"
          value={formData.username}
          onChange={handleInputChange}
          placeholder={t("admin.staff_creation.username_placeholder")}
        />
      </div>

      {/* ── Password ── */}
      <div>
        <PasswordInput
          id="password"
          label={t("admin.staff_creation.password")}
          value={formData.password}
          onChange={handleInputChange}
          placeholder={t("admin.staff_creation.password_placeholder")}
        />
      </div>

      {isDriverSelected && (
        <>
          <div>
            <Label htmlFor="driving_licence_no">{t("admin.staff_creation.driving_licence_no")}</Label>
            <Input
              id="driving_licence_no"
              value={formData.driving_licence_no}
              onChange={handleInputChange}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="driving_licence">{t("admin.staff_creation.driving_licence_upload")}</Label>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => licenceInputRef.current?.click()}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  {t("admin.staff_creation.driving_licence_choose")}
                </button>
                <span className="text-sm text-gray-500">
                  {licenceFile?.name || t("admin.staff_creation.driving_licence_no_file")}
                </span>
              </div>
              <input
                ref={licenceInputRef}
                type="file"
                id="driving_licence"
                accept=".jpg,.jpeg,.png,.pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  handleLicenceUpload(file);
                  e.target.value = "";
                }}
              />
              {licencePreview ? (
                licencePreview.toLowerCase().endsWith(".pdf") ? (
                  <a
                    href={licencePreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm mt-2 inline-block text-blue-600 hover:underline"
                  >
                    Open Licence PDF
                  </a>
                ) : (
                  <a
                    href={licencePreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block"
                  >
                    <img
                      src={licencePreview}
                      alt="Licence preview"
                      className="h-32 w-32 border rounded"
                    />
                  </a>
                )
              ) : licenceFile?.type === "application/pdf" ? (
                <a
                  href={URL.createObjectURL(licenceFile)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm mt-2 inline-block text-blue-600 hover:underline"
                >
                  PDF: {licenceFile.name}
                </a>
              ) : null}
            </div>
          </div>
        </>
      )}
      <div>
        <Label htmlFor="department_id">{t("admin.staff_creation.department_id")}</Label>
        <Input
          id="department_id"
          value={formData.department_id}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="designation_id">{t("admin.staff_creation.designation_id")}</Label>
        <Input
          id="designation_id"
          value={formData.designation_id}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="grade">{t("admin.staff_creation.grade")}</Label>
        <Select
          id="grade"
          value={formData.grade}
          onChange={(value) => handleSelectChange("grade", value)}
          options={gradeOptions}
          placeholder={t("admin.staff_creation.grade_placeholder")}
        />
      </div>
      <div>
        <Label htmlFor="site_name">{t("admin.staff_creation.site_name")}</Label>
        <Select
          id="site_name"
          value={formData.site_name}
          onChange={(value) => handleSelectChange("site_name", value)}
          options={siteOptions}
          placeholder={t("admin.staff_creation.site_placeholder")}
        />
      </div>
      <div>
        <Label htmlFor="biometric_id">{t("admin.staff_creation.biometric_id")}</Label>
        <Input
          id="biometric_id"
          value={formData.biometric_id}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="staff_head">{t("admin.staff_creation.staff_head")}</Label>
        <Input
          id="staff_head"
          value={formData.staff_head}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="staff_head_id">{t("admin.staff_creation.staff_head_id")}</Label>
        <Input
          id="staff_head_id"
          value={formData.staff_head_id}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <Label htmlFor="employee_known">{t("admin.staff_creation.employee_known")}</Label>
        <Select
          id="employee_known"
          value={formData.employee_known}
          onChange={(value) => handleSelectChange("employee_known", value)}
          options={yesNoOptions}
          placeholder={t("admin.staff_creation.select_option")}
        />
      </div>
      <div>
        <Label htmlFor="salary_type">{t("admin.staff_creation.salary_type")}</Label>
        <Select
          id="salary_type"
          value={formData.salary_type}
          onChange={(value) => handleSelectChange("salary_type", value)}
          options={salaryTypeOptions}
          placeholder={t("admin.staff_creation.salary_type_placeholder")}
        />
      </div>
      <div>
        <Label htmlFor="active_status">{t("admin.staff_creation.active_status")}</Label>
        <Select
          id="active_status"
          value={formData.active_status}
          onChange={(value) => handleSelectChange("active_status", value)}
          options={activeStatusOptions}
          placeholder={t("common.select_status")}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="photo">{t("admin.staff_creation.photo_label")}</Label>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              {t("admin.staff_creation.photo_choose")}
            </button>
            <span className="text-sm text-gray-500">
              {photoFile?.name || t("admin.staff_creation.photo_none")}
            </span>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            id="photo"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (!file) {
                setPhotoFile(null);
                return;
              }
              if (!file.type.startsWith("image/")) {
                Swal.fire({
                  icon: "warning",
                  title: t("admin.staff_creation.invalid_photo_title"),
                  text: t("admin.staff_creation.invalid_photo_desc"),
                });
                event.target.value = "";
                setPhotoFile(null);
                setPhotoPreview("");
                return;
              }
              setPhotoFile(file);
            }}
          />
          {photoPreview ? (
            <img
              src={photoPreview}
              alt={t("admin.staff_creation.photo_preview_alt")}
              className="h-32 w-32 rounded-lg border object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed px-2 text-xs text-gray-500">
              {t("admin.staff_creation.photo_empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonalSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="marital_status">
            {t("admin.staff_creation.marital_status")}
          </Label>
          <Select
            id="marital_status"
            value={formData.marital_status}
            onChange={(value) => handleSelectChange("marital_status", value)}
            options={maritalStatusOptions}
            placeholder={t("admin.staff_creation.marital_status_placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="dob">{t("admin.staff_creation.dob")}</Label>
          <Input id="dob" type="date" value={formData.dob} onChange={handleInputChange} />
        </div>
        <div>
          <Label htmlFor="age">{t("admin.staff_creation.age")}</Label>
          <Input
            id="age"
            value={formData.dob ? calculateAge(formData.dob) : ""}
            placeholder={t("admin.staff_creation.age_auto")}
          />
        </div>
        <div>
          <Label htmlFor="blood_group">{t("admin.staff_creation.blood_group")}</Label>
          <Select
            id="blood_group"
            value={formData.blood_group}
            onChange={(value) => handleSelectChange("blood_group", value)}
            options={bloodGroupOptions}
            placeholder={t("admin.staff_creation.blood_group_placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="gender">{t("admin.staff_creation.gender")}</Label>
          <Select
            id="gender"
            value={formData.gender}
            onChange={(value) => handleSelectChange("gender", value)}
            options={genderOptions}
            placeholder={t("admin.staff_creation.gender_placeholder")}
          />
        </div>
        <div>
          <Label htmlFor="physically_challenged">
            {t("admin.staff_creation.physically_challenged")}
          </Label>
          <Select
            id="physically_challenged"
            value={formData.physically_challenged}
            onChange={(value) => handleSelectChange("physically_challenged", value)}
            options={yesNoOptions}
            placeholder={t("admin.staff_creation.select_option")}
          />
        </div>
        <div>
          <Label htmlFor="extra_curricular">
            {t("admin.staff_creation.extra_curricular")}
          </Label>
          <textarea
            id="extra_curricular"
            value={formData.extra_curricular}
            onChange={handleInputChange}
            rows={3}
            className="input-validate h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-3 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-600">
            {t("admin.staff_creation.address_present_title")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="present_country">{t("common.country")}</Label>
              <Select
                id="present_country"
                value={formData.present_country}
                onChange={(value) => handleSelectChange("present_country", value)}
                options={countryOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.country") })}
              />
            </div>
            <div>
              <Label htmlFor="present_state">{t("common.state")}</Label>
              <Select
                id="present_state"
                value={formData.present_state}
                onChange={(value) => handleSelectChange("present_state", value)}
                options={stateOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.state") })}
              />
            </div>
            <div>
              <Label htmlFor="present_district">{t("common.district")}</Label>
              <Select
                id="present_district"
                value={formData.present_district}
                onChange={(value) => handleSelectChange("present_district", value)}
                options={presentDistrictOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
              />
            </div>
            <div>
              <Label htmlFor="present_city">{t("common.city")}</Label>
              <Select
                id="present_city"
                value={formData.present_city}
                onChange={(value) => handleSelectChange("present_city", value)}
                options={presentCityOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="present_building_no">{t("common.building_no")}</Label>
              <Input
                id="present_building_no"
                value={formData.present_building_no}
                onChange={handleInputChange}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="present_street">{t("common.street")}</Label>
              <textarea
                id="present_street"
                value={formData.present_street}
                onChange={handleInputChange}
                rows={2}
                className="input-validate h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="present_area">{t("common.area")}</Label>
              <textarea
                id="present_area"
                value={formData.present_area}
                onChange={handleInputChange}
                rows={2}
                className="input-validate h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <Label htmlFor="present_pincode">{t("common.pincode")}</Label>
              <Input
                id="present_pincode"
                value={formData.present_pincode}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">
              {t("admin.staff_creation.address_permanent_title")}
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={sameAddress}
                onChange={() => setSameAddress((prev) => !prev)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              {t("admin.staff_creation.address_same")}
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="permanent_country">{t("common.country")}</Label>
              <Select
                id="permanent_country"
                value={formData.permanent_country}
                onChange={(value) => handleSelectChange("permanent_country", value)}
                options={countryOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.country") })}
              />
            </div>
            <div>
              <Label htmlFor="permanent_state">{t("common.state")}</Label>
              <Select
                id="permanent_state"
                value={formData.permanent_state}
                onChange={(value) => handleSelectChange("permanent_state", value)}
                options={stateOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.state") })}
              />
            </div>
            <div>
              <Label htmlFor="permanent_district">{t("common.district")}</Label>
              <Select
                id="permanent_district"
                value={formData.permanent_district}
                onChange={(value) => handleSelectChange("permanent_district", value)}
                options={permanentDistrictOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
              />
            </div>
            <div>
              <Label htmlFor="permanent_city">{t("common.city")}</Label>
              <Select
                id="permanent_city"
                value={formData.permanent_city}
                onChange={(value) => handleSelectChange("permanent_city", value)}
                options={permanentCityOptions}
                placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="permanent_building_no">{t("common.building_no")}</Label>
              <Input
                id="permanent_building_no"
                value={formData.permanent_building_no}
                onChange={handleInputChange}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="permanent_street">{t("common.street")}</Label>
              <textarea
                id="permanent_street"
                value={formData.permanent_street}
                onChange={handleInputChange}
                rows={2}
                className="input-validate h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="permanent_area">{t("common.area")}</Label>
              <textarea
                id="permanent_area"
                value={formData.permanent_area}
                onChange={handleInputChange}
                rows={2}
                className="input-validate h-auto w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <Label htmlFor="permanent_pincode">{t("common.pincode")}</Label>
              <Input
                id="permanent_pincode"
                value={formData.permanent_pincode}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-600">
          {t("admin.staff_creation.contact_details")}
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="contact_mobile">
              {t("admin.staff_creation.contact_mobile")}
            </Label>
            <Input
              id="contact_mobile"
              value={formData.contact_mobile}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="contact_email">
              {t("admin.staff_creation.contact_email")}
            </Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={handleInputChange}
            />
          </div>
          {/* <div>
            <Label htmlFor="emergency_contact">Emergency Contact</Label>
            <Input
              id="emergency_contact"
              value={formData.emergency_contact}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="emergency_mobile">Emergency Mobile</Label>
            <Input
              id="emergency_mobile"
              value={formData.emergency_mobile}
              onChange={handleInputChange}
            />
          </div> */}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <ComponentCard
        title={
          isEdit
            ? t("admin.staff_creation.title_edit")
            : t("admin.staff_creation.title_add")
        }
        desc={t("admin.staff_creation.form_subtitle")}
      >
        <div className="flex flex-wrap gap-3 pb-4">
          {sectionButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setSection(btn.key)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                section === btn.key
                  ? "border-brand-500 bg-brand-500/10 text-brand-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {section === "official" ? renderOfficialSection() : renderPersonalSection()}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting
                ? isEdit
                  ? t("common.updating")
                  : t("common.saving")
                : isEdit
                  ? t("common.update")
                  : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
