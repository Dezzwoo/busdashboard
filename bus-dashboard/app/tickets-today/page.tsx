"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";

const BUS_LIST = ["BUS-01", "BUS-02", "BUS-03", "BUS-04", "BUS-05", "BUS-06"];

const colorMap: Record<string, string> = {
  "BUS-01": "#16a34a",
  "BUS-02": "#2563eb",
  "BUS-03": "#d97706",
  "BUS-04": "#db2777",
  "BUS-05": "#7c3aed",
  "BUS-06": "#14b8a6",
};

type TicketEntry = {
  id: number;
  bus_number: string;
  date: string;
  ticket_count: number;
};

export default function TicketsTodayPage() {
  const { role, loading } = useUserRole();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketEntry[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && role !== "admin") {
      router.replace("/");
    }
  }, [role, loading, router]);

  useEffect(() => {
    if (role !== "admin") return;

    async function loadTodayTickets() {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("date", today)
        .order("bus_number", { ascending: true });
      setTickets(data || []);
      setFetching(false);
    }

    loadTodayTickets();
    const interval = setInterval(loadTodayTickets, 3000);
    return () => clearInterval(interval);
  }, [role]);

  if (loading || role !== "admin") return null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Today's Encoded Tickets</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Manila",
        })}
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
        {BUS_LIST.map((bus) => {
          const entry = tickets.find((t) => t.bus_number === bus);
          return (
            <div key={bus} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colorMap[bus] }}
                />
                <span className="font-semibold text-gray-800">{bus}</span>
              </div>
              {entry ? (
                <span className="text-lg font-bold" style={{ color: colorMap[bus] }}>
                  {entry.ticket_count} tickets
                </span>
              ) : (
                <span className="text-sm text-amber-500 font-medium">Not encoded yet</span>
              )}
            </div>
          );
        })}
      </div>

      {!fetching && tickets.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">No buses have encoded tickets yet today.</p>
      )}
    </div>
  );
}