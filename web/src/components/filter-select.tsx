"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Labelled single-choice select over string options (value -> label). */
export function OptionSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  ariaLabel?: string;
  className?: string;
  id?: string;
}) {
  return (
    <Select items={options} value={value} onValueChange={(next) => next !== null && onChange(String(next))}>
      <SelectTrigger id={id} className={className ?? "w-full"} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Options for a filter: "All …" plus each enum value with its label. */
export function filterOptions(allLabel: string, values: readonly string[], labelFor: (v: string) => string) {
  return { ALL: allLabel, ...Object.fromEntries(values.map((v) => [v, labelFor(v)])) };
}
