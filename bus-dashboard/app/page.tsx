"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// ======================
// TYPES
// ======================
type Log = {
  id: number;
  timestamp: string;
  bus_number: string;
  passenger_count: number;
};

type Total = {
  bus_number: string;
  total_passengers: number;
};

type HistoryRecord = {
  bus_number: string;
  date: string;
  total_passengers: number;
};

// ======================
// BUS LIST — single source of truth
// ======================
const BUS_LIST = ["BUS-01", "BUS-02", "BUS-03", "BUS-04", "BUS-05", "BUS-06"];

export default function Dashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [selectedBus, setSelectedBus] = useState("BUS-01");
  const [graphData, setGraphData] = useState<Record<string, string | number>[]>([]);

  // === HISTORY ===
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // === AUTH GUARD ===
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  async function loadLogs() {
    const { data } = await supabase
      .from("passengers")
      .select("*")
      .order("id", { ascending: false });
    setLogs(data || []);
  }

  async function loadTotals() {
    const { data } = await supabase.from("bus_totals").select("*");
    setTotals(data || []);
  }

  async function loadGraph(bus: string) {
    const { data } = await supabase
      .from("passengers")
      .select("timestamp")
      .eq("bus_number", bus)
      .order("timestamp", { ascending: true });

    if (!data || data.length === 0) {
      setGraphData([]);
    } else {
      const grouped: Record<string, number> = {};
      data.forEach((item) => {
        const day = new Date(item.timestamp).toISOString().split("T")[0];
        grouped[day] = (grouped[day] || 0) + 1;
      });
      setGraphData(
        Object.entries(grouped).map(([day, count]) => ({ day, [bus]: count }))
      );
    }
  }

  async function loadHistory(from: string, to: string) {
    if (!from || !to) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("daily_totals_history")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true })
      .order("bus_number", { ascending: true });
    setHistoryData(data || []);
    setHistoryLoading(false);
  }

  function downloadCSV() {
    const headers = ["Bus", "Date", "Total Passengers"];
    const rows = historyData.map((h) => [h.bus_number, h.date, h.total_passengers]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bus-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    const printContent = `
      <html>
        <head>
          <title>Bus Report ${dateFrom} to ${dateTo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #666; font-size: 13px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; padding: 8px; border-bottom: 2px solid #ccc; color: #555; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
          </style>
        </head>
        <body>
          <h1>Bus Passenger Report</h1>
          <p>Date range: ${dateFrom} — ${dateTo}</p>
          <table>
            <thead><tr><th>Bus</th><th>Date</th><th>Total Passengers</th></tr></thead>
            <tbody>
              ${historyData.map((h) => `<tr><td>${h.bus_number}</td><td>${h.date}</td><td>${h.total_passengers}</td></tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(printContent);
    win?.document.close();
    win?.print();
  }

  useEffect(() => {
    if (!authChecked) return;
    loadLogs();
    loadTotals();
    loadGraph(selectedBus);

    const interval = setInterval(() => {
      loadLogs();
      loadTotals();
      loadGraph(selectedBus);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedBus, authChecked]);

  const colorMap: Record<string, string> = {
    "BUS-01": "#16a34a",
    "BUS-02": "#2563eb",
    "BUS-03": "#d97706",
    "BUS-04": "#db2777",
    "BUS-05": "#7c3aed",
    "BUS-06": "#14b8a6",
  };

  const today = new Date().toDateString();
  const filteredLogs = logs.filter(
    (l) =>
      l.bus_number === selectedBus &&
      new Date(l.timestamp).toDateString() === today
  );

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image src="/wvtc.png" alt="Bus Logo" width={50} height={50} className="rounded-lg" />
          <h1 className="text-4xl font-bold text-gray-900">Bus Control System</h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition"
        >
          Logout
        </button>
      </div>

      {/* BUS SWITCH BUTTONS */}
      <div className="flex flex-wrap gap-3 mb-6">
        {BUS_LIST.map((bus) => (
          <button
            key={bus}
            onClick={() => setSelectedBus(bus)}
            style={{
              borderColor: colorMap[bus],
              backgroundColor: selectedBus === bus ? colorMap[bus] : "transparent",
              color: selectedBus === bus ? "#fff" : colorMap[bus],
            }}
            className="px-4 py-2 rounded-lg border-2 font-semibold transition-all duration-200 hover:opacity-80"
          >
            {bus}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
        {/* LOGS */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            📄 Live Logs —{" "}
          <span style={{ color: colorMap[selectedBus] }}>{selectedBus}</span>
          </h2>

          <div className="max-h-[300px] overflow-auto">
            <table className="w-full text-sm">
            <thead className="text-gray-500 border-b border-gray-200">
        <tr>
          <th className="text-left py-2">ID</th>
          <th className="text-left py-2">Bus</th>
          <th className="text-left py-2">Count</th>
          <th className="text-left py-2">Date</th>
        </tr>
      </thead>
      <tbody>
        {filteredLogs.map((l) => (
          <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
            <td className="py-2 text-gray-400">#{l.id}</td>
            <td className="py-2 font-semibold">{l.bus_number}</td>
            <td className="py-2 font-bold" style={{ color: colorMap[l.bus_number] }}>
              +1
            </td>
            <td className="py-2 text-gray-400">
              {new Date(l.timestamp).toLocaleString()}
            </td>
          </tr>
        ))}
        {filteredLogs.length === 0 && (
          <tr>
            <td colSpan={4} className="py-4 text-center text-gray-400">
              No logs for {selectedBus} today.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

          {/* GRAPH */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xl mb-4">
              📊 Daily Passenger Comparison —{" "}
              <span style={{ color: colorMap[selectedBus] }}>{selectedBus}</span>
            </h2>

            {graphData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-16">
                No data yet for {selectedBus}.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(val) => {
                      const [year, month, day] = val.split("-");
                      const date = new Date(Number(year), Number(month) - 1, Number(day));
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#111827" }}
                    labelFormatter={(val) => {
                      const [year, month, day] = val.split("-");
                      const date = new Date(Number(year), Number(month) - 1, Number(day));
                      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedBus}
                    stroke={colorMap[selectedBus]}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: colorMap[selectedBus] }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* HISTORY */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">🗓️ Past Day Totals</h2>

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500 transition"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-green-500 transition"
                />
              </div>
              <button
                onClick={() => loadHistory(dateFrom, dateTo)}
                disabled={!dateFrom || !dateTo}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                Search
              </button>

              {historyData.length > 0 && (
                <>
                  <button
                    onClick={downloadCSV}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition"
                  >
                    ⬇️ CSV
                  </button>
                  <button
                    onClick={printReport}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition"
                  >
                    🖨️ Print / Save PDF
                  </button>
                </>
              )}
            </div>

            {historyLoading && (
              <p className="text-gray-400 text-sm">Loading...</p>
            )}

            {!historyLoading && dateFrom && dateTo && historyData.length === 0 && (
              <p className="text-gray-400 text-sm">No data found for this date range.</p>
            )}

            {!historyLoading && historyData.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2">Bus</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Total Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 font-semibold" style={{ color: colorMap[h.bus_number] }}>
                        {h.bus_number}
                      </td>
                      <td className="py-2 text-gray-400">{h.date}</td>
                      <td className="py-2 font-bold" style={{ color: colorMap[h.bus_number] }}>
                        {h.total_passengers}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* TOTALS — only selected bus */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">🚌 Bus Total Passengers</h2>
            {(() => {
              const todayCount = filteredLogs.length;
              return (
                <div
                  className="p-3 bg-gray-50 rounded-xl border-l-4"
                  style={{ borderLeftColor: colorMap[selectedBus] }}
                >
                  <p className="text-gray-500 text-sm">{selectedBus}</p>
                  <p className="text-3xl font-bold" style={{ color: colorMap[selectedBus] }}>
                    {todayCount}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* STATUS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700">System Status</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-green-600 font-bold">LIVE</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}