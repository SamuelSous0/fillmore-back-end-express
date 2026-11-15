
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import notFoundMiddleware from "../../src/middlewares/notFound.js";
import { AppError } from "../../src/utils/index.js";

describe("notFoundMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      originalUrl: "/rota-inexistente",
    };

    res = {};

    next = (error) => {
      next.error = error;
    };

    next.error = undefined;
  });

  it("deve encaminhar um erro para o next", () => {
    notFoundMiddleware(req, res, next);

    assert.ok(next.error);
    assert.ok(next.error instanceof AppError);
  });

  it("deve retornar status 404", () => {
    notFoundMiddleware(req, res, next);

    assert.equal(next.error.statusCode, 404);
  });

  it("deve incluir a URL original na mensagem de erro", () => {
    notFoundMiddleware(req, res, next);

    assert.equal(
      next.error.message,
      "Rota /rota-inexistente não encontrada no servidor."
    );
  });

  it("deve funcionar com diferentes URLs", () => {
    req.originalUrl = "/alunos/123/mensalidades";

    notFoundMiddleware(req, res, next);

    assert.equal(
      next.error.message,
      "Rota /alunos/123/mensalidades não encontrada no servidor."
    );
  });
});
