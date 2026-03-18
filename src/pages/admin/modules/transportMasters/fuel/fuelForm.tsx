import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { Input } from "@/components/ui/input";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";

type Fuel = {
  id: number;
  fuel_type: string;
  description: string;
  is_active: boolean;
};

const fuelApi = adminApi.fuels;

function FuelForm() {
  const { t } = useTranslation();
  const [fuelType, setFuelType] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const { encTransportMaster, encFuel } = getEncryptedRoute();

  const ENC_LIST_PATH = `/${encTransportMaster}/${encFuel}`;

  const { id } = useParams();
  const isEdit = Boolean(id);

  // Fetch existing data if editing
  useEffect(() => {
    if (isEdit) {
      fuelApi
        .get(id as string)
        .then((res) => {
          setFuelType(res.fuel_type);
          setDescription(res.description);
          setIsActive(res.is_active);
        })
        .catch((err) => {
          console.error("Error fetching fuelData:", err);
          Swal.fire({
            icon: "error",
            title: t("admin.fuel.load_failed_title"),
            text: err.response?.data?.detail || t("common.request_failed"),
          });
        });
    }
  }, [id, isEdit]);

  // Handle save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation BEFORE enabling loading or API call
    if (!fuelType) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
        confirmButtonColor: "#3085d6",
      });
      return; // Stop here if validation fails
    }
    setLoading(true);

    try {
      const payload = { fuel_type: fuelType, description, is_active: isActive };
      console.log(payload);

      if (isEdit) {
        await fuelApi.update(id as string, payload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await fuelApi.create(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      console.error("Failed to save:", error);

      const data = error.response?.data;
      let message = "Something went wrong while saving.";

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
        isEdit ? t("admin.fuel.title_edit") : t("admin.fuel.title_add")
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fuel Type */}
          <div>
            <Label htmlFor="name">
              {t("admin.fuel.fuel_type")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fuelType"
              type="text"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              placeholder={t("admin.fuel.fuel_type_placeholder")}
              className="input-validate w-full"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">
              {t("common.description")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fuelDescription"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("admin.fuel.description_placeholder")}
              className="input-validate w-full"
              required
            />
          </div>

          {/* Active Status */}
          <div>
            <Label htmlFor="isActive">
              {t("admin.fuel.active_status")} <span className="text-red-500">*</span>
            </Label>
            <Select
              id="isActive"
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: t("common.active") },
                { value: "false", label: t("common.inactive") },
              ]}
              className="input-validate w-full"
              required
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
          >
            {loading
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
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default FuelForm;
