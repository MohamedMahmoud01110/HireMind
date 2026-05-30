import { useCallback, useRef, useState } from "react";

export function pickIconForText(text = "") {
  const t = text.toLowerCase();
  if (t.includes("eye") || t.includes("camera") || t.includes("contact")) {
    return "👁";
  }
  if (t.includes("nervous") || t.includes("breath") || t.includes("calm")) {
    return "💨";
  }
  if (t.includes("posture") || t.includes("sit") || t.includes("straight")) {
    return "🧍";
  }
  if (
    t.includes("speak") ||
    t.includes("pace") ||
    t.includes("clear") ||
    t.includes("filler")
  ) {
    return "🤫";
  }
  if (t.includes("structure") || t.includes("star") || t.includes("result")) {
    return "💡";
  }
  if (t.includes("great") || t.includes("energy") || t.includes("keep")) {
    return "⭐";
  }
  if (t.includes("loading") || t.includes("wait")) {
    return "⏳";
  }
  if (t.includes("connection") || t.includes("lost") || t.includes("denied")) {
    return "⚠";
  }
  if (t.includes("ready") || t.includes("complete")) {
    return "✅";
  }
  return "💡";
}

export function useCoachingFeedback() {
  const [messages, setMessages] = useState([]);
  const seenHintsRef = useRef(new Set());
  const modelsReadyRef = useRef(false);
  const wasRecordingRef = useRef(false);

  const appendFeedback = useCallback((text, type = "info", icon) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    setMessages((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          text: trimmed,
          type,
          icon: icon || pickIconForText(trimmed),
          time: new Date(),
        },
      ].slice(-40),
    );
  }, []);

  const appendVisualHints = useCallback(
    (hints = []) => {
      hints.forEach((hint) => {
        const key = hint.trim().toLowerCase();
        if (!key || seenHintsRef.current.has(key)) return;
        seenHintsRef.current.add(key);
        appendFeedback(hint, "info", pickIconForText(hint));
      });
    },
    [appendFeedback],
  );

  const clearFeedback = useCallback(() => {
    setMessages([]);
    seenHintsRef.current.clear();
    modelsReadyRef.current = false;
  }, []);

  const markRecording = useCallback((active) => {
    wasRecordingRef.current = active;
  }, []);

  return {
    messages,
    appendFeedback,
    appendVisualHints,
    clearFeedback,
    modelsReadyRef,
    wasRecordingRef,
    markRecording,
  };
}
