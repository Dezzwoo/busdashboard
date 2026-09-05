"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const NO_SIDEBAR_ROUTES = ["/login"];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const hideSidebar = NO_SIDEBAR_ROUTES.includes(pathname);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-50">

        <div className="flex items-center gap-2">
          <img
            src="/wvtc.png"
            alt="WVTC"
            className="w-9 h-9 rounded-lg"
          />

          <span className="font-bold text-gray-900">
            Bus Control System
          </span>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-2xl px-2"
        >
          {menuOpen ? "✕" : "☰"}
        </button>

      </header>

      <div className="flex">

        {/* DESKTOP SIDEBAR */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* MOBILE SIDEBAR */}
        {menuOpen && (
          <>
            {/* DARK BACKGROUND */}
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />

            {/* SIDEBAR */}
            <div className="fixed left-0 top-0 z-50 lg:hidden">
              <Sidebar
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
          </>
        )}

        {/* CONTENT */}
        <main className="flex-1 min-w-0 p-4 sm:p-6">
          {children}
        </main>

      </div>
    </div>
  );
}