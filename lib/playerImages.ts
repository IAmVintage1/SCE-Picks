import { GENERATED_PLAYER_IMAGES } from "@/lib/generatedPlayerImages";

function normalizePlayerName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ALIASES: Record<string, string> = {
  adrian: "adrian pantoja",
  bao: "bao nguyen",
  "da juan": "dajuan",
  donavon: "donavan richardson",
  donavan: "donavan richardson",
  drich: "donavan richardson",
  eric: "eric perez",
  joe: "joe mooney",
  "kai mattox": "mekhai ryan",
  mekhai: "mekhai ryan",
  mikey: "michael cunningham",
  robert: "robert wardell",
  tay: "tawana destave",
  tawana: "tawana destave",
};

export function getLocalPlayerImage(name: string): string | null {
  const normalized = normalizePlayerName(name);
  const canonical = ALIASES[normalized] ?? normalized;
  return GENERATED_PLAYER_IMAGES[canonical] ?? null;
}
