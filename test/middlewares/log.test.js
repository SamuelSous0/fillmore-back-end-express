
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";

import logMiddleware from "../../src/middlewares/log.js";

describe("logMiddleware", () => {
  let req;
  let res;
  let next;
  let consoleStub;

  beforeEach(() => {
    req = {
      method: "GET",
      path: "/alunos",
      ip: "127.0.0.1",
    };

    res = {};

    next = sinon.spy();
    consoleStub = sinon.stub(console, "log");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("deve registrar método, caminho e IP da requisição", () => {
    logMiddleware(req, res, next);

    sinon.assert.calledOnceWithExactly(
      consoleStub,
      "GET /alunos - 127.0.0.1"
    );
  });

  it("deve chamar next para continuar o fluxo", () => {
    logMiddleware(req, res, next);

    sinon.assert.calledOnce(next);
  });

  it("deve registrar corretamente diferentes métodos e caminhos", () => {
    req.method = "POST";
    req.path = "/mensalidades";
    req.ip = "192.168.0.10";

    logMiddleware(req, res, next);

    sinon.assert.calledOnceWithExactly(
      consoleStub,
      "POST /mensalidades - 192.168.0.10"
    );
  });
});
