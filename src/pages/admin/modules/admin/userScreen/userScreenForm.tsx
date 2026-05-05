import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

import { encryptSegment } from "@/utils/routeCrypto";

/* -----------------------------------------
   ROUTES
----------------------------------------- */
const encAdmins = encryptSegment("admins");
const encUserScreen = encryptSegment("userscreens");
const ENC_LIST_PATH = `/${encAdmins}/${encUserScreen}`;

/* -----------------------------------------
   APIS
----------------------------------------- */

import {
  useCreateUserScreenMutation,
  useMainScreensQuery,
  useUpdateUserScreenMutation,
  useUserScreenQuery,
} from "@/tanstack/admin";

type MainScreenOption = {
    value: string;
    label: string;
    companyId: string;
    projectId: string;
    companyName: string;
    projectName: string;
};

const toText = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const firstErrorMessage = (value: unknown): string | undefined => {
    if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
    }

    if (typeof value === "string") {
        return value;
    }

    return undefined;
};


/* =========================================
    FORM COMPONENT
========================================= */
export default function UserScreenForm() {
    const { t } = useTranslation();
    /* FORM FIELDS */
    const [mainscreenId, setMainscreenId] = useState("");
    const [userScreenName, setUserScreenName] = useState("");
    const [folderName, setFolderName] = useState("");
    const [orderNo, setOrderNo] = useState("");
    const [description, setDescription] = useState("");
    const [fallbackCompanyId, setFallbackCompanyId] = useState("");
    const [fallbackProjectId, setFallbackProjectId] = useState("");
    const [fallbackCompanyName, setFallbackCompanyName] = useState("");
    const [fallbackProjectName, setFallbackProjectName] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const mainScreensQuery = useMainScreensQuery();
    const userScreenQuery = useUserScreenQuery(isEdit ? id : null);
    const createMutation = useCreateUserScreenMutation();
    const updateMutation = useUpdateUserScreenMutation();
    const isSubmitting = createMutation.isPending || updateMutation.isPending;
    const mainScreens = useMemo<MainScreenOption[]>(
        () =>
            (mainScreensQuery.data ?? [])
                .filter((x) => Boolean(x.is_active))
                .map((x) => ({
                    value: toText(x.unique_id),
                    label: toText(x.mainscreen_name),
                    companyId: toText(x.company_id),
                    projectId: toText(x.project_id),
                    companyName: toText(x.company_name),
                    projectName: toText(x.project_name),
                })),
        [mainScreensQuery.data]
    );
    const selectedMainScreen = useMemo(
        () => mainScreens.find((x) => x.value === mainscreenId),
        [mainScreens, mainscreenId]
    );
    const resolvedCompanyId = selectedMainScreen
        ? selectedMainScreen.companyId
        : fallbackCompanyId;
    const resolvedProjectId = selectedMainScreen
        ? selectedMainScreen.projectId
        : fallbackProjectId;
    const resolvedCompanyName = selectedMainScreen
        ? selectedMainScreen.companyName
        : fallbackCompanyName;
    const resolvedProjectName = selectedMainScreen
        ? selectedMainScreen.projectName
        : fallbackProjectName;

    /* =========================================
        LOAD MAINSCREENS FOR DROPDOWN
    ========================================= */
    /* =========================================
        EDIT MODE — LOAD EXISTING RECORD
    ========================================= */
    useEffect(() => {
        if (!userScreenQuery.data) return;
        const data = userScreenQuery.data;
        setMainscreenId(data.mainscreen_id ?? "");
        setUserScreenName(data.userscreen_name ?? "");
        setFolderName(data.folder_name ?? "");
        setOrderNo(String(data.order_no ?? ""));
        setDescription(data.description ?? "");
        setFallbackCompanyId(toText(data.company_id));
        setFallbackProjectId(toText(data.project_id));
        setFallbackCompanyName(toText(data.company_name));
        setFallbackProjectName(toText(data.project_name));
        setIsActive(Boolean(data.is_active));
    }, [userScreenQuery.data]);

    useEffect(() => {
        if (!userScreenQuery.isError && !mainScreensQuery.isError) return;
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
    }, [mainScreensQuery.isError, userScreenQuery.isError, t]);

    /* =========================================
        SUBMIT HANDLER
    ========================================= */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!mainscreenId || !userScreenName.trim() || !folderName.trim()) {
            Swal.fire(
                t("common.warning"),
                t("common.missing_fields"),
                "warning"
            );
            return;
        }

        try {
            const payload = {
                mainscreen_id: mainscreenId,
                company_id: resolvedCompanyId || null,
                project_id: resolvedProjectId || null,
                userscreen_name: userScreenName.trim(),
                folder_name: folderName.trim(),
                description: description.trim(),
                is_active: isActive,
            };

            if (isEdit && id) {
                await updateMutation.mutateAsync({ id, payload: {
                    ...payload,
                    order_no: Number(orderNo) || 0,
                }});
                Swal.fire(t("common.success"), t("common.updated_success"), "success");
            } else {
                await createMutation.mutateAsync(payload);
                Swal.fire(t("common.success"), t("common.added_success"), "success");
            }

            navigate(ENC_LIST_PATH);
        } catch (err: unknown) {
            const errorData =
                (err as { response?: { data?: Record<string, unknown> } })?.response
                    ?.data ?? {};

            Swal.fire(
                t("common.save_failed"),
                firstErrorMessage(errorData.detail) ||
                    firstErrorMessage(errorData.company_id) ||
                    firstErrorMessage(errorData.project_id) ||
                    t("common.save_failed_desc"),
                "error"
            );
        }
    };

    /* =========================================
        JSX
    ========================================= */
    return (
        <ComponentCard
            title={
                isEdit
                    ? t("common.edit_item", { item: t("admin.nav.user_screen") })
                    : t("common.add_item", { item: t("admin.nav.user_screen") })
            }
        >
            <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company (from MainScreen) */}
                    <div>
                        <Label>{t("admin.nav.company")}</Label>
                        <Input
                            value={resolvedCompanyName}
                            placeholder={t("common.select_item_placeholder", {
                                item: t("admin.nav.main_screen"),
                            })}
                            className="input-validate w-full"
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Project (from MainScreen) */}
                    <div>
                        <Label>{t("admin.nav.project")}</Label>
                        <Input
                            value={resolvedProjectName}
                            placeholder={t("common.select_item_placeholder", {
                                item: t("admin.nav.main_screen"),
                            })}
                            className="input-validate w-full"
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Mainscreen */}
                    <div>
                        <Label>{t("admin.nav.main_screen")} *</Label>
                        <Select
                            value={mainscreenId}
                            onValueChange={(val) => setMainscreenId(val)}
                        >
                            <SelectTrigger className="input-validate w-full">
                                <SelectValue
                                    placeholder={t("common.select_item_placeholder", {
                                        item: t("admin.nav.main_screen"),
                                    })}
                                />
                            </SelectTrigger>

                            <SelectContent>
                                {mainScreens.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* User Screen Name */}
                    <div>
                        <Label>
                            {t("common.item_name", {
                                item: t("admin.nav.user_screen"),
                            })}{" "}
                            *
                        </Label>
                        <Input
                            value={userScreenName}
                            onChange={(e) => setUserScreenName(e.target.value)}
                            placeholder={t("common.enter_item_name", {
                                item: t("admin.nav.user_screen"),
                            })}
                            required
                            className="input-validate w-full"
                        />
                    </div>

                    {/* Folder Name */}
                    <div>
                        <Label>{t("common.folder_path")} *</Label>
                        <Input
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder={t("common.folder_path_placeholder")}
                            required
                            className="input-validate w-full"
                        />
                    </div>

                    {/* Icon Name removed: backend-controlled */}

                    {/* Order No (backend-controlled) */}
                    {isEdit ? (
                        <div>
                            <Label>{t("common.order_no")}</Label>
                            <Input
                                type="number"
                                value={orderNo}
                                onChange={(e) => setOrderNo(e.target.value)}
                                placeholder={t("common.order_no_placeholder")}
                                className="input-validate w-full"
                            />
                        </div>
                    ) : null}

                    {/* Description */}
                    <div className="md:col-span-2">
                        <Label>{t("common.description")}</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("common.description_optional")}
                            className="input-validate w-full"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <Label>{t("common.status")} *</Label>
                        <Select
                            value={isActive ? "true" : "false"}
                            onValueChange={(v) => setIsActive(v === "true")}
                        >
                            <SelectTrigger className="input-validate w-full">
                                <SelectValue placeholder={t("common.select_status")} />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="true">
                                    {t("common.active")}
                                </SelectItem>
                                <SelectItem value="false">
                                    {t("common.inactive")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
                            ? isEdit
                                ? t("common.updating")
                                : t("common.saving")
                            : isEdit
                                ? t("common.update")
                                : t("common.save")}
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => navigate(ENC_LIST_PATH)}
                    >
                        {t("common.cancel")}
                    </Button>
                </div>
            </form>
        </ComponentCard>
    );
}
