
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";

import validate from "../../src/middlewares/validate.js";

describe("validateMiddleware", () => {
  it("deve validar body, params e query da requisição", async () => {
    const req = {
      body: { nome: "Paulo" },
      params: { id: "123" },
      query: { pagina: "1" },
    };

    const res = {};
    const next = sinon.spy();

    const schema = {
      parseAsync: sinon.stub().resolves({
        body: req.body,
        params: req.params,
        query: req.query,
      }),
    };

    await validate(schema)(req, res, next);

    sinon.assert.calledOnceWithExactly(schema.parseAsync, {
      body: { nome: "Paulo" },
      params: { id: "123" },
      query: { pagina: "1" },
    });

    sinon.assert.calledOnce(next);
  });

  it("deve atualizar os dados da requisição com os dados validados", async () => {
    const req = {
      body: { nome: "  Paulo  " },
      params: { id: "123" },
      query: {},
    };

    const res = {};
    const next = sinon.spy();

    const schema = {
      parseAsync: sinon.stub().resolves({
        body: { nome: "Paulo" },
        params: { id: 123 },
        query: {},
      }),
    };

    await validate(schema)(req, res, next);

    assert.deepEqual(req.body, { nome: "Paulo" });
    assert.deepEqual(req.params, { id: 123 });
    assert.deepEqual(req.query, {});

    sinon.assert.calledOnce(next);
  });

  it("não deve substituir partes da requisição ausentes no resultado", async () => {
    const req = {
      body: { nome: "Paulo" },
      params: { id: "123" },
      query: { pagina: "1" },
    };

    const bodyOriginal = req.body;
    const paramsOriginal = req.params;
    const queryOriginal = req.query;

    const res = {};
    const next = sinon.spy();

    const schema = {
      parseAsync: sinon.stub().resolves({
        body: { nome: "Paulo validado" },
      }),
    };

    await validate(schema)(req, res, next);

    assert.deepEqual(req.body, { nome: "Paulo validado" });
    assert.equal(req.params, paramsOriginal);
    assert.equal(req.query, queryOriginal);
    assert.notEqual(req.body, bodyOriginal);

    sinon.assert.calledOnce(next);
  });

  it("deve chamar next após uma validação bem-sucedida", async () => {
    const req = {
      body: {},
      params: {},
      query: {},
    };

    const res = {};
    const next = sinon.spy();

    const schema = {
      parseAsync: sinon.stub().resolves({
        body: {},
        params: {},
        query: {},
      }),
    };

    await validate(schema)(req, res, next);

    sinon.assert.calledOnce(next);
  });

  it("deve rejeitar a execução quando a validação falhar", async () => {
    const req = {
      body: { nome: "" },
      params: {},
      query: {},
    };

    const res = {};
    const next = sinon.spy();

    const erro = new Error("Erro de validação");

    const schema = {
      parseAsync: sinon.stub().rejects(erro),
    };

    await assert.rejects(
      validate(schema)(req, res, next),
      (error) => error === erro
    );

    sinon.assert.notCalled(next);
  });
});
