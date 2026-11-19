import { signup } from "@/features/auth/service";
import { setSessionCookie } from "@/features/auth/session";
import { signupInput } from "@/features/auth/validation";
import {
  assertSameOrigin,
  failure,
  HttpError,
  json,
  readJson,
} from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = signupInput.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new HttpError(
        "Check the workspace name, full name, username, email, and password.",
        400,
      );
    }

    const token = await signup(parsed.data);
    return setSessionCookie(json({ ok: true }, 201), token);
  } catch (error) {
    return failure(error);
  }
}
