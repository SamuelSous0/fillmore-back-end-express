
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;

// Primeira importação: configuração personalizada.
process.env.ALLOWED_ORIGINS =
  "http://localhost:3000,http://localhost:3001";

const { default: corsMiddleware } = await import(
  "../../src/middlewares/cors.js"
);

// Restaura a configuração original.
if (previousAllowedOrigins === undefined) {
  delete process.env.ALLOWED_ORIGINS;
} else {
  process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
}

// Segunda importação: força a configuração padrão.
// O parâmetro na URL permite carregar uma nova instância do módulo.
delete process.env.ALLOWED_ORIGINS;

const { default: corsFallbackMiddleware } = await import(
  "../../src/middlewares/cors.js?fallback-test"
);

// Restaura novamente a variável de ambiente.
if (previousAllowedOrigins === undefined) {
  delete process.env.ALLOWED_ORIGINS;
} else {
  process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
}

describe("corsMiddleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      method: "GET",
      headers: {},
    };

    const headers = {};

    res = {
      setHeader(name, value) {
        headers[name.toLowerCase()] = value;
      },

      getHeader(name) {
        return headers[name.toLowerCase()];
      },

      headers,
    };

    next = (error) => {
      next.error = error;
      next.called = true;
    };

    next.called = false;
    next.error = undefined;
  });

  it("deve permitir requisições sem header Origin", () => {
    corsMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, undefined);
  });

  it("deve permitir uma origem autorizada", () => {
    req.headers.origin = "http://localhost:3000";

    corsMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, undefined);

    assert.equal(
      res.getHeader("Access-Control-Allow-Origin"),
      "http://localhost:3000"
    );
  });

  it("não deve liberar CORS para uma origem não autorizada", () => {
    req.headers.origin = "http://site-nao-autorizado.com";

    corsMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, null);

    assert.equal(
      res.getHeader("Access-Control-Allow-Origin"),
      undefined
    );
  });

  it("deve permitir credenciais para origens autorizadas", () => {
    req.headers.origin = "http://localhost:3001";

    corsMiddleware(req, res, next);

    assert.equal(
      res.getHeader("Access-Control-Allow-Credentials"),
      "true"
    );
  });

  // ==========================================
  // CONFIGURAÇÃO PADRÃO
  // ==========================================

  it("deve permitir localhost:3000 quando ALLOWED_ORIGINS não estiver configurada", () => {
    req.headers.origin = "http://localhost:3000";

    corsFallbackMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, undefined);

    assert.equal(
      res.getHeader("Access-Control-Allow-Origin"),
      "http://localhost:3000"
    );
  });

  it("deve permitir localhost:3001 na configuração padrão", () => {
    req.headers.origin = "http://localhost:3001";

    corsFallbackMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, undefined);

    assert.equal(
      res.getHeader("Access-Control-Allow-Origin"),
      "http://localhost:3001"
    );
  });

  it("não deve permitir origens externas na configuração padrão", () => {
    req.headers.origin = "https://site-externo.com";

    corsFallbackMiddleware(req, res, next);

    assert.equal(next.called, true);
    assert.equal(next.error, null);

    assert.equal(
      res.getHeader("Access-Control-Allow-Origin"),
      undefined
    );
  });
});
