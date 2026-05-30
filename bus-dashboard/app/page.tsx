"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
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
  const [logs, setLogs] = useState<Log[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [selectedBus, setSelectedBus] = useState("BUS-01");
  const [graphData, setGraphData] = useState<Record<string, string | number>[]>([]);

  // === HISTORY ===
  const [selectedDate, setSelectedDate] = useState("");
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  async function loadHistory(date: string) {
    if (!date) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("daily_totals_history")
      .select("*")
      .eq("date", date)
      .order("bus_number", { ascending: true });
    setHistoryData(data || []);
    setHistoryLoading(false);
  }

  useEffect(() => {
    loadLogs();
    loadTotals();
    loadGraph(selectedBus);

    const interval = setInterval(() => {
      loadLogs();
      loadTotals();
      loadGraph(selectedBus);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedBus]);

  const colorMap: Record<string, string> = {
    "BUS-01": "#16a34a",
    "BUS-02": "#2563eb",
    "BUS-03": "#d97706",
    "BUS-04": "#db2777",
    "BUS-05": "#7c3aed",
    "BUS-06": "#14b8a6",
  };

  // Filter logs by selected bus AND today's date only
  const today = new Date().toDateString();
  const filteredLogs = logs.filter(
    (l) =>
      l.bus_number === selectedBus &&
      new Date(l.timestamp).toDateString() === today
  );

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Image src="/wvtc.png" alt="Bus Logo" width={50} height={50} className="rounded-lg" />
        <h1 className="text-4xl font-bold text-white">Bus Control System</h1>
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-xl font-semibold mb-4">
              📄 Live Logs —{" "}
              <span style={{ color: colorMap[selectedBus] }}>{selectedBus}</span>
            </h2>

            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Bus</th>
                    <th className="text-left py-2">Count</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                      <td className="py-2 text-gray-400">#{l.id}</td>
                      <td className="py-2 font-semibold">{l.bus_number}</td>
                      <td className="py-2 font-bold" style={{ color: colorMap[l.bus_number] }}>
                        {l.passenger_count}
                      </td>
                      <td className="py-2 text-gray-400">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        No logs for {selectedBus} today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRAPH */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-xl mb-4">
              📊 Daily Passenger Comparison —{" "}
              <span style={{ color: colorMap[selectedBus] }}>{selectedBus}</span>
            </h2>

            {graphData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-16">
                No data yet for {selectedBus}.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={graphData}>
                  <CartesianGrid stroke="#1f2937" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(val) => {
                      const [year, month, day] = val.split("-");
                      const date = new Date(Number(year), Number(month) - 1, Number(day));
                      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", color: "#f9fafb" }}
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
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-xl font-semibold mb-4">🗓️ Past Day Totals</h2>

            <div className="flex gap-3 mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 transition"
              />
              <button
                onClick={() => loadHistory(selectedDate)}
                disabled={!selectedDate}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                Check
              </button>
            </div>

            {historyLoading && (
              <p className="text-gray-500 text-sm">Loading...</p>
            )}

            {!historyLoading && selectedDate && historyData.length === 0 && (
              <p className="text-gray-500 text-sm">No data found for this date.</p>
            )}

            {!historyLoading && historyData.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-2">Bus</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Total Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h) => (
                    <tr key={h.bus_number} className="border-b border-gray-800">
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
<div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
  <h2 className="text-xl font-semibold mb-4">🚌 Bus Total Passengers</h2>
  {(() => {
    const found = totals.find((t) => t.bus_number === selectedBus);
    const todayCount = filteredLogs.length > 0 ? (found ? found.total_passengers : 0) : 0;
    return (
      <div
        className="p-3 bg-gray-800 rounded-xl border-l-4"
        style={{ borderLeftColor: colorMap[selectedBus] }}
      >
        <p className="text-gray-400 text-sm">{selectedBus}</p>
        <p className="text-3xl font-bold" style={{ color: colorMap[selectedBus] }}>
          {todayCount}
        </p>
      </div>
    );
  })()}
</div>

          {/* STATUS */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-gray-300">System Status</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-green-400 font-bold">LIVE</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}