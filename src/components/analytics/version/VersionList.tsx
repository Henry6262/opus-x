/**
 * VersionList Component - REDESIGNED
 *
 * Modern card-based layout with better visual hierarchy and animations.
 * Compact and way more visually appealing!
 */

import { motion } from 'motion/react';
import { Check, Calendar, User, Play, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import type { AgentVersion } from '@/types/versioning';

interface VersionListProps {
  versions: AgentVersion[];
  onActivate: (versionId: string) => Promise<void>;
  onViewConfig?: (version: AgentVersion) => void;
  loading?: boolean;
}

/**
 * VersionList - Modern card-based version management
 */
export function VersionList({
  versions,
  onActivate,
  onViewConfig,
  loading = false,
}: VersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="
        bg-gradient-to-br from-white/[0.08] to-white/[0.02]
        backdrop-blur-xl
        border border-white/[0.12]
        rounded-2xl p-12 text-center
      ">
        <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/60 font-medium">No versions available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {versions.map((version, index) => (
        <motion.div
          key={version.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="
            relative group
            rounded-2xl overflow-hidden
            bg-gradient-to-br from-white/[0.08] to-white/[0.02]
            backdrop-blur-xl
            border border-white/[0.12]
            p-5
          "
          whileHover={{
            scale: 1.02,
            borderColor: 'rgba(255,255,255,0.2)',
          }}
        >
          {/* Active Indicator Glow */}
          {version.isActive && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 30% 20%, #68ac6e30, transparent 70%)'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />
          )}

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-bold text-white">
                    {version.versionName}
                  </h4>
                  {version.isActive && (
                    <motion.span
                      className="
                        inline-flex items-center gap-1 px-2 py-0.5
                        rounded-full bg-[#68ac6e]/20 text-[#68ac6e]
                        text-xs font-black
                      "
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Check className="w-3 h-3" />
                      ACTIVE
                    </motion.span>
                  )}
                </div>
                <span className="text-sm text-white/40 font-mono">
                  {version.versionCode}
                </span>
              </div>
            </div>

            {/* Description */}
            {version.description && (
              <p className="text-sm text-white/60 mb-3 leading-relaxed">
                {version.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {format(new Date(version.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
              {version.createdBy && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{version.createdBy}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {version.notes && (
              <div className="mb-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                <p className="text-xs text-white/50 leading-relaxed">
                  <span className="font-bold text-white/70">Notes:</span> {version.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onViewConfig && (
                <motion.button
                  onClick={() => onViewConfig(version)}
                  className="
                    flex-1 px-4 py-2
                    text-xs font-bold
                    text-white/70 hover:text-white
                    bg-white/[0.05] hover:bg-white/[0.08]
                    border border-white/[0.12]
                    rounded-xl
                    transition-all duration-200
                  "
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Config
                </motion.button>
              )}

              {!version.isActive && (
                <motion.button
                  onClick={() => onActivate(version.id)}
                  disabled={loading}
                  className="
                    flex-1 flex items-center justify-center gap-2
                    px-4 py-2
                    text-xs font-black
                    text-white
                    bg-gradient-to-r from-[#68ac6e] to-[#4a8050]
                    hover:from-[#4a8050] hover:to-[#68ac6e]
                    rounded-xl
                    shadow-lg shadow-[#68ac6e]/30
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Activate
                </motion.button>
              )}
            </div>
          </div>

          {/* Hover Gradient Border */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${version.isActive ? '#68ac6e' : '#3b82f6'}40, transparent 50%, ${version.isActive ? '#68ac6e' : '#3b82f6'}20)`,
              opacity: 0,
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  );
}
