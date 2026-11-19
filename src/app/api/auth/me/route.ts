import { getCurrentIdentity } from "@/features/auth/session";
import { failure, HttpError, json } from "@/lib/http";

export async function GET() {
  try {
    const identity = await getCurrentIdentity();
    if (!identity) throw new HttpError("Sign in to view your workspace.", 401);
    return json(identity);
  } catch (error) {
    return failure(error);
  }
}
