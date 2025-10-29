import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import Swal from "sweetalert2";
import { PencilIcon, TrashBinIcon } from "../../icons";

type User = {
  id: number;
  unique_id: string;
  user_type_name: string;
  username: string;
  password?: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
};

export default function UserCreation() {
  const [users, setUsers] = useState<User[]>([]);
  const [userTypes, setUserTypes] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUsers = async () => {
     try {
    const [userRes, typeRes] = await Promise.all([
      api.get("user/"),
      api.get("user-type/")
    ]);

    const types = typeRes.data;
    const usersData = userRes.data.map((u: any) => ({
      ...u,
      user_type_name: types.find((t: any) => t.id === u.user_type)?.name || "N/A",
    }));

    setUsers(usersData);
  } catch (error) {
    console.error("Failed to fetch users:", error);
  } finally {
    setLoading(false);
  }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deactivate this user?")) return;
    try {
      await api.delete(`user/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  if (loading) return <div className="p-6">Loading users...</div>;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => navigate("/user-form")}
          className="bg-green-custom text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add User
        </button>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">ID</th>
            <th className="p-2 border">User Type</th>
            <th className="p-2 border">Username</th>
            <th className="p-2 border">Password</th>
            <th className="p-2 border">First Name</th>
            <th className="p-2 border">Last Name</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u,index) => (
            <tr key={u.id}>
              <td className="border p-2 text-center">{index+1}</td>
              <td className="border p-2 text-center">{u.user_type_name}</td>
              <td className="border p-2 text-center">{u.username}</td>
              <td className="border p-2 text-center">{u.password}</td>
              <td className="border p-2 text-center">{u.first_name}</td>
              <td className="border p-2 text-center">{u.last_name}</td>
              <td
                className={`border p-2 font-semibold text-center ${
                  u.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {u.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => navigate(`/user/${u.id}/edit`)}
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

          {users.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center p-3 text-gray-500">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
