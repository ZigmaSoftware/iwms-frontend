/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { binCollectionEventApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";

type BinCEDetail = {
  unique_id?: string;
  trip_plan?: { display_code?: string };
  collection_point?: { cp_name?: string };
  bin?: { bin_name?: string; bin_capacity?: number; bin_type?: string };
  waste_type?: { waste_type_name?: string };
  vehicle?: { vehicle_no?: string };
  effective_staff_template?: any;
  collected_weight_kg?: string | number;
  driver_latitude?: string | number | null;
  driver_longitude?: string | number | null;
  notes?: string | null;
  created_at?: string;
  company_name?: string;
  project_name?: string;
  [key: string]: unknown;
};

const field = (label: string, value: unknown) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-800 font-medium">{String(value ?? "-")}</span>
  </div>
);

const formatDate = (val?: string) => {
  if (!val) return "-";
  return new Date(val).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function BinCollectionEventForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as { record?: BinCEDetail; companyUniqueId?: string; projectId?: string } | null;

  const { companyUniqueId, projectId, applyCompanyProjectFromRecord } = useCompanyProjectSelection({
    isEdit: true,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encScheduleMasters, encBinCollectionEvent } = getEncryptedRoute();
  const LIST_PATH = `/${encScheduleMasters}/${encBinCollectionEvent}`;

  const [record, setRecord] = useState<BinCEDetail | null>(routeState?.record ?? null);
  const [loading, setLoading] = useState(!routeState?.record);

  useEffect(() => {
    if (!id) return;
    if (routeState?.record) {
      applyCompanyProjectFromRecord(routeState.record);
      return;
    }
    setLoading(true);
    binCollectionEventApi.retrieve(id)
      .then((data: any) => {
        setRecord(data);
        applyCompanyProjectFromRecord(data);
      })
      .catch(() => Swal.fire(t("common.error"), t("common.fetch_failed"), "error"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center p-10"><i className="pi pi-spin pi-spinner text-2xl text-blue-600" /></div>;
  }

  if (!record) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Record not found.</p>
        <button onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })} className="mt-3 text-blue-600 underline text-sm">
          Back to list
        </button>
      </div>
    );
  }

  const staffTemplate = record.effective_staff_template as any;
  const driverName = staffTemplate?.driver_id?.employee_name ?? staffTemplate?.driver?.employee_name ?? "-";
  const operatorName = staffTemplate?.operator_id?.employee_name ?? staffTemplate?.operator?.employee_name ?? "-";

  return (
    <div className="p-4 space-y-4">
      <ComponentCard title={`Bin Collection Event — ${record.unique_id ?? ""}`}>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {field("Event ID", record.unique_id)}
          {field("Trip Plan", record.trip_plan?.display_code)}
          {field("Collection Point", record.collection_point?.cp_name ?? (record.collection_point as any)?.cp_name)}
          {field("Bin", record.bin?.bin_name)}
          {field("Bin Type", record.bin?.bin_type)}
          {field("Bin Capacity (L)", record.bin?.bin_capacity)}
          {field("Waste Type", record.waste_type?.waste_type_name)}
          {field("Vehicle", record.vehicle?.vehicle_no)}
          {field("Driver", driverName)}
          {field("Operator", operatorName)}
          {field("Collected Weight (kg)", record.collected_weight_kg)}
          {field("GPS Latitude", record.driver_latitude ?? "-")}
          {field("GPS Longitude", record.driver_longitude ?? "-")}
          {field("Notes", record.notes ?? "-")}
          {field("Company", record.company_name)}
          {field("Project", record.project_name)}
          {field("Scanned At", formatDate(record.created_at))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            {t("common.back")}
          </button>
        </div>
      </ComponentCard>
    </div>
  );
}
