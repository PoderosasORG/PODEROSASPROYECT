"use client";

import { useMemo, useState } from "react";
import { formatCop, formatDate } from "@/lib/admin/format";

export type Customer = {
  key: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  origin: string;
  payment: string;
  coupon: string;
  firstDate: string;
  lastDate: string;
  count: number;
  total: number;
  products: string[];
  accounts: string[];
  isTest: boolean;
};

type TextKey = "name" | "email" | "phone" | "address" | "place" | "origin" | "products";
type SortKey = "name" | "email" | "lastDate" | "count" | "total" | "place" | "origin" | "payment";

/** Minúsculas y sin tildes: "Peréz" encuentra "perez". */
function norm(v: string) {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function place(c: Customer) {
  return [c.city, c.country].filter(Boolean).join(", ");
}

function textValue(c: Customer, k: TextKey) {
  if (k === "place") return place(c);
  if (k === "products") return `${c.products.join(" ")} ${c.accounts.join(" ")}`;
  return c[k];
}

/** YYYY-MM-DD en hora de Colombia, para comparar con los filtros de fecha. */
function dayBogota(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

const EMPTY_TEXT: Record<TextKey, string> = {
  name: "",
  email: "",
  phone: "",
  address: "",
  place: "",
  origin: "",
  products: "",
};

const cell = "px-3 py-2";
const filterInput =
  "w-full min-w-0 rounded-md border border-gold-light/70 bg-white px-2 py-1 text-xs font-normal text-foreground placeholder:text-foreground/35";

export function CrmTable({ customers }: { customers: Customer[] }) {
  const [text, setText] = useState(EMPTY_TEXT);
  const [payment, setPayment] = useState("");
  const [coupon, setCoupon] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minCount, setMinCount] = useState("");
  const [hideTests, setHideTests] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "lastDate", dir: -1 });

  const payments = useMemo(() => [...new Set(customers.map((c) => c.payment))].sort(), [customers]);

  const rows = useMemo(() => {
    const min = Number(minCount) || 0;
    const filtered = customers.filter((c) => {
      if (hideTests && c.isTest) return false;
      for (const k of Object.keys(text) as TextKey[]) {
        const q = norm(text[k]);
        if (q && !norm(textValue(c, k)).includes(q)) return false;
      }
      if (payment && c.payment !== payment) return false;
      if (coupon === "si" && !c.coupon) return false;
      if (coupon === "no" && c.coupon) return false;
      const day = dayBogota(c.lastDate);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (min && c.count < min) return false;
      return true;
    });
    const val = (c: Customer): string | number => {
      switch (sort.key) {
        case "lastDate":
          return c.lastDate;
        case "count":
          return c.count;
        case "total":
          return c.total;
        case "place":
          return norm(place(c));
        default:
          return norm(c[sort.key]);
      }
    };
    return [...filtered].sort((a, b) => (val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0));
  }, [customers, text, payment, coupon, from, to, minCount, hideTests, sort]);

  const active =
    Object.values(text).some(Boolean) || payment || coupon || from || to || minCount ? true : false;

  function clearAll() {
    setText(EMPTY_TEXT);
    setPayment("");
    setCoupon("");
    setFrom("");
    setTo("");
    setMinCount("");
  }

  function header(label: string, key?: SortKey, extra = "") {
    if (!key) return <span className={extra}>{label}</span>;
    const arrow = sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : "";
    return (
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1 }))}
        className={`hover:text-foreground ${extra}`}
        title="Ordenar"
      >
        {label}
        {arrow}
      </button>
    );
  }

  function textFilter(k: TextKey, placeholder: string) {
    return (
      <input
        value={text[k]}
        onChange={(e) => setText((t) => ({ ...t, [k]: e.target.value }))}
        placeholder={placeholder}
        className={filterInput}
      />
    );
  }

  function downloadCsv() {
    const head = ["Nombre", "Correo", "Teléfono", "Dirección", "Ciudad", "País", "Origen", "Método de pago", "Cupón", "Primera compra", "Última compra", "Compras", "Total COP", "Productos", "Cuenta receptora"];
    const lines = rows.map((c) =>
      [c.name, c.email, c.phone, c.address, c.city, c.country, c.origin, c.payment, c.coupon || "No", dayBogota(c.firstDate), dayBogota(c.lastDate), c.count, Math.round(c.total / 100), c.products.join(" | "), c.accounts.join(" | ")]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crm-poderosas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="text-foreground/70">
          Mostrando <strong>{rows.length}</strong> de {customers.length}
        </p>
        <label className="flex items-center gap-1.5 text-foreground/70">
          <input type="checkbox" checked={hideTests} onChange={(e) => setHideTests(e.target.checked)} />
          Ocultar pruebas
        </label>
        {active ? (
          <button type="button" onClick={clearAll} className="text-gold hover:underline">
            Limpiar filtros
          </button>
        ) : null}
        <button type="button" onClick={downloadCsv} className="ml-auto rounded-full border border-gold-light/70 bg-white px-4 py-1.5 hover:border-gold">
          Descargar Excel (CSV)
        </button>
      </div>

      <div className="rounded-2xl border border-gold-light/60 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[1250px]">
          <thead className="text-left text-xs text-foreground/50 align-top">
            <tr>
              <th className={`${cell} pl-4`}>{header("Nombre completo", "name")}</th>
              <th className={cell}>{header("Correo", "email")}</th>
              <th className={cell}>{header("Teléfono")}</th>
              <th className={cell}>{header("Dirección")}</th>
              <th className={cell}>{header("Ciudad / País", "place")}</th>
              <th className={cell}>{header("Origen", "origin")}</th>
              <th className={cell}>{header("Método de pago", "payment")}</th>
              <th className={cell}>{header("Cupón")}</th>
              <th className={cell}>{header("Última compra", "lastDate")}</th>
              <th className={`${cell} text-right`}>{header("Compras", "count")}</th>
              <th className={`${cell} text-right`}>{header("Total", "total")}</th>
              <th className={`${cell} pr-4`}>{header("Qué compró · cuenta")}</th>
            </tr>
            <tr className="bg-beige-light/40">
              <th className={`${cell} pl-4`}>{textFilter("name", "Nombre o apellido")}</th>
              <th className={cell}>{textFilter("email", "Correo")}</th>
              <th className={cell}>{textFilter("phone", "Teléfono")}</th>
              <th className={cell}>{textFilter("address", "Dirección")}</th>
              <th className={cell}>{textFilter("place", "Ciudad o país")}</th>
              <th className={cell}>{textFilter("origin", "Origen")}</th>
              <th className={cell}>
                <select value={payment} onChange={(e) => setPayment(e.target.value)} className={filterInput}>
                  <option value="">Todos</option>
                  {payments.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </th>
              <th className={cell}>
                <select value={coupon} onChange={(e) => setCoupon(e.target.value)} className={filterInput}>
                  <option value="">Todos</option>
                  <option value="si">Con cupón</option>
                  <option value="no">Sin cupón</option>
                </select>
              </th>
              <th className={cell}>
                <div className="flex flex-col gap-1">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={filterInput} title="Desde" />
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={filterInput} title="Hasta" />
                </div>
              </th>
              <th className={cell}>
                <input
                  type="number"
                  min={1}
                  value={minCount}
                  onChange={(e) => setMinCount(e.target.value)}
                  placeholder="Mín."
                  className={`${filterInput} text-right`}
                />
              </th>
              <th className={cell}></th>
              <th className={`${cell} pr-4`}>{textFilter("products", "Producto o cuenta")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className={`border-t border-gold-light/40 align-top ${c.isTest ? "opacity-50" : ""}`}>
                <td className={`${cell} pl-4 font-medium`}>
                  {c.name}
                  {c.isTest ? <span className="ml-1 text-[10px] text-foreground/50">(prueba)</span> : null}
                </td>
                <td className={cell}>{c.email || "—"}</td>
                <td className={`${cell} whitespace-nowrap`}>{c.phone || "—"}</td>
                <td className={cell}>{c.address || "—"}</td>
                <td className={cell}>{place(c) || "—"}</td>
                <td className={cell}>{c.origin || "—"}</td>
                <td className={cell}>{c.payment}</td>
                <td className={cell}>{c.coupon || "No"}</td>
                <td className={`${cell} whitespace-nowrap`}>{formatDate(c.lastDate)}</td>
                <td className={`${cell} text-right`}>{c.count}</td>
                <td className={`${cell} text-right whitespace-nowrap`}>{formatCop(c.total)}</td>
                <td className={`${cell} pr-4 text-xs text-foreground/70`}>
                  {c.products.join(" · ")}
                  <br />
                  <span className="text-foreground/45">→ {c.accounts.join(", ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-5 text-sm text-foreground/60">Nadie coincide con esos filtros.</p> : null}
      </div>
    </div>
  );
}
