import {
  assertLocalRequest,
  destroySession,
  errorResponse,
  getSession,
  login,
  noStoreJson,
  readJson,
  rotateSession,
  sessionCookie,
  sessionMetadata,
} from "@/lib/server/session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    return noStoreJson(sessionMetadata(getSession(request, false)));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    const body = await readJson(request, 2048);
    if (body.action === "unlock") {
      const session = login(body.password);
      const previous = getSession(request, false);
      if (previous) destroySession(previous);
      return noStoreJson(sessionMetadata(session), 200, {
        "Set-Cookie": sessionCookie(session, request),
      });
    }
    const current = getSession(request)!;
    if (body.action === "refresh") {
      const session = rotateSession(current);
      return noStoreJson(sessionMetadata(session), 200, {
        "Set-Cookie": sessionCookie(session, request),
      });
    }
    if (body.action === "lock") {
      destroySession(current);
      return noStoreJson(sessionMetadata(), 200, {
        "Set-Cookie": sessionCookie(null, request),
      });
    }
    return noStoreJson({ error: "Unknown session action." }, 400);
  } catch (error) {
    return errorResponse(error);
  }
}
