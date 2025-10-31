import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";
type WasteCollection = {
  id: number;
  unique_id: string;
  customer: number;
  customer_name: string;
  contact_no: string;
  building_no: string;
  zone_name: string;
  city_name: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  id_proof_type: string;
  id_no: string;
  qr_code: string;
  is_active_customer: boolean;
  wet_waste: number;
  dry_waste: number;
  mixed_waste: number;
  total_quantity: number;
  collection_date: string; // ISO date string
  collection_time: string; // time or timestamp string
  is_deleted: boolean;
  is_active: boolean;
};

function WasteCollectedDataList() {
  const [wasteCollectedDatas, setWasteCollectedDatas] = useState<
    WasteCollection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWasteCollectedData = async () => {
    try {
      const res = await api.get("wastecollections/");
      console.log(res.data);
      setWasteCollectedDatas(res.data);
    } catch (error) {
      console.error("Failed to fetch waste collected data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteCollectedData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this WasteCollection?")) return;
    try {
      await api.delete(`wastecollections/${id}/`);
      Swal.fire({
        icon: "success",
        title: "Deleted successfully!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchWasteCollectedData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: "Please try again later",
      });
    }
  };

  if (loading)
    return <div className="p-6">Loading Waste Collected Data...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Waste Collected Data</h1>
        <button
          onClick={() =>
            navigate("/wasteManagementMasters/wasteCollectedData/new")
          }
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add New
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Customer ID</th>
            <th className="p-2 border">Customer Name</th>

            <th className="p-2 border">Collected Date</th>
            <th className="p-2 border">Dry Waste</th>
            <th className="p-2 border">Wet Waste</th>
            <th className="p-2 border">Quantity</th>
            <th className="p-2 border">Zone</th>
            <th className="p-2 border">City</th>

            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {wasteCollectedDatas.map((c, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{c.customer}</td>
              <td className="border p-2">{c.customer_name}</td>
              <td className="border p-2">{c.collection_date}</td>
              <td className="border p-2">{c.dry_waste}</td>
              <td className="border p-2">{c.wet_waste}</td>
              <td className="border p-2">{c.total_quantity}</td>
              <td className="border p-2">{c.zone_name}</td>
              <td className="border p-2">{c.city_name}</td>

              <td
                className={`border p-2 font-semibold text-center ${
                  c.is_active ? "text-green-600" : "text-red-500"
                }`}
              >
                {c.is_active ? "Active" : "Inactive"}
              </td>
              <td className="border p-2 text-center">
                <button
                  onClick={() =>
                    navigate(`/wasteManagementMasters/wasteCollectedData/${c.id}/edit`)
                  }
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
          {wasteCollectedDatas.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center p-3 text-gray-500">
                No Waste Collected Data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default WasteCollectedDataList;
