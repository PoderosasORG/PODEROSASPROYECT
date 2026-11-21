import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Para rutas GET de /admin: sesión + estar en admin_members. */
export async function isAdminRequest() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("admin_members").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

/** CSV con BOM y separador ";" para que Excel en español lo abra en columnas. */
export function csvResponse(filename: string, head: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = "﻿" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Centavos → pesos sin decimales (número, para que Excel pueda sumar). */
export function pesos(cents: number | null | undefined) {
  return cents == null ? "" : Math.round(Number(cents) / 100);
}
