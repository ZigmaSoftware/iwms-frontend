import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import ComponentCard from "@/components/common/ComponentCard";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/common/FormSelect";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { complaintDepartmentMemberApi } from "@/features/complaintTicketing/api";
import { departmentApi, staffCreationApi } from "@/helpers/admin";
import { asArray, errorText } from "../utils";

export default function DepartmentRosterForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const routes = getEncryptedRoute();
  const { listPath } = createCrudRoutePaths(routes.encComplaintTicket, routes.encComplaintDepartmentMembers);

  const [departments, setDepartments] = useState<any[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ value: string; label: string }[]>([]);
  const [department, setDepartment] = useState("");
  const [staff, setStaff] = useState("");
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [maxActiveTickets, setMaxActiveTickets] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [departmentRows, staffRows] = await Promise.all([
        departmentApi.readAll().catch(() => []),
        staffCreationApi.readAll().catch(() => []),
      ]);
      setDepartments(asArray(departmentRows));
      setStaffOptions(
        asArray(staffRows).map((item: any) => ({
          value: String(item.staff_unique_id ?? item.unique_id),
          label: item.employee_name,
        })),
      );

      if (id) {
        const row: any = await complaintDepartmentMemberApi.read(id);
        setDepartment(String(row.department ?? ""));
        setStaff(String(row.staff ?? ""));
        setIsSupervisor(Boolean(row.is_supervisor));
        setMaxActiveTickets(row.max_active_tickets != null ? String(row.max_active_tickets) : "");
        setIsActive(row.is_active !== false);
      }
    };
    load().catch((err) => Swal.fire("Error", errorText(err, "Unable to load form data"), "error"));
  }, [id]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!department || !staff) {
      Swal.fire("Error", "Department and staff are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        department,
        staff,
        is_supervisor: isSupervisor,
        max_active_tickets: maxActiveTickets ? Number(maxActiveTickets) : null,
        is_active: isActive,
      };
      if (id) {
        await complaintDepartmentMemberApi.update(id, payload);
      } else {
        await complaintDepartmentMemberApi.create(payload);
      }
      Swal.fire("Saved", "Department roster member saved.", "success");
      navigate(listPath);
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to save roster member"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComponentCard title={id ? "Edit Roster Member" : "Add Roster Member"}>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Department</Label>
          <FormSelect
            value={department}
            onChange={setDepartment}
            options={departments.map((item) => ({ value: String(item.unique_id), label: item.department_name }))}
            placeholder="Select department"
          />
        </div>
        <div>
          <Label>Staff</Label>
          <FormSelect value={staff} onChange={setStaff} options={staffOptions} placeholder="Select staff" />
        </div>
        <div>
          <Label>Max Active Tickets</Label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={maxActiveTickets}
            onChange={(e) => setMaxActiveTickets(e.target.value)}
            placeholder="Unlimited"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isSupervisor} onCheckedChange={(checked) => setIsSupervisor(checked === true)} />
            Supervisor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
            Active
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(listPath)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
