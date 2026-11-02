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
  const expire = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hora para completar la subida

  const signature = crypto
    .createHash("sha256")
    .update(`${libraryId}${apiKey}${expire}${videoId}`)
    .digest("hex");

  return { libraryId, expire, signature };
}

export function getSignedPlaybackUrl(videoId: string): string {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const tokenKey = requireEnv("BUNNY_STREAM_TOKEN_KEY");
  const expires = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos

  const token = crypto
    .createHash("sha256")
    .update(`${tokenKey}${videoId}${expires}`)
    .digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const libraryId = requireEnv("BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireEnv("BUNNY_STREAM_API_KEY");

  await fetch(`${BUNNY_STREAM_API}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: { AccessKey: apiKey },
  });
}
