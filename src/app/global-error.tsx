"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#0a0a0b", margin: 0 }}>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <div
              style={{
                marginBottom: "1.5rem",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                color: "rgba(104, 172, 110, 0.6)",
              }}
            >
              CRITICAL ROUTING FAULT
            </div>
            <h2
              style={{
                marginBottom: "0.75rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Application Error
            </h2>
            <p
              style={{
                marginBottom: "2rem",
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              A critical error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                borderRadius: "0.375rem",
                border: "1px solid rgba(104, 172, 110, 0.3)",
                backgroundColor: "rgba(104, 172, 110, 0.1)",
                padding: "0.625rem 1.5rem",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                color: "#68ac6e",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
