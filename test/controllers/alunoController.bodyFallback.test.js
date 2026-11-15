
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { alunoService } = await import(
  "../../src/services/index.js"
);

const { default: alunoController } = await import(
  "../../src/controllers/alunoController.js"
);

afterEach(() => {
  sinon.restore();
});

describe("alunoController - validação do vínculo", () => {
  it("deve lançar erro 400 quando o body da requisição não existir", async () => {
    const associateStub = sinon.stub(
      alunoService,
      "associarAlunoARota"
    );

    const req = {
      params: {
        rotaId: "rota-teste-123",
      },
      // body propositalmente ausente
    };

    const res = {
      status: sinon.stub(),
      send: sinon.stub(),
    };

    await assert.rejects(
      alunoController.vincularAlunoNaRota(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "O campo alunoId é obrigatório no corpo da requisição."
        );
        return true;
      }
    );

    assert.equal(associateStub.notCalled, true);
    assert.equal(res.status.notCalled, true);
    assert.equal(res.send.notCalled, true);
  });
});
