"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BUS_LIST = ["BUS-01", "BUS-02", "BUS-03", "BUS-04", "BUS-05", "BUS-06"];

type TicketEntry = {
  id: number;
  bus_number: string;
  date: string;
  ticket_count: number;
};

export default function TicketEncoding() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const [bus, setBus] = useState("BUS-01");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [count, setCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [recent, setRecent] = useState<TicketEntry[]>([]);

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

  async function loadRecent() {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("date", today)
      .order("bus_number", { ascending: true });
    setRecent(data || []);
  }

  useEffect(() => {
    if (authChecked) loadRecent();
  }, [authChecked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!count || Number(count) < 0) {
      setMessage("Enter a valid ticket count.");
      return;
    }
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("tickets")
      .upsert(
        { bus_number: bus, date, ticket_count: Number(count) },
        { onConflict: "bus_number,date" }
      );

    setSaving(false);

    if (error) {
      setMessage("Error saving: " + error.message);
    } else {
      setMessage(`Saved ${count} tickets for ${bus} on ${date}.`);
      setCount("");
      loadRecent();
    }
  }

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-6">Ticket Encoding</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Encode Ticket Count</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter the total ticket count read from the ticket machine's memory card for this bus and date.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Bus</label>
              <select
                value={bus}
                onChange={(e) => setBus(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                {BUS_LIST.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Ticket Count</label>
              <input
                type="number"
                min="0"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="e.g. 142"
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {saving ? "Saving..." : "Save Ticket Count"}
            </button>

            {message && (
              <p className={`text-sm ${message.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                {message}
              </p>
            )}
          </form>
        </div>

        {/* TODAY'S ENCODED TICKETS */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Today's Encoded Tickets</h2>
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b border-gray-200">
              <tr>
                <th className="text-left py-2">Bus</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 font-semibold">{r.bus_number}</td>
                  <td className="py-2 text-gray-400">{r.date}</td>
                  <td className="py-2 font-bold">{r.ticket_count}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-400">
                    No tickets encoded today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}