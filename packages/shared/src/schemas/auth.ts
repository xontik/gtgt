import { z } from 'zod';

export const authLoginSchema = z.object({
  passcode: z.string().min(1),
});
export type AuthLogin = z.infer<typeof authLoginSchema>;
