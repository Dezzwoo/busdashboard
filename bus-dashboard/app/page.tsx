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

type Log = {
  id: number;
  timestamp: string;
  bus_number: string;
  passenger_count: number;
  event_type?: string;
  corrected?: boolean;
};

type HistoryRecord = {
  bus_number: string;
  date: string;
  total_passengers: number;
};

type GraphRecord = {
  day: string;
  passengers: number;
};

const BUS_LIST = [
  "BUS-01",
  "BUS-02",
  "BUS-03",
  "BUS-04",
  "BUS-05",
  "BUS-06",
];

const colorMap: Record<string, string> = {
  "BUS-01": "#16a34a",
  "BUS-02": "#2563eb",
  "BUS-03": "#d97706",
  "BUS-04": "#db2777",
  "BUS-05": "#7c3aed",
  "BUS-06": "#14b8a6",
};

/*
  PHILIPPINE DATE
*/

function getPhilippineDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getPhilippineDateFromTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export default function Dashboard() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);

  const [logs, setLogs] = useState<Log[]>([]);

  const [selectedBus, setSelectedBus] = useState("BUS-01");

  const [graphData, setGraphData] = useState<GraphRecord[]>([]);

  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [tickets, setTickets] = useState(0);

  /*
    RPI CONNECTION STATUS
  */

  const [rpiConnected, setRpiConnected] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    null
  );

  /*
    ============================
    AUTHENTICATION
    ============================
  */

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const role = session.user.user_metadata?.role;

      if (role !== "admin") {
        router.replace("/tickets");
        return;
      }

      setAuthChecked(true);
    }

    checkAuth();
  }, [router]);

  /*
    ============================
    RPI HEARTBEAT
    ============================
  */

  async function loadRpiStatus() {
    const { data, error } = await supabase
      .from("device_status")
      .select("last_seen")
      .eq("device_id", "RPI-BUS-01")
      .single();

    if (error || !data) {
      setRpiConnected(false);
      return;
    }

    const lastSeen = new Date(data.last_seen).getTime();

    const now = Date.now();

    /*
      RPi is considered connected if
      heartbeat was received within 30 seconds.
    */

    const connected =
      now - lastSeen <= 30000;

    setRpiConnected(connected);
  }

  /*
    ============================
    LOAD LIVE LOGS
    ============================
  */

  async function loadLogs() {
    const { data, error } = await supabase
      .from("passengers")
      .select("*")
      .eq("bus_number", selectedBus)
      .order("id", { ascending: false });

    if (error) {
      console.error(
        "Error loading logs:",
        error
      );
      return;
    }

    setLogs(data || []);

    setLastUpdated(new Date());
  }

  /*
    ============================
    LOAD TICKETS
    ============================
  */

  async function loadTickets() {
    const today = getPhilippineDate();

    const { data, error } = await supabase
      .from("tickets")
      .select("ticket_count")
      .eq("bus_number", selectedBus)
      .eq("date", today);

    if (error) {
      console.error(
        "Error loading tickets:",
        error
      );
      return;
    }

    const total =
      data?.reduce(
        (sum, row) =>
          sum +
          Number(row.ticket_count || 0),
        0
      ) || 0;

    setTickets(total);
  }

  /*
    ============================
    DAILY PASSENGER GRAPH
    ============================

    Counts:
    ENTER = +1

    Does NOT count:
    EXIT
    CORRECTION

    Corrected ENTER records are excluded.
  */

  async function loadGraph() {
    const { data, error } = await supabase
      .from("passengers")
      .select(
        "timestamp, passenger_count, event_type, corrected"
      )
      .eq("bus_number", selectedBus)
      .order("timestamp", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading graph:",
        error
      );

      setGraphData([]);

      return;
    }

    if (!data) {
      setGraphData([]);
      return;
    }

    const grouped: Record<string, number> =
      {};

    data.forEach((item) => {
      const eventType =
        item.event_type || "ENTER";

      /*
        Only valid ENTER events count.
      */

      if (
        eventType === "ENTER" &&
        item.corrected !== true
      ) {
        const day =
          getPhilippineDateFromTimestamp(
            item.timestamp
          );

        grouped[day] =
          (grouped[day] || 0) + 1;
      }
    });

    const result: GraphRecord[] =
      Object.entries(grouped)
        .sort(([a], [b]) =>
          a.localeCompare(b)
        )
        .map(([day, count]) => ({
          day,
          passengers: count,
        }));

    setGraphData(result);
  }

  /*
    ============================
    HISTORY
    ============================
  */

  async function loadHistory(
    from: string,
    to: string
  ) {
    if (!from || !to) return;

    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("daily_totals_history")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading history:",
        error
      );
    }

    setHistoryData(data || []);

    setHistoryLoading(false);
  }

  /*
    ============================
    CSV
    ============================
  */

  function downloadCSV() {
    const headers = [
      "Bus",
      "Date",
      "Total Passengers",
    ];

    const rows = historyData.map((h) => [
      h.bus_number,
      h.date,
      h.total_passengers,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv",
    });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "bus-report.csv";

    a.click();

    URL.revokeObjectURL(url);
  }

  /*
    ============================
    REFRESH DASHBOARD
    ============================
  */

  useEffect(() => {
    if (!authChecked) return;

    /*
      Initial load
    */

    loadLogs();
    loadTickets();
    loadGraph();
    loadRpiStatus();

    /*
      Refresh every 2 seconds
    */

    const interval = setInterval(() => {
      loadLogs();
      loadTickets();
      loadGraph();
      loadRpiStatus();
    }, 2000);

    /*
      SUPABASE REALTIME
    */

    const channel = supabase
      .channel(
        `passenger-dashboard-${selectedBus}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passengers",
          filter: `bus_number=eq.${selectedBus}`,
        },
        () => {
          loadLogs();
          loadGraph();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);

      supabase.removeChannel(channel);
    };
  }, [
    authChecked,
    selectedBus,
  ]);

  /*
    ============================
    TODAY
    ============================
  */

  const today =
    getPhilippineDate();

  const todayLogs =
    logs.filter(
      (log) =>
        getPhilippineDateFromTimestamp(
          log.timestamp
        ) === today
    );

  /*
    ============================
    VALID ENTERS
    ============================
  */

  const validEnters =
    todayLogs.filter(
      (log) =>
        (
          log.event_type === "ENTER" ||
          !log.event_type
        ) &&
        log.corrected !== true
    );

  /*
    ============================
    EXITS
    ============================
  */

  const exits =
    todayLogs.filter(
      (log) =>
        log.event_type === "EXIT"
    );

  /*
    ============================
    TODAY'S TOTAL
    ============================
  */

  const todayTotal =
    validEnters.length;

  /*
    ============================
    CURRENT PASSENGERS
    ============================
  */

  const livePassengers =
    Math.max(
      0,
      validEnters.length -
        exits.length
    );

  /*
    ============================
    DISCREPANCY
    ============================
  */

  const discrepancy =
    todayTotal - tickets;

  /*
    ============================
    PAGE
    ============================
  */

  if (!authChecked) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">

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

          <h1 className="text-4xl font-bold">
            Bus Control System
          </h1>

          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}

        </div>

      </div>

      {/* BUS BUTTONS */}

      <div className="flex flex-wrap gap-3 mb-6">

        {BUS_LIST.map((bus) => (

          <button
            key={bus}
            onClick={() =>
              setSelectedBus(bus)
            }
            style={{
              borderColor:
                colorMap[bus],

              backgroundColor:
                selectedBus === bus
                  ? colorMap[bus]
                  : "transparent",

              color:
                selectedBus === bus
                  ? "#fff"
                  : colorMap[bus],
            }}
            className="px-4 py-2 rounded-lg border-2 font-semibold"
          >
            {bus}
          </button>

        ))}

      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* LIVE */}

        <div className="bg-white border rounded-2xl p-5 shadow-sm">

          <p className="text-gray-500">
            Live Passengers
          </p>

          <p
            className="text-4xl font-bold mt-2"
            style={{
              color:
                colorMap[selectedBus],
            }}
          >
            {livePassengers}
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Currently inside
          </p>

        </div>

        {/* TODAY */}

        <div className="bg-white border rounded-2xl p-5 shadow-sm">

          <p className="text-gray-500">
            Today's Total
          </p>

          <p className="text-4xl font-bold mt-2">
            {todayTotal}
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Passengers today
          </p>

        </div>

        {/* TICKETS */}

        <div className="bg-white border rounded-2xl p-5 shadow-sm">

          <p className="text-gray-500">
            Today's Tickets
          </p>

          <p className="text-4xl font-bold text-blue-600 mt-2">
            {tickets}
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Ticketed passengers
          </p>

        </div>

      </div>

      {/* MAIN GRID */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}

        <div className="lg:col-span-2 space-y-6">

          {/* LIVE LOGS */}

          <div className="bg-white border rounded-2xl p-5 shadow-sm">

            <h2 className="text-xl font-semibold mb-4">

              Live Logs —{" "}

              <span
                style={{
                  color:
                    colorMap[selectedBus],
                }}
              >
                {selectedBus}
              </span>

            </h2>

            <div className="max-h-[350px] overflow-auto">

              <table className="w-full text-sm">

                <thead className="text-gray-500 border-b">

                  <tr>

                    <th className="text-left py-2">
                      ID
                    </th>

                    <th className="text-left py-2">
                      Event
                    </th>

                    <th className="text-left py-2">
                      Time
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {todayLogs.map(
                    (log) => {

                      const isExit =
                        log.event_type ===
                        "EXIT";

                      const isCorrection =
                        log.corrected ===
                        true;

                      return (

                        <tr
                          key={log.id}
                          className="border-b hover:bg-gray-50"
                        >

                          <td className="py-2 text-gray-400">
                            #{log.id}
                          </td>

                          <td
                            className={`py-2 font-bold ${
                              isCorrection
                                ? "text-orange-600"
                                : isExit
                                  ? "text-blue-600"
                                  : "text-green-600"
                            }`}
                          >

                            {isCorrection
                              ? "CORRECTION -1"
                              : isExit
                                ? "EXIT -1"
                                : "ENTER +1"}

                          </td>

                          <td className="py-2 text-gray-400">

                            {new Date(
                              log.timestamp
                            ).toLocaleTimeString()}

                          </td>

                        </tr>

                      );

                    }
                  )}

                  {todayLogs.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan={3}
                        className="py-6 text-center text-gray-400"
                      >
                        No logs yet.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* DAILY PASSENGER COMPARISON */}

          <div className="bg-white border rounded-2xl p-5 shadow-sm">

            <div className="flex items-center justify-between mb-4">

              <div>

                <h2 className="text-xl font-semibold">
                  Daily Passenger Comparison
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  {selectedBus} — valid passenger entries
                </p>

              </div>

              <div className="flex items-center gap-2">

                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor:
                      colorMap[selectedBus],
                  }}
                />

                <span className="text-xs text-gray-500">
                  Live
                </span>

              </div>

            </div>

            {graphData.length ===
              0 ? (

              <p className="text-gray-400 text-center py-16">
                No passenger data yet.
              </p>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <LineChart
                  data={graphData}
                >

                  <CartesianGrid
                    stroke="#e5e7eb"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis
                    allowDecimals={false}
                    domain={[
                      0,
                      (dataMax: number) =>
                        Math.max(
                          dataMax + 5,
                          10
                        ),
                    ]}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="passengers"
                    name={selectedBus}
                    stroke={
                      colorMap[selectedBus]
                    }
                    strokeWidth={3}
                    dot={{
                      r: 5,
                    }}
                    activeDot={{
                      r: 7,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

            {/* GRAPH TOTAL */}

            <div className="mt-4 pt-4 border-t flex justify-between">

              <span className="text-gray-500">
                Today's graph total
              </span>

              <span
                className="font-bold text-lg"
                style={{
                  color:
                    colorMap[selectedBus],
                }}
              >
                {todayTotal}
              </span>

            </div>

          </div>

          {/* HISTORY */}

          <div className="bg-white border rounded-2xl p-5 shadow-sm">

            <h2 className="text-xl font-semibold mb-4">
              Past Day Totals
            </h2>

            <div className="flex flex-wrap gap-3 mb-4">

              <input
                id="from"
                type="date"
                className="bg-gray-100 border rounded-lg px-3 py-2"
              />

              <input
                id="to"
                type="date"
                className="bg-gray-100 border rounded-lg px-3 py-2"
              />

              <button
                onClick={() => {

                  const from =
                    (
                      document.getElementById(
                        "from"
                      ) as HTMLInputElement
                    ).value;

                  const to =
                    (
                      document.getElementById(
                        "to"
                      ) as HTMLInputElement
                    ).value;

                  loadHistory(
                    from,
                    to
                  );

                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Search
              </button>

              {historyData.length >
                0 && (

                <button
                  onClick={
                    downloadCSV
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  CSV
                </button>

              )}

            </div>

            {historyLoading && (

              <p className="text-gray-400">
                Loading...
              </p>

            )}

            {historyData.length >
              0 && (

              <table className="w-full text-sm">

                <thead className="border-b text-gray-500">

                  <tr>

                    <th className="text-left py-2">
                      Bus
                    </th>

                    <th className="text-left py-2">
                      Date
                    </th>

                    <th className="text-left py-2">
                      Total
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {historyData.map(
                    (h, i) => (

                      <tr
                        key={i}
                        className="border-b"
                      >

                        <td
                          className="py-2 font-semibold"
                          style={{
                            color:
                              colorMap[
                                h.bus_number
                              ],
                          }}
                        >
                          {h.bus_number}
                        </td>

                        <td className="py-2">
                          {h.date}
                        </td>

                        <td className="py-2 font-bold">
                          {
                            h.total_passengers
                          }
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>

        </div>

        {/* RIGHT */}

        <div className="space-y-6">

          {/* SYSTEM STATUS */}

          <div className="bg-white border rounded-2xl p-5 shadow-sm">

            <h2 className="text-lg font-semibold">
              System Status
            </h2>

            <div className="flex items-center gap-3 mt-4">

              <span
                className={`w-3 h-3 rounded-full ${
                  rpiConnected
                    ? "bg-green-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />

              <span
                className={`font-bold text-lg ${
                  rpiConnected
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {rpiConnected
                  ? "CONNECTED"
                  : "DISCONNECTED"}
              </span>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}