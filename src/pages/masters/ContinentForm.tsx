import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

function ContinentForm() {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true); // default active on create
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Fetch existing data if editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`continents/${id}/`)
        .then((res) => {
          setName(res.data.name);
          setIsActive(res.data.is_active);
        })
        .catch((err) => {
          console.error("Error fetching continent:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load continent",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  // Handle save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔹 Basic validation BEFORE enabling loading or API call
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill all the required fields before submitting.",
        confirmButtonColor: "#3085d6",
      });
      return; // Stop here if validation fails
    }
    setLoading(true);

    try {
      const payload = { name, is_active: isActive };

      if (isEdit) {
        await api.put(`continents/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("continents/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/masters/continents");
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
        title: "Save failed",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Continent" : "Add Continent"}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Continent Name */}
          <div>
            <Label htmlFor="name">
              Continent Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="continentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter continent name"
              className="input-validate w-full"
              required
            />
          </div>

          {/* Active Status */}
          <div>
            <Label htmlFor="isActive">
              Active Status <span className="text-red-500">*</span>
            </Label>
            <Select
              id="isActive"
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
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
                ? "Updating..."
                : "Saving..."
              : isEdit
              ? "Update"
              : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/masters/continents")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default ContinentForm;