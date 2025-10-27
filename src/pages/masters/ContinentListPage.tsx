import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";
type Continent = {
  id: number;
  name: string;
  is_active: boolean;
};

export default function ContinentList() {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchContinents = async () => {
    try {
      const res = await api.get("continents/");
      setContinents(res.data);
    } catch (error) {
      console.error("Failed to fetch continents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContinents();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this continent?")) return;
    await api.delete(`continents/${id}/`);
    Swal.fire({
              icon: "success",
              title: "Deleted successfully!",
              timer: 1500,
              showConfirmButton: false,
            });
    fetchContinents();

  };

  if (loading) return <div className="p-6">Loading continents...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Continents</h1>
        <button
          onClick={() => navigate("/masters/continents/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add Continent
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Continent</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {continents.map((c, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{c.name}</td>
              <td
                className={`border p-2 font-semibold text-center ${
                  c.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {c.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/continents/${c.id}/edit`)}
                  className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3"
                  title="Edit"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                  title="Deactivate"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}
          {continents.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-3 text-gray-500">
                No continents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
