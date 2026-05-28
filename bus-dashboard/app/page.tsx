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

type Daily = {
  day: string;
  bus_number: string;
  total_passengers: number;
};

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [totals, setTotals] = useState<Total[]>([]);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [selectedBus, setSelectedBus] = useState("BUS-01"); // ✅ default bus view

  // ======================
  // LOAD LOGS
  // ======================
  async function loadLogs() {
    let query = supabase
      .from("passengers")
      .select("*")
      .order("id", { ascending: false });

    if (selectedBus !== "ALL") {
      query = query.eq("bus_number", selectedBus);
    }

    const { data } = await query;
    setLogs(data || []);
  }

  // ======================
  // LOAD TOTALS
  // ======================
  async function loadTotals() {
    const { data } = await supabase.from("bus_totals").select("*");
    setTotals(data || []);
  }

  // ======================
  // LOAD DAILY GRAPH
  // ======================
  async function loadDaily() {
    const { data } = await supabase
      .from("daily_bus_passengers")
      .select("*")
      .order("day", { ascending: true });

    setDaily(data || []);
  }

  // ======================
  // AUTO REFRESH
  // ======================
  useEffect(() => {
    loadLogs();
    loadTotals();
    loadDaily();

    const interval = setInterval(() => {
      loadLogs();
      loadTotals();
      loadDaily();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedBus]);

  // ======================
  // FORMAT GRAPH DATA
  // ======================
  const chartData = daily.reduce((acc: any[], item) => {
    if (!item?.day || !item?.bus_number) return acc;

    let found = acc.find((d) => d.day === item.day);

    if (!found) {
      found = { day: item.day };
      acc.push(found);
    }

    found[item.bus_number] = item.total_passengers ?? 0;

    return acc;
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black text-white p-6">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Image
          src="/wvtc.png"
          alt="Bus Logo"
          width={50}
          height={50}
          className="rounded-lg"
        />

        <div>
          <h1 className="text-5xl font-bold">
            Bus Control System
          </h1>
        </div>
      </div>

      {/* BUS SWITCH BUTTONS (NEW FEATURE) */}
      <div className="flex gap-3 mb-6">
        {["BUS-01", "BUS-02"].map((bus) => (
          <button
            key={bus}
            onClick={() => setSelectedBus(bus)}
            className={`px-4 py-2 rounded-lg border ${
              selectedBus === bus
                ? "bg-green-500 text-black"
                : "bg-white/10"
            }`}
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
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl mb-4">📄 Live Logs</h2>

            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm">

                <thead className="text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Bus</th>
                    <th className="text-left py-2">Count</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-2 text-gray-300">#{l.id}</td>
                      <td className="py-2 font-semibold">{l.bus_number}</td>
                      <td className="py-2 text-green-400 font-bold">
                        {l.passenger_count}
                      </td>
                      <td className="py-2 text-gray-400">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

          {/* GRAPH */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl mb-4">📊 Daily Passenger Comparison</h2>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#333" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="BUS-01"
                  stroke="#22c55e"
                  strokeWidth={2}
                />

                <Line
                  type="monotone"
                  dataKey="BUS-02"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* TOTALS */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl mb-4">📊 Bus Totals</h2>

            {["BUS-01", "BUS-02"].map((bus) => {
              const found = totals.find((t) => t.bus_number === bus);

              return (
                <div key={bus} className="mb-3 p-3 bg-white/5 rounded-xl">
                  <p className="text-gray-400">{bus}</p>
                  <p className="text-3xl text-green-400 font-bold">
                    {found ? found.total_passengers : 0}
                  </p>
                </div>
              );
            })}
          </div>

          {/* STATUS */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold">System Status</h2>
            <p className="text-green-400 font-bold mt-2">LIVE</p>
          </div>

        </div>

      </div>
    </main>
  );
}
