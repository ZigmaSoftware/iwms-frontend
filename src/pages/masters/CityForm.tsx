import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

type Option = { value: number; label: string };

export default function CityForm() {
  const [cityName, setCityName] = useState("");
  const [countryId, setCountryId] = useState<number | "">("");
  const [stateId, setStateId] = useState<number | "">("");
  const [districtId, setDistrictId] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // 🔹 Fetch active countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await api.get("countries/");
        const data = res.data
          .filter((c: any) => c.is_active)
          .map((c: any) => ({ value: c.id, label: c.name }));
        setCountries(data);
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
    fetchCountries();
  }, []);

  // 🔹 Fetch city details (Edit mode)
  useEffect(() => {
    if (!isEdit) return;

    const fetchCity = async () => {
      try {
        const res = await api.get(`cities/${id}/`);
        const data = res.data;

        setCityName(data.name);
        setCountryId(data.country);
        setStateId(data.state);
        setIsActive(data.is_active);

        // ✅ Fetch districts for this state before setting districtId
        if (data.state) {
          const districtRes = await api.get(`districts/?state=${data.state}`);
          const districtOptions = districtRes.data
            .filter((d: any) => d.is_active)
            .map((d: any) => ({ value: d.id, label: d.name }));

          setDistricts(districtOptions);
          setDistrictId(data.district);
        }
      } catch (err: any) {
        console.error("Error fetching city:", err);
        Swal.fire({
          icon: "error",
          title: "Failed to load city",
          text: err.response?.data?.detail || "Something went wrong!",
        });
      }
    };

    fetchCity();
  }, [id, isEdit]);

  // 🔹 Fetch states when country changes
  useEffect(() => {
    if (!countryId) return;

    const fetchStates = async () => {
      try {
        const res = await api.get(`states/?country=${countryId}`);
        const data = res.data
          .filter((s: any) => s.is_active)
          .map((s: any) => ({ value: s.id, label: s.name }));
        setStates(data);
      } catch (err) {
        console.error("Error fetching states:", err);
        setStates([]);
      }
    };

    fetchStates();
    setStateId("");
    setDistrictId("");
    setDistricts([]);
  }, [countryId]);

  // 🔹 Fetch districts when state changes
  useEffect(() => {
    if (!stateId) return;

    const fetchDistricts = async () => {
      try {
        const res = await api.get(`districts/?state=${stateId}`);
        const data = res.data
          .filter((d: any) => d.is_active)
          .map((d: any) => ({ value: d.id, label: d.name }));
        setDistricts(data);

        // ✅ Only clear selected district when adding new city
        if (!isEdit) setDistrictId("");
      } catch (err) {
        console.error("Error fetching districts:", err);
        setDistricts([]);
      }
    };

    fetchDistricts();
  }, [stateId]);

  // 🔹 Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔹 Basic validation BEFORE enabling loading or API call
    if (!countryId || !stateId || !districtId || !cityName.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please fill all the required fields before submitting.",
        confirmButtonColor: "#3085d6",
      });
      return; //  Stop here if validation fails
    }

    setLoading(true); //  Only set loading if validation passed

    try {
      const payload = {
        name: cityName.trim(),
        country: countryId,
        state: stateId,
        district: districtId || null,
        is_active: isActive,
      };

      console.log("Submitting payload:", payload);

      if (isEdit) {
        await api.put(`cities/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "Updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("cities/", payload);
        Swal.fire({
          icon: "success",
          title: "Added successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/masters/cities");
    } catch (error: any) {
      console.error("Failed to save:", error);
      const data = error.response?.data;

      if (data?.non_field_errors?.length) {
        Swal.fire({
          icon: "warning",
          title: "Duplicate Entry",
          text: data.non_field_errors[0],
        });
      } else {
        let message = "Something went wrong while saving.";
        if (typeof data === "object" && data !== null) {
          message = Object.entries(data)
            .map(([key, val]) => `${key}: ${(val as string[]).join(", ")}`)
            .join("\n");
        }
        Swal.fire({ icon: "error", title: "Save failed", text: message });
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Render form
  return (
    <ComponentCard title={isEdit ? "Edit City" : "Add City"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div>
            <Label htmlFor="country">
              Country <span className="text-red-500">*</span>
            </Label>
            <Select
              id="country"
              value={countryId === "" ? "" : countryId.toString()}
              onChange={(val: string) => setCountryId(Number(val))}
              options={countries.map((c) => ({
                value: c.value.toString(),
                label: c.label,
              }))}
              placeholder="Select Country"
              className="input-validate w-full"
            />
          </div>

          {/* State */}
          <div>
            <Label htmlFor="state">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              id="state"
              value={stateId === "" ? "" : stateId.toString()}
              onChange={(val: string) => setStateId(Number(val))}
              options={states.map((s) => ({
                value: s.value.toString(),
                label: s.label,
              }))}
              placeholder={countryId ? "Select State" : "Select Country First"}
              className="input-validate w-full"
              disabled={!countryId}
            />
          </div>

          {/* District */}
          <div>
            <Label htmlFor="district">
              District <span className="text-red-500">*</span>
            </Label>
            <Select
              id="district"
              value={districtId === "" ? "" : districtId.toString()}
              onChange={(val: string) => setDistrictId(Number(val))}
              options={districts.map((d) => ({
                value: d.value.toString(),
                label: d.label,
              }))}
              placeholder={stateId ? "Select District" : "Select State First"}
              className="input-validate w-full"
              disabled={!stateId}
            />
          </div>

          {/* City Name */}
          <div>
            <Label htmlFor="cityName">
              City Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cityName"
              type="text"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="Enter city name"
              className="input-validate w-full"
            />
          </div>

          {/* Active Status */}
          <div>
            <Label htmlFor="isActive">
              Active Status <span className="text-red-500">*</span>
            </Label>
            <Select
              id="isActive"
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              className="input-validate w-full"
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
            onClick={() => navigate("/masters/cities")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
