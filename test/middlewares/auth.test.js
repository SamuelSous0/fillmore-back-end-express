
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import jwt from "jsonwebtoken";

// URL fictícia para impedir conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação dos Services.
const { tokenService, userService } = await import(
  "../../src/services/index.js"
);

// Importação do Middleware.
const { default: authMiddleware } = await import(
  "../../src/middlewares/auth.js"
);

// Configuração utilizada nos testes.
const JWT_SECRET_TESTE = "segredo-jwt-teste";

const TOKEN_VALIDO = "token-ficticio-valido";

const TOKEN_REVOGADO = "token-ficticio-revogado";

const usuarioTeste = {
  id: "usuario-teste-123",
  nome: "Usuário Teste",
  email: "usuario@teste.com",
  tipo: "MOTORISTA",
  motorista: {
    id: "motorista-teste-123",
  },
};

// Preserva a configuração original do JWT.
const jwtSecretOriginal = process.env.JWT_SECRET;

// Restaura os Stubs após cada teste.
afterEach(() => {
  sinon.restore();

  if (jwtSecretOriginal === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = jwtSecretOriginal;
  }
});

describe("authMiddleware", () => {

  // ==========================================
  // 1. TOKEN NÃO INFORMADO
  // ==========================================

  it("deve lançar erro 401 quando o token não for informado", async () => {
    const revokedStub = sinon.stub(
      tokenService,
      "isTokenRevoked"
    );

    const req = {
      headers: {},
    };

    const res = {};

    const next = sinon.stub();

    await assert.rejects(
      authMiddleware(req, res, next),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Token de autenticação não fornecido."
        );

        return true;
      }
    );

    assert.strictEqual(revokedStub.notCalled, true);
    assert.strictEqual(next.notCalled, true);
  });

  // ==========================================
  // 2. FORMATO DO TOKEN INVÁLIDO
  // ==========================================

  it("deve lançar erro 401 quando o token não utilizar Bearer", async () => {
    const revokedStub = sinon.stub(
      tokenService,
      "isTokenRevoked"
    );

    const req = {
      headers: {
        authorization: "Basic token-invalido",
      },
    };

    const res = {};

    const next = sinon.stub();

    await assert.rejects(
      authMiddleware(req, res, next),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Token de autenticação não fornecido."
        );

        return true;
      }
    );

    assert.strictEqual(revokedStub.notCalled, true);
    assert.strictEqual(next.notCalled, true);
  });

  // ==========================================
  // 3. TOKEN REVOGADO
  // ==========================================

  it("deve impedir a autenticação quando o token estiver revogado", async () => {
    const revokedStub = sinon
      .stub(tokenService, "isTokenRevoked")
      .resolves(true);

    const verifyStub = sinon.stub(jwt, "verify");

    const findUserStub = sinon.stub(
      userService,
      "getUserById"
    );

    const req = {
      headers: {
        authorization: `Bearer ${TOKEN_REVOGADO}`,
      },
    };

    const res = {};

    const next = sinon.stub();

    await assert.rejects(
      authMiddleware(req, res, next),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Sessão finalizada ou token revogado. Faça login novamente."
        );

        return true;
      }
    );

    assert.deepStrictEqual(
      revokedStub.firstCall.args,
      [TOKEN_REVOGADO]
    );

    assert.strictEqual(verifyStub.notCalled, true);
    assert.strictEqual(findUserStub.notCalled, true);
    assert.strictEqual(next.notCalled, true);
  });

  // ==========================================
  // 4. AUTENTICAÇÃO COM TOKEN VÁLIDO
  // ==========================================

  it("deve autenticar o usuário quando o token for válido", async () => {
    process.env.JWT_SECRET = JWT_SECRET_TESTE;

    const decoded = {
      id: usuarioTeste.id,
      email: usuarioTeste.email,
      tipo: usuarioTeste.tipo,
    };

    const revokedStub = sinon
      .stub(tokenService, "isTokenRevoked")
      .resolves(false);

    const verifyStub = sinon
      .stub(jwt, "verify")
      .returns(decoded);

    const findUserStub = sinon
      .stub(userService, "getUserById")
      .resolves(usuarioTeste);

    const req = {
      headers: {
        authorization: `Bearer ${TOKEN_VALIDO}`,
      },
    };

    const res = {};

    const next = sinon.stub();

    await authMiddleware(req, res, next);

    assert.deepStrictEqual(
      revokedStub.firstCall.args,
      [TOKEN_VALIDO]
    );

    assert.strictEqual(revokedStub.calledOnce, true);

    assert.deepStrictEqual(
      verifyStub.firstCall.args,
      [TOKEN_VALIDO, JWT_SECRET_TESTE]
    );

    assert.deepStrictEqual(
      findUserStub.firstCall.args,
      [decoded.id]
    );

    assert.deepStrictEqual(req.user, usuarioTeste);
    assert.strictEqual(req.token, TOKEN_VALIDO);
    assert.deepStrictEqual(req.tokenPayload, decoded);

    assert.strictEqual(next.calledOnce, true);
  });

  // ==========================================
  // 5. SEGREDO JWT PADRÃO
  // ==========================================

  it("deve utilizar o segredo JWT padrão quando JWT_SECRET não estiver configurado", async () => {
    delete process.env.JWT_SECRET;

    const decoded = {
      id: usuarioTeste.id,
      email: usuarioTeste.email,
      tipo: usuarioTeste.tipo,
    };

    sinon
      .stub(tokenService, "isTokenRevoked")
      .resolves(false);

    const verifyStub = sinon
      .stub(jwt, "verify")
      .returns(decoded);

    sinon
      .stub(userService, "getUserById")
      .resolves(usuarioTeste);

    const req = {
      headers: {
        authorization: `Bearer ${TOKEN_VALIDO}`,
      },
    };

    const res = {};

    const next = sinon.stub();

    await authMiddleware(req, res, next);

    assert.deepStrictEqual(
      verifyStub.firstCall.args,
      [TOKEN_VALIDO, "default_jwt_secret"]
    );

    assert.deepStrictEqual(req.user, usuarioTeste);
    assert.strictEqual(req.token, TOKEN_VALIDO);
    assert.deepStrictEqual(req.tokenPayload, decoded);
    assert.strictEqual(next.calledOnce, true);
  });

  // ==========================================
  // 6. TOKEN INVÁLIDO
  // ==========================================

  it("deve interromper a autenticação quando o JWT for inválido", async () => {
    process.env.JWT_SECRET = JWT_SECRET_TESTE;

    const erroJWT = new Error("jwt malformed");

    sinon
      .stub(tokenService, "isTokenRevoked")
      .resolves(false);

    const verifyStub = sinon
      .stub(jwt, "verify")
      .throws(erroJWT);

    const findUserStub = sinon.stub(
      userService,
      "getUserById"
    );

    const req = {
      headers: {
        authorization: `Bearer ${TOKEN_VALIDO}`,
      },
    };

    const res = {};

    const next = sinon.stub();

    await assert.rejects(
      authMiddleware(req, res, next),
      (erro) => {
        assert.strictEqual(erro, erroJWT);
        assert.strictEqual(erro.message, "jwt malformed");
        return true;
      }
    );

    assert.strictEqual(verifyStub.calledOnce, true);
    assert.strictEqual(findUserStub.notCalled, true);
    assert.strictEqual(next.notCalled, true);
  });

  // ==========================================
  // 7. USUÁRIO NÃO ENCONTRADO
  // ==========================================

  it("deve lançar erro 401 quando o usuário associado ao token não existir", async () => {
    process.env.JWT_SECRET = JWT_SECRET_TESTE;

    const decoded = {
      id: "usuario-inexistente",
      email: "inexistente@teste.com",
      tipo: "MOTORISTA",
    };

    sinon
      .stub(tokenService, "isTokenRevoked")
      .resolves(false);

    sinon
      .stub(jwt, "verify")
      .returns(decoded);

    const findUserStub = sinon
      .stub(userService, "getUserById")
      .resolves(null);

    const req = {
      headers: {
        authorization: `Bearer ${TOKEN_VALIDO}`,
      },
    };

    const res = {};

    const next = sinon.stub();

    await assert.rejects(
      authMiddleware(req, res, next),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Usuário associado a este token não foi encontrado."
        );

        return true;
      }
    );

    assert.deepStrictEqual(
      findUserStub.firstCall.args,
      [decoded.id]
    );

    assert.strictEqual(findUserStub.calledOnce, true);
    assert.strictEqual(next.notCalled, true);
  });

});
