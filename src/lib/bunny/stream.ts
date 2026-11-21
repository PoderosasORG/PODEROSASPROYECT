// src/lib/bunny/stream.ts
import crypto from "node:crypto";

const BUNNY_STREAM_API = "https://video.bunnycdn.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export async function createBunnyVideo(title: string): Promise<{ videoId: string }> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  const res = await fetch(`${BUNNY_STREAM_API}/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(`Bunny rechazó crear el video (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { guid: string };
  return { videoId: data.guid };
}

export function createTusUploadAuth(videoId: string) {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");
  const expire = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 horas, para cubrir subidas grandes en conexiones lentas

  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return { libraryId, expire, signature };
}

export function getSignedPlaybackUrl(videoId: string): string {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const tokenKey = requireEnv("BUNNY_STREAM_TOKEN_KEY");
  // Enlace de un solo uso práctico: vence a los 3 minutos. El reproductor
  // solo lo necesita para cargar; si alguien lo copia y lo comparte, deja
  // de funcionar enseguida. (Bunny además exige token en cada segmento del
  // video — "CDN token authentication" — y solo permite poderosas.org.)
  const expires = Math.floor(Date.now() / 1000) + 60 * 3; // 3 minutos

  const token = crypto
    .createHash("sha256")
    .update(`${tokenKey}${videoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

export async function setBunnyThumbnail(videoId: string, thumbnailUrl: string): Promise<void> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  const res = await fetch(
    `${BUNNY_STREAM_API}/library/${libraryId}/videos/${videoId}/thumbnail?thumbnailUrl=${encodeURIComponent(thumbnailUrl)}`,
    { method: "POST", headers: { AccessKey: apiKey } },
  );
  if (!res.ok) {
    throw new Error(`Bunny rechazó la miniatura (${res.status}): ${await res.text()}`);
  }
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  await fetch(`${BUNNY_STREAM_API}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}
