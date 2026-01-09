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
    <div className="filters-bar">
      <Input
        placeholder="Search mint, symbol, or name"
        value={filters.search || ""}
        onChange={(event) => onChange({ search: event.target.value })}
        className="filters-input"
      />
      <select
        className="filters-select"
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
        className="filters-select"
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
