"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ComparisonRow = {
  bus_number: string;
  date: string;
  automated_count: number;
  ticket_count: number | null;
  discrepancy: number | null;
};

const colorMap: Record<string, string> = {
  "BUS-01": "#16a34a",
  "BUS-02": "#2563eb",
  "BUS-03": "#d97706",
  "BUS-04": "#db2777",
  "BUS-05": "#7c3aed",
  "BUS-06": "#14b8a6",
};

export default function Reports() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
      }
    }

    checkAuth();
  }, [router]);

  async function loadComparison() {
    if (!dateFrom || !dateTo) return;

    setLoading(true);

    const [{ data: automated }, { data: tickets }] = await Promise.all([
      supabase
        .from("daily_totals_history")
        .select("bus_number, date, total_passengers")
        .gte("date", dateFrom)
        .lte("date", dateTo),

      supabase
        .from("tickets")
        .select("bus_number, date, ticket_count")
        .gte("date", dateFrom)
        .lte("date", dateTo),
    ]);

    const ticketMap = new Map<string, number>();

    (tickets || []).forEach((t) => {
      ticketMap.set(
        `${t.bus_number}_${t.date}`,
        Number(t.ticket_count || 0)
      );
    });

    const merged: ComparisonRow[] = (automated || []).map((a) => {
      const key = `${a.bus_number}_${a.date}`;

      const ticketCount = ticketMap.has(key)
        ? ticketMap.get(key)!
        : null;

      return {
        bus_number: a.bus_number,
        date: a.date,
        automated_count: Number(a.total_passengers || 0),
        ticket_count: ticketCount,
        discrepancy:
          ticketCount === null
            ? null
            : Number(a.total_passengers || 0) - ticketCount,
      };
    });

    merged.sort((x, y) =>
      x.date < y.date ? 1 : -1
    );

    setRows(merged);
    setLoading(false);
  }

  const displayedRows = onlyFlagged
    ? rows.filter(
        (r) =>
          r.discrepancy !== null &&
          r.discrepancy !== 0
      )
    : rows;

  function downloadCSV() {
    const headers = [
      "Bus",
      "Date",
      "Automated Count",
      "Ticket Count",
      "Discrepancy",
    ];

    const csvRows = displayedRows.map((r) => [
      r.bus_number,
      r.date,
      r.automated_count,
      r.ticket_count ?? "No entry",
      r.discrepancy ?? "N/A",
    ]);

    const csv = [headers, ...csvRows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `discrepancy-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (!authChecked) return null;

  const flaggedCount = rows.filter(
    (r) =>
      r.discrepancy !== null &&
      r.discrepancy !== 0
  ).length;

  const missingCount = rows.filter(
    (r) => r.ticket_count === null
  ).length;

  // TOTAL DISCREPANCY
  const totalDiscrepancy = rows.reduce(
    (sum, r) =>
      sum + (r.discrepancy ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2">
        Discrepancy Report
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Compares automated passenger counts against manually encoded ticket sales.
      </p>

      {/* SUMMARY CARDS */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

          {/* RECORDS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400 uppercase font-semibold">
              Records Compared
            </p>

            <p className="text-2xl font-bold mt-1">
              {rows.length}
            </p>
          </div>

          {/* FLAGGED */}
          <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-red-400 uppercase font-semibold">
              Flagged Discrepancies
            </p>

            <p className="text-2xl font-bold text-red-500 mt-1">
              {flaggedCount}
            </p>
          </div>

          {/* MISSING */}
          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-amber-500 uppercase font-semibold">
              Missing Ticket Entries
            </p>

            <p className="text-2xl font-bold text-amber-600 mt-1">
              {missingCount}
            </p>
          </div>

          {/* TOTAL DISCREPANCY */}
          <div
            className={`bg-white rounded-2xl p-4 shadow-sm border ${
              totalDiscrepancy === 0
                ? "border-green-200"
                : totalDiscrepancy > 0
                ? "border-red-200"
                : "border-blue-200"
            }`}
          >
            <p className="text-xs text-gray-400 uppercase font-semibold">
              Total Discrepancy
            </p>

            <p
              className={`text-2xl font-bold mt-1 ${
                totalDiscrepancy === 0
                  ? "text-green-600"
                  : totalDiscrepancy > 0
                  ? "text-red-500"
                  : "text-blue-600"
              }`}
            >
              {totalDiscrepancy > 0
                ? `+${totalDiscrepancy}`
                : totalDiscrepancy}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Automated − Tickets
            </p>
          </div>

        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">

        <div className="flex flex-wrap items-end gap-3">

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              From
            </label>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
              className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              To
            </label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
              className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          <button
            onClick={loadComparison}
            disabled={!dateFrom || !dateTo}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition"
          >
            Compare
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-600 ml-2">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) =>
                setOnlyFlagged(e.target.checked)
              }
            />

            Show flagged only
          </label>

          {rows.length > 0 && (
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition ml-auto"
            >
              ⬇️ CSV
            </button>
          )}

        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm overflow-x-auto">

        {loading && (
          <p className="text-gray-400 text-sm">
            Loading...
          </p>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            Select a date range and click Compare to generate a report.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <table className="w-full text-sm">

            <thead className="text-gray-500 border-b border-gray-200">
              <tr>
                <th className="text-left py-2">
                  Bus
                </th>

                <th className="text-left py-2">
                  Date
                </th>

                <th className="text-left py-2">
                  Automated Count
                </th>

                <th className="text-left py-2">
                  Ticket Count
                </th>

                <th className="text-left py-2">
                  Discrepancy
                </th>
              </tr>
            </thead>

            <tbody>
              {displayedRows.map((r, i) => {

                const flagged =
                  r.discrepancy !== null &&
                  r.discrepancy !== 0;

                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${
                      flagged
                        ? "bg-red-50"
                        : ""
                    }`}
                  >

                    <td
                      className="py-2 font-semibold"
                      style={{
                        color:
                          colorMap[r.bus_number],
                      }}
                    >
                      {r.bus_number}
                    </td>

                    <td className="py-2 text-gray-400">
                      {r.date}
                    </td>

                    <td className="py-2 font-bold">
                      {r.automated_count}
                    </td>

                    <td className="py-2 font-bold">
                      {r.ticket_count === null ? (
                        <span className="text-amber-500">
                          No entry
                        </span>
                      ) : (
                        r.ticket_count
                      )}
                    </td>

                    <td className="py-2 font-bold">

                      {r.discrepancy === null ? (
                        "—"
                      ) : r.discrepancy === 0 ? (

                        <span className="text-green-600">
                          Match
                        </span>

                      ) : r.discrepancy < 0 ? (

                        <span className="text-orange-500">
                          +{-r.discrepancy}
                        </span>

                      ) : (

                        <span className="text-red-500">
                          -{r.discrepancy}
                        </span>

                      )}

                    </td>

                  </tr>
                );
              })}
            </tbody>

          </table>
        )}

      </div>

    </main>
  );
}