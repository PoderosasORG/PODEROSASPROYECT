import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { detectOrigin, ORIGIN_COOKIE } from "@/lib/origin";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Origen de la visita (para el CRM de /admin): se guarda la PRIMERA
  // fuente con la que llegó la persona (utm_source, ?ref= o el sitio
  // externo que la mandó) y se respeta por 30 días.
  if (!request.cookies.get(ORIGIN_COOKIE)) {
    const origin = detectOrigin(request);
    if (origin) {
      response.cookies.set(ORIGIN_COOKIE, origin, {
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
