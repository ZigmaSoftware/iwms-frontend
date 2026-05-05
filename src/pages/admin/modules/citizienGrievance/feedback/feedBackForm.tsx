import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  useCreateFeedbackMutation,
  useCustomerCreationsQuery,
  useFeedbackQuery,
  useUpdateFeedbackMutation,
  type CustomerCreationRecord,
} from "@/tanstack/admin";

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
  const customersQuery = useCustomerCreationsQuery();
  const feedbackQuery = useFeedbackQuery(isEdit ? id : null);
  const createFeedbackMutation = useCreateFeedbackMutation();
  const updateFeedbackMutation = useUpdateFeedbackMutation();

  const { encCitizenGrivence, encFeedback } = getEncryptedRoute();
  const LIST_PATH = `/${encCitizenGrivence}/${encFeedback}`;

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
  } = useCompanyProjectSelection({ isEdit });

  const resolveId = (c: CustomerCreationRecord & { id?: string | number }) =>
    normalizeId(c.unique_id || c.id);

  const customers = useMemo(() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];

    return (customersQuery.data ?? [])
      .filter((customer) => {
        const rowCompanyId = normalizeId(customer.company_id || customer.company_unique_id);
        const rowProjectId = normalizeId(customer.project_id || customer.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      })
      .sort((a, b) =>
        String(a.customer_name ?? "").localeCompare(String(b.customer_name ?? ""))
      );
  }, [
    companies.length,
    companyUniqueId,
    customersQuery.data,
    isSuperAdmin,
    projectId,
  ]);

  useEffect(() => {
    if (isEdit) return;

    const currentExists = customers.some((customer) => resolveId(customer) === customerId);
    if (currentExists) return;

    setCustomerId(customers[0] ? resolveId(customers[0]) : "");
  }, [customerId, customers, isEdit]);

  /* ---------------- EDIT MODE ---------------- */
  useEffect(() => {
    if (!feedbackQuery.data) return;

    const data = feedbackQuery.data;
    setCustomerId(
      normalizeId(data.customer ?? data.customer_id ?? data.customer_unique_id)
    );
    setFeedbackCategory(data.category || "Excellent");
    setFeedbackDetails(data.feedback_details || "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [applyCompanyProjectFromRecord, feedbackQuery.data]);

  useEffect(() => {
    if (
      !isEdit ||
      !customerId ||
      feedbackQuery.data?.company_id ||
      feedbackQuery.data?.company_unique_id
    ) {
      return;
    }
    const selected = (customersQuery.data ?? []).find(
      (customer) => resolveId(customer) === customerId
    );
    if (selected) {
      applyCompanyProjectFromRecord(selected as unknown as Record<string, unknown>);
    }
  }, [
    applyCompanyProjectFromRecord,
    customerId,
    customersQuery.data,
    feedbackQuery.data,
    isEdit,
  ]);

  useEffect(() => {
    if (!customersQuery.isError && !feedbackQuery.isError) return;
    const error = customersQuery.error ?? feedbackQuery.error;
    Swal.fire({
      icon: "error",
      title: t("common.error"),
      text: String((error as any)?.response?.data ?? error),
    });
  }, [
    customersQuery.error,
    customersQuery.isError,
    feedbackQuery.error,
    feedbackQuery.isError,
    t,
  ]);

  const selectedCustomer = customers.find(
    (c) => resolveId(c) === customerId
  );
  const isSubmitting =
    createFeedbackMutation.isPending || updateFeedbackMutation.isPending;

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

    try {
      const payload = {
        customer: customerId,
        category: feedbackCategory,
        feedback_details: feedbackDetails,
      };

      if (isEdit && id) {
        await updateFeedbackMutation.mutateAsync({ id, payload });
      } else {
        await createFeedbackMutation.mutateAsync(payload);
      }

      Swal.fire(
        t("common.success"),
        t("admin.citizen_grievance.feedback_form.saved"),
        "success"
      );
      navigate(LIST_PATH);
    } catch {
      Swal.fire(
        t("common.error"),
        t("admin.citizen_grievance.feedback_form.save_failed"),
        "error"
      );
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
              options={customers.map((c) => ({
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

export default FeedBackForm;
