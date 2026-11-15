
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

// URL fictícia para impedir conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação dos Services.
const { userService, tokenService } = await import(
  "../../src/services/index.js"
);

// Importação do Controller.
const { default: sessionController } = await import(
  "../../src/controllers/sessionController.js"
);

// IDs e dados utilizados nos testes.
const USER_ID = "usuario-teste-123";

const usuarioTeste = {
  id: USER_ID,
  nome: "Usuário Teste",
  email: "usuario@teste.com",
  senha: "hash-da-senha",
  tipo: "MOTORISTA",
};

// Cria uma requisição HTTP fictícia.
const criarReq = ({
  body = {},
  user = undefined,
  token = undefined,
  tokenPayload = undefined,
} = {}) => ({
  body,
  user,
  token,
  tokenPayload,
});

// Cria uma resposta HTTP simulada.
const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

// Preserva as configurações originais do JWT.
const jwtSecretOriginal = process.env.JWT_SECRET;
const jwtExpiresOriginal = process.env.JWT_EXPIRES_IN;

// Restaura os Stubs e variáveis de ambiente.
afterEach(() => {
  sinon.restore();

  if (jwtSecretOriginal === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = jwtSecretOriginal;
  }

  if (jwtExpiresOriginal === undefined) {
    delete process.env.JWT_EXPIRES_IN;
  } else {
    process.env.JWT_EXPIRES_IN = jwtExpiresOriginal;
  }
});

