import "server-only";
import Redis from "ioredis";
import { NextRequest, NextResponse } from "next/server";

// Mismo patrón ya probado en mystery-tienda: límite por IP+ámbito sobre
// Redis (REDIS_URL). Si Redis no está configurado o falla, se deja
// pasar la solicitud (fail-open) — nunca debe poder tumbar pagos reales
// por un problema de infraestructura ajeno al límite de abuso.
let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redisClient === undefined) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
      });
      redisClient.on("error", (err) => {
        console.error("[rateLimit] Error de conexión a Redis:", err);
      });
    } catch (err) {
      // REDIS_URL mal escrita (ej. pegaron el comando "redis-cli -u ..."
      // en vez de solo la URL) no debe tumbar endpoints de pago reales.
      console.error("[rateLimit] REDIS_URL inválida, siguiendo sin límite de tasa:", err);
      redisClient = null;
    }
  }
  return redisClient;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Hasta `limit` solicitudes por IP+scope cada `windowSeconds`.
export async function checkRateLimit(
  request: NextRequest,
  scope: string,
  { limit = 10, windowSeconds = 60 } = {},
): Promise<{ limited: boolean; retryAfter?: number }> {
  const client = getRedisClient();
  if (!client) return { limited: false };

  const ip = getClientIp(request);
  const key = `ratelimit:${scope}:${ip}`;

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    if (count > limit) {
      const ttl = await client.ttl(key);
      return { limited: true, retryAfter: ttl > 0 ? ttl : windowSeconds };
    }
    return { limited: false };
  } catch (err) {
    console.error(`[rateLimit] Error verificando límite (${scope}):`, err);
    return { limited: false };
  }
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
