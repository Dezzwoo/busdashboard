"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Passenger = {
  id: number;
  timestamp: string;
  passenger_count: number;
  bus_number: string;
};

export default function Home() {

  const [data, setData] = useState<Passenger[]>([]);
  const [selectedBus, setSelectedBus] = useState("ALL");

  async function loadPassengers() {

    let query = supabase
      .from("passengers")
      .select("*")
      .order("id", { ascending: false });

    // FILTER
    if (selectedBus !== "ALL") {
      query = query.eq(
        "bus_number",
        selectedBus
      );
    }

    const { data, error } = await query;

    if (error) {
      console.log(error);
      return;
    }

    setData(data || []);
  }

  useEffect(() => {

    loadPassengers();

    const interval = setInterval(() => {
      loadPassengers();
    }, 3000);

    return () => clearInterval(interval);

  }, [selectedBus]);

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-4xl font-bold mb-8">
        Bus Passenger Dashboard
      </h1>

      {/* FILTER BUTTONS */}

      <div className="flex gap-4 mb-6">

        <button
          onClick={() => setSelectedBus("ALL")}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          ALL
        </button>

        <button
          onClick={() => setSelectedBus("BUS-01")}
          className="bg-green-600 px-4 py-2 rounded"
        >
          BUS-01
        </button>

        <button
          onClick={() => setSelectedBus("BUS-02")}
          className="bg-red-600 px-4 py-2 rounded"
        >
          BUS-02
        </button>

      </div>

      {/* TABLE */}

      <table className="w-full border border-gray-700">

        <thead className="bg-gray-900">

          <tr>
            <th className="border p-4">ID</th>
            <th className="border p-4">Timestamp</th>
            <th className="border p-4">Passenger Count</th>
            <th className="border p-4">Bus Number</th>
          </tr>

        </thead>

        <tbody>

          {data.map((item) => (

            <tr key={item.id}>

              <td className="border p-4">
                {item.id}
              </td>

              <td className="border p-4">
                {item.timestamp}
              </td>

              <td className="border p-4">
                {item.passenger_count}
              </td>

              <td className="border p-4">
                {item.bus_number}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </main>
  );
}