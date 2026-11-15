
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import { z } from "zod";

const { AppError } = await import(
  "../../src/utils/index.js"
);

const { default: errorMiddleware } = await import(
  "../../src/middlewares/error.js"
);

const nodeEnvOriginal = process.env.NODE_ENV;

const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

const executarMiddleware = (erro) => {
  const req = {};
  const res = criarRes();
  const next = sinon.stub();

  errorMiddleware(erro, req, res, next);

  return { req, res, next };
};

afterEach(() => {
  sinon.restore();

  if (nodeEnvOriginal === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnvOriginal;
  }
});

describe("errorMiddleware", () => {
  // ==========================================
  // 1. ERRO DE VALIDAÇÃO ZOD
  // ==========================================

  it("deve retornar status 400 para erros de validação do Zod", () => {
    process.env.NODE_ENV = "test";

    const resultadoValidacao = z
      .object({
        nome: z.string(),
      })
      .safeParse({
        nome: 123,
      });

    assert.strictEqual(resultadoValidacao.success, false);

    const erro = resultadoValidacao.error;

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    const errosEsperados = erro.issues.map((issue) => {
      const campo = issue.path.join(".");
      return `${campo}: ${issue.message}`;
    });

    assert.strictEqual(res.status.firstCall.args[0], 400);
    assert.strictEqual(resposta.status, "fail");

    assert.deepStrictEqual(
      resposta.errors,
      errosEsperados
    );

    assert.strictEqual(
      resposta.message,
      errosEsperados.join("; ")
    );

    assert.strictEqual(consoleStub.calledOnce, true);
  });

  // ==========================================
  // 2. APPERROR PERSONALIZADO
  // ==========================================

  it("deve retornar o status definido no AppError", () => {
    process.env.NODE_ENV = "development";

    const erro = new AppError(
      "Acesso não autorizado.",
      403
    );

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 403);
    assert.strictEqual(resposta.status, "fail");

    assert.strictEqual(
      resposta.message,
      "Acesso não autorizado."
    );

    assert.strictEqual(resposta.stack, erro.stack);
  });

  it("deve ocultar stack do AppError em produção", () => {
    process.env.NODE_ENV = "production";

    const erro = new AppError(
      "Acesso não autorizado.",
      403
    );

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.equal(res.status.firstCall.args[0], 403);
    assert.equal(resposta.status, "fail");
    assert.equal(resposta.message, "Acesso não autorizado.");
    assert.equal(Object.hasOwn(resposta, "stack"), false);
  });

  // ==========================================
  // 3. ERRO DE REGISTRO DUPLICADO
  // ==========================================

  it("deve retornar status 409 para erros de registro duplicado", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error("Violação de chave única.");

    erro.name = "SequelizeUniqueConstraintError";

    erro.errors = [
      { message: "O e-mail já está cadastrado." },
      { message: "A CNH já está cadastrada." },
    ];

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 409);
    assert.strictEqual(resposta.status, "fail");

    assert.strictEqual(
      resposta.message,
      "O e-mail já está cadastrado., A CNH já está cadastrada."
    );

    assert.strictEqual(resposta.stack, erro.stack);
  });

  it("deve utilizar mensagem padrão quando não houver erros de duplicidade", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Violação de chave única.");

    erro.name = "SequelizeUniqueConstraintError";
    erro.errors = [];

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.equal(res.status.firstCall.args[0], 409);
    assert.equal(resposta.status, "fail");
    assert.equal(resposta.message, "Registro duplicado.");
    assert.equal(Object.hasOwn(resposta, "stack"), false);

    assert.equal(
      consoleStub.firstCall.args[0],
      "SequelizeUniqueConstraintError: Violação de chave única."
    );
  });

  it("deve utilizar mensagem padrão quando a propriedade errors estiver ausente", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Registro duplicado.");
    erro.name = "SequelizeUniqueConstraintError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(
      res.send.firstCall.args[0].message,
      "Registro duplicado."
    );
  });

  // ==========================================
  // 4. ERRO DE VALIDAÇÃO DO SEQUELIZE
  // ==========================================

  it("deve retornar status 400 para erros de validação do Sequelize", () => {
    process.env.NODE_ENV = "test";

    const erro = new Error("Erro de validação.");

    erro.name = "SequelizeValidationError";

    erro.errors = [
      { message: "O nome é obrigatório." },
      { message: "O e-mail é inválido." },
    ];

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 400);
    assert.strictEqual(resposta.status, "fail");

    assert.strictEqual(
      resposta.message,
      "O nome é obrigatório., O e-mail é inválido."
    );

    assert.strictEqual(resposta.stack, erro.stack);
  });

  it("deve utilizar a mensagem original quando a lista de erros estiver vazia", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Falha de validação.");

    erro.name = "SequelizeValidationError";
    erro.errors = [];

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.equal(res.status.firstCall.args[0], 400);
    assert.equal(resposta.status, "fail");
    assert.equal(resposta.message, "Falha de validação.");
    assert.equal(Object.hasOwn(resposta, "stack"), false);
  });

  it("deve utilizar a mensagem original quando errors estiver ausente", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Falha de validação.");
    erro.name = "SequelizeValidationError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(
      res.send.firstCall.args[0].message,
      "Falha de validação."
    );
  });

  // ==========================================
  // 5. ERRO DE FORMATO DE ID
  // ==========================================

  it("deve retornar status 400 quando o identificador possuir formato inválido", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Invalid input syntax for UUID.");

    erro.name = "SequelizeDatabaseError";

    erro.original = {
      code: "22P02",
    };

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 400);
    assert.strictEqual(resposta.status, "fail");

    assert.strictEqual(
      resposta.message,
      "Identificador (ID) fornecido possui formato inválido."
    );

    assert.strictEqual(
      Object.hasOwn(resposta, "stack"),
      false
    );

    assert.strictEqual(
      consoleStub.firstCall.args[0],
      "SequelizeDatabaseError: Invalid input syntax for UUID."
    );
  });

  it("deve retornar erro 500 quando o erro do banco possuir outro código", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error("Erro de banco de dados.");

    erro.name = "SequelizeDatabaseError";
    erro.original = {
      code: "23505",
    };

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.equal(res.status.firstCall.args[0], 500);
    assert.equal(resposta.status, "error");
    assert.equal(resposta.message, "Erro de banco de dados.");
    assert.equal(resposta.stack, erro.stack);
  });

  it("deve retornar erro 500 quando o erro do banco não possuir original", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error("Erro de banco de dados.");
    erro.name = "SequelizeDatabaseError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(res.status.firstCall.args[0], 500);
    assert.equal(res.send.firstCall.args[0].message, erro.message);
  });

  // ==========================================
  // 6. JWT INVÁLIDO
  // ==========================================

  it("deve retornar status 401 para token JWT inválido", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Token malformado.");
    erro.name = "JsonWebTokenError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 401);
    assert.strictEqual(resposta.status, "fail");
    assert.strictEqual(resposta.message, "Token inválido.");

    assert.strictEqual(
      Object.hasOwn(resposta, "stack"),
      false
    );
  });

  it("deve incluir stack quando o token JWT inválido ocorrer em desenvolvimento", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error("Token malformado.");
    erro.name = "JsonWebTokenError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(res.status.firstCall.args[0], 401);
    assert.equal(res.send.firstCall.args[0].stack, erro.stack);
  });

  // ==========================================
  // 7. JWT EXPIRADO
  // ==========================================

  it("deve retornar status 401 para token JWT expirado", () => {
    process.env.NODE_ENV = "test";

    const erro = new Error("Token expirado.");
    erro.name = "TokenExpiredError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 401);
    assert.strictEqual(resposta.status, "fail");

    assert.strictEqual(
      resposta.message,
      "Token expirado. Realize o login novamente."
    );

    assert.strictEqual(resposta.stack, erro.stack);
  });

  it("deve ocultar stack quando o token expirado ocorrer em produção", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Token expirado.");
    erro.name = "TokenExpiredError";

    sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(res.status.firstCall.args[0], 401);

    assert.equal(
      res.send.firstCall.args[0].message,
      "Token expirado. Realize o login novamente."
    );

    assert.equal(
      Object.hasOwn(res.send.firstCall.args[0], "stack"),
      false
    );
  });

  // ==========================================
  // 8. ERRO INTERNO EM DESENVOLVIMENTO
  // ==========================================

  it("deve retornar mensagem original para erros internos em desenvolvimento", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error(
      "Falha inesperada durante a operação."
    );

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 500);
    assert.strictEqual(resposta.status, "error");

    assert.strictEqual(
      resposta.message,
      "Falha inesperada durante a operação."
    );

    assert.strictEqual(resposta.stack, erro.stack);

    assert.strictEqual(
      consoleStub.firstCall.args[0],
      erro.stack
    );
  });

  // ==========================================
  // 9. ERRO INTERNO EM PRODUÇÃO
  // ==========================================

  it("deve ocultar detalhes internos em produção", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error(
      "Erro interno com informação confidencial."
    );

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    const resposta = res.send.firstCall.args[0];

    assert.strictEqual(res.status.firstCall.args[0], 500);
    assert.strictEqual(resposta.status, "error");

    assert.strictEqual(
      resposta.message,
      "Algo deu errado no servidor."
    );

    assert.strictEqual(
      Object.hasOwn(resposta, "stack"),
      false
    );

    assert.strictEqual(
      consoleStub.firstCall.args[0],
      "Error: Erro interno com informação confidencial."
    );
  });

  it("deve utilizar Error como nome quando o erro não possuir nome", () => {
    process.env.NODE_ENV = "production";

    const erro = new Error("Erro sem nome específico.");
    erro.name = "";

    const consoleStub = sinon.stub(console, "error");

    const { res } = executarMiddleware(erro);

    assert.equal(res.status.firstCall.args[0], 500);

    assert.equal(
      consoleStub.firstCall.args[0],
      "Error: Erro sem nome específico."
    );
  });
});
