import { Pool } from "@neondatabase/serverless";

const photos = [
["cb74ad56-069e-438a-a25a-30e2a140ac1d","Adrian Pantoja","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/cb74ad56-069e-438a-a25a-30e2a140ac1d-1788387762594.png"],
["d03d836b-e24a-4d8b-b15c-93ecd507b0cc","Bao Nguyen","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/d03d836b-e24a-4d8b-b15c-93ecd507b0cc-1788387766246.png"],
["b0715854-c262-4d3a-bbdf-c31ae3a339dd","Da'Juan","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/b0715854-c262-4d3a-bbdf-c31ae3a339dd-1788648827482.png"],
["ee3a122f-8dad-43cd-ac89-a0a07f205f90","Donavan Richardson","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/ee3a122f-8dad-43cd-ac89-a0a07f205f90-1788387772283.png"],
["b9d0c757-7fe7-4521-b5cb-09d06aaa64a8","Elijah","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/b9d0c757-7fe7-4521-b5cb-09d06aaa64a8-1788387779354.png"],
["7e6eb0dc-3420-444b-8108-184274c404c8","Eric Perez","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/7e6eb0dc-3420-444b-8108-184274c404c8-1788387789649.png"],
["08680303-593d-4d30-9581-1414db60e486","Joe Mooney","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/08680303-593d-4d30-9581-1414db60e486-1788387798178.png"],
["62326f08-6959-4222-a1ec-a550da55c7be","Justin","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/62326f08-6959-4222-a1ec-a550da55c7be-1788408179905.png"],
["4cfe44b0-ae9d-4fad-9e71-73d207fe61d0","Kay","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/4cfe44b0-ae9d-4fad-9e71-73d207fe61d0-1788353072936.png"],
["f982250b-bc56-4875-b250-72ce0752c52b","Matt","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/f982250b-bc56-4875-b250-72ce0752c52b-1788387819272.png"],
["c98f206d-291c-4a9c-a483-f01f07d1701c","Mekhai Ryan","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/c98f206d-291c-4a9c-a483-f01f07d1701c-1788387827165.png"],
["54f1ff26-1c88-4d3d-86d6-478ff5434d23","Mia","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/54f1ff26-1c88-4d3d-86d6-478ff5434d23-1788387832285.png"],
["45d2aafe-6d5a-46f2-b368-49d66ec6d8de","Michael Cunningham","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/45d2aafe-6d5a-46f2-b368-49d66ec6d8de-1788408187562.png"],
["1aa6a508-ade5-48a6-a971-f2df664aa2dd","Nohl","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/1aa6a508-ade5-48a6-a971-f2df664aa2dd-1788387840982.png"],
["05e6ee05-fc7d-4443-b146-0be3a19a170e","Robert Wardell","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/05e6ee05-fc7d-4443-b146-0be3a19a170e-1788387846482.png"],
["95a9f336-14ba-4f15-a58a-d4135150afaf","Shemar","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/95a9f336-14ba-4f15-a58a-d4135150afaf-1788408165142.png"],
["393e6982-2af0-4953-a371-88f81d71bd39","Stephen","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/393e6982-2af0-4953-a371-88f81d71bd39-1788408169569.png"],
["910fd5e3-c3ab-47e4-bfe7-f9358df4d83b","Tawana Destave","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/910fd5e3-c3ab-47e4-bfe7-f9358df4d83b-1788387858965.png"],
["2a8fa067-8368-41be-9101-cb64b0f7ad22","Toom","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/2a8fa067-8368-41be-9101-cb64b0f7ad22-1788387861759.png"],
["d3bb634d-d705-4780-ad58-c4d5397ee9f6","Vanessa","https://mutmlcoajwqpuzcmvoal.supabase.co/storage/v1/object/public/player-photos/d3bb634d-d705-4780-ad58-c4d5397ee9f6-1788387864363.png"]
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing");
const pool = new Pool({ connectionString });
let ok=0, failed=0;

for (const [id,name,url] of photos) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.log("[PHOTO_RECOVERY]", name, "HTTP", res.status);
      failed++;
      continue;
    }
    const mime = res.headers.get("content-type") || "image/png";
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) throw new Error("empty image");
    await pool.query(
      `insert into player_photos(player_id,mime_type,data,updated_at)
       values($1,$2,$3,now())
       on conflict(player_id) do update
       set mime_type=excluded.mime_type,data=excluded.data,updated_at=now()`,
      [id,mime,bytes],
    );
    await pool.query(
      `update players set image_url=$2,updated_at=now() where id=$1`,
      [id,`/api/player-photo/${id}?v=recovered`],
    );
    console.log("[PHOTO_RECOVERY]", name, bytes.length, mime);
    ok++;
  } catch (err) {
    console.log("[PHOTO_RECOVERY]", name, "ERROR", err?.message || err);
    failed++;
  }
}
console.log("[PHOTO_RECOVERY_SUMMARY]", JSON.stringify({ok,failed,total:photos.length}));
await pool.end();
