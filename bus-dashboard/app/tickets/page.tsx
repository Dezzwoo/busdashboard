"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BUS_LIST = [
  "BUS-01",
  "BUS-02",
  "BUS-03",
  "BUS-04",
  "BUS-05",
  "BUS-06",
];

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
    if (authChecked) {
      loadRecent();
    }
  }, [authChecked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!count || Number(count) <= 0) {
      setMessage("Enter a valid ticket count.");
      return;
    }

    setSaving(true);
    setMessage("");

    const addCount = Number(count);

    // Check existing record
    const { data: existing, error: fetchError } = await supabase
      .from("tickets")
      .select("id, ticket_count")
      .eq("bus_number", bus)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) {
      setSaving(false);
      setMessage("Error: " + fetchError.message);
      return;
    }

    if (existing) {
      // ADD to existing ticket count
      const newTotal = existing.ticket_count + addCount;

      const { error } = await supabase
        .from("tickets")
        .update({
          ticket_count: newTotal,
        })
        .eq("id", existing.id);

      if (error) {
        setMessage("Error: " + error.message);
      } else {
        setMessage(
          `${addCount} tickets added. Current total is ${newTotal}.`
        );
      }
    } else {
      // Create first record
      const { error } = await supabase
        .from("tickets")
        .insert({
          bus_number: bus,
          date,
          ticket_count: addCount,
        });

      if (error) {
        setMessage("Error: " + error.message);
      } else {
        setMessage(`Created new record with ${addCount} tickets.`);
      }
    }

    setSaving(false);
    setCount("");
    loadRecent();
  }

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-6">Ticket Encoding</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Encoding Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Encode Ticket Count
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Enter additional ticket count for the selected bus.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Bus
              </label>

              <select
                value={bus}
                onChange={(e) => setBus(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
              >
                {BUS_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Additional Tickets
              </label>

              <input
                type="number"
                min="1"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="Example: 20"
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Tickets"}
            </button>

            {message && (
              <p
                className={`text-sm ${
                  message.startsWith("Error")
                    ? "text-red-500"
                    : "text-green-600"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>

        {/* Today's Tickets */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Today's Encoded Tickets
          </h2>

          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 text-gray-500">
              <tr>
                <th className="text-left py-2">Bus</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Total Tickets</th>
              </tr>
            </thead>

            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 font-semibold">{r.bus_number}</td>
                  <td className="py-2 text-gray-500">{r.date}</td>
                  <td className="py-2 font-bold text-green-600">
                    {r.ticket_count}
                  </td>
                </tr>
              ))}

              {recent.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-4 text-center text-gray-400"
                  >
                    No tickets encoded today.
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