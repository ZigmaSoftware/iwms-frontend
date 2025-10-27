import { useEffect, useState } from "react";
import api from "../api";

type Continent = {
  id: number;
  name: string;
  is_active: boolean;
};

export default function ContinentPage() {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch data
  const loadContinents = async () => {
    setLoading(true);
    try {
      const res = await api.get("continents/");
      setContinents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContinents();
  }, []);

  // Add or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`continents/${isEditing}/`, { name });
      } else {
        await api.post("continents/", { name });
      }
      setName("");
      setIsEditing(null);
      loadContinents();
    } catch (err) {
      console.error(err);
    }
  };

  // Edit
  const handleEdit = (item: Continent) => {
    setName(item.name);
    setIsEditing(item.id);
  };

  // Delete (soft-delete backend will handle it)
  const handleDelete = async (id: number) => {
    if (window.confirm("Deactivate this continent?")) {
      await api.delete(`continents/${id}/`);
      loadContinents();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Continent Master</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Enter continent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-64"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {isEditing ? "Update" : "Add"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={() => {
              setName("");
              setIsEditing(null);
            }}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">ID</th>
              <th className="border border-gray-300 p-2 text-left">Name</th>
              <th className="border border-gray-300 p-2 text-left">Active</th>
              <th className="border border-gray-300 p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {continents.map((c) => (
              <tr key={c.id}>
                <td className="border p-2">{c.id}</td>
                <td className="border p-2">{c.name}</td>
                <td className="border p-2">
                  {c.is_active ? "✅" : "❌"}
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => handleEdit(c)}
                    className="text-blue-600 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
