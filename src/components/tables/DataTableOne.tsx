import React, { useEffect, useRef, useState } from "react";
import $ from "jquery";

// DataTables CSS + JS
import "datatables.net-dt/css/dataTables.dataTables.min.css";
import "datatables.net-dt";

import * as XLSX from "xlsx";
import { FaFileExcel, FaPrint, FaSearch } from "react-icons/fa";

export default function DataTableOne() {
  const tableRef = useRef<HTMLTableElement>(null);
  const dtRef = useRef<any>(null);
  const [query, setQuery] = useState("");

  const headers = [
    "S.No","Entry Date","Expense Date","Entry No","Batch No",
    "Site Name","Emp ID","Staff Name","Amount","Head App",
    "HR App","Acc App","Action"
  ];

  const rows: (string | number)[][] = [
    [1,"2025-09-25","2025-09-24","EN-001","B-101","Chennai","EMP01","John Doe",5000,"✔","✔","✔","View"],
    [2,"2025-09-20","2025-09-18","EN-002","B-102","Erode","EMP02","Jane Smith",3000,"✔","✖","✔","View"],
  ];

  // ✅ Init DataTable AFTER rows render
  useEffect(() => {
    if (tableRef.current) {
      if ($.fn.DataTable.isDataTable(tableRef.current)) {
        $(tableRef.current).DataTable().destroy();
      }

      dtRef.current = $(tableRef.current).DataTable({
        paging: true,
        ordering: true,
        info: true,
        lengthChange: true,
        pageLength: 5,
        searching: true,
        dom: "lrtip", // hide default search box
      });
    }
  }, [rows]);

  // ✅ Hook custom search box into DataTables
  useEffect(() => {
    if (dtRef.current) {
      dtRef.current.search(query).draw();
    }
  }, [query]);

  // ✅ Export Excel
  const exportExcel = () => {
    if (!dtRef.current) return;
    const visibleRows: any[] = dtRef.current.rows({ search: "applied" }).data().toArray();
    const aoa = [headers, ...visibleRows.map((r: any) => Array.from(r))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "datatable.xlsx");
  };

  // ✅ Print
  const printTable = () => {
    const html = document.getElementById("datatable-wrap")?.innerHTML || "";
    const w = window.open("", "", "width=900,height=700");
    if (!w) return;
    w.document.write(`<html><head><title>Print</title></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  return (
    <div className="p-6 bg-white shadow rounded space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Search (all columns)…"
            className="border rounded px-3 py-2 w-72"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center gap-2"
          >
            <FaFileExcel /> Excel
          </button>
          <button
            onClick={printTable}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded flex items-center gap-2"
          >
            <FaPrint /> Print
          </button>
        </div>
      </div>

      {/* DataTable */}
      <div id="datatable-wrap">
        <table ref={tableRef} className="display stripe hover w-full text-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
