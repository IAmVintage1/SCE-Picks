import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAdminSupabase } from "@/lib/supabase/admin";

const BUCKET = "player-photos";

/**
 * Photo uploads intentionally do NOT pass the image file through the
 * Vercel/Next.js request body. Vercel Functions have a request-body
 * limit, which caused 413 Content Too Large errors for larger photos.
 *
 * Flow:
 *  1. Browser asks this route for a signed upload URL.
 *  2. Browser uploads the image directly to Supabase Storage.
 *  3. Browser calls this route again to save image_url on the player.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const supabase = createAdminSupabase();

  // Step 1: Create a signed upload URL. This request contains only
  // metadata, not the actual image file.
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const action = body?.action;
    const playerId = body?.playerId as string | undefined;

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required." },
        { status: 400 }
      );
    }

    if (action === "sign") {
      const fileName = String(body?.fileName ?? "photo.jpg");
      const extension =
        fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
        "jpg";

      // Keep the extension to make files easy to inspect in Storage.
      // The timestamp prevents collisions when replacing a photo.
      const path = `${playerId}-${Date.now()}.${extension}`;

      const { data, error } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUploadUrl(path);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        path,
        token: data.token,
      });
    }

    // Step 3: Save the public URL after the browser has uploaded
    // directly to Storage.
    if (action === "complete") {
      const path = String(body?.path ?? "");

      if (!path) {
        return NextResponse.json(
          { error: "path is required." },
          { status: 400 }
        );
      }

      // Only allow paths generated for this player. This prevents
      // an admin request from accidentally assigning another
      // player's photo to this player.
      if (!path.startsWith(`${playerId}-`)) {
        return NextResponse.json(
          { error: "Invalid photo path." },
          { status: 400 }
        );
      }

      const { data: player } = await supabase
        .from("players")
        .select("image_url")
        .eq("id", playerId)
        .single();

      // Verify that the uploaded object actually exists before
      // saving its URL to the player record.
      const slash = path.lastIndexOf("/");
      const folder = slash >= 0 ? path.slice(0, slash) : "";
      const fileName = slash >= 0 ? path.slice(slash + 1) : path;

      const { data: files, error: listError } =
        await supabase.storage
          .from(BUCKET)
          .list(folder, { search: fileName, limit: 100 });

      if (listError) {
        return NextResponse.json(
          { error: listError.message },
          { status: 500 }
        );
      }

      const exists = (files ?? []).some((file) => file.name === fileName);

      if (!exists) {
        return NextResponse.json(
          { error: "Upload was not found in Storage." },
          { status: 400 }
        );
      }

      const { data: publicUrl } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

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
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      // Remove the previous photo only after the new photo has
      // successfully uploaded and the DB points to the new one.
      if (player?.image_url) {
        const oldPath = player.image_url.split(`${BUCKET}/`)[1];
        if (oldPath && oldPath !== path) {
          await supabase.storage.from(BUCKET).remove([oldPath]);
        }
      }

      return NextResponse.json({ player: updated });
    }

    return NextResponse.json(
      { error: "Unknown upload action." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Use JSON metadata requests for photo uploads." },
    { status: 400 }
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: auth.status }
    );
  }

  const { playerId } = await req.json();
  const supabase = createAdminSupabase();

  const { data: player } = await supabase
    .from("players")
    .select("image_url")
    .eq("id", playerId)
    .single();

  if (player?.image_url) {
    const oldPath = player.image_url.split(`${BUCKET}/`)[1];
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }
  }

  const { error } = await supabase
    .from("players")
    .update({
      image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
