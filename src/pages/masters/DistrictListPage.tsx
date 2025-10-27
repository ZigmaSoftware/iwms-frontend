import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";

type District = {
  id: number; // numeric DB ID
  uniqueId: string; // backend unique_id like "DIST641f93995aa8062449"
  countryName: string;
  stateName: string;
  name: string;
  is_active: boolean;
  country: number; // numeric country id
  state: number; // numeric state id
};

export default function DistrictListPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDistricts = async () => {
    try {
      const res = await api.get("districts/");
      console.log("Raw API data:", res.data);

      // Map API response to our type
      const mappedDistricts: District[] = res.data.map((d: any) => ({
        id: d.id,
        uniqueId: d.unique_id,
        countryName: d.country_name,
        stateName: d.state_name,
        name: d.name,
        is_active: d.is_active,
        country: d.country,
        state: d.state,
      }));
      // ✅ Sort by ID ascending
      mappedDistricts.sort((a, b) => a.id - b.id);

      console.log("Mapped districts:", mappedDistricts);
      setDistricts(mappedDistricts);
    } catch (error) {
      console.error("Failed to fetch districts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this district?")) return;
    try {
      await api.delete(`districts/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Delete this district successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchDistricts();
    } catch (error) {
      console.error("Failed to deactivate district:", error);
    }
  };

  if (loading) return <div className="p-6">Loading districts...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Districts</h1>
        <button
          onClick={() => navigate("/masters/districts/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add District
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Sno</th>
            <th className="p-2 border">Country</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">District</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {districts.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="border p-2">{d.id}</td>
              <td className="border p-2">{d.countryName}</td>
              <td className="border p-2">{d.stateName}</td>
              <td className="border p-2">{d.name}</td>
              <td
                className={`border p-2 font-semibold text-center ${
                  d.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {d.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/districts/${d.id}/edit`)}
                  className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3"
                  title="Edit"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                  title="Deactivate"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}
          {districts.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center p-3 text-gray-500">
                No districts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
