"use client";

import * as React from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Sprint Coach IA — bouton micro pour dicter un message.
 *
 * Comportement :
 *  - Si `enabled` est false (env NEXT_PUBLIC_TRANSCRIPTION_ENABLED absent),
 *    le composant ne rend RIEN. Pas de bouton mort.
 *  - Sinon : 3 états — idle / recording / transcribing.
 *  - Click idle → demande permission micro → MediaRecorder.start().
 *  - Click recording → MediaRecorder.stop() → POST /api/ai/transcribe.
 *  - Texte transcrit injecté dans le composer via `onTranscribed`.
 *
 * Pas d'animation, pas de visualizer waveform — minimum viable.
 * L'utilisateur sait qu'il enregistre via le label + l'icône qui
 * change. Si /api/ai/transcribe retourne 501 (OPENAI_API_KEY absente
 * côté serveur même si le flag UI est activé), on toast l'erreur
 * explicite.
 */

interface Props {
  enabled: boolean;
  disabled?: boolean;
  onTranscribed: (text: string) => void;
}

type State = "idle" | "recording" | "transcribing";

export function AudioMicButton({ enabled, disabled, onTranscribed }: Props) {
  const t = useTranslations("app.coach.chat.audio");
  const [state, setState] = React.useState<State>("idle");
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  if (!enabled) return null;

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error(t("permissionDenied"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const form = new FormData();
          form.append("file", blob, "audio.webm");
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const json = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            toast.error(json.error ?? t("transcribeFailed"));
            setState("idle");
            return;
          }
          const json = (await res.json()) as { text?: string };
          if (json.text && json.text.length > 0) {
            onTranscribed(json.text);
          }
        } catch {
          toast.error(t("transcribeFailed"));
        } finally {
          setState("idle");
        }
      };
      recorder.start();
      setState("recording");
    } catch {
      toast.error(t("permissionDenied"));
      setState("idle");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopTracks();
      setState("idle");
    }
  };

  const onClick = () => {
    if (disabled) return;
    if (state === "idle") return void startRecording();
    if (state === "recording") return stopRecording();
  };

  const ariaLabel =
    state === "recording" ? t("stopLabel") : t("micLabel");
  const isBusy = state === "transcribing";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled || isBusy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid #E5E9F0",
        background:
          state === "recording"
            ? "#FEE2E2"
            : isBusy
              ? "#F1F5F9"
              : "#FFFFFF",
        color:
          state === "recording"
            ? "#DC2626"
            : isBusy
              ? "#94A3B8"
              : "#0F172A",
        cursor: disabled || isBusy ? "not-allowed" : "pointer",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {isBusy ? (
        <Loader2 width={16} height={16} className="animate-spin" />
      ) : state === "recording" ? (
        <Square width={14} height={14} fill="currentColor" />
      ) : (
        <Mic width={16} height={16} />
      )}
    </button>
  );
}
