import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * VoiceButton — dictate into a controlled text field via the Web Speech API.
 * Fully optional: if unsupported it shows a disabled mic with a helpful tooltip,
 * and typing always keeps working.
 */
export default function VoiceButton({ value = "", onChange, testid = "voice-btn", label = "field" }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const baseRef = useRef("");
  const supported = !!SpeechRecognition;

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  const stop = () => { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); };

  const start = () => {
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = value ? value.trim() : "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) baseRef.current = (baseRef.current + " " + t).trim();
        else interim += t;
      }
      onChange((baseRef.current + (interim ? " " + interim : "")).trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed")
        toast.error("Microphone permission denied — enable it in your browser to use voice input.");
      else if (e.error === "no-speech") toast.message("Didn't catch that — try again.");
      else if (e.error !== "aborted") toast.error("Voice input error — please type instead.");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); }
    catch { toast.error("Could not start voice input."); setListening(false); }
  };

  const toggle = () => {
    if (!supported) {
      toast.error("Voice input isn't supported in this browser — please type instead.");
      return;
    }
    listening ? stop() : start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid={testid}
      aria-label={listening ? `Stop dictating ${label}` : `Dictate ${label} with your voice`}
      aria-pressed={listening}
      title={supported ? (listening ? "Stop dictating" : "Dictate with voice") : "Voice input not supported — type instead"}
      className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        listening
          ? "border-danger bg-danger/10 text-danger animate-pulse"
          : supported
          ? "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-borderStrong"
          : "border-border bg-surface text-muted-foreground/40 cursor-not-allowed"
      }`}
    >
      {listening ? <Square size={14} /> : <Mic size={15} />}
    </button>
  );
}
