import { Input } from "@/components/ui";
import type { FetchTokensParams, TwitterLinkType } from "../types";

const LINK_TYPE_OPTIONS: Array<{ label: string; value: TwitterLinkType | "all" }> = [
  { label: "All Types", value: "all" },
  { label: "Tweet", value: "tweet" },
  { label: "Profile", value: "profile" },
  { label: "Community", value: "community" },
  { label: "Search", value: "search" },
  { label: "Unknown", value: "unknown" },
];

const LABEL_STATUS_OPTIONS = [
  { label: "All Labels", value: "all" },
  { label: "Labeled", value: "labeled" },
  { label: "Unlabeled", value: "unlabeled" },
  { label: "Needs Review", value: "needs_review" },
];

interface FiltersBarProps {
  filters: FetchTokensParams;
  onChange: (filters: Partial<FetchTokensParams>) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-[2fr_1fr_1fr]">
      <Input
        placeholder="Search mint, symbol, or name"
        value={filters.search || ""}
        onChange={(event) => onChange({ search: event.target.value })}
      />
      <select
        className="h-10 rounded-md border border-white/15 bg-black/40 px-3 text-sm text-white"
        value={filters.twitterLinkType || "all"}
        onChange={(event) =>
          onChange({ twitterLinkType: event.target.value as TwitterLinkType | "all" })
        }
      >
        {LINK_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className="h-10 rounded-md border border-white/15 bg-black/40 px-3 text-sm text-white"
        value={filters.labelStatus || "all"}
        onChange={(event) =>
          onChange({
            labelStatus: event.target.value as FetchTokensParams["labelStatus"],
          })
        }
      >
        {LABEL_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
