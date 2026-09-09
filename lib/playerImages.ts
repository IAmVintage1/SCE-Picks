const PLAYER_IMAGES: Record<string, string> = {
  adrianpantoja: "/players/adrian-pantoja.svg",
  baonguyen: "/players/bao-nguyen.svg",
  dajuan: "/players/dajuan.svg",
  donavanrichardson: "/players/donavan-richardson.svg",
  drich: "/players/donavan-richardson.svg",
  elijah: "/players/elijah.svg",
  ericperez: "/players/eric-perez.svg",
  joemooney: "/players/joe-mooney.svg",
  justin: "/players/justin.svg",
  kay: "/players/kay.svg",
  matt: "/players/matt.svg",
  mekhairyan: "/players/mekhai-ryan.svg",
  kaimattox: "/players/mekhai-ryan.svg",
  mia: "/players/mia.svg",
  michaelcunningham: "/players/michael-cunningham.svg",
  mikey: "/players/michael-cunningham.svg",
  nohl: "/players/nohl.svg",
  robertwardell: "/players/robert-wardell.svg",
  shemar: "/players/shemar.svg",
  stephen: "/players/stephen.svg",
  tawanadestave: "/players/tawana-destave.svg",
  taydestave: "/players/tawana-destave.svg",
  tay: "/players/tawana-destave.svg",
  toom: "/players/toom.svg",
  vanessa: "/players/vanessa.svg",
};

function playerImageKey(name: string) {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function getLocalPlayerImageUrl(name: string | null | undefined) {
  if (!name) return null;
  return PLAYER_IMAGES[playerImageKey(name)] ?? null;
}
