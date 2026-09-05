"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUS_LIST = [
  "BUS-01",
  "BUS-02",
  "BUS-03",
  "BUS-04",
  "BUS-05",
  "BUS-06",
];

type Person = {
  id: number;
  name: string;
};

type Schedule = {
  id: number;
  bus_number: string;
  date: string;
  shift: string;
  driver_id: number | null;
  conductor_id: number | null;
  driver_name?: string;
  conductor_name?: string;
};

export default function Schedules() {
  const [drivers, setDrivers] = useState<Person[]>([]);
  const [conductors, setConductors] = useState<Person[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [bus, setBus] = useState("BUS-01");
  const [driver, setDriver] = useState("");
  const [conductor, setConductor] = useState("");

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // FORMAT TIME
  // =========================

  function formatTime(time: string) {
    const [hour, minute] = time.split(":");
    const hourNumber = Number(hour);

    const suffix = hourNumber >= 12 ? "PM" : "AM";

    const displayHour =
      hourNumber % 12 === 0
        ? 12
        : hourNumber % 12;

    return `${displayHour}:${minute} ${suffix}`;
  }

  // =========================
  // LOAD DATA
  // =========================

  async function loadData() {
    const { data: driverData } = await supabase
      .from("drivers")
      .select("id, name")
      .eq("status", "Active")
      .order("name");

    const { data: conductorData } = await supabase
      .from("conductors")
      .select("id, name")
      .eq("status", "Active")
      .order("name");

    const {
      data: scheduleData,
      error,
    } = await supabase
      .from("schedules")
      .select(
        "id, bus_number, date, shift, driver_id, conductor_id"
      )
      .order("date", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error loading schedules:",
        error
      );

      setMessage(
        "Error loading schedules: " +
          error.message
      );

      return;
    }

    const driverList = driverData || [];
    const conductorList = conductorData || [];

    const formattedSchedules =
      (scheduleData || []).map((schedule) => {

        const foundDriver =
          driverList.find(
            (d) =>
              d.id === schedule.driver_id
          );

        const foundConductor =
          conductorList.find(
            (c) =>
              c.id === schedule.conductor_id
          );

        return {
          ...schedule,
          driver_name:
            foundDriver?.name || "-",
          conductor_name:
            foundConductor?.name || "-",
        };
      });

    setDrivers(driverList);
    setConductors(conductorList);
    setSchedules(formattedSchedules);
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // ADD SCHEDULE
  // =========================

  async function addSchedule() {
    setMessage("");

    if (!driver) {
      setMessage(
        "Please select a driver."
      );
      return;
    }

    if (!conductor) {
      setMessage(
        "Please select a conductor."
      );
      return;
    }

    if (!startTime || !endTime) {
      setMessage(
        "Please select the start and end time."
      );
      return;
    }

    if (startTime === endTime) {
      setMessage(
        "Start time and end time cannot be the same."
      );
      return;
    }

    setLoading(true);

    const shift = `${formatTime(startTime)} - ${formatTime(
      endTime
    )}`;

    const { error } = await supabase
      .from("schedules")
      .insert({
        bus_number: bus,
        driver_id: Number(driver),
        conductor_id: Number(conductor),
        date,
        shift,
      });

    setLoading(false);

    if (error) {
      setMessage(
        "Error: " + error.message
      );
      return;
    }

    setMessage(
      "Schedule added successfully."
    );

    setDriver("");
    setConductor("");

    await loadData();
  }

  // =========================
  // DELETE SCHEDULE
  // =========================

  async function deleteSchedule(
    id: number
  ) {
    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(
        "Error: " + error.message
      );
      return;
    }

    await loadData();
  }

  // =========================
  // TODAY'S SCHEDULE
  // =========================

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const todaySchedules =
    schedules.filter(
      (s) => s.date === today
    );

  return (
    <main className="min-h-screen p-4 sm:p-6">

      {/* HEADER */}
      <div className="mb-6">

        <h1 className="text-2xl sm:text-3xl font-bold">
          Driver & Conductor Scheduling
        </h1>

        <p className="text-gray-500 mt-1">
          Assign drivers and conductors to
          buses for the day.
        </p>

      </div>

      {/* CREATE SCHEDULE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm mb-6">

        <h2 className="text-lg font-semibold mb-5">
          Create Schedule
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* BUS */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Bus ID
            </label>

            <select
              value={bus}
              onChange={(e) =>
                setBus(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3 bg-white"
            >

              {BUS_LIST.map((b) => (
                <option
                  key={b}
                  value={b}
                >
                  {b}
                </option>
              ))}

            </select>

          </div>

          {/* DRIVER */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Driver
            </label>

            <select
              value={driver}
              onChange={(e) =>
                setDriver(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3 bg-white"
            >

              <option value="">
                Select Driver
              </option>

              {drivers.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                >
                  {d.name}
                </option>
              ))}

            </select>

          </div>

          {/* CONDUCTOR */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Conductor
            </label>

            <select
              value={conductor}
              onChange={(e) =>
                setConductor(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3 bg-white"
            >

              <option value="">
                Select Conductor
              </option>

              {conductors.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))}

            </select>

          </div>

          {/* DATE */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3"
            />

          </div>

          {/* START TIME */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              Start Time
            </label>

            <input
              type="time"
              value={startTime}
              onChange={(e) =>
                setStartTime(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3"
            />

          </div>

          {/* END TIME */}
          <div>

            <label className="block text-sm font-medium text-gray-600 mb-1">
              End Time
            </label>

            <input
              type="time"
              value={endTime}
              onChange={(e) =>
                setEndTime(e.target.value)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-3"
            />

          </div>

        </div>

        {/* ADD BUTTON */}
        <button
          onClick={addSchedule}
          disabled={loading}
          className="mt-5 w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : "+ Add Schedule"}
        </button>

        {message && (
          <p
            className={`mt-3 text-sm ${
              message.startsWith("Error") ||
              message.startsWith("Please")
                ? "text-red-500"
                : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}

      </div>

      {/* TODAY'S SCHEDULE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm mb-6">

        <h2 className="text-lg font-semibold mb-4">
          Today's Schedule
        </h2>

        {todaySchedules.length === 0 ? (

          <p className="text-gray-400 text-sm py-6 text-center">
            No schedule for today.
          </p>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {todaySchedules.map((s) => (

              <div
                key={s.id}
                className="border rounded-xl p-4"
              >

                <div className="flex justify-between items-center mb-3">

                  <span className="text-lg font-bold text-green-600">
                    {s.bus_number}
                  </span>

                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    TODAY
                  </span>

                </div>

                <p className="text-sm text-gray-500">
                  Driver
                </p>

                <p className="font-semibold mb-2">
                  {s.driver_name}
                </p>

                <p className="text-sm text-gray-500">
                  Conductor
                </p>

                <p className="font-semibold mb-2">
                  {s.conductor_name}
                </p>

                <p className="text-sm text-gray-500">
                  Time
                </p>

                <p className="font-semibold">
                  {s.shift}
                </p>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* SCHEDULE RECORDS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">

        <h2 className="text-lg font-semibold mb-4">
          Schedule Records
        </h2>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px] text-sm">

            <thead className="border-b border-gray-200 text-gray-500">

              <tr>

                <th className="text-left py-3">
                  Bus
                </th>

                <th className="text-left py-3">
                  Driver
                </th>

                <th className="text-left py-3">
                  Conductor
                </th>

                <th className="text-left py-3">
                  Date
                </th>

                <th className="text-left py-3">
                  Time
                </th>

                <th className="text-left py-3">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {schedules.map((s) => (

                <tr
                  key={s.id}
                  className="border-b border-gray-100"
                >

                  <td className="py-3 font-bold text-green-600">
                    {s.bus_number}
                  </td>

                  <td>
                    {s.driver_name}
                  </td>

                  <td>
                    {s.conductor_name}
                  </td>

                  <td>
                    {s.date}
                  </td>

                  <td>
                    {s.shift}
                  </td>

                  <td>

                    <button
                      onClick={() =>
                        deleteSchedule(s.id)
                      }
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

              {schedules.length === 0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-400"
                  >
                    No schedules yet.
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