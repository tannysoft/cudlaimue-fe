import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lineAuthUrl } from "@/lib/auth/line";
import { newId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/account";
  const state = newId("st");
  const nonce = newId("nc");

  const jar = await cookies();
  jar.set("line_oauth_state", JSON.stringify({ state, nonce, next }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${new URL(req.url).origin}/api/auth/line/callback`;
  return NextResponse.redirect(lineAuthUrl(state, redirectUri, nonce));
}
