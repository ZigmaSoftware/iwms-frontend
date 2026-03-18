import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { getEncryptedRoute } from "@/utils/routeCache";
import { filterActiveRecords } from "@/utils/customerUtils";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";

const vehicleTypeApi = adminApi.vehicleTypes;
const fuelTypeApi = adminApi.fuels;
const vehicleCreationApi = adminApi.vehicleCreations;
const companyApi = adminApi.companies;
const projectApi = adminApi.projects;

const FILE_ICON = "/images/pdfimage/download.png";

type VehicleTypeOption = {
  unique_id: string;
  vehicleType: string;
  is_active?: boolean;
};

type FuelTypeOption = {
  unique_id: string;
  fuel_type: string;
  is_active?: boolean;
};

type Company = { unique_id: string; name: string };
type Project = { unique_id: string; name: string; company_unique_id?: string };

export default function VehicleCreationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { encTransportMaster, encVehicleCreation } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encVehicleCreation}`;

  const [loading, setLoading] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelTypeOption[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const [form, setForm] = useState({
    vehicleNo: "",
    vehicleTypeId: "",
    fuelTypeId: "",
    capacity: "",
    mileagePerLiter: "",
    serviceRecord: "",
    vehicleInsurance: "",
    insuranceExpiryDate: "",
    vehicleCondition: "NEW",
    fuelTankCapacity: "",
    isActive: "true",
  });

  const [rcFile, setRcFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [existingRcFile, setExistingRcFile] = useState<string | null>(null);
  const [existingInsuranceFile, setExistingInsuranceFile] = useState<string | null>(null);
  const [rcPreviewUrl, setRcPreviewUrl] = useState<string>("");
  const [insurancePreviewUrl, setInsurancePreviewUrl] = useState<string>("");
  const [isRcPreviewImage, setIsRcPreviewImage] = useState(false);
  const [isInsurancePreviewImage, setIsInsurancePreviewImage] = useState(false);
  const [removeRcFile, setRemoveRcFile] = useState(false);
  const [removeInsuranceFile, setRemoveInsuranceFile] = useState(false);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resolveId = (item: { unique_id?: string; id?: string | number }) =>
    String(item?.unique_id ?? item?.id ?? "");

  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp")
    );
  };

  // Fetch companies & projects on mount
  useEffect(() => {
    companyApi
      .listPaginated(1, 100)
      .then((data: any) => setCompanies(data.results))
      .catch(() => console.error("Failed to load companies"));

    projectApi
      .listPaginated(1, 100)
      .then((data: any) => setProjects(data.results))
      .catch(() => console.error("Failed to load projects"));
  }, []);

  // For ADD mode — load vehicle types & fuel types normally
  useEffect(() => {
    if (isEdit) return;
    Promise.all([vehicleTypeApi.list(), fuelTypeApi.list()]).then(
      ([vehicleRes, fuelRes]) => {
        setVehicleTypes(vehicleRes);
        setFuelTypes(fuelRes);
      }
    );
  }, [isEdit]);

  // For EDIT mode — load everything together so dropdowns pre-select correctly
  useEffect(() => {
    if (!isEdit) return;

    vehicleCreationApi
      .get(id as string)
      .then((res: any) => {
        // Load vehicle types & fuel types FIRST, then set form values
        Promise.all([
          vehicleTypeApi.list(),
          fuelTypeApi.list(),
        ]).then(([vehicleRes, fuelRes]) => {
          setVehicleTypes(vehicleRes);
          setFuelTypes(fuelRes);

          // Set form AFTER options are loaded — dropdowns will pre-select correctly
          setForm({
            vehicleNo: res.vehicle_no ?? "",
            vehicleTypeId: res.vehicle_type_id ?? "",   // ← direct string, no String() wrapper
            fuelTypeId: res.fuel_type_id ?? "",          // ← direct string, no String() wrapper
            capacity: res.capacity ?? "",
            mileagePerLiter: res.mileage_per_liter ?? "",
            serviceRecord: res.service_record ?? "",
            vehicleInsurance: res.vehicle_insurance ?? "",
            insuranceExpiryDate: res.insurance_expiry_date ?? "",
            vehicleCondition: res.vehicle_condition ?? "NEW",
            fuelTankCapacity: res.fuel_tank_capacity ?? "",
            isActive: String(res.is_active ?? true),
          });

          setSelectedCompany(res.company_id || "");
          setSelectedProject(res.project_id || "");

          setExistingRcFile(res.rc_upload ?? null);
          setExistingInsuranceFile(res.vehicle_insurance_file ?? null);

          if (res.rc_upload) {
            setRcPreviewUrl(res.rc_upload);
            setIsRcPreviewImage(isImageUrl(res.rc_upload));
          }
          if (res.vehicle_insurance_file) {
            setInsurancePreviewUrl(res.vehicle_insurance_file);
            setIsInsurancePreviewImage(isImageUrl(res.vehicle_insurance_file));
          }
          setRemoveRcFile(false);
          setRemoveInsuranceFile(false);
        });
      })
      .catch((err) => {
        console.error("Failed to load vehicle:", err);
        Swal.fire({
          icon: "error",
          title: t("common.load_failed"),
          text: t("common.request_failed"),
        });
      });
  }, [id, isEdit, t]);

  useEffect(() => {
    return () => {
      if (rcPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(rcPreviewUrl);
      if (insurancePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(insurancePreviewUrl);
    };
  }, [rcPreviewUrl, insurancePreviewUrl]);

  const vehicleTypeOptions = useMemo(
    () =>
      filterActiveRecords(vehicleTypes, form.vehicleTypeId ? [form.vehicleTypeId] : []).map(
        (item) => ({ value: resolveId(item), label: item.vehicleType })
      ),
    [vehicleTypes, form.vehicleTypeId]
  );

  const fuelTypeOptions = useMemo(
    () =>
      filterActiveRecords(fuelTypes, form.fuelTypeId ? [form.fuelTypeId] : []).map(
        (item) => ({ value: resolveId(item), label: item.fuel_type })
      ),
    [fuelTypes, form.fuelTypeId]
  );

  const conditionOptions = [
    { value: "NEW", label: t("admin.vehicle_creation.condition_new") },
    { value: "SECOND_HAND", label: t("admin.vehicle_creation.condition_second_hand") },
  ];

  const handleFileChange = (
    file: File | null,
    setFile: (file: File | null) => void,
    setPreviewUrl: (url: string) => void,
    setIsPreviewImage: (value: boolean) => void,
    existingUrl: string | null,
    currentPreviewUrl: string,
  ) => {
    if (file) {
      if (currentPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(currentPreviewUrl);
      setFile(file);
      const objectUrl = URL.createObjectURL(file);
      setIsPreviewImage(file.type.startsWith("image/"));
      setPreviewUrl(objectUrl);
      return;
    }
    setFile(null);
    if (existingUrl) {
      setPreviewUrl(existingUrl);
      setIsPreviewImage(isImageUrl(existingUrl));
    } else {
      setPreviewUrl("");
      setIsPreviewImage(false);
    }
  };

  const clearPreview = (options: {
    previewUrl: string;
    setPreviewUrl: (url: string) => void;
    setFile: (file: File | null) => void;
    setIsPreviewImage: (value: boolean) => void;
    setExistingFile?: (value: string | null) => void;
    setRemoveFlag?: (value: boolean) => void;
    inputId?: string;
  }) => {
    const {
      previewUrl, setPreviewUrl, setFile,
      setIsPreviewImage, setExistingFile, setRemoveFlag, inputId,
    } = options;
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    if (inputId) {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (input) input.value = "";
    }
    setFile(null);
    setPreviewUrl("");
    setIsPreviewImage(false);
    setExistingFile?.(null);
    setRemoveFlag?.(true);
  };

  const extractFileName = (url: string) => {
    const cleaned = url.split("?")[0];
    return cleaned.substring(cleaned.lastIndexOf("/") + 1) || cleaned;
  };

  const renderFileActions = (
    previewUrl: string,
    file: File | null,
    onPreview: () => void,
    onRemove: () => void,
  ) => {
    if (!previewUrl) return null;
    const label = file?.name ?? extractFileName(previewUrl);
    return (
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onPreview}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          {t("admin.vehicle_creation.preview_label")} ({label})
        </button>
        <button type="button" onClick={onRemove}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm">
          {t("common.remove")}
        </button>
      </div>
    );
  };

  const buildPayload = () => ({
    vehicle_no: form.vehicleNo.trim(),
    vehicle_type_id: form.vehicleTypeId || null,
    fuel_type_id: form.fuelTypeId || null,
    capacity: form.capacity || null,
    mileage_per_liter: form.mileagePerLiter || null,
    service_record: form.serviceRecord || null,
    vehicle_insurance: form.vehicleInsurance || null,
    insurance_expiry_date: form.insuranceExpiryDate || null,
    vehicle_condition: form.vehicleCondition,
    fuel_tank_capacity: form.fuelTankCapacity || null,
    is_active: form.isActive === "true",
    company_id_input: selectedCompany,
    project_id_input: selectedProject || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.vehicleNo.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("admin.vehicle_creation.missing_fields_title"),
        text: t("admin.vehicle_creation.missing_fields_desc"),
      });
      return;
    }

    if (!selectedCompany) {
      Swal.fire({
        icon: "warning",
        title: "Company Required",
        text: "Please select a company.",
      });
      return;
    }

    if (!selectedProject) {
      Swal.fire({
        icon: "warning",
        title: "Project Required",
        text: "Please select a project.",
      });
      return;
    }

    setLoading(true);
    const payload = buildPayload();
    const removalPayload = {
      ...payload,
      ...(removeRcFile ? { rc_upload: null } : {}),
      ...(removeInsuranceFile ? { vehicle_insurance_file: null } : {}),
    };
    const hasFiles = Boolean(rcFile || insuranceFile);

    try {
      if (hasFiles) {
        const formBody = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          formBody.append(key, String(value));
        });
        if (rcFile) formBody.append("rc_upload", rcFile);
        if (insuranceFile) formBody.append("vehicle_insurance_file", insuranceFile);

        const multipartConfig = {
          headers: { "Content-Type": "multipart/form-data" },
        };

        if (isEdit) {
          await vehicleCreationApi.update(id as string, formBody, multipartConfig);
        } else {
          await vehicleCreationApi.create(formBody, multipartConfig);
        }
      } else if (isEdit) {
        await vehicleCreationApi.update(id as string, removalPayload);
      } else {
        await vehicleCreationApi.create(payload);
      }

      Swal.fire({
        icon: "success",
        title: t("admin.vehicle_creation.save_success"),
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      console.error("Failed to save vehicle:", error);
      const data = error?.response?.data;
      let message = t("common.request_failed");
      if (typeof data === "object" && data !== null) {
        message = Object.entries(data)
          .map(([key, val]) => `${key}: ${(val as string[]).join(", ")}`)
          .join("\n");
      } else if (typeof data === "string") {
        message = data;
      }
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.vehicle_creation.title_edit")
          : t("admin.vehicle_creation.title_add")
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Vehicle No */}
          <div>
            <Label htmlFor="vehicleNo">
              {t("admin.vehicle_creation.vehicle_no")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vehicleNo"
              value={form.vehicleNo}
              onChange={(e) => update("vehicleNo", e.target.value)}
              placeholder={t("admin.vehicle_creation.vehicle_no_placeholder")}
              className="input-validate w-full"
              required
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="isActive">{t("common.status")}</Label>
            <Select
              id="isActive"
              value={form.isActive}
              onChange={(value) => update("isActive", value)}
              options={[
                { value: "true", label: t("common.active") },
                { value: "false", label: t("common.inactive") },
              ]}
              placeholder={t("common.select_status")}
              className="input-validate w-full"
            />
          </div>

          {/* Company Dropdown */}
          <div>
            <Label htmlFor="company">
              Company <span className="text-red-500">*</span>
            </Label>
            <select
              id="company"
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedProject("");
              }}
              required
              className={`w-full px-3 py-2 border ${
                !selectedCompany
                  ? "border-red-400 focus:ring-red-200"
                  : "border-green-400 focus:ring-green-200"
              } rounded-sm focus:outline-none focus:ring-2`}
            >
              <option value="">-- Select Company --</option>
              {companies.map((c) => (
                <option key={c.unique_id} value={c.unique_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Dropdown */}
          <div>
            <Label htmlFor="project">
              Project <span className="text-red-500">*</span>
            </Label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              required
              className={`w-full px-3 py-2 border ${
                !selectedProject
                  ? "border-red-400 focus:ring-red-200"
                  : "border-green-400 focus:ring-green-200"
              } rounded-sm focus:outline-none focus:ring-2`}
            >
              <option value="">-- Select Project --</option>
              {projects
                .filter((p: any) =>
                  selectedCompany
                    ? p.company_unique_id === selectedCompany
                    : true
                )
                .map((p) => (
                  <option key={p.unique_id} value={p.unique_id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Vehicle Type */}
          <div>
            <Label htmlFor="vehicleType">
              {t("admin.vehicle_creation.vehicle_type")}
            </Label>
            <Select
              id="vehicleType"
              value={form.vehicleTypeId}
              onChange={(value) => update("vehicleTypeId", value)}
              options={vehicleTypeOptions}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.vehicle_creation.vehicle_type"),
              })}
              className="input-validate w-full"
            />
          </div>

          {/* Fuel Type */}
          <div>
            <Label htmlFor="fuelType">
              {t("admin.vehicle_creation.fuel_type")}
            </Label>
            <Select
              id="fuelType"
              value={form.fuelTypeId}
              onChange={(value) => update("fuelTypeId", value)}
              options={fuelTypeOptions}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.vehicle_creation.fuel_type"),
              })}
              className="input-validate w-full"
            />
          </div>

          {/* Capacity */}
          <div>
            <Label htmlFor="capacity">
              {t("admin.vehicle_creation.capacity")}
            </Label>
            <Input
              id="capacity"
              value={form.capacity}
              onChange={(e) => update("capacity", e.target.value)}
              placeholder={t("admin.vehicle_creation.capacity_placeholder")}
              className="input-validate w-full"
            />
          </div>

          {/* Mileage */}
          <div>
            <Label htmlFor="mileagePerLiter">
              {t("admin.vehicle_creation.mileage_per_liter")}
            </Label>
            <Input
              id="mileagePerLiter"
              value={form.mileagePerLiter}
              onChange={(e) => update("mileagePerLiter", e.target.value)}
              placeholder={t("admin.vehicle_creation.mileage_placeholder")}
              className="input-validate w-full"
            />
          </div>

          {/* Fuel Tank Capacity */}
          <div>
            <Label htmlFor="fuelTankCapacity">
              {t("admin.vehicle_creation.fuel_tank_capacity")}
            </Label>
            <Input
              id="fuelTankCapacity"
              value={form.fuelTankCapacity}
              onChange={(e) => update("fuelTankCapacity", e.target.value)}
              placeholder={t("admin.vehicle_creation.fuel_tank_capacity_placeholder")}
              className="input-validate w-full"
            />
          </div>

          {/* Vehicle Condition */}
          <div>
            <Label htmlFor="vehicleCondition">
              {t("admin.vehicle_creation.vehicle_condition")}
            </Label>
            <Select
              id="vehicleCondition"
              value={form.vehicleCondition}
              onChange={(value) => update("vehicleCondition", value)}
              options={conditionOptions}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.vehicle_creation.vehicle_condition"),
              })}
              className="input-validate w-full"
            />
          </div>

          {/* Service Record */}
          <div className="md:col-span-2">
            <Label htmlFor="serviceRecord">
              {t("admin.vehicle_creation.service_record")}
            </Label>
            <Textarea
              id="serviceRecord"
              value={form.serviceRecord}
              onChange={(e) => update("serviceRecord", e.target.value)}
              placeholder={t("admin.vehicle_creation.service_record_placeholder")}
              className="input-validate w-full"
            />
          </div>

          {/* Vehicle Insurance */}
          <div>
            <Label htmlFor="vehicleInsurance">
              {t("admin.vehicle_creation.vehicle_insurance")}
            </Label>
            <Input
              id="vehicleInsurance"
              value={form.vehicleInsurance}
              onChange={(e) => update("vehicleInsurance", e.target.value)}
              placeholder={t("admin.vehicle_creation.vehicle_insurance_placeholder")}
              className="input-validate w-full"
            />
          </div>

          {/* Insurance Expiry Date */}
          <div>
            <Label htmlFor="insuranceExpiryDate">
              {t("admin.vehicle_creation.insurance_expiry_date")}
            </Label>
            <Input
              id="insuranceExpiryDate"
              type="date"
              value={form.insuranceExpiryDate}
              onChange={(e) => update("insuranceExpiryDate", e.target.value)}
              className="input-validate w-full"
            />
          </div>

          {/* RC Upload */}
          <div>
            <Label htmlFor="rcUpload">
              {t("admin.vehicle_creation.rc_upload")}
            </Label>
            <input id="rcUpload" type="file" hidden
              onChange={(e) => {
                setRemoveRcFile(false);
                handleFileChange(
                  e.target.files?.[0] ?? null, setRcFile,
                  setRcPreviewUrl, setIsRcPreviewImage,
                  existingRcFile, rcPreviewUrl
                );
              }}
            />
            <div className="border rounded p-4 cursor-pointer bg-gray-50"
              onClick={() => document.getElementById("rcUpload")?.click()}>
              {rcPreviewUrl ? (
                <img src={isRcPreviewImage ? rcPreviewUrl : FILE_ICON}
                  alt={t("admin.vehicle_creation.rc_upload")}
                  className="w-full h-24 object-contain" />
              ) : (
                <img src={FILE_ICON} className="w-12 h-12 mx-auto opacity-60" />
              )}
            </div>
            {renderFileActions(
              rcPreviewUrl, rcFile,
              () => window.open(rcPreviewUrl, "_blank", "noopener,noreferrer"),
              () => clearPreview({
                previewUrl: rcPreviewUrl, setPreviewUrl: setRcPreviewUrl,
                setFile: setRcFile, setIsPreviewImage: setIsRcPreviewImage,
                setExistingFile: setExistingRcFile, setRemoveFlag: setRemoveRcFile,
                inputId: "rcUpload",
              })
            )}
          </div>

          {/* Insurance File */}
          <div>
            <Label htmlFor="insuranceFile">
              {t("admin.vehicle_creation.vehicle_insurance_file")}
            </Label>
            <input id="insuranceFile" type="file" hidden
              onChange={(e) => {
                setRemoveInsuranceFile(false);
                handleFileChange(
                  e.target.files?.[0] ?? null, setInsuranceFile,
                  setInsurancePreviewUrl, setIsInsurancePreviewImage,
                  existingInsuranceFile, insurancePreviewUrl
                );
              }}
            />
            <div className="border rounded p-4 cursor-pointer bg-gray-50"
              onClick={() => document.getElementById("insuranceFile")?.click()}>
              {insurancePreviewUrl ? (
                <img src={isInsurancePreviewImage ? insurancePreviewUrl : FILE_ICON}
                  alt={t("admin.vehicle_creation.vehicle_insurance_file")}
                  className="w-full h-24 object-contain" />
              ) : (
                <img src={FILE_ICON} className="w-12 h-12 mx-auto opacity-60" />
              )}
            </div>
            {renderFileActions(
              insurancePreviewUrl, insuranceFile,
              () => window.open(insurancePreviewUrl, "_blank", "noopener,noreferrer"),
              () => clearPreview({
                previewUrl: insurancePreviewUrl, setPreviewUrl: setInsurancePreviewUrl,
                setFile: setInsuranceFile, setIsPreviewImage: setIsInsurancePreviewImage,
                setExistingFile: setExistingInsuranceFile, setRemoveFlag: setRemoveInsuranceFile,
                inputId: "insuranceFile",
              })
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button type="submit" disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors">
            {loading
              ? isEdit ? t("common.updating") : t("common.saving")
              : isEdit ? t("common.update") : t("common.save")}
          </button>
          <button type="button" onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500">
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}