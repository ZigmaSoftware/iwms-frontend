import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";
type Property = {
  id: number;
  property_name: string;
  is_active: boolean;
};

function PropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProperties = async () => {
    try {
      const res = await api.get("properties/");
      console.log(res.data);
      setProperties(res.data);
    } catch (error) {
      console.error("Failed to fetch properties", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Delete subproperty
  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will mark the Property as deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`properties/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchProperties();
    } catch (error) {
      console.error("Delete failed:", error);
      Swal.fire({
        icon: "error",
        title: "Error deleting record",
        text: "Something went wrong while deleting.",
      });
    }
  };

  if (loading) return <div className="p-6">Loading Properties...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Property</h1>
        <button
          onClick={() => navigate("/masters/property/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add Property
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Property Name</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((c, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{c.property_name}</td>
              <td
                className={`border p-2 font-semibold text-center ${
                  c.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {c.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/property/${c.id}/edit`)}
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
          {properties.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-3 text-gray-500">
                No properties found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default PropertyList;
