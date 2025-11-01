import React, { useEffect, useState } from "react";
import axios from "axios";
import L from "leaflet";
import "./collectionMonitor.css";

interface Vehicle {
  id: string;
  number: string;
  lat: number;
  lon: number;
  status: "Running" | "Idle" | "Parked" | "No Data";
  speed: number;
  ignition: boolean;
  location: string;
  distance: number;
  updatedAt: string;
}

interface Option {
  value: string | number;
  label: string;
}

const WasteCollectionMonitor: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [zone, setZone] = useState<string>("");
  const [ward, setWard] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");

  const [zones, setZones] = useState<Option[]>([]);
  const [wards, setWards] = useState<Option[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);

  const [collectedCount, setCollectedCount] = useState<number>(0);
  const [notCollectedCount, setNotCollectedCount] = useState<number>(0);
  const [totalHouseholdCount, setTotalHouseholdCount] = useState<number>(0);

  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);

  // Fetch vehicle data from Vamosys
  const fetchVamosysData = async () => {
    try {
      const response = await fetch(
        "https://api.vamosys.com/mobile/getGrpDataForTrustedClients?providerName=BLUEPLANET&fcode=VAM",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      console.log("Raw API data:", data);

      const parsedData: Vehicle[] =
        data?.data?.map((v: any, index: number) => ({
          id: index.toString(),
          number: v.vehicleNumber || "Unknown",
          lat: parseFloat(v.latitude) || 28.61,
          lon: parseFloat(v.longitude) || 77.23,
          status: v.status || "Idle",
          speed: v.speed || 0,
          ignition: v.ignitionStatus === "ON",
          location: v.location || "Unknown Area",
          distance: v.distance || 0,
          updatedAt: v.updatedAt || new Date().toISOString(),
        })) || [];

      setVehicles(parsedData);
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
    }
  };

  // Load vehicle data once
  useEffect(() => {
    fetchVamosysData();
  }, []);

  // Initialize map
  useEffect(() => {
    const leafletMap = L.map("map", { center: [28.6, 77.2], zoom: 8 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(leafletMap);

    setMap(leafletMap);

    return () => {
      leafletMap.remove();
    };
  }, []);

  // Add markers dynamically
  useEffect(() => {
    if (!map) return;

    // Remove old markers
    map.eachLayer((layer) => {
      if ((layer as any)._latlng) map.removeLayer(layer);
    });

    vehicles.forEach((v) => {
      const color =
        v.status === "Running"
          ? "#66E066"
          : v.status === "Idle"
          ? "#FFB03F"
          : v.status === "Parked"
          ? "#808080"
          : "#999";

      const truckIcon = L.divIcon({
        html: `<div class="truck-marker" style="color:${color}">🚛</div>`,
        iconSize: [28, 28],
        className: "custom-marker",
      });

      L.marker([v.lat, v.lon], { icon: truckIcon })
        .addTo(map)
        .bindPopup(
          `<b>${v.number}</b><br>Status: ${v.status}<br>Speed: ${v.speed} km/h<br>${v.location}`
        );
    });
  }, [map, vehicles]);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h5 className="text-lg font-semibold flex items-center">
            Waste Collection Monitoring
          </h5>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="form-input w-full border rounded-md p-2"
              value={fromDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Zone</label>
            <select
              className="form-select w-full border rounded-md p-2"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            >
              <option value="">Select the Zone</option>
              {zones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ward</label>
            <select
              className="form-select w-full border rounded-md p-2"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            >
              <option value="">Select the Ward</option>
              {wards.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select
              className="form-select w-full border rounded-md p-2"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
              Go
            </button>
          </div>
        </div>

        {/* Status Radio Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          {[
            {
              label: "Collected",
              value: "collected",
              count: collectedCount,
              color: "green-400",
            },
            {
              label: "Not Collected",
              value: "not_collected",
              count: notCollectedCount,
              color: "red-400",
            },
            {
              label: "Total Household",
              value: "total_household",
              count: totalHouseholdCount,
              color: "blue-400",
            },
          ].map((status) => (
            <label key={status.value} className="control cursor-pointer">
              <input
                type="radio"
                name="status"
                value={status.value}
                checked={selectedStatus === status.value}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="hidden"
              />
              <span className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full transition">
                <span
                  className={`w-4 h-4 mr-2 rounded-full ${
                    selectedStatus === status.value
                      ? `bg-${status.color} shadow-md`
                      : "bg-gray-300"
                  }`}
                ></span>
                {status.label} ({status.count})
              </span>
            </label>
          ))}
        </div>

        <hr className="my-4" />
        <div id="vehicle_id_text" className="font-semibold text-gray-600 mb-2">
          {customerId ? `Vehicle ID: ${customerId}` : ""}
        </div>

        {/* Map */}
        <div id="map" style={{ height: "600px", width: "100%" }}></div>
      </div>
    </div>
  );
};

export default WasteCollectionMonitor;
