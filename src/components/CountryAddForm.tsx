import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/countries/";

export default function CountryAddForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    country_name: "",
    country_code: "",
    currency: "",
    language: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(API_URL, form);
      navigate("/countries"); // ✅ go back to list after add
    } catch (err) {
      console.error("Error adding country:", err);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-6">➕ Add Country</h2>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 bg-white shadow rounded-lg p-6"
      >
        <input
          className="border rounded px-3 py-2"
          placeholder="Country Name"
          value={form.country_name}
          onChange={(e) => setForm({ ...form, country_name: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Country Code"
          value={form.country_code}
          onChange={(e) => setForm({ ...form, country_code: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Currency"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Language"
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value })}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Add
        </button>
      </form>
    </div>
  );
}
