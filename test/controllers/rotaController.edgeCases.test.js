
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { rotaService } = await import(
  "../../src/services/index.js"
);

const { default: rotaController } = await import(
  "../../src/controllers/rotaController.js"
);

const ROTA_ID = "rota-teste-123";
const MOTORISTA_ID = "motorista-teste-123";

const criarReq = ({
  params = {},
  body = {},
  query = {},
  user = {
    tipo: "MOTORISTA",
    motorista: { id: MOTORISTA_ID },
  },
} = {}) => ({
  params: {
    id: ROTA_ID,
    ...params,
  },
  body,
  query,
  user,
});

const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

afterEach(() => {
  sinon.restore();
});

describe("rotaController - casos adicionais", () => {
  // ==========================================
  // 1. AUTORIZAÇÃO DO MOTORISTA
  // ==========================================

  it("deve negar acesso quando não existir usuário autenticado", async () => {
    const findStub = sinon.stub(
      rotaService,
      "getAllRotas"
    );

    const req = {
      params: { id: ROTA_ID },
      body: {},
      query: {},
    };

    const res = criarRes();

    await assert.rejects(
      rotaController.getRotas(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Apenas usuários do tipo MOTORISTA podem gerenciar rotas."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
    assert.equal(res.status.notCalled, true);
  });

  it("deve negar acesso quando o motorista não possuir perfil associado", async () => {
    const findStub = sinon.stub(
      rotaService,
      "getAllRotas"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: null,
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.getRotas(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Apenas usuários do tipo MOTORISTA podem gerenciar rotas."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  // ==========================================
  // 2. CREATE ROTA
  // ==========================================

  it("deve utilizar um objeto vazio quando o body da criação estiver ausente", async () => {
    const createStub = sinon.stub(
      rotaService,
      "createRota"
    );

    const req = criarReq();

    delete req.body;

    const res = criarRes();

    await assert.rejects(
      rotaController.createRota(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "Nome e turno da rota são campos obrigatórios."
        );
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
    assert.equal(res.status.notCalled, true);
  });

  it("deve rejeitar a criação quando o nome estiver ausente", async () => {
    const createStub = sinon.stub(
      rotaService,
      "createRota"
    );

    const req = criarReq({
      body: {
        turno: "MANHA",
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.createRota(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "Nome e turno da rota são campos obrigatórios."
        );
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  // ==========================================
  // 3. UPDATE ROTA
  // ==========================================

  it("deve utilizar um objeto vazio quando o body da atualização estiver ausente", async () => {
    const rotaAtualizada = {
      id: ROTA_ID,
      nome: "Rota Teste",
      turno: "MANHA",
    };

    const updateStub = sinon
      .stub(rotaService, "updateRota")
      .resolves(rotaAtualizada);

    const req = criarReq();

    delete req.body;

    const res = criarRes();

    await rotaController.updateRota(req, res);

    assert.deepEqual(
      updateStub.firstCall.args,
      [ROTA_ID, MOTORISTA_ID, {}]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(
      res.send.firstCall.args[0],
      rotaAtualizada
    );
  });

  // ==========================================
  // 4. OTIMIZAR ROTA
  // ==========================================

  it("deve permitir otimizar sem informar data no corpo ou na query", async () => {
    const resultadoEsperado = {
      rotaId: ROTA_ID,
      paradas: [],
    };

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves(resultadoEsperado);

    const req = criarReq();

    delete req.body;
    delete req.query;

    const res = criarRes();

    await rotaController.otimizarRota(req, res);

    assert.deepEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        MOTORISTA_ID,
        {
          data: undefined,
          salvarNoBanco: true,
        },
      ]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );
  });

  it("deve utilizar a data da query quando a data do body estiver vazia", async () => {
    const data = "2026-11-20";

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves({ rotaId: ROTA_ID });

    const req = criarReq({
      body: {
        data: "",
      },
      query: {
        data,
      },
    });

    const res = criarRes();

    await rotaController.otimizarRota(req, res);

    assert.deepEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        MOTORISTA_ID,
        {
          data,
          salvarNoBanco: true,
        },
      ]
    );
  });

  // ==========================================
  // 5. GET TRAJETO OTIMIZADO
  // ==========================================

  it("deve permitir consultar o trajeto sem usuário autenticado e sem salvar alterações", async () => {
    const resultadoEsperado = {
      rotaId: ROTA_ID,
      paradas: [],
    };

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves(resultadoEsperado);

    const req = {
      params: {
        id: ROTA_ID,
      },
    };

    const res = criarRes();

    await rotaController.getTrajetoOtimizado(req, res);

    assert.deepEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        null,
        {
          data: undefined,
          salvarNoBanco: false,
        },
      ]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );
  });

  it("deve permitir consultar o trajeto de um motorista sem perfil associado sem salvar alterações", async () => {
    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves({ rotaId: ROTA_ID });

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
      },
      query: {
        data: "2026-11-20",
      },
    });

    const res = criarRes();

    await rotaController.getTrajetoOtimizado(req, res);

    assert.deepEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        undefined,
        {
          data: "2026-11-20",
          salvarNoBanco: false,
        },
      ]
    );

    assert.equal(res.status.firstCall.args[0], 200);
  });

  it("deve consultar o trajeto sem data quando a query não estiver disponível", async () => {
    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves({ rotaId: ROTA_ID });

    const req = {
      params: {
        id: ROTA_ID,
      },
      user: {
        tipo: "RESPONSAVEL",
      },
    };

    const res = criarRes();

    await rotaController.getTrajetoOtimizado(req, res);

    assert.deepEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        null,
        {
          data: undefined,
          salvarNoBanco: false,
        },
      ]
    );

    assert.equal(res.status.firstCall.args[0], 200);
  });
});
