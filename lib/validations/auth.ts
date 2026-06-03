import { z } from "zod";

// Validation messages are stable keys ("errors.validation.*"). Each form
// passes the key through `useTranslations("errors")` so the user sees
// the field error in their profile language. Keeping the keys here
// (rather than the translated phrase) means the schema is the same
// object whatever locale renders it.
export const emailSchema = z
  .string()
  .min(1, "errors.validation.emailRequired")
  .email("errors.validation.emailInvalid");

export const passwordSchema = z
  .string()
  .min(8, "errors.validation.passwordMin")
  .max(72, "errors.validation.passwordMax");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "errors.validation.passwordRequired"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "errors.validation.nameMin")
      .max(60, "errors.validation.nameMax"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "errors.validation.confirmRequired"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({
        message: "errors.validation.acceptTerms",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "errors.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "errors.validation.confirmRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "errors.validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
