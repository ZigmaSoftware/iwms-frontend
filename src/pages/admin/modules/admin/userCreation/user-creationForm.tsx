import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  customerCreationApi,
  cityApi,
  districtApi,
  staffCreationApi,
  staffUserTypeApi,
  userCreationApi,
  userTypeApi,
  wardApi,
  zoneApi,
} from "@/helpers/admin";

/* =======================
   SHADCN SELECT
   ======================= */
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* =======================
   TYPES
   ======================= */
type SelectOption = {
  value: string;
  label: string;
};

/* =======================
   ROUTES
   ======================= */
const { encAdmins, encUserCreation } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encAdmins}/${encUserCreation}`;

/* =======================
   HELPERS
   ======================= */
const pickIdentifier = (entity: any): string => {
  if (!entity) return "";
  if (typeof entity !== "object") return String(entity);

  const keys = [
    "unique_id",
    "id",
    "value",
    "staff_unique_id",
    "customer_id",
    "zone_id",
    "city_id",
    "district_id",
    "ward_id",
  ];

  for (const k of keys) {
    const v = entity[k];
    if (v !== undefined && v !== null && String(v).length > 0) {
      return String(v);
    }
  }
  return "";
};

const parseIdentifierForPayload = (value: string) => {
  if (!value) return undefined;
  return /^\d+$/.test(value) ? Number(value) : value;
};

const mapToOptions = (
  items: any[] = [],
  labelBuilder: (item: any) => string | undefined,
): SelectOption[] =>
  items
    .map((item) => {
      const value = pickIdentifier(item);
      if (!value) return null;
      const label = labelBuilder(item) ?? value;
      return { value, label };
    })
    .filter(Boolean) as SelectOption[];

const normalizeList = (payload: any) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : (payload?.data?.results ?? []);

/* =======================
   ROLE CONFIG
   ======================= */
const ROLE_CONFIG: Record<string, any> = {
  staff: {
    fields: [
      "staffusertype_id",
      "staff_id",
      "district_id",
      "city_id",
      "zone_id",
      "ward_id",
    ],
    apis: ["staffusertypes/", "staffcreation/", "districts/"],
  },
  customer: {
    fields: ["customer_id"],
    apis: ["customercreations/"],
  },
};

/* =======================
   SHADCN SELECT WRAPPER
   ======================= */
function ShadcnSelect({
  value,
  onChange,
  options,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* =======================
   COMPONENT
   ======================= */
export default function UserCreationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  /* ---------- STATE ---------- */
  const [userType, setUserType] = useState("");
  const [userTypes, setUserTypes] = useState<SelectOption[]>([]);

  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [customerList, setCustomerList] = useState<SelectOption[]>([]);
  const [customerId, setCustomerId] = useState("");

  const [staffUserTypes, setStaffUserTypes] = useState<SelectOption[]>([]);
  const [staffUserType, setStaffUserType] = useState("");

  const [staffList, setStaffList] = useState<SelectOption[]>([]);
  const [staffId, setStaffId] = useState("");

  const [districtList, setDistrictList] = useState<SelectOption[]>([]);
  const [district, setDistrict] = useState("");

  const [cityList, setCityList] = useState<SelectOption[]>([]);
  const [city, setCity] = useState("");

  const [zoneList, setZoneList] = useState<SelectOption[]>([]);
  const [zone, setZone] = useState("");

  const [wardList, setWardList] = useState<SelectOption[]>([]);
  const [ward, setWard] = useState("");

  /* ---------- USER TYPES ---------- */
  useEffect(() => {
    userTypeApi
      .list()
      .then((res) => {
        setUserTypes(mapToOptions(normalizeList(res), (u) => u.name));
      })
      .catch((err) => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
        console.error("User type load failed:", err);
      });
  }, []);

  /* ---------- ROLE ---------- */
  const selectedRoleKey = userTypes
    .find((u) => u.value === userType)
    ?.label?.toLowerCase();

  const roleConfig = selectedRoleKey ? ROLE_CONFIG[selectedRoleKey] : undefined;

  /* ---------- ROLE DATA ---------- */
  useEffect(() => {
    if (!roleConfig) return;

    if (selectedRoleKey === "customer") {
      customerCreationApi
        .list()
        .then((res) => {
          const list = normalizeList(res);
          setCustomerList(
            mapToOptions(list, (c) =>
              [c.customer_name].filter(Boolean).join(" - "),
            ),
          );
        })
        .catch((err) => {
          Swal.fire(t("common.error"), t("common.load_failed"), "error");
          console.error("Customer load failed:", err);
        });
    }

    if (selectedRoleKey === "staff") {
      Promise.all([
        staffUserTypeApi.list(),
        staffCreationApi.list(),
        districtApi.list(),
      ])
        .then(([staffTypesRes, staffRes, districtsRes]) => {
          setStaffUserTypes(
            mapToOptions(normalizeList(staffTypesRes), (s) => s.name),
          );
          setStaffList(
            mapToOptions(normalizeList(staffRes), (s) => s.employee_name),
          );
          setDistrictList(
            mapToOptions(normalizeList(districtsRes), (d) => d.name),
          );
        })
        .catch((err) => {
          Swal.fire(t("common.error"), t("common.load_failed"), "error");
          console.error("Staff data load failed:", err);
        });
    }
  }, [selectedRoleKey]);

  /* ---------- CHAINED LOCATION ---------- */
  useEffect(() => {
    if (!district) return;
    cityApi
      .list({ params: { district: parseIdentifierForPayload(district) } })
      .then((res) =>
        setCityList(mapToOptions(normalizeList(res), (c) => c.name)),
      )
      .catch((err) => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
        console.error("City load failed:", err);
      });
  }, [district]);

  useEffect(() => {
    if (!city) return;
    zoneApi
      .list({ params: { city: parseIdentifierForPayload(city) } })
      .then((res) =>
        setZoneList(mapToOptions(normalizeList(res), (z) => z.name)),
      )
      .catch((err) => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
        console.error("Zone load failed:", err);
      });
  }, [city]);

  useEffect(() => {
    if (!zone) return;
    wardApi
      .list({ params: { zone: parseIdentifierForPayload(zone) } })
      .then((res) =>
        setWardList(mapToOptions(normalizeList(res), (w) => w.name)),
      )
      .catch((err) => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
        console.error("Ward load failed:", err);
      });
  }, [zone]);

  /* ---------- EDIT ---------- */
  useEffect(() => {
    if (!isEdit || !id) return;

    userCreationApi
      .get(id)
      .then((u) => {
        setUserType(pickIdentifier(u.user_type_id));
        setPassword(u.password ?? "");
        setIsActive(Boolean(u.is_active));
        setCustomerId(pickIdentifier(u.customer_id));
        setStaffUserType(pickIdentifier(u.staffusertype_id));
        setStaffId(pickIdentifier(u.staff_id));
        setDistrict(pickIdentifier(u.district_id));
        setCity(pickIdentifier(u.city_id));
        setZone(pickIdentifier(u.zone_id));
        setWard(pickIdentifier(u.ward_id));
      })
      .catch((err) => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
        console.error("User load failed:", err);
      });
  }, [id, isEdit]);

  /* ---------- SUBMIT ---------- */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const payload: any = {
      user_type_id: parseIdentifierForPayload(userType),
      password,
      is_active: isActive ? 1 : 0,
    };

    if (selectedRoleKey === "customer") {
      payload.customer_id = parseIdentifierForPayload(customerId);
    }

    if (selectedRoleKey === "staff") {
      payload.staffusertype_id = parseIdentifierForPayload(staffUserType);
      payload.staff_id = parseIdentifierForPayload(staffId);
      payload.district_id = parseIdentifierForPayload(district);
      payload.city_id = parseIdentifierForPayload(city);
      payload.zone_id = parseIdentifierForPayload(zone);
      payload.ward_id = parseIdentifierForPayload(ward);
    }
    console.log("Payload:", payload); 

    try {
      setLoading(true);
      if (isEdit) {
        if (!id) {
          throw new Error(t("common.missing_id"));
        }
        await userCreationApi.update(id, payload);
      } else {
        await userCreationApi.create(payload);
      }

      Swal.fire({ icon: "success", title: t("common.updated_success") });
      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: JSON.stringify(err.response?.data),
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RENDER ---------- */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.user_creation.user_label") })
          : t("common.add_item", { item: t("admin.user_creation.user_label") })
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>{t("admin.nav.user_type")} *</Label>
            <ShadcnSelect
              value={userType}
              onChange={setUserType}
              options={userTypes}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.nav.user_type"),
              })}
            />
          </div>

          <div>
            <Label>{t("admin.user_creation.password_label")} *</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <Label>{t("common.status")} *</Label>
            <ShadcnSelect
              value={isActive ? "1" : "0"}
              onChange={(v) => setIsActive(v === "1")}
              options={[
                { value: "1", label: t("common.active") },
                { value: "0", label: t("common.inactive") },
              ]}
              placeholder={t("common.select_status")}
            />
          </div>

          {roleConfig?.fields?.includes("customer_id") && (
            <div>
              <Label>{t("admin.roles.customer")} *</Label>
              <ShadcnSelect
                value={customerId}
                onChange={setCustomerId}
                options={customerList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.roles.customer"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("staffusertype_id") && (
            <div>
              <Label>{t("admin.nav.staff_user_type")} *</Label>
              <ShadcnSelect
                value={staffUserType}
                onChange={setStaffUserType}
                options={staffUserTypes}
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.staff_user_type"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("staff_id") && (
            <div>
              <Label>{t("admin.roles.staff")} *</Label>
              <ShadcnSelect
                value={staffId}
                onChange={setStaffId}
                options={staffList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.roles.staff"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("district_id") && (
            <div>
              <Label>{t("admin.nav.district")} *</Label>
              <ShadcnSelect
                value={district}
                onChange={setDistrict}
                options={districtList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.district"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("city_id") && (
            <div>
              <Label>{t("common.city")} *</Label>
              <ShadcnSelect
                value={city}
                onChange={setCity}
                options={cityList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("common.city"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("zone_id") && (
            <div>
              <Label>{t("common.zone")} *</Label>
              <ShadcnSelect
                value={zone}
                onChange={setZone}
                options={zoneList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("common.zone"),
                })}
              />
            </div>
          )}

          {roleConfig?.fields?.includes("ward_id") && (
            <div>
              <Label>{t("common.ward")} *</Label>
              <ShadcnSelect
                value={ward}
                onChange={setWard}
                options={wardList}
                placeholder={t("common.select_item_placeholder", {
                  item: t("common.ward"),
                })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="bg-red-400 px-4 py-2 text-white rounded"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom px-4 py-2 text-white rounded"
          >
            {loading
              ? t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
