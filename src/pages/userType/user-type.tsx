import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Swal from "sweetalert2";
import { PencilIcon, TrashBinIcon } from "../../icons";

type UserType = {
  id: number;
  unique_id: string;
  name: string;
  is_active: boolean;
};

export default function UserTypePage() {
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserTypes = async () => {
    try {
      const res = await api.get("user-type/");
      // Handle both paginated and non-paginated DRF responses
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setUserTypes(data);
    } catch (error) {
      console.error("Failed to fetch user types:", error);
      console.log("UserTypePage loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTypes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deactivate this user type?")) return;
    try {
      await api.delete(`user-type/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchUserTypes();
    } catch (err) {
      console.error("Failed to delete user type:", err);
    }
  };

  if (loading) return <div className="p-6">Loading user types...</div>;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">User Types</h1>

        <button
          onClick={() => navigate("/user-typeForm")}
          className="bg-green-custom text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add User Type
        </button>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">User Type</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {userTypes.map((u,index) => (
            <tr key={u.id}>
              <td className="border p-2 text-center">{index+1}</td>
              <td className="border p-2 text-center">{u.name}</td>
              <td
                className={`border p-2 font-semibold text-center ${
                  u.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {u.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/user-type/${u.id}/edit`)}
                  className="text-blue-600 hover:underline mr-3"
                >
                  <PencilIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-600 hover:underline"
                >
                  <TrashBinIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                </button>
              </td>
            </tr>
          ))}

          {userTypes.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-3 text-gray-500">
                No user types found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
