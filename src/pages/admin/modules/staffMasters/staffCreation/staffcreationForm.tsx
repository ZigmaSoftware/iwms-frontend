import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "@/api";
import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import PasswordInput from "@/components/form/input/PasswordInput";
import { getEncryptedRoute } from "@/utils/routeCache";
import { staffCreationApi } from "@/helpers/admin";
import {
  useCreateStaff,
  useUpdateStaff,
} from "@/tanstack/admin/queries/masters/staffCreation";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { useTranslation } from "react-i18next";
import {
  countryApi,
  stateApi,
  districtApi,
  cityApi,
  staffUserTypeApi,
  contractorUserTypeApi,
  departmentApi,
  designationApi,
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
    data && typeof data === "object" && "errors" in data
      ? (data as any).errors
      : data;

  if (payload && typeof payload === "object") {
    return Object.entries(payload as Record<string, unknown>)
      .map(([key, value]) =>
        Array.isArray(value)
          ? `${key}: ${value.join(", ")}`
          : `${key}: ${String(value)}`,
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
  staff_head: "",
  staff_head_id: "",
  employee_known: "",
  salary_type: "",
  active_status: "1",
  staffusertype_id: "",
  contractorusertype_id: "",
  username: "", // ← username field
  password: "",
  office_email: "",
  company_id: "",
  project_id: "",
  marital_status: "",
  dob: "",
  blood_group: "",
  gender: "",
  physically_challenged: "",
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

const STAFF_CREATION_FIELDS: Record<string, string[]> = {
  employee_name: ["employee_name", "name"],
  doj: ["doj", "date_of_joining"],
  department: ["department"],
  designation: ["designation"],
  department_id: ["department_id"],
  designation_id: ["designation_id"],
  grade: ["grade"],
  site_name: ["site_name", "site"],
  staff_head: ["staff_head"],
  staff_head_id: ["staff_head_id"],
  employee_known: ["employee_known"],
  salary_type: ["salary_type"],
  active_status: ["active_status", "is_active"],
  staffusertype_id: ["staffusertype_id", "staff_user_type", "staffusertype"],
  username: ["username"],
  password: ["password"],
  photo: ["photo"],
  company_id: ["company_id", "company"],
  project_id: ["project_id", "project"],
  marital_status: ["marital_status"],
  dob: ["dob", "date_of_birth"],
  blood_group: ["blood_group"],
  gender: ["gender"],
  physically_challenged: ["physically_challenged"],
  present_country: ["present_country", "present_address.country"],
  present_state: ["present_state", "present_address.state"],
  present_district: ["present_district", "present_address.district"],
  present_city: ["present_city", "present_address.city"],
  present_building_no: ["present_building_no", "present_address.building_no"],
  present_street: ["present_street", "present_address.street"],
  present_area: ["present_area", "present_address.area"],
  present_pincode: ["present_pincode", "present_address.pincode"],
  permanent_country: ["permanent_country", "permanent_address.country"],
  permanent_state: ["permanent_state", "permanent_address.state"],
  permanent_district: ["permanent_district", "permanent_address.district"],
  permanent_city: ["permanent_city", "permanent_address.city"],
  permanent_building_no: [
    "permanent_building_no",
    "permanent_address.building_no",
  ],
  permanent_street: ["permanent_street", "permanent_address.street"],
  permanent_area: ["permanent_area", "permanent_address.area"],
  permanent_pincode: ["permanent_pincode", "permanent_address.pincode"],
  contact_mobile: ["contact_mobile", "mobile"],
  contact_email: ["contact_email", "email"],
  driving_licence_no: ["driving_licence_no", "driving_license_no"],
  driving_licence_file: ["driving_licence_file", "driving_license_file"],
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
  const [contractorUserTypeOptions, setContractorUserTypeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [userTypeCategory, setUserTypeCategory] = useState<
    "staff" | "contractor"
  >("staff");
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licencePreview, setLicencePreview] = useState("");
  const licenceInputRef = useRef<HTMLInputElement>(null);
  const [departmentOptions, setDepartmentOptions] = useState<
    { value: string; label: string; name: string; code?: string }[]
  >([]);
  const [designationOptions, setDesignationOptions] = useState<
    { value: string; label: string; name: string; group?: string; departmentId?: string }[]
  >([]);
  const [staffHeadOptions, setStaffHeadOptions] = useState<
    { value: string; label: string; name: string }[]
  >([]);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { showField, filterPayload } = useFieldVisibility(
    "staff-masters",
    "staff-creation",
    STAFF_CREATION_FIELDS,
  );

  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId: hookProjectId,
    companies: hookCompanies,
    projects: hookProjects,
    loggedInCompanyUniqueId,
    isSuperAdmin,
    onCompanyChange: hookOnCompanyChange,
    setProjectId: hookSetProjectId,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

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
    (opt) => opt.value === formData.staffusertype_id,
  );

  const isDriverSelected =
    !!formData.driving_licence_no ||
    !!selectedUserType?.label?.toLowerCase().includes("driver");

  const presentDistrictOptions = useMemo(
    () =>
      districtOptions.filter(
        (option) =>
          !formData.present_state ||
          !option.stateName ||
          option.stateName === formData.present_state,
      ),
    [districtOptions, formData.present_state],
  );

  const presentCityOptions = useMemo(
    () =>
      cityOptions.filter(
        (option) =>
          !formData.present_district ||
          !option.districtName ||
          option.districtName === formData.present_district,
      ),
    [cityOptions, formData.present_district],
  );

  const permanentDistrictOptions = useMemo(
    () =>
      districtOptions.filter(
        (option) =>
          !formData.permanent_state ||
          !option.stateName ||
          option.stateName === formData.permanent_state,
      ),
    [districtOptions, formData.permanent_state],
  );

  const permanentCityOptions = useMemo(
    () =>
      cityOptions.filter(
        (option) =>
          !formData.permanent_district ||
          !option.districtName ||
          option.districtName === formData.permanent_district,
      ),
    [cityOptions, formData.permanent_district],
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
    const loadUserTypeOptions = async () => {
      try {
        const toOptions = (res: any) => {
          const data = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : (res?.data?.results ?? []);
          return data.map((item: any) => ({
            value: item.unique_id,
            label: item.name,
          }));
        };

        const [staffRes, contractorRes] = await Promise.all([
          staffUserTypeApi.list(),
          contractorUserTypeApi.list(),
        ]);

        setStaffUserTypeOptions(toOptions(staffRes));
        setContractorUserTypeOptions(toOptions(contractorRes));
      } catch (err) {
        console.error("Failed to load user type options", err);
      }
    };

    loadUserTypeOptions();
  }, []);

  useEffect(() => {
    const loadLocationOptions = async () => {
      try {
        const [
          countries,
          states,
          districts,
          cities,
          departments,
        ] =
          await Promise.all([
            countryApi.list(),
            stateApi.list(),
            districtApi.list(),
            cityApi.list(),
            departmentApi.list({ params: { status: "active" } }),
          ]);

        const countryList = mapLocationOptions(countries);
        const stateList = mapLocationOptions(states).map((state) => ({
          ...state,
          countryName: countryList.find(
            (country) =>
              country.uniqueId && country.uniqueId === state.countryId,
          )?.value,
        }));
        const districtList = mapLocationOptions(districts).map((district) => ({
          ...district,
          countryName: countryList.find(
            (country) =>
              country.uniqueId && country.uniqueId === district.countryId,
          )?.value,
          stateName: stateList.find(
            (state) => state.uniqueId && state.uniqueId === district.stateId,
          )?.value,
        }));
        const cityList = mapLocationOptions(cities).map((city) => ({
          ...city,
          countryName: countryList.find(
            (country) =>
              country.uniqueId && country.uniqueId === city.countryId,
          )?.value,
          stateName: stateList.find(
            (state) => state.uniqueId && state.uniqueId === city.stateId,
          )?.value,
          districtName: districtList.find(
            (district) =>
              district.uniqueId && district.uniqueId === city.districtId,
          )?.value,
        }));

        setCountryOptions(countryList);
        setStateOptions(stateList);
        setDistrictOptions(districtList);
        setCityOptions(cityList);

        const normalize = (arr: any[]) =>
          arr.filter((i) => i?.is_active !== false && i?.is_deleted !== true);
        const normalizeResponse = (res: any) =>
          Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
              ? res.data
              : res?.data?.results ?? [];

        setDepartmentOptions(
          normalize(normalizeResponse(departments)).map((d: any) => ({
            value: String(d?.unique_id ?? d?.id ?? ""),
            label: d.department_code
              ? `${d.department_name} (${d.department_code})`
              : d.department_name,
            name: d.department_name,
            code: d.department_code,
          })),
        );
      } catch (error) {
        console.error("Failed to load location masters", error);
      }
    };

    void loadLocationOptions();
  }, []);

  useEffect(() => {
    if (!formData.department_id) {
      setDesignationOptions([]);
      return;
    }
    const normalizeResponse = (res: any) =>
      Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : res?.data?.results ?? [];

    designationApi
      .list({ params: { status: "active", department_id: formData.department_id } })
      .then((res: any) => {
        const list = normalizeResponse(res).filter(
          (d: any) => d?.is_active !== false && d?.is_deleted !== true,
        );
        setDesignationOptions(
          list.map((d: any) => ({
            value: String(d?.unique_id ?? d?.id ?? ""),
            label: d.designation_name,
            name: d.designation_name,
            group: d.designation_group,
            departmentId: d.department_id ? String(d.department_id) : undefined,
          })),
        );
      })
      .catch(() => setDesignationOptions([]));
  }, [formData.department_id]);

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
          staff_head: staff.staff_head ?? "",
          staff_head_id: staff.staff_head_id ?? "",
          employee_known: staff.employee_known ?? "",
          salary_type: staff.salary_type ?? "",
          active_status: staff.active_status ? "1" : "0",

          // Auth
          username: staff.username ?? "", // ← populate on edit
          password:
            staff.password ?? staff.user_password ?? staff.staff_password ?? "",

          // Personal details (FLAT — NOT nested)
          marital_status:
            staff.marital_status ??
            staff.personal_details?.marital_status ??
            "",
          dob: staff.dob ?? staff.personal_details?.dob ?? "",
          blood_group:
            staff.blood_group ?? staff.personal_details?.blood_group ?? "",
          gender: staff.gender ?? staff.personal_details?.gender ?? "",
          physically_challenged:
            staff.physically_challenged ??
            staff.personal_details?.physically_challenged ??
            "",

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
          contractorusertype_id: staff.contractorusertype_id ?? "",
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
              : `${backendOrigin}${staff.driving_licence_file}`,
          );
        }

        if (staff.contractorusertype_id) {
          setUserTypeCategory("contractor");
        } else {
          setUserTypeCategory("staff");
        }

        applyCompanyProjectFromRecord(staff);

        console.log("Fetched staff data:", staff);
        if (staff.photo) {
          setPhotoPreview(
            staff.photo.startsWith("http")
              ? staff.photo
              : `${backendOrigin}${staff.photo}`,
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
    const loadStaffHeads = async () => {
      try {
        const params: Record<string, string> = {};
        if (id) params.exclude = id;

        const response = await api.get(
          "/user-creations/staffcreation/staff-head-options/",
          { params },
        );
        const records = Array.isArray(response.data)
          ? response.data
          : response.data?.results ?? [];
        const options: { value: string; label: string; name: string }[] = records.map((staff: any) => ({
          value: String(staff.unique_id),
          label: `${staff.employee_name}${staff.department_name ? ` — ${staff.department_name}` : ""}`,
          name: staff.employee_name,
        }));

        setStaffHeadOptions(options);
      } catch (error) {
        console.error("Failed to load staff head options", error);
        setStaffHeadOptions([]);
      }
    };

    void loadStaffHeads();
  }, [id]);

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

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (
    field: keyof typeof initialFormData,
    value: string,
  ) => {
    if (field === "company_id") {
      hookOnCompanyChange(value);
      hookSetProjectId("");
    }
    if (field === "project_id") {
      hookSetProjectId(value);
    }
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
      if (field === "department_id") {
        const department = departmentOptions.find((item) => item.value === value);
        next.department = department?.name ?? "";
        next.designation_id = "";
        next.designation = "";
        next.staff_head = "";
        next.staff_head_id = "";
      }
      if (field === "designation_id") {
        const designation = designationOptions.find((item) => item.value === value);
        next.designation = designation?.name ?? "";
      }
      if (field === "staffusertype_id" || field === "contractorusertype_id") {
        next.staff_head = "";
        next.staff_head_id = "";
      }
      if (field === "staff_head_id") {
        const staffHead = staffHeadOptions.find((item) => item.value === value);
        next.staff_head = staffHead?.name ?? "";
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
      ...(showField(`${prefix}_country`) && {
        country: formData[
          `${prefix}_country` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_state`) && {
        state: formData[
          `${prefix}_state` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_district`) && {
        district: formData[
          `${prefix}_district` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_city`) && {
        city: formData[
          `${prefix}_city` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_building_no`) && {
        building_no: formData[
          `${prefix}_building_no` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_street`) && {
        street: formData[
          `${prefix}_street` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_area`) && {
        area: formData[
          `${prefix}_area` as keyof typeof initialFormData
        ] as string,
      }),
      ...(showField(`${prefix}_pincode`) && {
        pincode: formData[
          `${prefix}_pincode` as keyof typeof initialFormData
        ] as string,
      }),
    };

    return Object.values(address).some((value) => Boolean(value))
      ? address
      : null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required",
        "error",
      );
      return;
    }

    if (
      showField("photo") &&
      photoFile &&
      !photoFile.type.startsWith("image/")
    ) {
      Swal.fire({
        icon: "warning",
        title: t("admin.staff_creation.invalid_photo_title"),
        text: t("admin.staff_creation.invalid_photo_desc"),
      });
      return;
    }

    if (showField("department_id") && !formData.department_id) {
      Swal.fire("Error", "Department is required", "error");
      return;
    }

    if (showField("designation_id") && !formData.designation_id) {
      Swal.fire("Error", "Designation is required", "error");
      return;
    }

    // ✅ DRIVER VALIDATION
    if (
      showField("driving_licence_file") &&
      showField("driving_licence_no") &&
      isDriverSelected &&
      !licenceFile &&
      !isEdit
    ) {
      Swal.fire({
        icon: "error",
        title: "Licence Required",
        text: "Driver must upload driving licence",
      });
      return;
    }

    setSubmitting(true);

    try {
      const rawPayload: Record<string, any> = {
        employee_name: formData.employee_name,
        doj: formData.doj || null,
        department: formData.department,
        designation: formData.designation,
        department_id: formData.department_id,
        designation_id: formData.designation_id,
        grade: formData.grade,
        site_name: formData.site_name,
        staff_head: formData.staff_head,
        staff_head_id: formData.staff_head_id,
        employee_known: formData.employee_known,
        salary_type: formData.salary_type,
        active_status: formData.active_status === "1",
        company_id: companyUniqueId,
        project_id: hookProjectId || null,
        staffusertype_id:
          userTypeCategory === "staff"
            ? formData.staffusertype_id || null
            : null,
        contractorusertype_id:
          userTypeCategory === "contractor"
            ? formData.contractorusertype_id || null
            : null,
        username: formData.username || null, // ← username in payload

        // Personal
        marital_status: formData.marital_status,
        dob: formData.dob || null,
        blood_group: formData.blood_group,
        gender: formData.gender,
        physically_challenged: formData.physically_challenged,
        contact_mobile: formData.contact_mobile,
        contact_email: formData.contact_email,
      };

      // ✅ Add password if provided
      console.log("Form password:", formData.password);
      console.log("Is password truthy?", Boolean(formData.password));
      console.log("Payload before password:", rawPayload);
      if (formData.password) {
        rawPayload.password = formData.password;
        console.log("Password added to payload:", rawPayload.password);
      } else {
        console.log("No password provided, skipping...");
      }
      console.log("Payload after password:", rawPayload);

      // ✅ ADD DRIVER FIELD HERE (Correct Placement)
      if (showField("driving_licence_no") && isDriverSelected) {
        rawPayload.driving_licence_no = formData.driving_licence_no || "";
      }

      const presentPayload = buildAddressPayload("present");
      const permanentPayload = buildAddressPayload("permanent");

      if (presentPayload) rawPayload.present_address = presentPayload;
      if (permanentPayload) rawPayload.permanent_address = permanentPayload;

      const payload = filterPayload(rawPayload, ["company_id", "project_id"]);

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
      if (showField("photo") && photoFile) {
        formBody.append("photo", photoFile);
      }

      if (showField("driving_licence_file") && licenceFile) {
        formBody.append("driving_licence_file", licenceFile);
      }

      let response: any;

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

      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId: hookProjectId } });
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
      {showField("company_id") && (
        <div>
          <Label htmlFor="company_id">
            {t("admin.nav.company") || "Company"}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            id="company_id"
            value={companyUniqueId}
            onChange={(value) => {
              handleSelectChange("company_id", value);
              handleSelectChange("project_id", "");
            }}
            options={hookCompanies}
            placeholder={t("admin.nav.company_placeholder") || "Select company"}
          />
        </div>
      )}

      {/* ── Project ── */}
      {showField("project_id") && (
        <div>
          <Label htmlFor="project_id">
            {t("admin.nav.project") || "Project"}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            id="project_id"
            value={hookProjectId}
            onChange={(value) => handleSelectChange("project_id", value)}
            options={hookProjects}
            placeholder={t("admin.nav.project_placeholder") || "Select project"}
          />
        </div>
      )}
      {showField("employee_name") && (
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
      )}
      {/* <div>
        <Label htmlFor="employee_id">Employee ID</Label>
        <Input
          id="employee_id"
          value={formData.employee_id}
          onChange={handleInputChange}
        />
      </div> */}
      {showField("doj") && (
        <div>
          <Label htmlFor="doj">{t("admin.staff_creation.doj")}</Label>
          <Input
            id="doj"
            type="date"
            value={formData.doj}
            onChange={handleInputChange}
          />
        </div>
      )}
      {showField("department_id") && (
        <div>
          <Label htmlFor="department_id">
            {t("admin.staff_creation.department_name")}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            id="department_id"
            value={formData.department_id}
            onChange={(value) => handleSelectChange("department_id", value)}
            options={departmentOptions}
            placeholder={t("common.select_item_placeholder", {
              item: t("admin.staff_creation.department_name"),
            })}
          />
        </div>
      )}
      {showField("designation_id") && (
        <div>
          <Label htmlFor="designation_id">
            {t("admin.staff_creation.designation")}
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            id="designation_id"
            value={formData.designation_id}
            onChange={(value) => handleSelectChange("designation_id", value)}
            options={designationOptions}
            placeholder={
              formData.department_id
                ? t("common.select_item_placeholder", { item: t("admin.staff_creation.designation") })
                : "Select a department first"
            }
          />
        </div>
      )}
      {showField("staffusertype_id") && (
        <>
          <div>
            <Label htmlFor="userTypeCategory">User Type</Label>
            <Select
              id="userTypeCategory"
              value={userTypeCategory}
              onChange={(value) => {
                setUserTypeCategory(value as "staff" | "contractor");
                handleSelectChange("staffusertype_id", "");
                handleSelectChange("contractorusertype_id", "");
                handleSelectChange("staff_head_id", "");
              }}
              options={[
                { value: "staff", label: "Staff" },
                { value: "contractor", label: "Contractor" },
              ]}
              placeholder="Select User Type"
            />
          </div>

          {userTypeCategory === "staff" ? (
            <div>
              <Label htmlFor="staffusertype_id">
                {t("admin.staff_creation.staff_user_type")}
              </Label>
              <Select
                id="staffusertype_id"
                value={formData.staffusertype_id}
                onChange={(value) =>
                  handleSelectChange("staffusertype_id", value)
                }
                options={staffUserTypeOptions}
                placeholder={t(
                  "admin.staff_creation.staff_user_type_placeholder",
                )}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="contractorusertype_id">
                Contractor User Type
              </Label>
              <Select
                id="contractorusertype_id"
                value={formData.contractorusertype_id}
                onChange={(value) =>
                  handleSelectChange("contractorusertype_id", value)
                }
                options={contractorUserTypeOptions}
                placeholder="Select Contractor Type"
              />
            </div>
          )}
        </>
      )}

      {/* ── Username ── */}
      {showField("username") && (
        <div>
          <Label htmlFor="username">{t("admin.staff_creation.username")}</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder={t("admin.staff_creation.username_placeholder")}
          />
        </div>
      )}

      {/* ── Password ── */}
      {showField("password") && (
        <div>
          <PasswordInput
            id="password"
            label={t("admin.staff_creation.password")}
            value={formData.password}
            onChange={handleInputChange}
            placeholder={t("admin.staff_creation.password_placeholder")}
          />
        </div>
      )}

      {isDriverSelected &&
        (showField("driving_licence_no") ||
          showField("driving_licence_file")) && (
          <>
            {showField("driving_licence_no") && (
              <div>
                <Label htmlFor="driving_licence_no">
                  {t("admin.staff_creation.driving_licence_no")}
                </Label>
                <Input
                  id="driving_licence_no"
                  value={formData.driving_licence_no}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {showField("driving_licence_file") && (
              <div className="md:col-span-2">
                <Label htmlFor="driving_licence">
                  {t("admin.staff_creation.driving_licence_upload")}
                </Label>
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
                      {licenceFile?.name ||
                        t("admin.staff_creation.driving_licence_no_file")}
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
            )}
          </>
        )}
      {showField("grade") && (
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
      )}
      {showField("site_name") && (
        <div>
          <Label htmlFor="site_name">
            {t("admin.staff_creation.site_name")}
          </Label>
          <Select
            id="site_name"
            value={formData.site_name}
            onChange={(value) => handleSelectChange("site_name", value)}
            options={siteOptions}
            placeholder={t("admin.staff_creation.site_placeholder")}
          />
        </div>
      )}
      {showField("staff_head_id") && (
        <div>
          <Label htmlFor="staff_head_id">
            {t("admin.staff_creation.staff_head")}
          </Label>
          <Select
            id="staff_head_id"
            value={formData.staff_head_id}
            onChange={(value) => handleSelectChange("staff_head_id", value)}
            options={staffHeadOptions}
            placeholder={
              formData.department_id
                ? t("common.select_item_placeholder", {
                    item: t("admin.staff_creation.staff_head"),
                  })
                : t("admin.staff_creation.department_id")
            }
          />
        </div>
      )}
      {showField("employee_known") && (
        <div>
          <Label htmlFor="employee_known">
            {t("admin.staff_creation.employee_known")}
          </Label>
          <Select
            id="employee_known"
            value={formData.employee_known}
            onChange={(value) => handleSelectChange("employee_known", value)}
            options={yesNoOptions}
            placeholder={t("admin.staff_creation.select_option")}
          />
        </div>
      )}
      {showField("salary_type") && (
        <div>
          <Label htmlFor="salary_type">
            {t("admin.staff_creation.salary_type")}
          </Label>
          <Select
            id="salary_type"
            value={formData.salary_type}
            onChange={(value) => handleSelectChange("salary_type", value)}
            options={salaryTypeOptions}
            placeholder={t("admin.staff_creation.salary_type_placeholder")}
          />
        </div>
      )}
      {showField("active_status") && (
        <div>
          <Label htmlFor="active_status">
            {t("admin.staff_creation.active_status")}
          </Label>
          <Select
            id="active_status"
            value={formData.active_status}
            onChange={(value) => handleSelectChange("active_status", value)}
            options={activeStatusOptions}
            placeholder={t("common.select_status")}
          />
        </div>
      )}
      {showField("photo") && (
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
              <div className="relative h-32 w-32">
                <img
                  src={photoPreview}
                  alt={t("admin.staff_creation.photo_preview_alt")}
                  className="h-32 w-32 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview("");
                    if (photoInputRef.current) photoInputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs leading-none hover:bg-red-600"
                  title="Remove photo"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed px-2 text-xs text-gray-500">
                {t("admin.staff_creation.photo_empty")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderPersonalSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {showField("marital_status") && (
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
        )}
        {showField("dob") && (
          <div>
            <Label htmlFor="dob">{t("admin.staff_creation.dob")}</Label>
            <Input
              id="dob"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
            />
          </div>
        )}
        {showField("dob") && (
          <div>
            <Label htmlFor="age">{t("admin.staff_creation.age")}</Label>
            <Input
              id="age"
              value={formData.dob ? calculateAge(formData.dob) : ""}
              placeholder={t("admin.staff_creation.age_auto")}
            />
          </div>
        )}
        {showField("blood_group") && (
          <div>
            <Label htmlFor="blood_group">
              {t("admin.staff_creation.blood_group")}
            </Label>
            <Select
              id="blood_group"
              value={formData.blood_group}
              onChange={(value) => handleSelectChange("blood_group", value)}
              options={bloodGroupOptions}
              placeholder={t("admin.staff_creation.blood_group_placeholder")}
            />
          </div>
        )}
        {showField("gender") && (
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
        )}
        {showField("physically_challenged") && (
          <div>
            <Label htmlFor="physically_challenged">
              {t("admin.staff_creation.physically_challenged")}
            </Label>
            <Select
              id="physically_challenged"
              value={formData.physically_challenged}
              onChange={(value) =>
                handleSelectChange("physically_challenged", value)
              }
              options={yesNoOptions}
              placeholder={t("admin.staff_creation.select_option")}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(showField("present_country") ||
          showField("present_state") ||
          showField("present_district") ||
          showField("present_city") ||
          showField("present_building_no") ||
          showField("present_street") ||
          showField("present_area") ||
          showField("present_pincode")) && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-600">
              {t("admin.staff_creation.address_present_title")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {showField("present_country") && (
                <div>
                  <Label htmlFor="present_country">{t("common.country")}</Label>
                  <Select
                    id="present_country"
                    value={formData.present_country}
                    onChange={(value) =>
                      handleSelectChange("present_country", value)
                    }
                    options={countryOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.country"),
                    })}
                  />
                </div>
              )}
              {showField("present_state") && (
                <div>
                  <Label htmlFor="present_state">{t("common.state")}</Label>
                  <Select
                    id="present_state"
                    value={formData.present_state}
                    onChange={(value) =>
                      handleSelectChange("present_state", value)
                    }
                    options={stateOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.state"),
                    })}
                  />
                </div>
              )}
              {showField("present_district") && (
                <div>
                  <Label htmlFor="present_district">
                    {t("common.district")}
                  </Label>
                  <Select
                    id="present_district"
                    value={formData.present_district}
                    onChange={(value) =>
                      handleSelectChange("present_district", value)
                    }
                    options={presentDistrictOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.district"),
                    })}
                  />
                </div>
              )}
              {showField("present_city") && (
                <div>
                  <Label htmlFor="present_city">{t("common.city")}</Label>
                  <Select
                    id="present_city"
                    value={formData.present_city}
                    onChange={(value) =>
                      handleSelectChange("present_city", value)
                    }
                    options={presentCityOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.city"),
                    })}
                  />
                </div>
              )}
              {showField("present_building_no") && (
                <div className="sm:col-span-2">
                  <Label htmlFor="present_building_no">
                    {t("common.building_no")}
                  </Label>
                  <Input
                    id="present_building_no"
                    value={formData.present_building_no}
                    onChange={handleInputChange}
                  />
                </div>
              )}
              {showField("present_street") && (
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
              )}
              {showField("present_area") && (
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
              )}
              {showField("present_pincode") && (
                <div>
                  <Label htmlFor="present_pincode">{t("common.pincode")}</Label>
                  <Input
                    id="present_pincode"
                    value={formData.present_pincode}
                    onChange={handleInputChange}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {(showField("permanent_country") ||
          showField("permanent_state") ||
          showField("permanent_district") ||
          showField("permanent_city") ||
          showField("permanent_building_no") ||
          showField("permanent_street") ||
          showField("permanent_area") ||
          showField("permanent_pincode")) && (
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
              {showField("permanent_country") && (
                <div>
                  <Label htmlFor="permanent_country">
                    {t("common.country")}
                  </Label>
                  <Select
                    id="permanent_country"
                    value={formData.permanent_country}
                    onChange={(value) =>
                      handleSelectChange("permanent_country", value)
                    }
                    options={countryOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.country"),
                    })}
                  />
                </div>
              )}
              {showField("permanent_state") && (
                <div>
                  <Label htmlFor="permanent_state">{t("common.state")}</Label>
                  <Select
                    id="permanent_state"
                    value={formData.permanent_state}
                    onChange={(value) =>
                      handleSelectChange("permanent_state", value)
                    }
                    options={stateOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.state"),
                    })}
                  />
                </div>
              )}
              {showField("permanent_district") && (
                <div>
                  <Label htmlFor="permanent_district">
                    {t("common.district")}
                  </Label>
                  <Select
                    id="permanent_district"
                    value={formData.permanent_district}
                    onChange={(value) =>
                      handleSelectChange("permanent_district", value)
                    }
                    options={permanentDistrictOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.district"),
                    })}
                  />
                </div>
              )}
              {showField("permanent_city") && (
                <div>
                  <Label htmlFor="permanent_city">{t("common.city")}</Label>
                  <Select
                    id="permanent_city"
                    value={formData.permanent_city}
                    onChange={(value) =>
                      handleSelectChange("permanent_city", value)
                    }
                    options={permanentCityOptions}
                    placeholder={t("common.select_item_placeholder", {
                      item: t("common.city"),
                    })}
                  />
                </div>
              )}
              {showField("permanent_building_no") && (
                <div className="sm:col-span-2">
                  <Label htmlFor="permanent_building_no">
                    {t("common.building_no")}
                  </Label>
                  <Input
                    id="permanent_building_no"
                    value={formData.permanent_building_no}
                    onChange={handleInputChange}
                  />
                </div>
              )}
              {showField("permanent_street") && (
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
              )}
              {showField("permanent_area") && (
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
              )}
              {showField("permanent_pincode") && (
                <div>
                  <Label htmlFor="permanent_pincode">
                    {t("common.pincode")}
                  </Label>
                  <Input
                    id="permanent_pincode"
                    value={formData.permanent_pincode}
                    onChange={handleInputChange}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(showField("contact_mobile") || showField("contact_email")) && (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-600">
            {t("admin.staff_creation.contact_details")}
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {showField("contact_mobile") && (
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
            )}
            {showField("contact_email") && (
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
            )}
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
      )}
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
          {section === "official"
            ? renderOfficialSection()
            : renderPersonalSection()}

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
              onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId: hookProjectId } })}
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
