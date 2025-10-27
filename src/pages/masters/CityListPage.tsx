import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";

// Define the City type according to your API response
type City = {
  id: number;
  name: string;
  is_active: boolean;
  country_name: string;
  state_name: string;
  district_name: string;
};

function CityList() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCities = async () => {
    try {
      const res = await api.get("cities/"); // API endpoint
      console.log("Cities:", res.data);
      setCities(res.data);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load city data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this city?")) return;
    try {
      await api.delete(`cities/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCities(); // Refresh list
    } catch (error) {
      console.error("Failed to delete city:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Something went wrong while deleting.",
      });
    }
  };

  if (loading) return <div className="p-6">Loading cities...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Cities</h1>
        <button
          onClick={() => navigate("/masters/cities/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add City
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Country</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">District</th>
            <th className="p-2 border">City</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city, index) => (
            <tr key={city.id} className="hover:bg-gray-50">
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2">{city.country_name}</td>
              <td className="border p-2">{city.state_name}</td>
              <td className="border p-2">{city.district_name}</td>
              <td className="border p-2">{city.name}</td>
              <td
                className={`border p-2 text-center font-semibold ${
                  city.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {city.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/cities/${city.id}/edit`)}
                  className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3"
                  title="Edit"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(city.id)}
                  className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}
          {cities.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center p-3 text-gray-500">
                No cities found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CityList;
