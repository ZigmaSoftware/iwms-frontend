import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { adminApi } from "@/helpers/admin/registry";

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

function FeedBackForm() {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState<string>("");
  const [feedbackCategory, setFeedbackCategory] = useState("Excellent");
  const [feedbackDetails, setFeedbackDetails] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [recordData, setRecordData] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { encCitizenGrivence, encFeedback } = getEncryptedRoute();
  const LIST_PATH = `/${encCitizenGrivence}/${encFeedback}`;

  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  /* ---------------- LOAD CUSTOMERS ---------------- */
  useEffect(() => {
    let cancelled = false;
    adminApi.customerCreations.list()
      .then((res: any) => {
        if (cancelled) return;
        setCustomersList(Array.isArray(res) ? res : (res?.results ?? []));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ---------------- LOAD RECORD (EDIT MODE) ---------------- */
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    adminApi.feedbacks.get(id)
      .then((res: any) => {
        if (cancelled) return;
        setRecordData(res);
        setLoadingRecord(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadingRecord(false);
        Swal.fire(t("common.error"), String(err?.response?.data ?? err?.message ?? t("common.load_failed")), "error");
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const resolveId = (c: any) =>
    normalizeId(c.unique_id || c.id);

  const customers = useMemo(() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];

    return customersList
      .filter((customer) => {
        const rowCompanyId = normalizeId(customer.company_id || customer.company_unique_id);
        const rowProjectId = normalizeId(customer.project_id || customer.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      })
      .sort((a: any, b: any) =>
        String(a.customer_name ?? "").localeCompare(String(b.customer_name ?? ""))
      );
  }, [
    companies.length,
    companyUniqueId,
    customersList,
    isSuperAdmin,
    projectId,
  ]);

  useEffect(() => {
    if (isEdit) return;

    const currentExists = customers.some((customer: any) => resolveId(customer) === customerId);
    if (currentExists) return;

    setCustomerId(customers[0] ? resolveId(customers[0]) : "");
  }, [customerId, customers, isEdit]);

  /* ---------------- APPLY EDIT DATA ---------------- */
  useEffect(() => {
    if (!recordData) return;

    const data = recordData;
    setCustomerId(
      normalizeId(data.customer ?? data.customer_id ?? data.customer_unique_id)
    );
    setFeedbackCategory(data.category || "Excellent");
    setFeedbackDetails(data.feedback_details || "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [applyCompanyProjectFromRecord, recordData]);

  useEffect(() => {
    if (
      !isEdit ||
      !customerId ||
      recordData?.company_id ||
      recordData?.company_unique_id
    ) {
      return;
    }
    const selected = customersList.find(
      (customer: any) => resolveId(customer) === customerId
    );
    if (selected) {
      applyCompanyProjectFromRecord(selected as unknown as Record<string, unknown>);
    }
  }, [
    applyCompanyProjectFromRecord,
    customerId,
    customersList,
    recordData,
    isEdit,
  ]);

  const selectedCustomer = customers.find(
    (c: any) => resolveId(c) === customerId
  );

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      Swal.fire(
        t("common.warning"),
        t("admin.citizen_grievance.feedback_form.customer_required"),
        "warning"
      );
      return;
    }

    if (!companyUniqueId || !projectId) {
      Swal.fire(
        t("common.warning"),
        "Company and project are required",
        "warning"
      );
      return;
    }

    const payload = {
      customer: customerId,
      category: feedbackCategory,
      feedback_details: feedbackDetails,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.feedbacks.update(id, payload);
      } else {
        await adminApi.feedbacks.create(payload);
      }

      Swal.fire(
        t("common.success"),
        t("admin.citizen_grievance.feedback_form.saved"),
        "success"
      );
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch {
      Swal.fire(
        t("common.error"),
        t("admin.citizen_grievance.feedback_form.save_failed"),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.citizen_grievance.feedback_form.title_edit")
          : t("admin.citizen_grievance.feedback_form.title_add")
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>
              {t("admin.nav.company")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={companyUniqueId}
              onChange={onCompanyChange}
              options={companies}
              disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId)}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            />
          </div>

          <div>
            <Label>
              {t("admin.nav.project")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={projectId}
              onChange={setProjectId}
              options={projects}
              disabled={!companyUniqueId || projects.length === 0}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            />
          </div>

          {/* Customer */}
          <div>
            <Label>
              {t("admin.citizen_grievance.feedback_form.customer")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={customerId}
              onChange={(val) => setCustomerId(val)}
              disabled={!companyUniqueId || !projectId || customers.length === 0}
              options={customers.map((c: any) => ({
                value: resolveId(c),
                label: c.customer_name,
              }))}
            />
          </div>

          {/* Address */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_address")}</Label>
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
            <Label>{t("admin.citizen_grievance.feedback_form.customer_zone")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.zone_name || ""} />
          </div>

          {/* Ward */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_ward")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.ward_name || ""} />
          </div>

          {/* City */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_city")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.city_name || ""} />
          </div>

          {/* District */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_district")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.district_name || ""} />
          </div>

          {/* State */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_state")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.state_name || ""} />
          </div>

          {/* Country */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.customer_country")}</Label>
            <Input disabled className="bg-gray-100"
              value={selectedCustomer?.country_name || ""} />
          </div>

          {/* Feedback Category */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.feedback_category")}</Label>
            <Select
              value={feedbackCategory}
              onChange={(val) => setFeedbackCategory(val)}
              options={[
                { value: "Excellent", label: t("admin.citizen_grievance.feedback_form.categories.excellent") },
                { value: "Satisfied", label: t("admin.citizen_grievance.feedback_form.categories.satisfied") },
                { value: "Not Satisfied", label: t("admin.citizen_grievance.feedback_form.categories.not_satisfied") },
                { value: "Poor", label: t("admin.citizen_grievance.feedback_form.categories.poor") },
              ]}
            />
          </div>

          {/* Feedback Details */}
          <div>
            <Label>{t("admin.citizen_grievance.feedback_form.feedback_details")}</Label>
            <Input
              value={feedbackDetails}
              onChange={(e) => setFeedbackDetails(e.target.value)}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-custom text-white px-4 py-2 rounded"
          >
            {isSubmitting ? t("admin.citizen_grievance.feedback_form.saving") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            className="bg-red-400 text-white px-4 py-2 rounded"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default FeedBackForm;
