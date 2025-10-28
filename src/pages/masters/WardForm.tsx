import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

export default function WardForm() {
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [states, setStates] = useState<{ value: string; label: string }[]>([]);
  const [districts, setDistricts] = useState<{ value: string; label: string }[]>([]);
  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string; label: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Countries
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

  // States by country
  useEffect(() => {
    setStates([]); setDistricts([]); setCities([]); setZones([]); setStateId(""); setDistrictId(""); setCityId(""); setZoneId("");
    if (!countryId) return;
    api
      .get(`states/?country=${countryId}`)
      .then((res) => {
        const data = res.data
          .filter((s: any) => s.is_active)
          .map((s: any) => ({ value: s.id.toString(), label: s.name }));
        setStates(data);
      })
      .catch((err) => console.error("Error fetching states:", err));
  }, [countryId]);

  // Districts by state
  useEffect(() => {
    setDistricts([]); setCities([]); setZones([]); setDistrictId(""); setCityId(""); setZoneId("");
    if (!stateId) return;
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

  // Cities by district
  useEffect(() => {
    setCities([]); setZones([]); setCityId(""); setZoneId("");
    if (!districtId) return;
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

  // Zones by city (your ZoneViewSet supports ?city=)
  useEffect(() => {
    setZones([]); setZoneId("");
    if (!cityId) return;
    api
      .get(`zones/?city=${cityId}`)
      .then((res) => {
        const data = res.data
          .filter((z: any) => z.is_active && !z.is_deleted)
          .map((z: any) => ({ value: z.id.toString(), label: z.name }));
        setZones(data);
      })
      .catch((err) => console.error("Error fetching zones:", err));
  }, [cityId]);

  // Load Ward for edit
  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`wards/${id}/`)
      .then(async (res) => {
        const w = res.data;
        setName(w.name);
        setIsActive(w.is_active);
        setDescription(w.description || "");

        // Preload cascading selects for edit (ensure option lists exist before setting IDs)
        const loadCascade = async () => {
          // country
          if (w.country) {
            setCountryId(String(w.country));
            const statesRes = await api.get(`states/?country=${w.country}`);
            setStates(
              statesRes.data
                .filter((s: any) => s.is_active)
                .map((s: any) => ({ value: s.id.toString(), label: s.name }))
            );
          }
          // state
          if (w.state) {
            setStateId(String(w.state));
            const dRes = await api.get(`districts/?state=${w.state}`);
            setDistricts(
              dRes.data
                .filter((d: any) => d.is_active)
                .map((d: any) => ({ value: d.id.toString(), label: d.name }))
            );
          }
          // district
          if (w.district) {
            setDistrictId(String(w.district));
            const cRes = await api.get(`cities/?district=${w.district}`);
            setCities(
              cRes.data
                .filter((c: any) => c.is_active)
                .map((c: any) => ({ value: c.id.toString(), label: c.name }))
            );
          }
          // city
          if (w.city) {
            setCityId(String(w.city));
            const zRes = await api.get(`zones/?city=${w.city}`);
            setZones(
              zRes.data
                .filter((z: any) => z.is_active && !z.is_deleted)
                .map((z: any) => ({ value: z.id.toString(), label: z.name }))
            );
          }
          // zone
          if (w.zone) setZoneId(String(w.zone));
        };

        await loadCascade();
      })
      .catch((err) => {
        console.error("Error fetching ward:", err);
        Swal.fire({
          icon: "error",
          title: "Failed to load ward",
          text: err.response?.data?.detail || "Something went wrong!",
        });
      });
  }, [id, isEdit]);

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guardrails: keep it tight
    if (!countryId || !stateId || !name) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Country, State and Ward Name are mandatory.",
      });
      return;
    }
    if (!cityId && !zoneId) {
      Swal.fire({
        icon: "warning",
        title: "Geography Incomplete",
        text: "Select City (and Zone if applicable).",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        country: countryId,
        state: stateId,
        district: districtId || null,
        city: cityId || null,
        zone: zoneId || null,
        description,
        is_active: isActive,
      };
      console.log(payload);

      if (isEdit) {
        await api.put(`wards/${id}/`, payload);
        Swal.fire({ icon: "success", title: "Updated successfully!", timer: 1500, showConfirmButton: false });
      } else {
        await api.post("wards/", payload);
        Swal.fire({ icon: "success", title: "Added successfully!", timer: 1500, showConfirmButton: false });
      }
      navigate("/masters/wards");
    } catch (error: any) {
      console.error("Failed to save ward:", error);
      const data = error.response?.data;
      let message = "Something went wrong while saving.";

      if (typeof data === "object" && data !== null) {
        message = Object.entries(data)
          .map(([key, val]) => `${key}: ${(val as string[]).join(", ")}`)
          .join("\n");
      } else if (typeof data === "string") {
        message = data;
      }

      const errMsg = message.toLowerCase();
      if (errMsg.includes("ward name already exists") || errMsg.includes("duplicate")) {
        Swal.fire({ icon: "warning", title: "Duplicate Ward", text: "Ward name already exists in the selected scope." });
      } else {
        Swal.fire({ icon: "error", title: "Save failed", text: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Ward" : "Add Ward"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Country */}
          <div>
            <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
            <Select
              id="country"
              value={countryId}
              onChange={(val) => setCountryId(val)}
              options={countries}
              placeholder="Select Country"
            />
          </div>

          {/* State */}
          <div>
            <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
            <Select
              id="state"
              value={stateId}
              onChange={(val) => setStateId(val)}
              options={states}
              placeholder="Select State"
            />
          </div>

          {/* District */}
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

          {/* City */}
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

          {/* Zone */}
          <div>
            <Label htmlFor="zone">Zone</Label>
            <Select
              id="zone"
              value={zoneId}
              onChange={(val) => setZoneId(val)}
              options={zones}
              placeholder="Select Zone"
            />
          </div>

          {/* Ward Name */}
          <div>
            <Label htmlFor="wardName">Ward Name <span className="text-red-500">*</span></Label>
            <Input
              id="wardName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Ward Name"
            />
          </div>

          {/* Active */}
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

          {/* Description */}
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

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
          >
            {loading ? (isEdit ? "Updating..." : "Saving...") : (isEdit ? "Update" : "Save")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/masters/wards")}
            className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
