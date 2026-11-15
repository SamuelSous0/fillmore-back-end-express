
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

// URL fictícia para o ambiente de testes.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação dos models e services.
const { default: models } = await import(
  "../../src/models/index.js"
);

const { default: tokenService } = await import(
  "../../src/services/tokenService.js"
);

describe("tokenService", () => {
  let clock;

  afterEach(() => {
    // Restaura o relógio simulado, quando utilizado.
    if (clock) {
      clock.restore();
      clock = undefined;
    }

    // Restaura os Stubs.
    sinon.restore();
  });

  // ==========================================
  // 1. REVOGAR TOKEN COM EXPIRAÇÃO INFORMADA
  // ==========================================

  it("deve registrar um token revogado com a data de expiração informada", async () => {
    const token = "token-teste-123";

    const expiraEm = Math.floor(
      Date.parse("2026-11-15T12:00:00.000Z") / 1000
    );

    const registroEsperado = {
      id: "revogacao-123",
      token,
      expiraEm: new Date(expiraEm * 1000),
    };

    const createStub = sinon
      .stub(models.TokenRevogado, "create")
      .resolves(registroEsperado);

    const resultado = await tokenService.revokeToken(
      token,
      expiraEm
    );

    assert.deepStrictEqual(resultado, registroEsperado);

    assert.deepStrictEqual(
      createStub.firstCall.args[0],
      {
        token,
        expiraEm: new Date(expiraEm * 1000),
      }
    );

    assert.strictEqual(createStub.calledOnce, true);
  });

  // ==========================================
  // 2. REVOGAR TOKEN COM EXPIRAÇÃO PADRÃO
  // ==========================================

  it("deve utilizar 24 horas como expiração padrão quando nenhuma data for informada", async () => {
    const dataAtual = new Date(
      "2026-11-14T12:00:00.000Z"
    );

    // Simula o relógio para tornar o teste previsível.
    clock = sinon.useFakeTimers({
      now: dataAtual,
    });

    const token = "token-sem-expiracao-informada";

    const createStub = sinon
      .stub(models.TokenRevogado, "create")
      .resolves({
        id: "revogacao-124",
        token,
      });

    await tokenService.revokeToken(token);

    const dadosEnviados = createStub.firstCall.args[0];

    const expiracaoEsperada = new Date(
      dataAtual.getTime() + 24 * 60 * 60 * 1000
    );

    assert.strictEqual(dadosEnviados.token, token);

    assert.deepStrictEqual(
      dadosEnviados.expiraEm,
      expiracaoEsperada
    );

    assert.strictEqual(createStub.calledOnce, true);
  });

  // ==========================================
  // 3. VERIFICAR TOKEN REVOGADO
  // ==========================================

  it("deve retornar true quando o token estiver revogado", async () => {
    const token = "token-revogado-123";

    const findOneStub = sinon
      .stub(models.TokenRevogado, "findOne")
      .resolves({
        id: "revogacao-125",
        token,
      });

    const resultado = await tokenService.isTokenRevoked(
      token
    );

    assert.strictEqual(resultado, true);

    assert.deepStrictEqual(
      findOneStub.firstCall.args[0],
      {
        where: { token },
      }
    );

    assert.strictEqual(findOneStub.calledOnce, true);
  });

  // ==========================================
  // 4. VERIFICAR TOKEN NÃO REVOGADO
  // ==========================================

  it("deve retornar false quando o token não estiver revogado", async () => {
    const token = "token-valido-123";

    const findOneStub = sinon
      .stub(models.TokenRevogado, "findOne")
      .resolves(null);

    const resultado = await tokenService.isTokenRevoked(
      token
    );

    assert.strictEqual(resultado, false);

    assert.deepStrictEqual(
      findOneStub.firstCall.args[0],
      {
        where: { token },
      }
    );

    assert.strictEqual(findOneStub.calledOnce, true);
  });
});
