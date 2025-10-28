import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";

// Define the Zone type according to your API response
type Zone = {
  id: number;
  name: string;
  is_active: boolean;
  country_name: string;
  state_name: string;
  district_name: string;
  city_name: string;
};

function ZoneList() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchZones = async () => {
    try {
      const res = await api.get("zones/"); // API endpoint
      console.log("Zones:", res.data);
      setZones(res.data);
    } catch (error) {
      console.error("Failed to fetch zones:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load zone data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) return;
    try {
      await api.delete(`zones/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchZones(); // Refresh list
    } catch (error) {
      console.error("Failed to delete zone:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Something went wrong while deleting.",
      });
    }
  };

  if (loading) return <div className="p-6">Loading zones...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Zones</h1>
        <button
          onClick={() => navigate("/masters/zones/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add Zone
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
      
            <th className="p-2 border">City</th>
            <th className="p-2 border">Zone</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone, index) => (
            <tr key={zone.id} className="hover:bg-gray-50">
              <td className="border p-2 text-center">{index + 1}</td>
             
              <td className="border p-2">{zone.city_name}</td>
              <td className="border p-2 font-medium">{zone.name}</td>
              <td
                className={`border p-2 text-center font-semibold ${
                  zone.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {zone.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/zones/${zone.id}/edit`)}
                  className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3"
                  title="Edit"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}
          {zones.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center p-3 text-gray-500">
                No zones found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ZoneList;
