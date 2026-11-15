
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

// URL fictícia para impedir conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação do Service e Controller.
const { rotaService } = await import(
  "../../src/services/index.js"
);

const { default: rotaController } = await import(
  "../../src/controllers/rotaController.js"
);

// IDs utilizados nos testes.
const ROTA_ID = "rota-teste-123";
const MOTORISTA_ID = "motorista-teste-123";

// Cria uma requisição fictícia.
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

// Cria uma resposta HTTP simulada.
const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

// Restaura os Stubs depois de cada teste.
afterEach(() => {
  sinon.restore();
});

describe("rotaController", () => {

  // ==========================================
  // 1. GET ROTAS
  // ==========================================

  it("deve listar as rotas do motorista autenticado", async () => {
    const rotasEsperadas = [
      {
        id: ROTA_ID,
        nome: "Rota Teste",
        turno: "MANHA",
        motoristaId: MOTORISTA_ID,
      },
    ];

    const findStub = sinon
      .stub(rotaService, "getAllRotas")
      .resolves(rotasEsperadas);

    const req = criarReq();
    const res = criarRes();

    await rotaController.getRotas(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [MOTORISTA_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      rotasEsperadas
    );
  });

  it("deve lançar erro 403 quando um responsável tentar gerenciar rotas", async () => {
    const findStub = sinon.stub(
      rotaService,
      "getAllRotas"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: "responsavel-123" },
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.getRotas(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Apenas usuários do tipo MOTORISTA podem gerenciar rotas."
        );
        return true;
      }
    );

    assert.strictEqual(findStub.notCalled, true);
  });

  // ==========================================
  // 2. GET ROTA
  // ==========================================

  it("deve buscar uma rota pelo ID", async () => {
    const rotaEsperada = {
      id: ROTA_ID,
      nome: "Rota Teste",
      turno: "MANHA",
      motoristaId: MOTORISTA_ID,
    };

    const findStub = sinon
      .stub(rotaService, "getRotaById")
      .resolves(rotaEsperada);

    const req = criarReq();
    const res = criarRes();

    await rotaController.getRota(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [ROTA_ID, MOTORISTA_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      rotaEsperada
    );
  });

  it("deve lançar erro 404 quando a rota não existir", async () => {
    const findStub = sinon
      .stub(rotaService, "getRotaById")
      .resolves(null);

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      rotaController.getRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Rota não encontrada."
        );
        return true;
      }
    );

    assert.strictEqual(findStub.calledOnce, true);
  });

  // ==========================================
  // 3. CREATE ROTA
  // ==========================================

  it("deve criar uma rota quando os dados forem válidos", async () => {
    const dadosRota = {
      nome: "Rota Nova",
      turno: "MANHA",
      pontoInicialLat: -8.05,
      pontoInicialLng: -34.9,
      pontoFinalLat: -8.1,
      pontoFinalLng: -34.95,
      distanciaTotalKm: 12.5,
      tempoEstimadoMin: 35,
    };

    const rotaEsperada = {
      id: ROTA_ID,
      motoristaId: MOTORISTA_ID,
      ...dadosRota,
    };

    const createStub = sinon
      .stub(rotaService, "createRota")
      .resolves(rotaEsperada);

    const req = criarReq({
      body: dadosRota,
    });

    const res = criarRes();

    await rotaController.createRota(req, res);

    assert.deepStrictEqual(
      createStub.firstCall.args,
      [MOTORISTA_ID, dadosRota]
    );

    assert.strictEqual(res.status.firstCall.args[0], 201);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      rotaEsperada
    );
  });

  it("deve lançar erro 400 quando nome ou turno não forem informados", async () => {
    const createStub = sinon.stub(
      rotaService,
      "createRota"
    );

    const req = criarReq({
      body: {
        nome: "Rota Teste",
        // Turno não informado.
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.createRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "Nome e turno da rota são campos obrigatórios."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  it("deve impedir que um usuário sem perfil de motorista crie rotas", async () => {
    const createStub = sinon.stub(
      rotaService,
      "createRota"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
      },
      body: {
        nome: "Rota Teste",
        turno: "MANHA",
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.createRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Apenas usuários do tipo MOTORISTA podem gerenciar rotas."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  // ==========================================
  // 4. UPDATE ROTA
  // ==========================================

  it("deve atualizar uma rota existente", async () => {
    const dadosAtualizacao = {
      nome: "Rota Atualizada",
      turno: "TARDE",
    };

    const rotaAtualizada = {
      id: ROTA_ID,
      motoristaId: MOTORISTA_ID,
      ...dadosAtualizacao,
    };

    const updateStub = sinon
      .stub(rotaService, "updateRota")
      .resolves(rotaAtualizada);

    const req = criarReq({
      body: dadosAtualizacao,
    });

    const res = criarRes();

    await rotaController.updateRota(req, res);

    assert.deepStrictEqual(
      updateStub.firstCall.args,
      [
        ROTA_ID,
        MOTORISTA_ID,
        dadosAtualizacao,
      ]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      rotaAtualizada
    );
  });

  it("deve lançar erro 404 ao atualizar uma rota inexistente", async () => {
    const updateStub = sinon
      .stub(rotaService, "updateRota")
      .resolves(null);

    const req = criarReq({
      body: {
        nome: "Rota Atualizada",
      },
    });

    const res = criarRes();

    await assert.rejects(
      rotaController.updateRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Rota não encontrada."
        );
        return true;
      }
    );

    assert.strictEqual(updateStub.calledOnce, true);
  });

  // ==========================================
  // 5. DELETE ROTA
  // ==========================================

  it("deve excluir uma rota existente e retornar status 204", async () => {
    const deleteStub = sinon
      .stub(rotaService, "deleteRota")
      .resolves(true);

    const req = criarReq();
    const res = criarRes();

    await rotaController.deleteRota(req, res);

    assert.deepStrictEqual(
      deleteStub.firstCall.args,
      [ROTA_ID, MOTORISTA_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
    assert.strictEqual(res.send.firstCall.args.length, 0);
  });

  it("deve lançar erro 404 ao tentar excluir uma rota inexistente", async () => {
    const deleteStub = sinon
      .stub(rotaService, "deleteRota")
      .resolves(false);

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      rotaController.deleteRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Rota não encontrada."
        );
        return true;
      }
    );

    assert.strictEqual(deleteStub.calledOnce, true);
  });

  // ==========================================
  // 6. OTIMIZAR ROTA
  // ==========================================

  it("deve otimizar uma rota utilizando a data informada no corpo", async () => {
    const data = "2026-11-14";

    const resultadoEsperado = {
      rotaId: ROTA_ID,
      nome: "Rota Inteligente",
      resumo: {
        totalAlunosVinculados: 5,
      },
      paradas: [],
    };

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves(resultadoEsperado);

    const req = criarReq({
      body: { data },
      query: { data: "2026-11-13" },
    });

    const res = criarRes();

    await rotaController.otimizarRota(req, res);

    assert.deepStrictEqual(
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

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );
  });

  it("deve utilizar a data da query quando ela não estiver no corpo", async () => {
    const data = "2026-11-15";

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves({
        rotaId: ROTA_ID,
        paradas: [],
      });

    const req = criarReq({
      body: {},
      query: { data },
    });

    const res = criarRes();

    await rotaController.otimizarRota(req, res);

    assert.deepStrictEqual(
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

    assert.strictEqual(res.status.firstCall.args[0], 200);
  });

  // ==========================================
  // 7. GET TRAJETO OTIMIZADO
  // ==========================================

  it("deve obter o trajeto otimizado do motorista autenticado", async () => {
    const data = "2026-11-14";

    const resultadoEsperado = {
      rotaId: ROTA_ID,
      nome: "Rota Inteligente",
      paradas: [],
    };

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves(resultadoEsperado);

    const req = criarReq({
      query: { data },
    });

    const res = criarRes();

    await rotaController.getTrajetoOtimizado(req, res);

    assert.deepStrictEqual(
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

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );
  });

  it("deve permitir consultar o trajeto otimizado sem salvar alterações quando o usuário não for motorista", async () => {
    const data = "2026-11-14";

    const resultadoEsperado = {
      rotaId: ROTA_ID,
      nome: "Rota Pública",
      paradas: [],
    };

    const optimizeStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves(resultadoEsperado);

    const req = criarReq({
      query: { data },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: "responsavel-123",
        },
      },
    });

    const res = criarRes();

    await rotaController.getTrajetoOtimizado(req, res);

    assert.deepStrictEqual(
      optimizeStub.firstCall.args,
      [
        ROTA_ID,
        null,
        {
          data,
          salvarNoBanco: false,
        },
      ]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );
  });

});
