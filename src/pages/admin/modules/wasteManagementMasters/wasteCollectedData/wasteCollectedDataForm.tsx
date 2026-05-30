import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { customerCreationApi, wasteCollectionApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";

type Customer = {
  id: number;
  unique_id?: string;
  customer_name: string;
  building_no: string;
  street: string;
  area: string;
  zone_name: string;
  ward_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  country_name: string;
};

function WasteCollectedForm() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");

  const [wetWaste, setWetWaste] = useState(0);
  const [dryWaste, setDryWaste] = useState(0);
  const [mixedWaste, setMixedWaste] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { encWasteManagementMaster, encWasteCollectedData } =
    getEncryptedRoute();
  const LIST_PATH = `/${encWasteManagementMaster}/${encWasteCollectedData}`;

  const normalizeEntityId = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      return String(record.unique_id ?? record.id ?? record.value ?? "").trim();
    }
    return String(value).trim();
  };

  const resolveId = (c: Customer) => normalizeEntityId(c);

  /* ---------------- TOTAL ---------------- */
  useEffect(() => {
    setTotalQuantity(wetWaste + dryWaste + mixedWaste);
  }, [wetWaste, dryWaste, mixedWaste]);

  /* ---------------- LOAD CUSTOMERS ---------------- */
  useEffect(() => {
    let cancelled = false;
    customerCreationApi.list().then((res) => {
      if (cancelled) return;
      setCustomers(res || []);
      if (!isEdit && res?.length) {
        setCustomerId(resolveId(res[0])); // same as Feedback
      }
    });
    return () => { cancelled = true; };
  }, [isEdit]);

  /* ---------------- EDIT MODE ---------------- */
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;

    wasteCollectionApi.get(id as string).then((res: any) => {
      if (cancelled) return;
      setCustomerId(
        normalizeEntityId(res.customer ?? res.customer_id ?? res.customer_unique_id)
      );
      setWetWaste(res.wet_waste || 0);
      setDryWaste(res.dry_waste || 0);
      setMixedWaste(res.mixed_waste || 0);
    });

    return () => { cancelled = true; };
  }, [id, isEdit]);

  const selectedCustomer = customers.find(
    (c) => resolveId(c) === customerId
  );

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      Swal.fire(
        t("common.warning"),
        t("admin.waste_collected_data.customer_required"),
        "warning"
      );
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
        await wasteCollectionApi.update(id as string, payload);
      } else {
        await wasteCollectionApi.create(payload);
      }

      Swal.fire(
        t("common.success"),
        t("admin.waste_collected_data.save_success"),
        "success"
      );
      navigate(LIST_PATH);
    } catch {
      Swal.fire(
        t("common.save_failed"),
        t("common.save_failed_desc"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.waste_collected_data.title_edit")
          : t("admin.waste_collected_data.title_add")
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Customer */}
          <div>
            <Label>
              {t("admin.waste_collected_data.customer")}
              <span className="text-red-500"> *</span>
            </Label>
            <Select
              value={customerId}
              onChange={(val) => setCustomerId(val)}
              options={customers.map((c) => ({
                value: resolveId(c),
                label: c.customer_name,
              }))}
            />
          </div>

          {/* Address */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_address")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={
                selectedCustomer
                  ? [
                      selectedCustomer.building_no,
                      selectedCustomer.street,
                      selectedCustomer.area,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : ""
              }
            />
          </div>

          {/* Zone */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_zone")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.zone_name || ""}
            />
          </div>

          {/* Ward */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_ward")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.ward_name || ""}
            />
          </div>

          {/* City */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_city")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.city_name || ""}
            />
          </div>

          {/* District */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_district")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.district_name || ""}
            />
          </div>

          {/* State */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_state")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.state_name || ""}
            />
          </div>

          {/* Country */}
          <div>
            <Label>{t("admin.waste_collected_data.customer_country")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={selectedCustomer?.country_name || ""}
            />
          </div>

          {/* Dry */}
          <div>
            <Label>{t("admin.waste_collected_data.dry_waste")}</Label>
            <Input
              type="number"
              value={dryWaste}
              onChange={(e) => setDryWaste(Math.max(0, +e.target.value || 0))}
            />
          </div>

          {/* Wet */}
          <div>
            <Label>{t("admin.waste_collected_data.wet_waste")}</Label>
            <Input
              type="number"
              value={wetWaste}
              onChange={(e) => setWetWaste(Math.max(0, +e.target.value || 0))}
            />
          </div>

          {/* Mixed */}
          <div>
            <Label>{t("admin.waste_collected_data.mixed_waste")}</Label>
            <Input
              type="number"
              value={mixedWaste}
              onChange={(e) => setMixedWaste(Math.max(0, +e.target.value || 0))}
            />
          </div>

          {/* Total */}
          <div>
            <Label>{t("admin.waste_collected_data.total_quantity")}</Label>
            <Input
              disabled
              className="bg-gray-100"
              value={totalQuantity}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded"
          >
            {loading
              ? t("common.saving")
              : isEdit
              ? t("common.update")
              : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(LIST_PATH)}
            className="bg-red-400 text-white px-4 py-2 rounded"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default WasteCollectedForm;
