
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";

import {
  createUserSchema,
  userIdParamSchema,
  createMessageSchema,
  messageIdParamSchema,
} from "../../src/middlewares/validationSchemas.js";

describe("validationSchemas", () => {
  describe("createUserSchema", () => {
    it("deve aceitar um usuário com dados válidos", async () => {
      const dados = {
        body: {
          nome: "Paulo",
          email: "paulo@email.com",
          senha: "123456",
          tipo: "MOTORISTA",
          capacidadeVan: "15",
        },
      };

      const resultado = await createUserSchema.parseAsync(dados);

      assert.equal(resultado.body.nome, "Paulo");
      assert.equal(resultado.body.email, "paulo@email.com");
      assert.equal(resultado.body.tipo, "MOTORISTA");
      assert.equal(resultado.body.capacidadeVan, 15);
      assert.equal(typeof resultado.body.capacidadeVan, "number");
    });

    it("deve rejeitar usuário sem campos obrigatórios", async () => {
      const dados = {
        body: {
          username: "paulo",
        },
      };

      await assert.rejects(
        createUserSchema.parseAsync(dados),
        (error) => {
          assert.ok(error instanceof ZodError);

          const campos = error.issues.map((issue) =>
            issue.path.join(".")
          );

          assert.ok(campos.includes("body.nome"));
          assert.ok(campos.includes("body.email"));
          assert.ok(campos.includes("body.senha"));

          return true;
        }
      );
    });

    it("deve rejeitar e-mail inválido e senha com menos de 6 caracteres", async () => {
      const dados = {
        body: {
          nome: "Paulo",
          email: "email-invalido",
          senha: "123",
        },
      };

      await assert.rejects(
        createUserSchema.parseAsync(dados),
        (error) => {
          assert.ok(error instanceof ZodError);

          const campos = error.issues.map((issue) =>
            issue.path.join(".")
          );

          assert.ok(campos.includes("body.email"));
          assert.ok(campos.includes("body.senha"));

          return true;
        }
      );
    });

    it("deve aceitar campos opcionais e valores nulos", async () => {
      const dados = {
        body: {
          nome: "Paulo",
          email: "paulo@email.com",
          senha: "123456",
          username: null,
          telefone: null,
          cnh: null,
          placaVeiculo: null,
          chavePix: null,
          titularPix: null,
          capacidadeVan: null,
        },
      };

      const resultado = await createUserSchema.parseAsync(dados);

      assert.equal(resultado.body.username, null);
      assert.equal(resultado.body.telefone, null);
      assert.equal(resultado.body.cnh, null);
      assert.equal(resultado.body.placaVeiculo, null);
      assert.equal(resultado.body.chavePix, null);
      assert.equal(resultado.body.titularPix, null);
      assert.equal(resultado.body.capacidadeVan, null);
    });

    it("deve rejeitar tipo de usuário inválido e capacidade não positiva", async () => {
      const dados = {
        body: {
          nome: "Paulo",
          email: "paulo@email.com",
          senha: "123456",
          tipo: "ADMIN",
          capacidadeVan: "0",
        },
      };

      await assert.rejects(
        createUserSchema.parseAsync(dados),
        (error) => {
          assert.ok(error instanceof ZodError);

          const campos = error.issues.map((issue) =>
            issue.path.join(".")
          );

          assert.ok(campos.includes("body.tipo"));
          assert.ok(campos.includes("body.capacidadeVan"));

          return true;
        }
      );
    });
  });

  describe("userIdParamSchema", () => {
    it("deve aceitar um UUID válido de usuário", async () => {
      const dados = {
        params: {
          userId: "e23b1769-a94f-43a7-b1f5-505a89a31e4c",
        },
      };

      const resultado = await userIdParamSchema.parseAsync(dados);

      assert.equal(
        resultado.params.userId,
        dados.params.userId
      );
    });

    it("deve rejeitar um UUID inválido de usuário", async () => {
      const dados = {
        params: {
          userId: "12345",
        },
      };

      await assert.rejects(
        userIdParamSchema.parseAsync(dados),
        ZodError
      );
    });
  });

  describe("createMessageSchema", () => {
    it("deve aceitar uma mensagem válida", async () => {
      const dados = {
        body: {
          text: "Olá, tudo bem?",
        },
      };

      const resultado = await createMessageSchema.parseAsync(dados);

      assert.equal(resultado.body.text, "Olá, tudo bem?");
    });

    it("deve rejeitar mensagem vazia", async () => {
      const dados = {
        body: {
          text: "",
        },
      };

      await assert.rejects(
        createMessageSchema.parseAsync(dados),
        ZodError
      );
    });

    it("deve rejeitar mensagem com mais de 1000 caracteres", async () => {
      const dados = {
        body: {
          text: "A".repeat(1001),
        },
      };

      await assert.rejects(
        createMessageSchema.parseAsync(dados),
        (error) => {
          assert.ok(error instanceof ZodError);

          assert.ok(
            error.issues.some(
              (issue) =>
                issue.path.join(".") === "body.text"
            )
          );

          return true;
        }
      );
    });
  });

  describe("messageIdParamSchema", () => {
    it("deve aceitar um UUID válido de mensagem", async () => {
      const dados = {
        params: {
          messageId: "c31c30f1-0d5f-4632-9d67-3a460693cfa1",
        },
      };

      const resultado = await messageIdParamSchema.parseAsync(dados);

      assert.equal(
        resultado.params.messageId,
        dados.params.messageId
      );
    });

    it("deve rejeitar um UUID inválido de mensagem", async () => {
      const dados = {
        params: {
          messageId: "mensagem-invalida",
        },
      };

      await assert.rejects(
        messageIdParamSchema.parseAsync(dados),
        ZodError
      );
    });
  });
});
