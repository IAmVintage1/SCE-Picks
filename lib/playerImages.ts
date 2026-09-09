const LOCAL_PLAYER_IMAGE_IDS = new Set([
  "cb74ad56-069e-438a-a25a-30e2a140ac1d",
  "f982250b-bc56-4875-b250-72ce0752c52b",
  "b9d0c757-7fe7-4521-b5cb-09d06aaa64a8",
  "54f1ff26-1c88-4d3d-86d6-478ff5434d23",
  "b0715854-c262-4d3a-bbdf-c31ae3a339dd",
  "7e6eb0dc-3420-444b-8108-184274c404c8",
  "910fd5e3-c3ab-47e4-bfe7-f9358df4d83b",
  "1aa6a508-ade5-48a6-a971-f2df664aa2dd",
  "d03d836b-e24a-4d8b-b15c-93ecd507b0cc",
  "08680303-593d-4d30-9581-1414db60e486",
  "d3bb634d-d705-4780-ad58-c4d5397ee9f6",
  "393e6982-2af0-4953-a371-88f81d71bd39",
  "05e6ee05-fc7d-4443-b146-0be3a19a170e",
  "ee3a122f-8dad-43cd-ac89-a0a07f205f90",
  "45d2aafe-6d5a-46f2-b368-49d66ec6d8de",
  "62326f08-6959-4222-a1ec-a550da55c7be",
  "95a9f336-14ba-4f15-a58a-d4135150afaf",
  "2a8fa067-8368-41be-9101-cb64b0f7ad22",
  "4cfe44b0-ae9d-4fad-9e71-73d207fe61d0",
  "c98f206d-291c-4a9c-a483-f01f07d1701c",
]);

export function getPlayerImageUrl(
  playerId: string,
  fallback: string | null = null,
) {
  if (LOCAL_PLAYER_IMAGE_IDS.has(playerId)) {
    return `/players/${playerId}.webp`;
  }

  return fallback;
}
