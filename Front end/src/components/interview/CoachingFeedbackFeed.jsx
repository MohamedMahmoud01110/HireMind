import React, { useEffect, useRef } from "react";

const TYPE_STYLES = {
  info: {
    card: "bg-slate-50 border-slate-200",
    text: "text-slate-700",
  },
  success: {
    card: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-900",
  },
  adaptive: {
    card: "bg-cyan-50 border-cyan-200",
    text: "text-cyan-900",
  },
  urgent: {
    card: "bg-red-50 border-red-200",
    text: "text-red-900",
  },
};

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function FeedbackCard({ icon, text, type, time }) {
  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 animate-fade-up ${styles.card}`}
    >
      <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
        {icon}
      </span>
      <p
        className={`flex-1 text-[13px] leading-relaxed ${styles.text}`}
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {text}
      </p>
      <span
        className="text-[10px] text-slate-400 font-mono flex-shrink-0 pt-0.5"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {formatTime(time)}
      </span>
    </div>
  );
}

export default function CoachingFeedbackFeed({
  messages = [],
  isLive = false,
  className = "",
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[300px] max-h-[480px] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h3
            className="text-[15px] font-bold text-gray-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Coaching Feedback
          </h3>
          <p
            className="text-[12px] text-gray-400 mt-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Live tips while you practice
          </p>
        </div>
        {isLive && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
            <span className="text-3xl opacity-40 mb-3">💬</span>
            <p
              className="text-[13px] text-gray-500 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Coaching tips will appear here during your session.
            </p>
          </div>
        ) : (
          messages.map((msg) => <FeedbackCard key={msg.id} {...msg} />)
        )}
      </div>
    </div>
  );
}
