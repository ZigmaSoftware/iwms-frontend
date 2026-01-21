import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

import { customerCreationApi, customerTagApi, userCreationApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";

type SelectOption = { value: string; label: string };

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

export default function CustomerTagForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const customerApi = customerCreationApi;
  const userApi = userCreationApi;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [customerId, setCustomerId] = useState("");

  const { encCustomerMaster, encCustomerTag } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encCustomerMaster}/${encCustomerTag}`;

  const buildCustomerMap = (items: any[]) =>
    items.reduce<Record<string, any>>((acc, item) => {
      const key = item?.unique_id ?? item?.id;
      if (key) acc[String(key)] = item;
      return acc;
    }, {});

  const findCustomerProfile = (user: any, map: Record<string, any>) => {
    const key =
      user?.customer_unique_id ||
      user?.customer_id ||
      user?.customer ||
      user?.unique_id;
    return key ? map[String(key)] ?? null : null;
  };

  useEffect(() => {
    setFetching(true);
    Promise.all([userApi.list(), customerApi.list()])
      .then(([usersRes, customersRes]) => {
        const users = normalizeList(usersRes);
        const customerMap = buildCustomerMap(normalizeList(customersRes));
        const customerUsers = users.filter(
          (user) => user?.user_type_name?.toLowerCase() === "customer"
        );

        const options = customerUsers
          .map((user) => {
            const profile = findCustomerProfile(user, customerMap);
            const label =
              profile?.customer_name ||
              user?.full_name ||
              user?.username ||
              user?.unique_id;
            return {
              value: String(user?.unique_id ?? ""),
              label: String(label ?? ""),
            };
          })
          .filter((option) => option.value);

        setCustomers(options);
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => setFetching(false));
  }, [customerApi, t, userApi]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    setLoading(true);
    try {
      await customerTagApi.create({ customer_id: customerId });
      Swal.fire(t("common.success"), t("common.added_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const message = error?.response?.data?.detail || t("common.save_failed_desc");
      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={t("admin.customer_tag.title_add")}
        desc={t("admin.customer_tag.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.customer_tag.customer")}</Label>
              <Select
                value={customerId}
                onChange={setCustomerId}
                options={customers}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>

            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
