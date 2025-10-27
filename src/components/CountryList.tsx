import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

interface Country {
  id: number;
  country_name: string;
  country_code: string;
  currency: string;
  language: string;
}

const API_URL = "http://127.0.0.1:8000/api/countries/";

export default function CountryList() {
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    const res = await axios.get<Country[]>(API_URL);
    setCountries(res.data);
  };

  const handleDelete = async (id: number) => {
    await axios.delete(`${API_URL}${id}/`);
    fetchCountries();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">🌍 Country Master</h2>
        <Link
          to="/countries/add"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Country
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white shadow rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Code</th>
              <th className="border px-4 py-2 text-left">Currency</th>
              <th className="border px-4 py-2 text-left">Language</th>
              <th className="border px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{c.country_name}</td>
                <td className="border px-4 py-2">{c.country_code}</td>
                <td className="border px-4 py-2">{c.currency}</td>
                <td className="border px-4 py-2">{c.language}</td>
                <td className="border px-4 py-2 text-center space-x-2">
                  <Link
                    to={`/countries/edit/${c.id}`}
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {countries.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  No countries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
