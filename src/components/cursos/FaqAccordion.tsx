"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q} className="bg-white rounded-xl border border-gold-light/40 overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-center justify-between gap-4 text-left px-4 py-3.5"
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <span className="shrink-0 text-gold text-xs">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <p className="text-sm text-foreground/60 px-4 pb-4 leading-relaxed">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
