"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Route error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 font-mono text-sm tracking-widest text-[#68ac6e]/60">
          ROUTING FAULT DETECTED
        </div>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          Something went wrong
        </h2>
        <p className="mb-8 text-sm text-white/50">
          A transient error occurred. This is likely a network issue or a
          temporary fault in the data stream.
        </p>
        <button
          onClick={reset}
          className="rounded-md border border-[#68ac6e]/30 bg-[#68ac6e]/10 px-6 py-2.5 font-mono text-sm text-[#68ac6e] transition-colors hover:bg-[#68ac6e]/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
