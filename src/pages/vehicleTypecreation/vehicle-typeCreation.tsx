import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Swal from "sweetalert2";
import { PencilIcon, TrashBinIcon } from "../../icons";

// Define vehicle type structure
type VehicleType = {
  id: number;
  unique_id: string;
  vehicleType: string;
  description: string;
  is_active: boolean;
};

export default function VehicleTypeCreation() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Fetch Vehicle Type List
  const fetchVehicleTypes = async () => {
    try {
      const res = await api.get("vehicle-type/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setVehicleTypes(data);
    } catch (error) {
      console.error("Failed to fetch vehicle types:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  // ✅ Delete / Deactivate Vehicle Type
  const handleDelete = async (id: number) => {
    if (!window.confirm("Deactivate this vehicle type?")) return;
    try {
      await api.delete(`vehicle-type/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchVehicleTypes();
    } catch (err) {
      console.error("Failed to delete vehicle type:", err);
    }
  };

  if (loading) return <div className="p-6">Loading vehicle types...</div>;

  // ✅ UI Layout (copied from UserTypePage for consistent design)
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Vehicle Types Creation List</h1>

        <button
          onClick={() => navigate("/vehicle-type")}
          className="bg-green-custom text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add Vehicle Type
        </button>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
             <th className="p-2 border">Vehicle Type</th>
            {/* <th className="p-2 border">Description</th> */}
            <th className="p-2 border">Active</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicleTypes.map((v, index) => (
            <tr key={v.id}>
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2 text-center">{v.vehicleType}</td>
              {/* <td className="border p-2 text-center">
                {v.description || "-"}
              </td> */}
              <td
                className={`border p-2 font-semibold text-center ${
                  v.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {v.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/vehicle-type/${v.id}/edit`)}
                  className="text-blue-600 hover:underline mr-3"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-600 hover:underline"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}

          {vehicleTypes.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center p-3 text-gray-500">
                No vehicle types found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
