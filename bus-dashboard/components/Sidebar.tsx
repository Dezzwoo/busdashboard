"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useUserRole();

  const NAV_ITEMS =
    role === "admin"
      ? [
          {
            href: "/",
            label: "Dashboard",
            icon: "🏠",
          },
          {
            href: "/tickets-today",
            label: "Today's Tickets",
            icon: "🎫",
          },
          {
            href: "/reports",
            label: "Discrepancy Report",
            icon: "📊",
          },
          {
            href: "/profiles",
            label: "Profiles",
            icon: "👤",
          },
          {
            href: "/schedules",
            label: "Schedules",
            icon: "📅",
          },
        ]
      : [
          {
            href: "/tickets",
            label: "Ticket Encoding",
            icon: "🎫",
          },
        ];

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="h-screen w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">

      {/* LOGO */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">

        <Image
          src="/wvtc.png"
          alt="Logo"
          width={36}
          height={36}
          className="rounded-lg"
        />

        <span className="font-bold text-gray-900 text-sm leading-tight">
          Bus Control
          <br />
          System
        </span>

      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">

        {!loading &&
          NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition ${
                  active
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

      </nav>

      {/* LOGOUT */}
      <div className="p-2 border-t border-gray-200">

        <button
          onClick={logout}
          className="w-full px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition text-left"
        >
          🚪 Logout
        </button>

      </div>

    </aside>
  );
}