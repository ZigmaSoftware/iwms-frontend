import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

export default function ZoneForm() {
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  const [countries, setCountries] = useState<
    { value: string; label: string }[]
  >([]);
  const [states, setStates] = useState<{ value: string; label: string }[]>([]);
  const [districts, setDistricts] = useState<
    { value: string; label: string }[]
  >([]);
  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  //  Load Countries
  useEffect(() => {
    api
      .get("countries/")
      .then((res) => {
        const data = res.data
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ value: c.id.toString(), label: c.name }));
        setCountries(data);
      })
      .catch((err) => console.error("Error fetching countries:", err));
  }, []);

  //  Load States when country changes
  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setDistricts([]);
      setCities([]);
      return;
    }
    api
      .get(`states/?country=${countryId}`)
      .then((res) => {
        const data = res.data
          .filter((s: any) => s.is_active)
          .map((s: any) => ({ value: s.id.toString(), label: s.name }));
        console.log(data);
        setStates(data);
      })
      .catch((err) => console.error("Error fetching states:", err));
  }, [countryId]);

  //  Load Districts when state changes
  useEffect(() => {
    if (!stateId) {
      setDistricts([]);
      setCities([]);
      return;
    }
    api
      .get(`districts/?state=${stateId}`)
      .then((res) => {
        const data = res.data
          .filter((d: any) => d.is_active)
          .map((d: any) => ({ value: d.id.toString(), label: d.name }));
        setDistricts(data);
      })
      .catch((err) => console.error("Error fetching districts:", err));
  }, [stateId]);

  //  Load Cities when district changes
  useEffect(() => {
    if (!districtId) {
      setCities([]);
      return;
    }
    api
      .get(`cities/?district=${districtId}`)
      .then((res) => {
        const data = res.data
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ value: c.id.toString(), label: c.name }));
        setCities(data);
      })
      .catch((err) => console.error("Error fetching cities:", err));
  }, [districtId]);

  //  Load Zone details when editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`zones/${id}/`)
        .then((res) => {
          const z = res.data;
          setName(z.name);
          setIsActive(z.is_active);
          setCountryId(z.country?.toString() || "");
          setStateId(z.state?.toString() || "");
          setDistrictId(z.district?.toString() || "");
          setCityId(z.city?.toString() || "");
          setDescription(z.description || "");
        })
        .catch((err) => {
          console.error("Error fetching zone:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load zone",
            text: err.response?.data?.detail || "Something went wrong!",
          });
        });
    }
  }, [id, isEdit]);

  //  Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation BEFORE enabling loading or API call
    if (!countryId || !stateId || !name || !cityId) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill all the required fields before submitting.",
        confirmButtonColor: "#3085d6",
      });
      return; // Stop here if validation fails
    }
    setLoading(true);

    try {
      const payload = {
        name,
        country: countryId,
        state: stateId,
        district: districtId,
        city: cityId,
        description,
        is_active: isActive,
      };
      console.log(payload);

      if (isEdit) {
        await api.put(`zones/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("zones/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/masters/zones");
    } catch (error: any) {
      console.error("Failed to save zone:", error);
      const data = error.response?.data;
      let message = "Something went wrong while saving.";

      // Convert backend response to readable text
      if (typeof data === "object" && data !== null) {
        message = Object.entries(data)
          .map(([key, val]) => `${key}: ${(val as string[]).join(", ")}`)
          .join("\n");
      } else if (typeof data === "string") {
        message = data;
      }

      const errMsg = message.toLowerCase();

      // 🎯 Custom duplicate check for unique constraint
      if (errMsg.includes("city, name must make a unique set")) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate Zone",
          text: "Zone name already exists for the selected city.",
        });
      } else if (errMsg.includes("state, name must make a unique set")) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate Zone",
          text: "Zone name already exists for the selected state.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Save failed",
          text: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Zone" : "Add Zone"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div>
            <Label htmlFor="country">
              Country <span className="text-red-500">*</span>
            </Label>
            <Select
              id="country"
              value={countryId}
              onChange={(val) => setCountryId(val)}
              options={countries}
              placeholder="Select Country"
            />
          </div>

          {/*  State */}
          <div>
            <Label htmlFor="state">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              id="state"
              value={stateId}
              onChange={(val) => setStateId(val)}
              options={states}
              placeholder="Select State"
            />
          </div>

          {/*  District */}
          <div>
            <Label htmlFor="district">District</Label>
            <Select
              id="district"
              value={districtId}
              onChange={(val) => setDistrictId(val)}
              options={districts}
              placeholder="Select District"
            />
          </div>

          {/*  City */}
          <div>
            <Label htmlFor="city">City</Label>
            <Select
              id="city"
              value={cityId}
              onChange={(val) => setCityId(val)}
              options={cities}
              placeholder="Select City"
            />
          </div>

          {/*  Zone Name */}
          <div>
            <Label htmlFor="zoneName">
              Zone Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="zoneName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Zone Name"
            />
          </div>

          

          {/* ⚙️ Active Status */}
          <div>
            <Label htmlFor="isActive">Active Status</Label>
            <Select
              id="isActive"
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </div>
          {/* 📝 Description */}
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              className="w-full border rounded-md p-2 focus:ring focus:ring-green-200 outline-none"
              rows={3}
            />
          </div>
        </div>

        {/* 🧾 Buttons */}
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
            onClick={() => navigate("/masters/zones")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
