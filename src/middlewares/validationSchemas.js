import { z } from "zod";

// Validação para criação de usuário (POST /users)
export const createUserSchema = z.object({
  body: z.object({
    nome: z
      .string({ error: "Campo obrigatório" })
      .min(1, "Nome é obrigatório"),
    email: z
      .string({ error: "Campo obrigatório" })
      .email("Formato de e-mail inválido"),
    senha: z
      .string({ error: "Campo obrigatório" })
      .min(6, "A senha deve ter no mínimo 6 caracteres"),
    username: z.string().optional().nullable(),
    tipo: z.enum(["MOTORISTA", "RESPONSAVEL"]).optional(),
    telefone: z.string().optional().nullable(),
    cnh: z.string().optional().nullable(),
    placaVeiculo: z.string().optional().nullable(),
    chavePix: z.string().optional().nullable(),
    titularPix: z.string().optional().nullable(),
    capacidadeVan: z.coerce
      .number()
      .int()
      .positive("A capacidade da van deve ser um número positivo")
      .optional()
      .nullable(),
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
