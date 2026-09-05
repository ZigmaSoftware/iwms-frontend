import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { PencilIcon } from "@/icons";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
import { complaintDepartmentMemberApi } from "@/features/complaintTicketing/api";
import type { ComplaintDepartmentMember } from "@/features/complaintTicketing/types";
import { asArray, errorText } from "../utils";

export default function DepartmentRosterList() {
  const navigate = useNavigate();
  const routes = getEncryptedRoute();
  const { newPath, editPath } = createCrudRoutePaths(
    routes.encComplaintTicket,
    routes.encComplaintDepartmentMembers,
  );

  const [rows, setRows] = useState<ComplaintDepartmentMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await complaintDepartmentMemberApi.readAll();
      setRows(asArray(response));
    } catch (error) {
      Swal.fire("Error", errorText(error, "Unable to load department roster"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = rows.filter((row) => {
    if (!query) return true;
    const haystack = `${row.department_name ?? ""} ${row.staff_name ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const edit = (row: ComplaintDepartmentMember) => navigate(editPath(row.unique_id));

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">Department Roster</h1>
          <p className="text-sm text-gray-500">
            Who belongs to each department for complaint assignment, and who its supervisor is.
          </p>
        </div>
        <Button label="Add Member" icon="pi pi-plus" className="p-button-success" onClick={() => navigate(newPath)} />
      </div>
      <DataTable
        value={filtered}
        dataKey="unique_id"
        loading={isLoading}
        header={
          <div className="flex justify-end">
            <InputText
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="p-inputtext-sm"
            />
          </div>
        }
        emptyMessage="No roster members found"
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column header="S.No" body={(_, options) => options.rowIndex + 1} style={{ width: "80px" }} />
        <Column field="department_name" header="Department" />
        <Column field="staff_name" header="Staff" />
        <Column
          header="Role"
          body={(row: ComplaintDepartmentMember) => (row.is_supervisor ? "Supervisor" : "Member")}
        />
        <Column
          header="Open Tickets"
          body={(row: ComplaintDepartmentMember) => row.open_ticket_count ?? "-"}
        />
        <Column header="Active" body={(row: ComplaintDepartmentMember) => (row.is_active ? "Yes" : "No")} />
        <Column
          header="Actions"
          body={(row: ComplaintDepartmentMember) => (
            <button type="button" onClick={() => edit(row)} title="Edit">
              <PencilIcon className="h-4 w-4 text-gray-500 hover:text-gray-800" />
            </button>
          )}
          style={{ width: "90px" }}
        />
      </DataTable>
    </div>
  );
}
