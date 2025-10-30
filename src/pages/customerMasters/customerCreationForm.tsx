import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

function CustomerCreationForm() {
  const [formData, setFormData] = useState({
    customer_name: "",
    contact_no: "",
    building_no: "",
    street: "",
    area: "",
    pincode: "",
    latitude: "",
    longitude: "",
    id_proof_type: "",
    id_no: "",
    qr_code: "",
    is_deleted: false,
    is_active: true,
    ward: "",
    zone: "",
    city: "",
    district: "",
    state: "",
    country: "",
    property: "",
    sub_property: "",
  });

  const [dropdowns, setDropdowns] = useState({
    wards: [],
    zones: [],
    cities: [],
    districts: [],
    states: [],
    countries: [],
    properties: [],
    subProperties: [],
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // 🔹 Generic handler for field updates
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // 🔹 Fetch dropdown data (wards, zones, etc.)
  const fetchDropdowns = async () => {
    try {
      const [
        wardsRes,
        zonesRes,
        citiesRes,
        districtsRes,
        statesRes,
        countriesRes,
        propertiesRes,
        subPropsRes,
      ] = await Promise.all([
        api.get("wards/"),
        api.get("zones/"),
        api.get("cities/"),
        api.get("districts/"),
        api.get("states/"),
        api.get("countries/"),
        api.get("properties/"),
        api.get("subproperties/"),
      ]);

      const obj = {
        wards: wardsRes.data,
        zones: zonesRes.data,
        cities: citiesRes.data,
        districts: districtsRes.data,
        states: statesRes.data,
        countries: countriesRes.data,
        properties: propertiesRes.data,
        subProperties: subPropsRes.data,
      };
      console.log(obj);

      setDropdowns(obj);
    } catch (error) {
      console.error("Dropdown fetch failed:", error);
    }
  };

  // 🔹 Load customer data for edit mode
  useEffect(() => {
    fetchDropdowns();
    if (isEdit) {
      api
        .get(`customercreations/${id}/`)
        .then((res) => setFormData(res.data))
        .catch((err) => {
          console.error("Error loading customer:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load customer",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  //  Handle save with full validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔹 Comprehensive validation
    const {
      customer_name,
      contact_no,
      building_no,
      street,
      area,
      pincode,
      latitude,
      longitude,
      id_proof_type,
      id_no,
      ward,
      zone,
      city,
      district,
      state,
      country,
      property,
      sub_property,
    } = formData;

    // Required fields check
    if (
      !customer_name ||
      !contact_no ||
      !building_no ||
      !street ||
      !area ||
      !pincode ||
      !latitude ||
      !longitude ||
      !id_proof_type ||
      !id_no ||
      !ward ||
      !zone ||
      !city ||
      !district ||
      !state ||
      !country ||
      !property ||
      !sub_property
    ) {
      Swal.fire({
        icon: "warning",
        title: "Missing Required Fields",
        text: "Please fill all mandatory fields — customer name, contact, location, address, and ID details are required.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // 🔸 Contact number format
    if (!/^\d{10}$/.test(contact_no)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Contact Number",
        text: "Contact number must be exactly 10 digits.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // 🔸 Pincode validation
    if (!/^\d{6}$/.test(pincode)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Pincode",
        text: "Pincode must be exactly 6 digits.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // 🔸 Latitude/Longitude validation
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Coordinates",
        text: "Please enter valid latitude and longitude values.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    // 🔹 Save
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`customercreations/${id}/`, formData);
        Swal.fire({
          icon: "success",
          title: "Customer updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("customercreations/", formData);
        Swal.fire({
          icon: "success",
          title: "Customer added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate("/customerMasters/customerCreations");
    } catch (error: any) {
      console.error("Save failed:", error);
      Swal.fire({
        icon: "error",
        title: "Save failed",
        text:
          error.response?.data?.detail ||
          "Something went wrong while saving data.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={isEdit ? "Edit Customer Creation" : "Add Customer Creation"}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Details */}
          <div>
            <Label htmlFor="customer_name">Customer Name *</Label>
            <Input
              id="customer_name"
              type="text"
              value={formData.customer_name}
              onChange={handleChange}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <Label htmlFor="contact_no">Contact No *</Label>
            <Input
              id="contact_no"
              type="text"
              value={formData.contact_no}
              onChange={handleChange}
              placeholder="Enter contact number"
            />
          </div>

          <div>
            <Label htmlFor="building_no">Building No</Label>
            <Input
              id="building_no"
              type="text"
              value={formData.building_no}
              onChange={handleChange}
              placeholder="Enter building number"
            />
          </div>

          <div>
            <Label htmlFor="street">Street</Label>
            <Input
              id="street"
              type="text"
              value={formData.street}
              onChange={handleChange}
              placeholder="Enter street"
            />
          </div>

          <div>
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              type="text"
              value={formData.area}
              onChange={handleChange}
              placeholder="Enter area"
            />
          </div>

          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              type="text"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter pincode"
            />
          </div>

          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="Enter latitude"
            />
          </div>

          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="Enter longitude"
            />
          </div>

          {/* ID Proof Section */}
          <div>
            <Label htmlFor="id_proof_type">ID Proof Type</Label>
            <Select
              id="id_proof_type"
              value={formData.id_proof_type}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, id_proof_type: val }))
              }
              options={[
                { value: "AADHAAR", label: "Aadhaar" },
                { value: "VOTER_ID", label: "Voter ID" },
                { value: "PAN_CARD", label: "PAN Card" },
                { value: "DL", label: "Driving License" },
                { value: "PASSPORT", label: "Passport" },
              ]}
            />
          </div>

          <div>
            <Label htmlFor="id_no">ID Number</Label>
            <Input
              id="id_no"
              type="text"
              value={formData.id_no}
              onChange={handleChange}
              placeholder="Enter ID number"
            />
          </div>

          <div>
            <Label htmlFor="qr_code">QR Code</Label>
            <Input
              id="qr_code"
              type="text"
              value={formData.qr_code}
              onChange={handleChange}
              placeholder="Enter QR code"
            />
          </div>

          {/* Dropdowns for Relations */}
          <div>
            <Label htmlFor="ward">Ward</Label>
            <Select
              id="ward"
              value={formData.ward}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, ward: val }))
              }
              options={dropdowns.wards.map((w: any) => ({
                value: w.id,
                label: w.name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="zone">Zone</Label>
            <Select
              id="zone"
              value={formData.zone}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, zone: val }))
              }
              options={dropdowns.zones.map((z: any) => ({
                value: z.id,
                label: z.name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <Select
              id="city"
              value={formData.city}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, city: val }))
              }
              options={dropdowns.cities.map((c: any) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="district">District</Label>
            <Select
              id="district"
              value={formData.district}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, district: val }))
              }
              options={dropdowns.districts.map((d: any) => ({
                value: d.id,
                label: d.name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Select
              id="state"
              value={formData.state}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, state: val }))
              }
              options={dropdowns.states.map((s: any) => ({
                value: s.id,
                label: s.name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Select
              id="country"
              value={formData.country}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, country: val }))
              }
              options={dropdowns.countries.map((c: any) => ({
                value: c.id,
                label: `${c.name} (${c.currency || ""})`,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="property">Property</Label>
            <Select
              id="property"
              value={formData.property}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, property: val }))
              }
              options={dropdowns.properties.map((p: any) => ({
                value: p.id,
                label: p.property_name,
              }))}
            />
          </div>

          <div>
            <Label htmlFor="sub_property">Sub Property</Label>
            <Select
              id="sub_property"
              value={formData.sub_property}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, sub_property: val }))
              }
              options={dropdowns.subProperties.map((sp: any) => ({
                value: sp.id,
                label: sp.sub_property_name,
              }))}
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
            onClick={() => navigate("/customerMasters/customerCreations")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default CustomerCreationForm;
