"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Role = "admin" | "operator" | null;

export function useUserRole() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const r = (session?.user?.user_metadata?.role as Role) || null;
      setRole(r);
      setLoading(false);
    }
    load();
  }, []);

  return { role, loading };
}