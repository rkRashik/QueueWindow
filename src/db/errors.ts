export function isUniqueViolation(
  error: unknown,
  ...constraints: string[]
): boolean {
  if (!(error instanceof Error)) return false;
  if ("code" in error && error.code === "23505" && "constraint" in error) {
    return (
      typeof error.constraint === "string" &&
      constraints.includes(error.constraint)
    );
  }
  return isUniqueViolation(error.cause, ...constraints);
}
