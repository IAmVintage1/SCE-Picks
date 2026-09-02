import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

const BUCKET = "player-photos";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const playerId = formData.get("playerId") as string | null;

  if (!file || !playerId) {
    return NextResponse.json(
      { error: "A file and playerId are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();

  const { data: player } = await supabase
    .from("players")
    .select("image_url")
    .eq("id", playerId)
    .single();

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${playerId}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: updated, error: updateError } = await supabase
    .from("players")
    .update({
      image_url: publicUrl.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Clean up the previous photo file if one existed, so storage doesn't
  // accumulate orphaned images every time a photo is replaced.
  if (player?.image_url) {
    const oldPath = player.image_url.split(`${BUCKET}/`)[1];
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }
  }

  return NextResponse.json({ player: updated });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const { playerId } = await req.json();
  const supabase = createAdminSupabase();

  const { data: player } = await supabase
    .from("players")
    .select("image_url")
    .eq("id", playerId)
    .single();

  if (player?.image_url) {
    const oldPath = player.image_url.split(`${BUCKET}/`)[1];
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  const { error } = await supabase
    .from("players")
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq("id", playerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
