import { login } from "@/features/auth/service";
import { setSessionCookie } from "@/features/auth/session";
import { loginInput } from "@/features/auth/validation";
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
    const parsed = loginInput.safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError("Enter a valid email or username and password.", 400);

    const token = await login(parsed.data);
    return setSessionCookie(json({ ok: true }), token);
  } catch (error) {
    return failure(error);
  }
}
