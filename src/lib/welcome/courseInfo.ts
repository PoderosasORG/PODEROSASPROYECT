import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CourseInfo = {
  sessions: { title: string; startsAt: string }[];
  publishedModules: number;
  upcomingModules: { title: string; category: string; plannedDate: string | null }[];
  hasEbook: boolean;
  materialCount: number;
};

/** Calendario de encuentros, contenido publicado y próximos módulos. */
export async function loadCourseInfo(productId: string): Promise<CourseInfo> {
  const admin = createAdminClient();
  const [{ data: sessions }, { data: categories }, { data: files }] = await Promise.all([
    admin
      .from("live_sessions")
      .select("title, starts_at")
      .eq("product_id", productId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    admin.from("course_categories").select("id, title, order_index").eq("product_id", productId).order("order_index"),
    admin.from("product_files").select("file_name, display_name").eq("product_id", productId),
  ]);
  const catIds = (categories ?? []).map((c) => c.id);
  const { data: modules } = catIds.length
    ? await admin
        .from("category_modules")
        .select("title, category_id, is_published, planned_publish_date, order_index")
        .in("category_id", catIds)
        .order("order_index")
    : { data: [] as { title: string; category_id: string; is_published: boolean; planned_publish_date: string | null }[] };

  const catTitle = new Map((categories ?? []).map((c) => [c.id, c.title as string]));
  const catOrder = new Map((categories ?? []).map((c) => [c.id, c.order_index as number]));
  const pending = (modules ?? [])
    .filter((m) => !m.is_published)
    .sort((a, b) =>
      (a.planned_publish_date ?? "9999").localeCompare(b.planned_publish_date ?? "9999") ||
      (catOrder.get(a.category_id) ?? 0) - (catOrder.get(b.category_id) ?? 0),
    );

  return {
    sessions: (sessions ?? []).map((s) => ({ title: s.title, startsAt: s.starts_at })),
    publishedModules: (modules ?? []).filter((m) => m.is_published).length,
    upcomingModules: pending.map((m) => ({
      title: m.title,
      category: catTitle.get(m.category_id) ?? "",
      plannedDate: m.planned_publish_date,
    })),
    hasEbook: (files ?? []).some((f) => `${f.display_name ?? ""} ${f.file_name}`.toLowerCase().includes("50 acuerdos")),
    materialCount: (files ?? []).length,
  };
}

export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

export function formatPlannedDate(date: string) {
  return new Date(`${date}T12:00:00-05:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
}
