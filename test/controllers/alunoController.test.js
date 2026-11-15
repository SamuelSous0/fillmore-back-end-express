
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

// URL fictícia para evitar conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação do Service e do Controller.
const { alunoService } = await import(
  "../../src/services/index.js"
);

const { default: alunoController } = await import(
  "../../src/controllers/alunoController.js"
);

// IDs utilizados nos testes.
const ALUNO_ID = "aluno-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";
const OUTRO_RESPONSAVEL_ID = "outro-responsavel-456";
const ROTA_ID = "rota-teste-123";

// Cria uma requisição HTTP fictícia.
const criarReq = ({
  params = {},
  body = {},
  user = { tipo: "MOTORISTA" },
} = {}) => ({
  params: {
    id: ALUNO_ID,
    alunoId: ALUNO_ID,
    rotaId: ROTA_ID,
    responsavelId: RESPONSAVEL_ID,
    ...params,
  },
  body,
  user,
});

// Cria uma resposta HTTP simulada.
const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

// Restaura os Stubs após cada teste.
afterEach(() => {
  sinon.restore();
});

describe("alunoController", () => {

  // ==========================================
  // 1. GET ALUNOS
  // ==========================================

  it("deve listar os alunos do responsável autenticado", async () => {
    const alunosEsperados = [
      {
        id: ALUNO_ID,
        nome: "Aluno Teste",
        responsavelId: RESPONSAVEL_ID,
      },
    ];

    const findStub = sinon
      .stub(alunoService, "getAlunos")
      .resolves(alunosEsperados);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await alunoController.getAlunos(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [{ responsavelId: RESPONSAVEL_ID }]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunosEsperados
    );
  });

  it("deve listar todos os alunos quando o usuário não for responsável", async () => {
    const alunosEsperados = [
      { id: ALUNO_ID, nome: "Aluno Teste" },
    ];

    const findStub = sinon
      .stub(alunoService, "getAlunos")
      .resolves(alunosEsperados);

    const req = criarReq({
      user: { tipo: "MOTORISTA" },
    });

    const res = criarRes();

    await alunoController.getAlunos(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [{}]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunosEsperados
    );
  });

  // ==========================================
  // 2. GET ALUNO
  // ==========================================

  it("deve buscar um aluno existente pelo ID", async () => {
    const alunoEsperado = {
      id: ALUNO_ID,
      nome: "Aluno Teste",
      responsavelId: RESPONSAVEL_ID,
    };

    const findStub = sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const req = criarReq();
    const res = criarRes();

    await alunoController.getAluno(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [ALUNO_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunoEsperado
    );
  });

  it("deve lançar erro 404 quando o aluno não existir", async () => {
    const findStub = sinon
      .stub(alunoService, "getAlunoById")
      .resolves(null);

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      alunoController.getAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Aluno não encontrado."
        );
        return true;
      }
    );

    assert.strictEqual(findStub.calledOnce, true);
  });

  it("deve lançar erro 403 quando o responsável tentar acessar aluno de outra pessoa", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves({
        id: ALUNO_ID,
        nome: "Aluno de Outra Pessoa",
        responsavelId: OUTRO_RESPONSAVEL_ID,
      });

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.getAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado a dados de outro responsável."
        );
        return true;
      }
    );
  });

  // ==========================================
  // 3. CREATE ALUNO
  // ==========================================

  it("deve criar um aluno quando os dados forem válidos", async () => {
    const dadosAluno = {
      nome: "Aluno Novo",
      escola: "Escola de Teste",
      responsavelId: RESPONSAVEL_ID,
    };

    const alunoEsperado = {
      id: ALUNO_ID,
      ...dadosAluno,
    };

    const createStub = sinon
      .stub(alunoService, "createAluno")
      .resolves(alunoEsperado);

    const req = criarReq({
      body: dadosAluno,
    });

    const res = criarRes();

    await alunoController.createAluno(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 201);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunoEsperado
    );

    assert.strictEqual(createStub.calledOnce, true);

    const dadosEnviados = createStub.firstCall.args[0];

    assert.strictEqual(dadosEnviados.nome, "Aluno Novo");
    assert.strictEqual(dadosEnviados.escola, "Escola de Teste");
    assert.strictEqual(
      dadosEnviados.responsavelId,
      RESPONSAVEL_ID
    );
  });

  it("deve utilizar o responsável autenticado quando o ID não for informado", async () => {
    const alunoEsperado = {
      id: ALUNO_ID,
      nome: "Aluno Novo",
      escola: "Escola de Teste",
      responsavelId: RESPONSAVEL_ID,
    };

    const createStub = sinon
      .stub(alunoService, "createAluno")
      .resolves(alunoEsperado);

    const req = criarReq({
      body: {
        nome: "Aluno Novo",
        escola: "Escola de Teste",
      },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await alunoController.createAluno(req, res);

    assert.strictEqual(
      createStub.firstCall.args[0].responsavelId,
      RESPONSAVEL_ID
    );

    assert.strictEqual(res.status.firstCall.args[0], 201);
  });

  it("deve lançar erro 400 quando nome ou escola estiver ausente", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      body: {
        nome: "Aluno Teste",
        // Escola ausente.
        responsavelId: RESPONSAVEL_ID,
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "Nome e escola do aluno são campos obrigatórios."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  it("deve lançar erro 400 quando o responsável não for informado", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      body: {
        nome: "Aluno Teste",
        escola: "Escola de Teste",
      },
      user: { tipo: "MOTORISTA" },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "O campo responsavelId é obrigatório para cadastrar o aluno."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  it("deve lançar erro 403 quando um responsável tentar cadastrar aluno para outra pessoa", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      body: {
        nome: "Aluno Teste",
        escola: "Escola de Teste",
        responsavelId: OUTRO_RESPONSAVEL_ID,
      },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Você não pode cadastrar um aluno para outro responsável."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  // ==========================================
  // 4. UPDATE ALUNO
  // ==========================================

  it("deve atualizar um aluno existente", async () => {
    const dadosAtualizacao = {
      nome: "Aluno Atualizado",
      escola: "Nova Escola",
    };

    const alunoExistente = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
    };

    const alunoAtualizado = {
      ...alunoExistente,
      ...dadosAtualizacao,
    };

    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoExistente);

    const updateStub = sinon
      .stub(alunoService, "updateAluno")
      .resolves(alunoAtualizado);

    const req = criarReq({
      body: dadosAtualizacao,
    });

    const res = criarRes();

    await alunoController.updateAluno(req, res);

    assert.deepStrictEqual(
      updateStub.firstCall.args,
      [ALUNO_ID, dadosAtualizacao]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunoAtualizado
    );
  });

  it("deve lançar erro 404 ao atualizar aluno inexistente", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(null);

    const updateStub = sinon.stub(
      alunoService,
      "updateAluno"
    );

    const req = criarReq({
      body: { nome: "Novo Nome" },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.updateAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Aluno não encontrado."
        );
        return true;
      }
    );

    assert.strictEqual(updateStub.notCalled, true);
  });

  it("deve impedir que um responsável atualize aluno de outra pessoa", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves({
        id: ALUNO_ID,
        responsavelId: OUTRO_RESPONSAVEL_ID,
      });

    const updateStub = sinon.stub(
      alunoService,
      "updateAluno"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
      body: {
        nome: "Tentativa de alteração",
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.updateAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado a dados de outro responsável."
        );
        return true;
      }
    );

    assert.strictEqual(updateStub.notCalled, true);
  });

  // ==========================================
  // 5. DELETE ALUNO
  // ==========================================

  it("deve excluir um aluno existente", async () => {
    const alunoExistente = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
    };

    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoExistente);

    const deleteStub = sinon
      .stub(alunoService, "deleteAluno")
      .resolves(true);

    const req = criarReq();
    const res = criarRes();

    await alunoController.deleteAluno(req, res);

    assert.deepStrictEqual(
      deleteStub.firstCall.args,
      [ALUNO_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
    assert.strictEqual(res.send.firstCall.args.length, 0);
  });

  it("deve lançar erro 404 ao excluir aluno inexistente", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(null);

    const deleteStub = sinon.stub(
      alunoService,
      "deleteAluno"
    );

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      alunoController.deleteAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Aluno não encontrado."
        );
        return true;
      }
    );

    assert.strictEqual(deleteStub.notCalled, true);
  });

  it("deve impedir que um responsável exclua aluno de outra pessoa", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves({
        id: ALUNO_ID,
        responsavelId: OUTRO_RESPONSAVEL_ID,
      });

    const deleteStub = sinon.stub(
      alunoService,
      "deleteAluno"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.deleteAluno(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado a dados de outro responsável."
        );
        return true;
      }
    );

    assert.strictEqual(deleteStub.notCalled, true);
  });

  // ==========================================
  // 6. GET ALUNOS DA ROTA
  // ==========================================

  it("deve listar os alunos associados a uma rota", async () => {
    const alunosEsperados = [
      {
        id: ALUNO_ID,
        nome: "Aluno Teste",
        rotaIdaId: ROTA_ID,
      },
    ];

    const findStub = sinon
      .stub(alunoService, "getAlunosByRota")
      .resolves(alunosEsperados);

    const req = criarReq();
    const res = criarRes();

    await alunoController.getAlunosDaRota(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [ROTA_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunosEsperados
    );
  });

  // ==========================================
  // 7. VINCULAR ALUNO NA ROTA
  // ==========================================

  it("deve lançar erro 400 quando alunoId não for informado no vínculo", async () => {
    const associateStub = sinon.stub(
      alunoService,
      "associarAlunoARota"
    );

    const req = criarReq({
      body: {
        tipoTrajeto: "IDA",
        ordemNaRota: 2,
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.vincularAlunoNaRota(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "O campo alunoId é obrigatório no corpo da requisição."
        );
        return true;
      }
    );

    assert.strictEqual(associateStub.notCalled, true);
  });

  it("deve vincular um aluno a uma rota com sucesso", async () => {
    const alunoEsperado = {
      id: ALUNO_ID,
      nome: "Aluno Teste",
      rotaIdaId: ROTA_ID,
      ordemNaRotaIda: 2,
    };

    const associateStub = sinon
      .stub(alunoService, "associarAlunoARota")
      .resolves(alunoEsperado);

    const req = criarReq({
      body: {
        alunoId: ALUNO_ID,
        tipoTrajeto: "IDA",
        ordemNaRota: 2,
      },
    });

    const res = criarRes();

    await alunoController.vincularAlunoNaRota(req, res);

    assert.deepStrictEqual(
      associateStub.firstCall.args,
      [
        ALUNO_ID,
        ROTA_ID,
        {
          tipoTrajeto: "IDA",
          ordemNaRota: 2,
        },
      ]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunoEsperado
    );
  });

  // ==========================================
  // 8. REMOVER ALUNO DA ROTA
  // ==========================================

  it("deve remover um aluno de uma rota com sucesso", async () => {
    const removeStub = sinon
      .stub(alunoService, "desassociarAlunoDaRota")
      .resolves();

    const req = criarReq();
    const res = criarRes();

    await alunoController.removerAlunoDaRota(req, res);

    assert.deepStrictEqual(
      removeStub.firstCall.args,
      [ALUNO_ID, ROTA_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);
    assert.strictEqual(res.send.firstCall.args.length, 0);
  });

  // ==========================================
  // 9. GET ALUNOS DO RESPONSÁVEL
  // ==========================================

  it("deve listar os alunos de um responsável", async () => {
    const alunosEsperados = [
      {
        id: ALUNO_ID,
        nome: "Aluno Teste",
        responsavelId: RESPONSAVEL_ID,
      },
    ];

    const findStub = sinon
      .stub(alunoService, "getAlunosByResponsavel")
      .resolves(alunosEsperados);

    const req = criarReq({
      user: { tipo: "MOTORISTA" },
    });

    const res = criarRes();

    await alunoController.getAlunosDoResponsavel(req, res);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [RESPONSAVEL_ID]
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      alunosEsperados
    );
  });

  it("deve impedir que um responsável consulte alunos de outra pessoa", async () => {
    const findStub = sinon.stub(
      alunoService,
      "getAlunosByResponsavel"
    );

    const req = criarReq({
      params: {
        responsavelId: OUTRO_RESPONSAVEL_ID,
      },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.getAlunosDoResponsavel(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado aos alunos de outro responsável."
        );
        return true;
      }
    );

    assert.strictEqual(findStub.notCalled, true);
  });

});
