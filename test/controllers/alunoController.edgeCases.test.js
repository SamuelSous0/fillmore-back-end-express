
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

const ALUNO_ID = "aluno-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";
const ROTA_ID = "rota-teste-123";

const alunoEsperado = {
  id: ALUNO_ID,
  nome: "Aluno Teste",
  escola: "Escola Teste",
  responsavelId: RESPONSAVEL_ID,
};

const criarReq = ({
  params = {},
  body = {},
  user = { tipo: "MOTORISTA" },
} = {}) => ({
  params: {
    id: ALUNO_ID,
    rotaId: ROTA_ID,
    responsavelId: RESPONSAVEL_ID,
    ...params,
  },
  body,
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

describe("alunoController - casos adicionais", () => {
  // ==========================================
  // 1. GET ALUNOS
  // ==========================================

  it("deve listar alunos sem usuário autenticado aplicando filtro vazio", async () => {
    const findStub = sinon
      .stub(alunoService, "getAlunos")
      .resolves([alunoEsperado]);

    const req = {
      params: {},
    };

    const res = criarRes();

    await alunoController.getAlunos(req, res);

    assert.deepEqual(findStub.firstCall.args, [{}]);
    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], [alunoEsperado]);
  });

  it("deve utilizar undefined como responsável quando o perfil não possuir ID", async () => {
    const findStub = sinon
      .stub(alunoService, "getAlunos")
      .resolves([]);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await alunoController.getAlunos(req, res);

    assert.deepEqual(
      findStub.firstCall.args,
      [{ responsavelId: undefined }]
    );

    assert.equal(res.status.firstCall.args[0], 200);
  });

  // ==========================================
  // 2. GET ALUNO
  // ==========================================

  it("deve permitir que o responsável consulte seu próprio aluno", async () => {
    const findStub = sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: RESPONSAVEL_ID,
        },
      },
    });

    const res = criarRes();

    await alunoController.getAluno(req, res);

    assert.deepEqual(findStub.firstCall.args, [ALUNO_ID]);
    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], alunoEsperado);
  });

  it("deve permitir a consulta quando o responsável não possuir perfil associado", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await alunoController.getAluno(req, res);

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], alunoEsperado);
  });

  // ==========================================
  // 3. CREATE ALUNO
  // ==========================================

  it("deve lançar erro 400 quando o nome estiver ausente", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      body: {
        escola: "Escola Teste",
        responsavelId: RESPONSAVEL_ID,
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "Nome e escola do aluno são campos obrigatórios."
        );
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  it("deve utilizar um objeto vazio quando o body da criação estiver ausente", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: RESPONSAVEL_ID,
        },
      },
    });

    delete req.body;

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "Nome e escola do aluno são campos obrigatórios."
        );
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  it("deve lançar erro 400 quando o responsável não possuir perfil e seu ID não for informado", async () => {
    const createStub = sinon.stub(
      alunoService,
      "createAluno"
    );

    const req = criarReq({
      body: {
        nome: "Aluno Teste",
        escola: "Escola Teste",
      },
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await assert.rejects(
      alunoController.createAluno(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        assert.equal(
          erro.message,
          "O campo responsavelId é obrigatório para cadastrar o aluno."
        );
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  // ==========================================
  // 4. UPDATE ALUNO
  // ==========================================

  it("deve utilizar um objeto vazio quando o body da atualização estiver ausente", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const updateStub = sinon
      .stub(alunoService, "updateAluno")
      .resolves(alunoEsperado);

    const req = criarReq();

    delete req.body;

    const res = criarRes();

    await alunoController.updateAluno(req, res);

    assert.deepEqual(
      updateStub.firstCall.args,
      [ALUNO_ID, {}]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], alunoEsperado);
  });

  it("deve permitir que o responsável atualize seu próprio aluno", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const alunoAtualizado = {
      ...alunoEsperado,
      nome: "Aluno Atualizado",
    };

    const updateStub = sinon
      .stub(alunoService, "updateAluno")
      .resolves(alunoAtualizado);

    const req = criarReq({
      body: {
        nome: "Aluno Atualizado",
      },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: RESPONSAVEL_ID,
        },
      },
    });

    const res = criarRes();

    await alunoController.updateAluno(req, res);

    assert.deepEqual(
      updateStub.firstCall.args,
      [ALUNO_ID, { nome: "Aluno Atualizado" }]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], alunoAtualizado);
  });

  it("deve permitir a atualização quando o responsável não possuir perfil associado", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const updateStub = sinon
      .stub(alunoService, "updateAluno")
      .resolves(alunoEsperado);

    const req = criarReq({
      body: {
        nome: "Novo Nome",
      },
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await alunoController.updateAluno(req, res);

    assert.equal(updateStub.calledOnce, true);
    assert.equal(res.status.firstCall.args[0], 200);
  });

  // ==========================================
  // 5. DELETE ALUNO
  // ==========================================

  it("deve permitir que o responsável exclua seu próprio aluno", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const deleteStub = sinon
      .stub(alunoService, "deleteAluno")
      .resolves(true);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: RESPONSAVEL_ID,
        },
      },
    });

    const res = criarRes();

    await alunoController.deleteAluno(req, res);

    assert.deepEqual(deleteStub.firstCall.args, [ALUNO_ID]);
    assert.equal(res.status.firstCall.args[0], 204);
    assert.equal(res.send.calledOnce, true);
  });

  it("deve permitir a exclusão quando o responsável não possuir perfil associado", async () => {
    sinon
      .stub(alunoService, "getAlunoById")
      .resolves(alunoEsperado);

    const deleteStub = sinon
      .stub(alunoService, "deleteAluno")
      .resolves(true);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await alunoController.deleteAluno(req, res);

    assert.equal(deleteStub.calledOnce, true);
    assert.equal(res.status.firstCall.args[0], 204);
  });

  // ==========================================
  // 6. GET ALUNOS DO RESPONSÁVEL
  // ==========================================

  it("deve permitir que o responsável consulte seus próprios alunos", async () => {
    const alunos = [alunoEsperado];

    const findStub = sinon
      .stub(alunoService, "getAlunosByResponsavel")
      .resolves(alunos);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: {
          id: RESPONSAVEL_ID,
        },
      },
    });

    const res = criarRes();

    await alunoController.getAlunosDoResponsavel(req, res);

    assert.deepEqual(
      findStub.firstCall.args,
      [RESPONSAVEL_ID]
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], alunos);
  });

  it("deve permitir a consulta quando o responsável não possuir perfil associado", async () => {
    const findStub = sinon
      .stub(alunoService, "getAlunosByResponsavel")
      .resolves([]);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await alunoController.getAlunosDoResponsavel(req, res);

    assert.deepEqual(
      findStub.firstCall.args,
      [RESPONSAVEL_ID]
    );

    assert.equal(res.status.firstCall.args[0], 200);
  });
});
