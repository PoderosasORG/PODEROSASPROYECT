"use client";

import Link from "next/link";
import { trackEvent, trackFunnel } from "@/lib/analytics/client";

/** Link que registra el clic (anónimo) antes de navegar. */
export function TrackedLink({
  href,
  location,
  className,
  children,
}: {
  href: string;
  location: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackEvent("cta_ir_a_metodologia", { location });
        trackFunnel("cta_ir_a_metodologia", location);
      }}
    >
      {children}
    </Link>
  );
}
