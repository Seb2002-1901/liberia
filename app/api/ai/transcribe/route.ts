import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTranscriptionServerConfigured } from "@/lib/env";
import { getActionErrors } from "@/lib/i18n/action-errors";

/**
 * Sprint Coach IA — endpoint de transcription audio.
 *
 * Mode dégradé par défaut : sans `OPENAI_API_KEY`, retourne 501 avec
 * un message clair pour que le client affiche la tooltip "transcription
 * non configurée". Le bouton micro est de toute façon caché côté UI
 * (cf. lib/env.ts:isTranscriptionUiEnabled).
 *
 * Implémentation Whisper :
 *  - Accepte multipart/form-data avec `file` (audio webm/mp3/m4a)
 *  - Appelle OpenAI Whisper avec model=whisper-1
 *  - Retourne `{ text: string }`
 *
 * Garde-fous :
 *  - Auth Supabase obligatoire (pas d'anonymes — Whisper coûte)
 *  - Rate-limit sur "ai" (30 reqs/min/user)
 *  - Max 25 MB (limite Whisper API)
 *  - Pas de stockage côté serveur : le fichier transite et est jeté.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

export async function POST(request: Request) {
  const tErr = await getActionErrors();

  if (!isTranscriptionServerConfigured()) {
    return NextResponse.json(
      { error: tErr("transcriptionUnavailable") },
      { status: 501 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: tErr("authRequired") },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: tErr("authRequired") }, { status: 401 });
  }

  const rate = await checkRateLimit("ai", user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: tErr("tooManyAttempts") },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: tErr("audioTooLarge") },
      { status: 413 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  // Pas de FormData stream-forward direct vers OpenAI (les implems
  // diffèrent edge/node) — on rebuild un FormData propre.
  const openaiForm = new FormData();
  openaiForm.append("file", file, "audio.webm");
  openaiForm.append("model", "whisper-1");
  // Hint le modèle vers un contexte finance / FR par défaut. Le user
  // peut overrider sa langue via le profil.
  openaiForm.append("response_format", "json");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiForm,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[transcribe] OpenAI error", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: tErr("transcribeFailed") },
        { status: 502 },
      );
    }
    const json = (await res.json()) as { text?: string };
    const text = typeof json.text === "string" ? json.text.trim() : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error(
      "[transcribe] fetch failed",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: tErr("transcribeFailed") },
      { status: 502 },
    );
  }
}
