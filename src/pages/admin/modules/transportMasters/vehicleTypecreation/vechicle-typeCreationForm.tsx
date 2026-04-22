import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";

const vehicleTypeApi = adminApi.vehicleTypes;
const companyApi = adminApi.companies;
const projectApi = adminApi.projects;

type Company = { unique_id: string; name: string };
type Project = { unique_id: string; name: string; company_unique_id?: string };

interface PaginatedResponse<T> {
  results: T[];
}

interface VehicleTypeResponse {
  vehicleType: string;
  description?: string;
  is_active: boolean;
  company_id?: string;
  project_id?: string;
}

interface ApiError {
  response?: {
    data?: {
      vehicleType?: string[];
      company_id_input?: string[];
      project_id_input?: string[];
      detail?: string;
      [key: string]: unknown;
    };
  };
  message?: string;
}

export default function VehicleTypeCreationForm() {
  const { t } = useTranslation();
  const [vehicleType, setVehicleType] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const navigate = useNavigate();
  const { encTransportMaster, encVehicleType } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encVehicleType}`;
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Fetch companies & projects on mount
  useEffect(() => {
    companyApi
      .listPaginated(1, 100)
      .then((data: PaginatedResponse<Company>) => setCompanies(data.results))
      .catch(() => console.error("Failed to load companies"));

    projectApi
      .listPaginated(1, 100)
      .then((data: PaginatedResponse<Project>) => setProjects(data.results))
      .catch(() => console.error("Failed to load projects"));
  }, []);

  // Fetch existing record if editing
  // Now res.company_id and res.project_id return unique_id strings
  // because serializer SerializerMethodField returns them
  useEffect(() => {
    if (isEdit) {
      vehicleTypeApi
        .get(id as string)
        .then((res: VehicleTypeResponse) => {
          setVehicleType(res.vehicleType);
          setDescription(res.description || "");
          setIsActive(res.is_active);
          setSelectedCompany(res.company_id || "");
          setSelectedProject(res.project_id || "");
        })
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: t("admin.vehicle_type.load_failed_title"),
            text: t("common.request_failed"),
          });
        });
    }
  }, [id, isEdit, t]);

  // Submit logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const normalizedVehicleType = vehicleType.trim();
    const normalizedDescription = description.trim();

    if (!normalizedVehicleType) {
      Swal.fire({
        icon: "warning",
        title: t("admin.vehicle_type.missing_title"),
        text: t("admin.vehicle_type.missing_desc"),
      });
      setLoading(false);
      return;
    }

    if (!selectedCompany) {
      Swal.fire({
        icon: "warning",
        title: "Company Required",
        text: "Please select a company.",
      });
      setLoading(false);
      return;
    }

    if (!selectedProject) {
      Swal.fire({
        icon: "warning",
        title: "Project Required",
        text: "Please select a project.",
      });
      setLoading(false);
      return;
    }

    // Use company_id_input and project_id_input
    // to match the serializer write fields
    const payload = {
      vehicleType: normalizedVehicleType,
      description: normalizedDescription ? normalizedDescription : null,
      is_active: isActive,
      company_id_input: selectedCompany,
      project_id_input: selectedProject,
    };

    try {
      if (isEdit) {
        await vehicleTypeApi.update(id as string, payload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await vehicleTypeApi.create(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate(ENC_LIST_PATH);
    } catch (error: unknown) {
      const responseMessage =
        (error as ApiError)?.response?.data?.vehicleType?.[0] as string ??
        (error as ApiError)?.response?.data?.company_id_input?.[0] as string ??
        (error as ApiError)?.response?.data?.project_id_input?.[0] as string ??
        (error as ApiError)?.response?.data?.detail as string ??
        (error as ApiError)?.message ??
        "Unable to save vehicle type.";
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: responseMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto bg-white rounded-xl shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit
              ? t("admin.vehicle_type.title_edit")
              : t("admin.vehicle_type.title_add")}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Vehicle Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("admin.vehicle_type.label")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder={t("admin.vehicle_type.placeholder")}
                value={vehicleType}
                required
                onChange={(e) => setVehicleType(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  vehicleType.trim() === ""
                    ? "border-red-400 focus:ring-red-200"
                    : "border-green-400 focus:ring-green-200"
                } rounded-sm focus:outline-none focus:ring-2`}
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("common.status")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(e) => setIsActive(e.target.value === "Active")}
                className="w-full px-3 py-2 border border-green-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="Active">{t("common.active")}</option>
                <option value="Inactive">{t("common.inactive")}</option>
              </select>
            </div>

            {/* Company Dropdown — Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <select
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

            {/* Project Dropdown — Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
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
                  .filter((p) =>
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

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("common.description")}
              </label>
              <textarea
                placeholder={t("common.description_optional")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                rows={3}
              ></textarea>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white font-medium px-6 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="bg-red-500 text-white font-medium px-6 py-2 rounded hover:bg-red-600 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}