import { GENERATED_TEAM_IMAGES } from "@/lib/generatedTeamImages";

export function getLocalTeamLogo(team: "youngknights" | "alumknights") {
  return GENERATED_TEAM_IMAGES[team] ?? null;
}
