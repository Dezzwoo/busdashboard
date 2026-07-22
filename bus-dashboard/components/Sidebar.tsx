"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading } = useUserRole();

  const NAV_ITEMS =
    role === "admin"
      ? [
          { href: "/", label: "Dashboard" },
          { href: "/tickets-today", label: "Today's Tickets" },
          { href: "/reports", label: "Discrepancy Report" },
        ]
      : [{ href: "/tickets", label: "Ticket Encoding" }];

  return (
    <aside className="h-screen w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
        <Image src="/wvtc.png" alt="Logo" width={36} height={36} className="rounded-lg" />
        <span className="font-bold text-gray-900 text-sm leading-tight">
          Bus Control<br />System
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {!loading &&
          NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  active
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
          className="w-full px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition text-left"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}