import { z } from "zod";

// Validação para criação de usuário
export const createUserSchema = z.object({
  body: z.object({
    username: z
      .string({ error: "Campo obrigatório" })
      .min(1, "Campo obrigatório"),
    email: z
      .string({ error: "Campo obrigatório" })
      .email("Formato de e-mail inválido"),
  }),
});

// Validação de parâmetro :userId (UUID v4)
export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid("Identificador inválido (UUID v4 esperado)"),
  }),
});

// Validação para criação de mensagem
export const createMessageSchema = z.object({
  body: z.object({
    text: z
      .string({ error: "Campo obrigatório" })
      .min(1, "Campo obrigatório")
      .max(1000, "O texto não pode exceder 1000 caracteres"),
  }),
});

// Validação de parâmetro :messageId (UUID v4)
export const messageIdParamSchema = z.object({
  params: z.object({
    messageId: z.string().uuid("Identificador inválido (UUID v4 esperado)"),
  }),
});
