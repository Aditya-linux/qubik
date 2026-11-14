import type { ThemeId } from "./types";

export const THEME_OPTIONS: {
  id: ThemeId;
  label: string;
}[] = [
  { id: "ai", label: "AI & software" },
  { id: "big_tech", label: "Large-cap tech" },
  { id: "clean_energy", label: "Clean energy" },
  { id: "space", label: "Aerospace" },
  { id: "even", label: "Diversified" },
  { id: "surprise", label: "Randomized" },
];

export const EXCLUSION_CHIPS = [
  { id: "energy", label: "Energy" },
  { id: "finance", label: "Finance" },
  { id: "health", label: "Healthcare" },
  { id: "space", label: "Aerospace" },
  { id: "tech", label: "Tech overlap" },
];

export function themeLabel(id: ThemeId): string {
  return THEME_OPTIONS.find((t) => t.id === id)?.label ?? id;
}