describe("sessionController", () => {

  // ==========================================
  // 1. LOGIN COM CREDENCIAIS VÁLIDAS
  // ==========================================

  it("deve autenticar o usuário e gerar um token JWT", async () => {
    const tokenEsperado = "jwt-ficticio-123";

    process.env.JWT_SECRET = "segredo-de-teste";
    process.env.JWT_EXPIRES_IN = "2h";

    const findUserStub = sinon
      .stub(userService, "getUserByEmail")
      .resolves(usuarioTeste);

    const verifyStub = sinon
      .stub(argon2, "verify")
      .resolves(true);

    const signStub = sinon
      .stub(jwt, "sign")
      .returns(tokenEsperado);

    const req = criarReq({
      body: {
        email: "usuario@teste.com",
        senha: "SenhaTeste123",
      },
    });

    const res = criarRes();

    await sessionController.login(req, res);

    assert.deepStrictEqual(
      findUserStub.firstCall.args,
      ["usuario@teste.com"]
    );

    assert.deepStrictEqual(
      verifyStub.firstCall.args,
      ["hash-da-senha", "SenhaTeste123"]
    );

    assert.deepStrictEqual(
      signStub.firstCall.args[0],
      {
        id: USER_ID,
        email: "usuario@teste.com",
        tipo: "MOTORISTA",
      }
    );

    assert.strictEqual(
      signStub.firstCall.args[1],
      "segredo-de-teste"
    );

    assert.strictEqual(
      signStub.firstCall.args[2].expiresIn,
      "2h"
    );

    assert.match(
      signStub.firstCall.args[2].jwtid,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      {
        user: usuarioTeste,
        token: tokenEsperado,
      }
    );
  });

  // ==========================================
  // 2. LOGIN SEM E-MAIL OU SENHA
  // ==========================================

  it("deve lançar erro 400 quando e-mail ou senha não forem informados", async () => {
    const findUserStub = sinon.stub(
      userService,
      "getUserByEmail"
    );

    const req = criarReq({
      body: {
        email: "usuario@teste.com",
      },
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.login(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);

        assert.strictEqual(
          erro.message,
          "E-mail e senha são campos obrigatórios."
        );

        return true;
      }
    );

    assert.strictEqual(findUserStub.notCalled, true);
  });

  it("deve utilizar um objeto vazio quando o body não for informado", async () => {
    const findUserStub = sinon.stub(
      userService,
      "getUserByEmail"
    );

    const req = criarReq({
      body: null,
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.login(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "E-mail e senha são campos obrigatórios."
        );
        return true;
      }
    );

    assert.strictEqual(findUserStub.notCalled, true);
  });

  it("deve lançar erro 400 quando somente o e-mail estiver ausente", async () => {
    const findUserStub = sinon.stub(
      userService,
      "getUserByEmail"
    );

    const req = criarReq({
      body: {
        senha: "SenhaTeste123",
      },
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.login(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "E-mail e senha são campos obrigatórios."
        );
        return true;
      }
    );

    assert.strictEqual(findUserStub.notCalled, true);
  });

  // ==========================================
  // 3. USUÁRIO NÃO ENCONTRADO
  // ==========================================

  it("deve lançar erro 401 quando o usuário não existir", async () => {
    const findUserStub = sinon
      .stub(userService, "getUserByEmail")
      .resolves(null);

    const verifyStub = sinon.stub(argon2, "verify");
    const signStub = sinon.stub(jwt, "sign");

    const req = criarReq({
      body: {
        email: "inexistente@teste.com",
        senha: "SenhaTeste123",
      },
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.login(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Credenciais inválidas."
        );

        return true;
      }
    );

    assert.strictEqual(findUserStub.calledOnce, true);
    assert.strictEqual(verifyStub.notCalled, true);
    assert.strictEqual(signStub.notCalled, true);
  });

  // ==========================================
  // 4. SENHA INCORRETA
  // ==========================================

  it("deve lançar erro 401 quando a senha estiver incorreta", async () => {
    sinon
      .stub(userService, "getUserByEmail")
      .resolves(usuarioTeste);

    const verifyStub = sinon
      .stub(argon2, "verify")
      .resolves(false);

    const signStub = sinon.stub(jwt, "sign");

    const req = criarReq({
      body: {
        email: "usuario@teste.com",
        senha: "SenhaIncorreta",
      },
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.login(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Credenciais inválidas."
        );

        return true;
      }
    );

    assert.strictEqual(verifyStub.calledOnce, true);
    assert.strictEqual(signStub.notCalled, true);
  });

  // ==========================================
  // 5. CONFIGURAÇÕES PADRÃO DO JWT
  // ==========================================

  it("deve utilizar as configurações padrão quando as variáveis do JWT não estiverem definidas", async () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;

    sinon
      .stub(userService, "getUserByEmail")
      .resolves(usuarioTeste);

    sinon
      .stub(argon2, "verify")
      .resolves(true);

    const signStub = sinon
      .stub(jwt, "sign")
      .returns("jwt-padrao");

    const req = criarReq({
      body: {
        email: "usuario@teste.com",
        senha: "SenhaTeste123",
      },
    });

    const res = criarRes();

    await sessionController.login(req, res);

    assert.strictEqual(
      signStub.firstCall.args[1],
      "default_jwt_secret"
    );

    assert.strictEqual(
      signStub.firstCall.args[2].expiresIn,
      "24h"
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      {
        user: usuarioTeste,
        token: "jwt-padrao",
      }
    );
  });

  // ==========================================
  // 6. LOGOUT COM TOKEN
  // ==========================================

  it("deve revogar o token ao realizar logout", async () => {
    const token = "jwt-ficticio-123";
    const exp = 1800000000;

    const revokeStub = sinon
      .stub(tokenService, "revokeToken")
      .resolves();

    const req = criarReq({
      token,
      tokenPayload: {
        exp,
      },
    });

    const res = criarRes();

    await sessionController.logout(req, res);

    assert.deepStrictEqual(
      revokeStub.firstCall.args,
      [token, exp]
    );

    assert.strictEqual(revokeStub.calledOnce, true);
    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
    assert.strictEqual(res.send.firstCall.args.length, 0);
  });

  // ==========================================
  // 7. LOGOUT SEM TOKEN
  // ==========================================

  it("deve finalizar logout sem tentar revogar quando não houver token", async () => {
    const revokeStub = sinon.stub(
      tokenService,
      "revokeToken"
    );

    const req = criarReq();
    const res = criarRes();

    await sessionController.logout(req, res);

    assert.strictEqual(revokeStub.notCalled, true);
    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
    assert.strictEqual(res.send.firstCall.args.length, 0);
  });

  it("deve revogar o token mesmo quando o payload não estiver disponível", async () => {
    const token = "jwt-sem-payload";

    const revokeStub = sinon
      .stub(tokenService, "revokeToken")
      .resolves();

    const req = criarReq({
      token,
    });

    const res = criarRes();

    await sessionController.logout(req, res);

    assert.strictEqual(revokeStub.calledOnce, true);

    assert.deepStrictEqual(
      revokeStub.firstCall.args,
      [token, undefined]
    );

    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
  });

  // ==========================================
  // 8. GET SESSION AUTENTICADA
  // ==========================================

  it("deve retornar os dados do usuário autenticado", async () => {
    const req = criarReq({
      user: usuarioTeste,
    });

    const res = criarRes();

    await sessionController.getSession(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      usuarioTeste
    );
  });

  // ==========================================
  // 9. GET SESSION NÃO AUTENTICADA
  // ==========================================

  it("deve lançar erro 401 quando não houver usuário autenticado", async () => {
    const req = criarReq({
      user: undefined,
    });

    const res = criarRes();

    await assert.rejects(
      sessionController.getSession(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 401);

        assert.strictEqual(
          erro.message,
          "Usuário não autenticado."
        );

        return true;
      }
    );

    assert.strictEqual(res.status.notCalled, true);
    assert.strictEqual(res.send.notCalled, true);
  });
});
