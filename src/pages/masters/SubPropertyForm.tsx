import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

function SubPropertyForm() {
  const [subPropertyName, setSubPropertyName] = useState("");
  const [propertyId, setPropertyId] = useState<number | "">("");
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  //  Fetch available properties for dropdown
  const fetchProperties = async () => {
    try {
      const res = await api.get("properties/");
      setProperties(res.data);
    } catch (error) {
      console.error("Failed to load properties list:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to load property list.",
      });
    }
  };

  // Fetch existing SubProperty if editing
  useEffect(() => {
    fetchProperties();
    if (isEdit) {
      api
        .get(`subproperties/${id}/`)
        .then((res) => {
          setSubPropertyName(res.data.sub_property_name);
          setIsActive(res.data.is_active);
          setPropertyId(res.data.property);
        })
        .catch((err) => {
          console.error("Error fetching subproperty data:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load SubProperty",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  //  Handle Save/Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subPropertyName || !propertyId) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please select a Property and enter SubProperty name.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    setLoading(true);
    const payload = {
      sub_property_name: subPropertyName,
      property: propertyId,
      is_active: isActive,
    };

    try {
      if (isEdit) {
        await api.put(`subproperties/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("subproperties/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate("/masters/subproperty");
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
    <ComponentCard title={isEdit ? "Edit SubProperty" : "Add SubProperty"}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parent Property Dropdown */}
          <div>
            <Label htmlFor="property">
              Parent Property <span className="text-red-500">*</span>
            </Label>
            <Select
              id="property"
              value={propertyId}
              onChange={(val) => setPropertyId(Number(val))}
              options={properties.map((p) => ({
                value: p.id.toString(),
                label: p.property_name,
              }))}
              className="input-validate w-full"
              required
            />
          </div>

          {/* SubProperty Name */}
          <div>
            <Label htmlFor="subPropertyName">
              SubProperty Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subPropertyName"
              type="text"
              value={subPropertyName}
              onChange={(e) => setSubPropertyName(e.target.value)}
              placeholder="Enter SubProperty name"
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
            onClick={() => navigate("/masters/subproperty")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default SubPropertyForm;
