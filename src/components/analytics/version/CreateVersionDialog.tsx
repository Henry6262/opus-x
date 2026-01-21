/**
 * CreateVersionDialog Component
 *
 * Modal dialog for creating a new agent version.
 * Captures version metadata and whether to activate immediately.
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Loader2 } from 'lucide-react';
import type { CreateVersionRequest } from '@/types/versioning';
import type { TradingConfig } from '@/features/smart-trading/types';

interface CreateVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (req: CreateVersionRequest) => Promise<void>;
  currentConfig: TradingConfig | null;
}

/**
 * CreateVersionDialog - Form for creating new agent versions
 *
 * @example
 * ```tsx
 * <CreateVersionDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onCreate={async (req) => {
 *     await createVersion(req);
 *     setShowDialog(false);
 *   }}
 *   currentConfig={tradingConfig}
 * />
 * ```
 */
export function CreateVersionDialog({
  isOpen,
  onClose,
  onCreate,
  currentConfig,
}: CreateVersionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    versionCode: '',
    versionName: '',
    description: '',
    activate: true,
    createdBy: '',
    notes: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.versionCode.trim() || !formData.versionName.trim()) {
      setError('Version code and name are required');
      return;
    }

    if (!currentConfig) {
      setError('No trading config available');
      return;
    }

    try {
      setLoading(true);

      const request: CreateVersionRequest = {
        versionCode: formData.versionCode.trim(),
        versionName: formData.versionName.trim(),
        description: formData.description.trim() || undefined,
        configSnapshot: currentConfig,
        activate: formData.activate,
        createdBy: formData.createdBy.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await onCreate(request);

      // Reset form
      setFormData({
        versionCode: '',
        versionName: '',
        description: '',
        activate: true,
        createdBy: '',
        notes: '',
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="
              fixed inset-0 z-50
              flex items-center justify-center
              p-4
            "
          >
            <div
              className="
                bg-[#0a0a0a]
                border border-white/[0.1]
                rounded-2xl
                shadow-2xl
                max-w-md w-full
                max-h-[90vh]
                overflow-y-auto
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#68ac6e]/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-[#68ac6e]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Create New Version
                    </h3>
                    <p className="text-xs text-white/50">
                      Snapshot current config
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-[#ff0033]/10 border border-[#ff0033]/30 rounded-lg">
                    <p className="text-sm text-[#ff0033]">{error}</p>
                  </div>
                )}

                {/* Version Code */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Version Code <span className="text-[#ff0033]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.versionCode}
                    onChange={(e) =>
                      setFormData({ ...formData, versionCode: e.target.value })
                    }
                    placeholder="e.g., v1.2.0"
                    className="
                      w-full px-4 py-2
                      bg-white/[0.03]
                      border border-white/[0.1]
                      rounded-lg
                      text-white
                      placeholder:text-white/30
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                    "
                    disabled={loading}
                  />
                </div>

                {/* Version Name */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Version Name <span className="text-[#ff0033]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.versionName}
                    onChange={(e) =>
                      setFormData({ ...formData, versionName: e.target.value })
                    }
                    placeholder="e.g., Aggressive TP Strategy"
                    className="
                      w-full px-4 py-2
                      bg-white/[0.03]
                      border border-white/[0.1]
                      rounded-lg
                      text-white
                      placeholder:text-white/30
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                    "
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="What changed in this version?"
                    rows={3}
                    className="
                      w-full px-4 py-2
                      bg-white/[0.03]
                      border border-white/[0.1]
                      rounded-lg
                      text-white
                      placeholder:text-white/30
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                      resize-none
                    "
                    disabled={loading}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes or context"
                    rows={2}
                    className="
                      w-full px-4 py-2
                      bg-white/[0.03]
                      border border-white/[0.1]
                      rounded-lg
                      text-white
                      placeholder:text-white/30
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                      resize-none
                    "
                    disabled={loading}
                  />
                </div>

                {/* Created By */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Created By
                  </label>
                  <input
                    type="text"
                    value={formData.createdBy}
                    onChange={(e) =>
                      setFormData({ ...formData, createdBy: e.target.value })
                    }
                    placeholder="Your email or name"
                    className="
                      w-full px-4 py-2
                      bg-white/[0.03]
                      border border-white/[0.1]
                      rounded-lg
                      text-white
                      placeholder:text-white/30
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                    "
                    disabled={loading}
                  />
                </div>

                {/* Activate checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="activate"
                    checked={formData.activate}
                    onChange={(e) =>
                      setFormData({ ...formData, activate: e.target.checked })
                    }
                    className="
                      w-4 h-4
                      rounded
                      border-white/[0.2]
                      bg-white/[0.03]
                      text-[#68ac6e]
                      focus:ring-2
                      focus:ring-[#68ac6e]/50
                    "
                    disabled={loading}
                  />
                  <label htmlFor="activate" className="text-sm text-white/70">
                    Activate this version immediately
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="
                      flex-1 px-4 py-2
                      bg-white/[0.05] hover:bg-white/[0.08]
                      border border-white/[0.1]
                      rounded-lg
                      text-white text-sm font-medium
                      transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      flex-1 px-4 py-2
                      bg-[#68ac6e] hover:bg-[#4a8050]
                      rounded-lg
                      text-white text-sm font-medium
                      transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2
                    "
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Version
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
