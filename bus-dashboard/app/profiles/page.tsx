"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Person = {
  id: number;
  name: string;
  employee_id: string;
  contact: string;
  status: string;
};

export default function Profiles() {
  const [drivers, setDrivers] = useState<Person[]>([]);
  const [conductors, setConductors] = useState<Person[]>([]);

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [contact, setContact] = useState("");
  const [type, setType] = useState("Driver");

  async function loadProfiles() {
    const { data: driverData } = await supabase
      .from("drivers")
      .select("*")
      .order("id");

    const { data: conductorData } = await supabase
      .from("conductors")
      .select("*")
      .order("id");

    setDrivers(driverData || []);
    setConductors(conductorData || []);
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  async function addProfile() {
    if (!name || !employeeId) return;

    if (type === "Driver") {
      await supabase.from("drivers").insert({
        name,
        employee_id: employeeId,
        contact,
        status: "Active",
      });
    } else {
      await supabase.from("conductors").insert({
        name,
        employee_id: employeeId,
        contact,
        status: "Active",
      });
    }

    setName("");
    setEmployeeId("");
    setContact("");

    loadProfiles();
  }

  async function deleteDriver(id: number) {
    await supabase
      .from("drivers")
      .delete()
      .eq("id", id);

    loadProfiles();
  }

  async function deleteConductor(id: number) {
    await supabase
      .from("conductors")
      .delete()
      .eq("id", id);

    loadProfiles();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">

      <h1 className="text-4xl font-bold mb-6">
        Profiles
      </h1>

      {/* ADD PROFILE */}
      <div className="bg-white border rounded-2xl p-5 mb-6">

        <h2 className="text-xl font-semibold mb-4">
          Add Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border rounded-lg p-3"
          >
            <option>Driver</option>
            <option>Conductor</option>
          </select>

          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded-lg p-3"
          />

          <input
            placeholder="Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border rounded-lg p-3"
          />

          <input
            placeholder="Contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="border rounded-lg p-3"
          />

        </div>

        <button
          onClick={addProfile}
          className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold"
        >
          + Add Profile
        </button>

      </div>

      {/* DRIVERS */}
      <div className="bg-white border rounded-2xl p-5 mb-6 overflow-x-auto">

        <h2 className="text-xl font-semibold mb-4">
          Drivers
        </h2>

        <table className="w-full text-sm">

          <thead className="border-b text-gray-500">
            <tr>
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Employee ID</th>
              <th className="text-left py-3">Contact</th>
              <th className="text-left py-3">Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            {drivers.map((driver) => (
              <tr
                key={driver.id}
                className="border-b"
              >

                <td className="py-3 font-semibold">
                  {driver.name}
                </td>

                <td>
                  {driver.employee_id}
                </td>

                <td>
                  {driver.contact}
                </td>

                <td className="text-green-600 font-semibold">
                  {driver.status}
                </td>

                <td>
                  <button
                    onClick={() =>
                      deleteDriver(driver.id)
                    }
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

      {/* CONDUCTORS */}
      <div className="bg-white border rounded-2xl p-5 overflow-x-auto">

        <h2 className="text-xl font-semibold mb-4">
          Conductors
        </h2>

        <table className="w-full text-sm">

          <thead className="border-b text-gray-500">
            <tr>
              <th className="text-left py-3">
                Name
              </th>

              <th className="text-left py-3">
                Employee ID
              </th>

              <th className="text-left py-3">
                Contact
              </th>

              <th className="text-left py-3">
                Status
              </th>

              <th></th>
            </tr>
          </thead>

          <tbody>

            {conductors.map((conductor) => (
              <tr
                key={conductor.id}
                className="border-b"
              >

                <td className="py-3 font-semibold">
                  {conductor.name}
                </td>

                <td>
                  {conductor.employee_id}
                </td>

                <td>
                  {conductor.contact}
                </td>

                <td className="text-green-600 font-semibold">
                  {conductor.status}
                </td>

                <td>
                  <button
                    onClick={() =>
                      deleteConductor(conductor.id)
                    }
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </main>
  );
}