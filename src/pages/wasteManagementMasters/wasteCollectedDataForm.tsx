import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

type Customer = {
  id: number;
  customer_name: string;
  contact_no: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  zone_name: string;
  city_name: string;
};

function WasteCollectedForm() {
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wetWaste, setWetWaste] = useState<number>();
  const [dryWaste, setDryWaste] = useState<number>();
  const [mixedWaste, setMixedWaste] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState<number>();

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Calculate total quantity whenever individual quantities change
  useEffect(() => {
    setTotalQuantity(wetWaste + dryWaste + mixedWaste);
  }, [wetWaste, dryWaste, mixedWaste]);

  // Fetch all customers for selection
  useEffect(() => {
    api
      .get("customercreations/")
      .then((res) => {
        console.log("Fetched customers:", res.data); // <-- log the response
        setCustomers(res.data);
      })
      .catch((err) => console.error("Failed to fetch customers:", err));
  }, []);

  // Fetch existing waste collection if editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`wastecollections/${id}/`)
        .then((res) => {
          setCustomerId(res.data.customer);
          setWetWaste(res.data.wet_waste);
          setDryWaste(res.data.dry_waste);
          setMixedWaste(res.data.mixed_waste);
        })
        .catch((err) => {
          console.error("Failed to fetch waste collection:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load data",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please select a customer.",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer: customerId,
        wet_waste: wetWaste,
        dry_waste: dryWaste,
        mixed_waste: mixedWaste,
        total_quantity: totalQuantity,
      };

      if (isEdit) {
        await api.put(`wastecollections/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("wastecollections/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/wasteManagementMasters/wasteCollectedData");
    } catch (err: any) {
      console.error("Failed to save:", err);
      let message = "Something went wrong while saving.";
      const data = err.response?.data;
      if (data && typeof data === "object") {
        message = Object.entries(data)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join("\n");
      }
      Swal.fire({ icon: "error", title: "Save failed", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={isEdit ? "Edit Waste Collection" : "Add Waste Collection"}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Select */}
          <div>
            <Label htmlFor="customer">
              Customer <span className="text-red-500">*</span>
            </Label>
            <Select
              id="customer"
              value={customerId}
              onChange={(val) => setCustomerId(Number(val))}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customer_name} (${c.zone_name || "-"} / ${
                  c.city_name || "-"
                })`,
              }))}
              className="w-full"
              required
            />
          </div>

          {/* Dry Waste */}
          <div>
            <Label htmlFor="dryWaste">Dry Waste (kg)</Label>
            <Input
              id="dryWaste"
              type="number"
              value={dryWaste}
              onChange={(e) => setDryWaste(Number(e.target.value))}
              className="input-validate w-full"
              required
            />
          </div>

          {/* Wet Waste */}
          <div>
            <Label htmlFor="wetWaste">Wet Waste (kg)</Label>
            <Input
              id="wetWaste"
              type="number"
              value={wetWaste}
              onChange={(e) => setWetWaste(Number(e.target.value))}
              className="w-full"
              required
            />
          </div>

          {/* Mixed Waste */}
          <div>
            <Label htmlFor="mixedWaste">Mixed Waste (kg)</Label>
            <Input
              id="mixedWaste"
              type="number"
              value={mixedWaste}
              onChange={(e) => setMixedWaste(Number(e.target.value))}
              className="w-full"
              required
            />
          </div>

          {/* Total Quantity */}
          <div>
            <Label htmlFor="totalQuantity">Total Quantity (kg)</Label>
            <Input
              id="totalQuantity"
              type="number"
              value={totalQuantity}
              disabled
              className="w-full bg-gray-100"
              required
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
          >
            {loading
              ? isEdit
                ? "Updating..."
                : "Saving..."
              : isEdit
              ? "Update"
              : "Save"}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate("/wasteManagementMasters/wasteCollectedData")
            }
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default WasteCollectedForm;
