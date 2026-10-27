
import { useEffect, useRef, useState } from "react";

export default function TextToSpeech({ text = "" }) {
  const [status, setStatus] = useState("idle");
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );
      window.speechSynthesis.cancel();
    };
  }, []);

  const play = () => {
    if (!("speechSynthesis" in window)) {
      alert("Browser ini belum mendukung fitur baca otomatis.");
      return;
    }

    const cleanText = text.trim();
    if (!cleanText) {
      alert("Teks bab novel belum tersedia.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const indonesianVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === "id-id"
    );

    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.lang = "id-ID";
    utterance.rate = speed;
    utterance.pitch = 1;

    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  };

  return (
    <div className="tts-player">
      <div className="tts-title">🔊 Baca Otomatis</div>

      <div className="tts-controls">
        <button onClick={play} disabled={status === "playing"}>
          ▶ Putar
        </button>

        {status === "playing" ? (
          <button onClick={pause}>⏸ Jeda</button>
        ) : (
          <button
            onClick={resume}
            disabled={status !== "paused"}
          >
            ▶ Lanjutkan
          </button>
        )}

        <button onClick={stop}>⏹ Berhenti</button>
      </div>

      <label className="tts-speed">
        Kecepatan baca: {speed.toFixed(1)}x
        <select
          value={speed}
          onChange={(event) => {
            const nextSpeed = Number(event.target.value);
            setSpeed(nextSpeed);
          }}
        >
          <option value="0.7">Lambat</option>
          <option value="1">Normal</option>
          <option value="1.2">Agak cepat</option>
          <option value="1.5">Cepat</option>
        </select>
      </label>

      <small>
        {status === "playing"
          ? "Sedang membacakan novel..."
          : status === "paused"
          ? "Pembacaan dijeda."
          : "Siap membacakan novel."}
      </small>
    </div>
  );
}
