"use client";

import { useState, useCallback } from "react";
import type {
  SubmissionState,
  SubmissionFormData,
  SubmissionAnalysisData,
  SubmissionStep,
} from "../types";
import {
  fetchTokenData,
  fetchWalletTrades,
  createSubmission,
} from "../service";

const INITIAL_STATE: SubmissionState = {
  step: "form",
  formData: null,
  tokenData: null,
  tradeData: null,
  twitterData: null,
  analysisData: {},
  error: null,
};

export function useSubmission() {
  const [state, setState] = useState<SubmissionState>(INITIAL_STATE);

  const setStep = useCallback((step: SubmissionStep) => {
    setState((prev) => ({ ...prev, step, error: null }));
  }, []);

  const analyze = useCallback(async (formData: SubmissionFormData) => {
    setState((prev) => ({ ...prev, step: "fetching", formData, error: null }));

    try {
      const [tokenRes, tradeRes] = await Promise.all([
        fetchTokenData(formData.token_mint),
        fetchWalletTrades(
          formData.traded_wallet_address,
          formData.token_mint
        ),
      ]);

      if (!tokenRes.success) {
        setState((prev) => ({
          ...prev,
          step: "error",
          error: tokenRes.error,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        step: "results",
        tokenData: tokenRes.data,
        tradeData: tradeRes.success ? tradeRes.data : null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        step: "error",
        error: err instanceof Error ? err.message : "Failed to fetch data",
      }));
    }
  }, []);

  const updateAnalysis = useCallback((data: Partial<SubmissionAnalysisData>) => {
    setState((prev) => ({
      ...prev,
      analysisData: { ...prev.analysisData, ...data },
    }));
  }, []);

  const submit = useCallback(
    async (walletAddress: string) => {
      if (!state.formData || !state.tokenData) return;

      setState((prev) => ({ ...prev, step: "submitting" }));

      try {
        const res = await createSubmission({
          wallet_address: walletAddress,
          traded_wallet_address: state.formData.traded_wallet_address,
          token_mint: state.formData.token_mint,
          token_data: state.tokenData,
          trade_data: state.tradeData!,
          twitter_data: state.twitterData,
          analysis: state.analysisData,
        });

        if (!res.success) {
          setState((prev) => ({ ...prev, step: "error", error: res.error }));
          return;
        }

        setState((prev) => ({ ...prev, step: "success" }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          step: "error",
          error: err instanceof Error ? err.message : "Submission failed",
        }));
      }
    },
    [state.formData, state.tokenData, state.tradeData, state.twitterData, state.analysisData]
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    setStep,
    analyze,
    updateAnalysis,
    submit,
    reset,
  };
}
