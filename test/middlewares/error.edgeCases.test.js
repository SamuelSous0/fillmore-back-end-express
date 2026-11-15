
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

const { default: errorMiddleware } = await import(
  "../../src/middlewares/error.js"
);

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  sinon.restore();

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

describe("errorMiddleware - ramificações restantes", () => {
  it("deve incluir stack para UUID inválido em desenvolvimento", () => {
    process.env.NODE_ENV = "development";

    const erro = new Error("Invalid input syntax for UUID.");
    erro.name = "SequelizeDatabaseError";
    erro.original = {
      code: "22P02",
    };

    sinon.stub(console, "error");

    const res = {
      status: sinon.stub(),
      send: sinon.stub(),
    };

    res.status.returns(res);

    errorMiddleware(erro, {}, res, sinon.stub());

    assert.equal(res.status.calledOnceWithExactly(400), true);

    const resposta = res.send.firstCall.args[0];

    assert.equal(resposta.status, "fail");
    assert.equal(
      resposta.message,
      "Identificador (ID) fornecido possui formato inválido."
    );
    assert.equal(resposta.stack, erro.stack);
  });
});
