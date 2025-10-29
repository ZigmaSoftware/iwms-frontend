import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";

export default function VehicleTypeCreationForm() {
  const [vehicleType, setVehicleType] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // ✅ Fetch existing record if editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`vehicle-type/${id}/`)
        .then((res) => {
          setVehicleType(res.data.vehicleType);
          setDescription(res.data.description || "");
          setIsActive(res.data.is_active);
         
        })
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: "Failed to load vehicle type",
            text: "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);
console.log("Fetched vehicle type data:", { vehicleType, description, isActive });
  // ✅ Submit logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      vehicleType,
      description,
      is_active: isActive,
      is_deleted: false,
    };
    console.log("Payload:", payload);

    try {
      if (isEdit) {
        await api.put(`vehicle-type/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("vehicle-type/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/vehicle-typeCreation");
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Duplicate Vehicle Type",
        text: "Vehicle type name already exists!",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f9fafb] min-h-screen p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? "Edit Vehicle Type" : "Add Vehicle Type"}
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter vehicle type name"
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
                Active Status <span className="text-red-500">*</span>
              </label>
              <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(e) => setIsActive(e.target.value === "Active")}
                className="w-full px-3 py-2 border border-green-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Description */}
            <div className="">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Enter description (optional)"
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
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/vehicle-typeCreation")}
              className="bg-red-500 text-white font-medium px-6 py-2 rounded hover:bg-red-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
