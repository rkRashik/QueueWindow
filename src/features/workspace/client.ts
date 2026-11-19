export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      typeof data?.error === "string"
        ? data.error
        : "Couldn’t complete that request. Try again.",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export function jsonRequest(method: string, data?: object): RequestInit {
  return {
    method,
    ...(data && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  };
}

export type Wire<T> = T extends Date
  ? string
  : T extends object
    ? { [Key in keyof T]: Wire<T[Key]> }
    : T;
