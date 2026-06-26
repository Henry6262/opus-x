"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  Sparkles,
  Zap,
  Shield,
  Rocket,
  ArrowRight,
  Check,
  Loader2,
  Twitter,
  Wallet,
} from "lucide-react";
import ScrambleText from "../animations/ScrambleText";

const INTEREST_OPTIONS = [
  "Early access",
  "Trading automation",
  "Token analytics",
  "DeFAI agent tooling",
  "Just here to observe",
];

export function WaitlistLanding() {
  const [xHandle, setXHandle] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [interest, setInterest] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xHandle,
          walletAddress,
          interest,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Submission failed");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[var(--void-black)] text-white overflow-x-hidden">
      {/* Background glow */}
      <motion.div
        style={{ y: backgroundY }}
        className="fixed inset-0 z-0 pointer-events-none"
      >
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[160px] bg-[var(--brand-primary)]/10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[140px] bg-[var(--brand-primary)]/5" />
      </motion.div>

      {/* Subtle grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(104,172,110,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(104,172,110,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <img
            src="/character/super-router.png"
            alt="SuperRouter"
            className="w-8 h-8 object-contain"
          />
          <span className="text-lg font-black tracking-tight">SUPERROUTER</span>
        </div>
        <a
          href="https://x.com/SuperRoutersol"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <Twitter className="w-4 h-4" />
          <span className="hidden md:inline">@SuperRoutersol</span>
        </a>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-8"
          >
            <img
              src="/character/super-router.png"
              alt="SuperRouter"
              className="w-32 h-32 md:w-48 md:h-48 mx-auto object-contain drop-shadow-[0_0_40px_rgba(104,172,110,0.35)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-mono uppercase tracking-widest"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]" />
            </span>
            Coming soon
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6"
          >
            The autonomous
            <br />
            <span className="text-[var(--brand-primary)]">trading agent</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="h-8 md:h-10 mb-8 flex items-center justify-center"
          >
            <span className="text-lg md:text-2xl text-white/60 font-mono">
              <ScrambleText text="Built for Solana. Powered by AI." speed={40} />
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            SuperRouter scans, analyzes, and executes trades on-chain — 24/7. No
            emotions. No sleep. Just alpha.
          </motion.p>

          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            href="/v1"
            className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-mono uppercase tracking-widest hover:bg-[var(--brand-primary)]/20 transition-colors"
          >
            View V1 proof of work
            <ArrowRight className="w-3 h-3" />
          </motion.a>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#waitlist"
              className="group flex items-center gap-2 px-8 py-4 bg-[var(--brand-primary)] text-[var(--void-black)] rounded-full font-semibold text-sm uppercase tracking-widest hover:bg-[var(--brand-primary-light)] transition-colors"
            >
              Join the waitlist
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#sneak-peek"
              className="px-8 py-4 border border-white/20 text-white rounded-full font-semibold text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Sneak peek
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-[1px] h-10 bg-gradient-to-b from-[var(--brand-primary)] to-transparent"
          />
        </motion.div>
      </section>

      {/* Sneak Peek */}
      <section id="sneak-peek" className="relative z-10 py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-[var(--brand-primary)] text-xs font-mono uppercase tracking-[0.2em] mb-4 block">
              Sneak peek
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              What we are cooking
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              A glimpse of the tools that will power the next generation of Solana traders.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "AI market analysis",
                description:
                  "Real-time sentiment, on-chain signals, and token scoring distilled into actionable insights.",
              },
              {
                icon: Zap,
                title: "Autonomous execution",
                description:
                  "Set your strategy and let SuperRouter execute trades around the clock with sub-second reactions.",
              },
              {
                icon: Shield,
                title: "Risk-first positioning",
                description:
                  "Dynamic stop-losses, position sizing, and drawdown guards built into every decision.",
              },
              {
                icon: Rocket,
                title: "New launch radar",
                description:
                  "Early detection of high-momentum tokens before they hit the mainstream timeline.",
              },
              {
                icon: Wallet,
                title: "Portfolio intelligence",
                description:
                  "Unified PnL, holding history, and wallet analytics across every position.",
              },
              {
                icon: Twitter,
                title: "Social alpha layer",
                description:
                  "Track smart wallets and key voices to surface narratives as they form.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group p-6 md:p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[var(--brand-primary)]/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="relative z-10 py-24 md:py-32 px-6">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-[var(--brand-primary)] text-xs font-mono uppercase tracking-[0.2em] mb-4 block">
              Limited early access
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              Join the movement
            </h2>
            <p className="text-white/50">
              Drop your X handle and/or Solana wallet. We will reach out when early access goes live.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="p-6 md:p-10 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm"
          >
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center mb-6">
                    <Check className="w-8 h-8 text-[var(--brand-primary)]" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">You are on the list</h3>
                  <p className="text-white/60 mb-6">
                    Thank you for your interest. We will be in touch soon with early access details.
                  </p>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-mono uppercase tracking-widest">
                    Coming soon
                  </span>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Twitter className="w-3 h-3" />
                      X / Twitter handle
                    </label>
                    <input
                      type="text"
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      placeholder="@username"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Wallet className="w-3 h-3" />
                      Solana wallet
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Your SOL address (optional)"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-widest text-white/40">
                      What are you most interested in?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setInterest(option)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                            interest === option
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/20 text-[var(--brand-primary-light)]"
                              : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {status === "error" && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-400"
                    >
                      {errorMessage}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-[var(--brand-primary)] text-[var(--void-black)] rounded-xl font-semibold text-sm uppercase tracking-widest hover:bg-[var(--brand-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Reserve my spot"
                    )}
                  </button>

                  <p className="text-[10px] text-white/30 text-center">
                    No spam. Wallet is optional and never shared.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <img
              src="/character/super-router.png"
              alt="SuperRouter"
              className="w-5 h-5 object-contain opacity-60"
            />
            <span>SuperRouter — Built for the Solana ecosystem.</span>
          </div>
          <a
            href="https://x.com/SuperRoutersol"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-[var(--brand-primary)] transition-colors"
          >
            <Twitter className="w-5 h-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
