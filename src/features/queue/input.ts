import { z } from "zod";
import { newPassword, username } from "@/features/auth/validation";

export const id = z.uuid();
export const slug = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const name = z.string().trim().min(1).max(100);
const prefix = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,2}$/);
const idempotencyKey = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const counterId = id;

export const counterInput = z.strictObject({ name, prefix });
export const counterPatch = z
  .strictObject({
    name: name.optional(),
    prefix: prefix.optional(),
    status: z.enum(["OPEN", "PAUSED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0);

export const staffInput = z.strictObject({
  fullName: name,
  username,
  password: newPassword,
});
export const organizationPatch = z
  .strictObject({
    name: name.optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .toUpperCase()
      .optional(),
    logoUrl: z
      .url({ protocol: /^https$/ })
      .max(2048)
      .refine((value) => {
        if (!URL.canParse(value)) return false;
        const url = new URL(value);
        return !url.username && !url.password;
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0);

export const joinInput = z.strictObject({
  counterId,
  idempotencyKey: z.uuidv4(),
});
export const stateInput = z.strictObject({ counterId: counterId.optional() });
export const deskAction = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("ISSUE_WALKIN"),
    counterId,
    idempotencyKey,
  }),
  z.strictObject({ action: z.literal("CALL_NEXT"), counterId }),
  z.strictObject({ action: z.literal("COMPLETE"), counterId, ticketId: id }),
  z.strictObject({ action: z.literal("SKIP"), counterId, ticketId: id }),
  z.strictObject({ action: z.literal("RECALL"), counterId, ticketId: id }),
  z.strictObject({ action: z.literal("TOGGLE_PAUSE"), counterId }),
]);
