"use client";

import { useEffect, useRef, useState } from "react";
import { blobToWavBase64 } from "@/lib/client/media";

export type VoiceNote = { mimeType: "audio/wav"; data: string; seconds: number; url: string };

const MAX_SECONDS = 60;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function VoiceRecorder({
  value,
  onChange,
}: {
  value: VoiceNote | null;
  onChange: (note: VoiceNote | null) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (state === "recording" && seconds >= MAX_SECONDS) stop();
  }, [seconds, state]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes aren't supported in this browser. Please type instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        if (timerRef.current) clearInterval(timerRef.current);
        setState("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const { base64, seconds: duration } = await blobToWavBase64(blob);
          if (duration < 2) {
            setError("That was too short. Try speaking for at least 5 seconds.");
          } else {
            onChange({ mimeType: "audio/wav", data: base64, seconds: Math.round(duration), url: URL.createObjectURL(blob) });
          }
        } catch {
          setError("We couldn't process that recording. Please try again or type instead.");
        }
        setState("idle");
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings, or type instead.");
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  if (value) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between text-sm font-semibold text-emerald-800">
          <span>🎙️ Voice note added · {clock(value.seconds)}</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs font-medium text-emerald-700 underline">
            Remove
          </button>
        </div>
        <audio controls src={value.url} className="mt-2 h-9 w-full" />
      </div>
    );
  }

  return (
    <div>
      {state === "recording" ? (
        <button
          type="button"
          onClick={stop}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 py-4 text-white shadow-lg"
        >
          <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
          <span className="font-semibold">Tap to stop · {clock(seconds)} / {clock(MAX_SECONDS)}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={state === "processing"}
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-4 text-orange-900 transition active:scale-[0.99] disabled:opacity-60"
        >
          <span className="text-base font-semibold">
            {state === "processing" ? "Processing your voice note…" : "🎙️ Record a voice note"}
          </span>
          <span className="mt-1 text-xs text-orange-700">Up to 60 sec · Hindi, Hinglish or English</span>
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}