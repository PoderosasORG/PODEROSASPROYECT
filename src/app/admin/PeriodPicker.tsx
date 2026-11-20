import Link from "next/link";
import { quickPeriods } from "@/lib/admin/format";

export function PeriodPicker({ basePath, from, to }: { basePath: string; from: string; to: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {quickPeriods().map((p) => {
          const active = p.desde === from && p.hasta === to;
          return (
            <Link
              key={p.label}
              href={`${basePath}?desde=${p.desde}&hasta=${p.hasta}`}
              className={`rounded-full px-3 py-1.5 text-sm border ${
                active ? "bg-gold text-white border-gold" : "bg-white border-gold-light/70 hover:border-gold"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form action={basePath} className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">Desde</span>
          <input type="date" name="desde" defaultValue={from} className="rounded-lg border border-gold-light/70 bg-white px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">Hasta</span>
          <input type="date" name="hasta" defaultValue={to} className="rounded-lg border border-gold-light/70 bg-white px-2 py-1" />
        </label>
        <button className="rounded-full bg-foreground text-white px-4 py-1.5">Ver</button>
      </form>
    </div>
  );
}
