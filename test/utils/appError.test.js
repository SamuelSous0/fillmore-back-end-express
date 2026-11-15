
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import AppError from "../../src/utils/appError.js";

describe("AppError", () => {
  it("deve criar um erro com status fail para códigos 4xx", () => {
    const erro = new AppError("Recurso não encontrado", 404);

    assert.equal(erro.message, "Recurso não encontrado");
    assert.equal(erro.statusCode, 404);
    assert.equal(erro.status, "fail");
    assert.equal(erro.isOperational, true);
  });

  it("deve criar um erro com status error para códigos 5xx", () => {
    const erro = new AppError("Erro interno", 500);

    assert.equal(erro.message, "Erro interno");
    assert.equal(erro.statusCode, 500);
    assert.equal(erro.status, "error");
    assert.equal(erro.isOperational, true);
  });

  it("deve criar um erro com status error para códigos que não começam com 4", () => {
    const erro = new AppError("Erro personalizado", 300);

    assert.equal(erro.status, "error");
    assert.equal(erro.statusCode, 300);
  });

  it("deve ser uma instância de Error", () => {
    const erro = new AppError("Erro de teste", 400);

    assert.ok(erro instanceof Error);
    assert.ok(erro instanceof AppError);
  });

  it("deve possuir uma stack trace", () => {
    const erro = new AppError("Erro de teste", 400);

    assert.ok(erro.stack);
    assert.ok(erro.stack.includes("Erro de teste"));
  });
});
