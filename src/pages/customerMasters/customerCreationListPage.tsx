import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { PencilIcon, TrashBinIcon } from "../../icons";
import Swal from "sweetalert2";

type Customer = {
  id: number;
  unique_id: string;
  customer_name: string;
  contact_no: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  ward_name: string;
  zone_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  country_name: string;
  property_name: string;
  sub_property_name: string;
  id_proof_type: string;
  id_no: string;
  is_active: boolean;
};

function CustomerCreationList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    try {
      const res = await api.get("customercreations/");
      console.log(res.data);
      setCustomers(res.data);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this customer?")) return;
    await api.delete(`customer_creation/${id}/`);
    Swal.fire({
      icon: "success",
      title: "Deleted successfully!",
      timer: 1500,
      showConfirmButton: false,
    });
    fetchCustomers();
  };

  if (loading) return <div className="p-6">Loading Customers...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Creation</h1>
        <button
          onClick={() => navigate("/customerMasters/customerCreations/new")}
          className="bg-green-custom text-white px-4 py-2 rounded"
        >
          + Add Customer
        </button>
      </div>

      <table className="w-full border border-gray-300 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">S.No</th>
            <th className="p-2 border">Customer Name</th>
            <th className="p-2 border">Contact No</th>
            <th className="p-2 border">Ward</th>
            <th className="p-2 border">Zone</th>
            <th className="p-2 border">City</th>
            <th className="p-2 border">State</th>
            <th className="p-2 border">Property</th>
            <th className="p-2 border">SubProperty</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, index) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="border p-2">{index + 1}</td>
              <td className="border p-2">{c.customer_name}</td>
              <td className="border p-2">{c.contact_no}</td>
              <td className="border p-2">{c.ward_name}</td>
              <td className="border p-2">{c.zone_name}</td>
              <td className="border p-2">{c.city_name}</td>
              <td className="border p-2">{c.state_name}</td>
              <td className="border p-2">{c.property_name}</td>
              <td className="border p-2">{c.sub_property_name}</td>
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
                    navigate(`/customerMasters/customerCreations/${c.id}/edit`)
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
          {customers.length === 0 && (
            <tr>
              <td colSpan={11} className="text-center p-3 text-gray-500">
                No customers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerCreationList;
