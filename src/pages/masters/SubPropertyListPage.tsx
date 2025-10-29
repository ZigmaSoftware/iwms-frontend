import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";

type SubProperty = {
  id: number;
  sub_property_name: string;
  property_name?: string;
  is_active: boolean;
};

function SubPropertyList() {
  const [subProperties, setSubProperties] = useState<SubProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all SubProperties
  const fetchSubProperties = async () => {
    try {
      const res = await api.get("subproperties/");
      console.log(res.data);
      setSubProperties(res.data);
    } catch (error) {
      console.error("Failed to fetch sub-properties", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubProperties();
  }, []);

  // Delete subproperty
  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will mark the SubProperty as deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`subproperties/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchSubProperties();
    } catch (error) {
      console.error("Delete failed:", error);
      Swal.fire({
        icon: "error",
        title: "Error deleting record",
        text: "Something went wrong while deleting.",
      });
    }
  };

  if (loading) return <div className="p-6">Loading SubProperties...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Sub Property</h1>
        <button
          onClick={() => navigate("/masters/subproperty/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add Sub Property
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Property</th>
            <th className="p-2 border">Sub Property Name</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subProperties.map((sp, index) => (
            <tr key={sp.id} className="hover:bg-gray-50">
              <td className="border p-2 text-center">{index + 1}</td>
              <td className="border p-2">{sp.property_name || "-"}</td>
              <td className="border p-2">{sp.sub_property_name}</td>
              <td
                className={`border p-2 text-center font-semibold ${
                  sp.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {sp.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/masters/subproperty/${sp.id}/edit`)}
                  className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 mr-3"
                  title="Edit"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(sp.id)}
                  className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                  title="Deactivate"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}

          {subProperties.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center p-3 text-gray-500">
                No sub-properties found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SubPropertyList;
