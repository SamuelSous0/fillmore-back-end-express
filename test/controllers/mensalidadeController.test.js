
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

// URL fictícia para impedir conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importações dinâmicas do Service e Controller.
const { mensalidadeService } = await import(
  "../../src/services/index.js"
);

const { default: mensalidadeController } = await import(
  "../../src/controllers/mensalidadeController.js"
);

// IDs utilizados nos testes.
const ALUNO_ID = "aluno-teste-123";
const MENSALIDADE_ID = "mensalidade-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";
const MOTORISTA_ID = "motorista-teste-123";

// Aluno associado ao motorista.
const alunoMotorista = {
  id: ALUNO_ID,
  responsavelId: RESPONSAVEL_ID,
  rotaIda: {
    motorista: {
      id: MOTORISTA_ID,
    },
  },
  rotaVolta: null,
};

// Aluno associado ao responsável.
const alunoResponsavel = {
  id: ALUNO_ID,
  responsavelId: RESPONSAVEL_ID,
  rotaIda: null,
  rotaVolta: null,
};

// Cria uma requisição fictícia.
const criarReq = ({
  params = {},
  body = {},
  user = {
    tipo: "MOTORISTA",
    motorista: { id: MOTORISTA_ID },
  },
} = {}) => ({
  params: {
    alunoId: ALUNO_ID,
    mensalidadeId: MENSALIDADE_ID,
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

// Restaura os Services simulados.
afterEach(() => {
  sinon.restore();
});

describe("mensalidadeController", () => {

  // ==========================================
  // 1. GET MENSALIDADES DO ALUNO
  // ==========================================

  it("deve listar mensalidades quando o responsável tiver acesso ao aluno", async () => {
    const mensalidadesEsperadas = [
      {
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
        valor: 350,
        status: "PENDENTE",
      },
    ];

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoResponsavel);

    const findStub = sinon
      .stub(mensalidadeService, "getMensalidadesDoAluno")
      .resolves(mensalidadesEsperadas);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await mensalidadeController.getMensalidadesDoAluno(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadesEsperadas
    );

    assert.strictEqual(findStub.calledOnce, true);

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [ALUNO_ID]
    );
  });

  it("deve permitir que o motorista responsável pela rota consulte as mensalidades", async () => {
    const mensalidadesEsperadas = [
      { id: MENSALIDADE_ID, valor: 350 },
    ];

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadesDoAluno")
      .resolves(mensalidadesEsperadas);

    const req = criarReq();
    const res = criarRes();

    await mensalidadeController.getMensalidadesDoAluno(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadesEsperadas
    );
  });

  it("deve lançar erro 403 quando o responsável tentar acessar aluno de outra pessoa", async () => {
    const outroAluno = {
      ...alunoResponsavel,
      responsavelId: "outro-responsavel",
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(outroAluno);

    const mensalidadesStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado às mensalidades deste aluno."
        );
        return true;
      }
    );

    assert.strictEqual(mensalidadesStub.notCalled, true);
  });

  it("deve lançar erro 404 quando o aluno não existir", async () => {
    const alunoStub = sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(null);

    const mensalidadesStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Aluno não encontrado."
        );
        return true;
      }
    );

    assert.strictEqual(alunoStub.calledOnce, true);
    assert.strictEqual(mensalidadesStub.notCalled, true);
  });

  // ==========================================
  // 2. GET MENSALIDADE ESPECÍFICA
  // ==========================================

  it("deve buscar uma mensalidade específica do aluno", async () => {
    const mensalidadeEsperada = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      valor: 350,
      status: "PENDENTE",
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoResponsavel);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves(mensalidadeEsperada);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await mensalidadeController.getMensalidade(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadeEsperada
    );
  });

  it("deve lançar erro 404 quando a mensalidade pertencer a outro aluno", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoResponsavel);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: "outro-aluno",
      });

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidade(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Mensalidade não encontrada."
        );
        return true;
      }
    );
  });

  // ==========================================
  // 3. CREATE MENSALIDADE
  // ==========================================

  it("deve criar uma mensalidade quando os dados forem válidos", async () => {
    const dados = {
      mesReferencia: 11,
      anoReferencia: 2026,
      valor: 350,
      dataVencimento: "2026-11-20",
    };

    const mensalidadeEsperada = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      ...dados,
      status: "PENDENTE",
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const createStub = sinon
      .stub(mensalidadeService, "createMensalidade")
      .resolves(mensalidadeEsperada);

    const req = criarReq({ body: dados });
    const res = criarRes();

    await mensalidadeController.createMensalidade(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 201);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadeEsperada
    );

    assert.deepStrictEqual(
      createStub.firstCall.args,
      [ALUNO_ID, dados]
    );
  });

  it("deve lançar erro 400 quando faltar um campo obrigatório", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const createStub = sinon.stub(
      mensalidadeService,
      "createMensalidade"
    );

    const req = criarReq({
      body: {
        mesReferencia: 11,
        anoReferencia: 2026,
        valor: 350,
        // Data de vencimento ausente.
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.createMensalidade(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "Mês, ano, valor e data de vencimento são obrigatórios."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  it("deve impedir que um responsável crie mensalidades", async () => {
    const alunoStub = sinon.stub(
      mensalidadeService,
      "getAlunoComMotoristas"
    );

    const createStub = sinon.stub(
      mensalidadeService,
      "createMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.createMensalidade(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Somente o motorista responsável pode gerenciar mensalidades."
        );
        return true;
      }
    );

    assert.strictEqual(alunoStub.notCalled, true);
    assert.strictEqual(createStub.notCalled, true);
  });

  // ==========================================
  // 4. REGISTRAR PAGAMENTO
  // ==========================================

  it("deve registrar o pagamento de uma mensalidade", async () => {
    const dataPagamento = "2026-11-14";

    const mensalidadeAtualizada = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      status: "PAGO",
      dataPagamento,
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
        status: "PENDENTE",
      });

    const pagamentoStub = sinon
      .stub(mensalidadeService, "registrarPagamento")
      .resolves(mensalidadeAtualizada);

    const req = criarReq({
      body: { dataPagamento },
    });

    const res = criarRes();

    await mensalidadeController.registrarPagamento(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadeAtualizada
    );

    assert.deepStrictEqual(
      pagamentoStub.firstCall.args,
      [MENSALIDADE_ID, dataPagamento]
    );
  });

  it("deve lançar erro 404 ao tentar pagar mensalidade inexistente ou de outro aluno", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: "outro-aluno",
      });

    const pagamentoStub = sinon.stub(
      mensalidadeService,
      "registrarPagamento"
    );

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      mensalidadeController.registrarPagamento(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Mensalidade não encontrada."
        );
        return true;
      }
    );

    assert.strictEqual(pagamentoStub.notCalled, true);
  });

  // ==========================================
  // 5. UPDATE MENSALIDADE
  // ==========================================

  it("deve atualizar uma mensalidade existente", async () => {
    const dadosAtualizacao = {
      valor: 400,
      dataVencimento: "2026-11-25",
    };

    const mensalidadeAtualizada = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      ...dadosAtualizacao,
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
        valor: 350,
      });

    const updateStub = sinon
      .stub(mensalidadeService, "updateMensalidade")
      .resolves(mensalidadeAtualizada);

    const req = criarReq({
      body: dadosAtualizacao,
    });

    const res = criarRes();

    await mensalidadeController.updateMensalidade(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      mensalidadeAtualizada
    );

    assert.deepStrictEqual(
      updateStub.firstCall.args,
      [MENSALIDADE_ID, dadosAtualizacao]
    );
  });

  // ==========================================
  // 6. DELETE MENSALIDADE
  // ==========================================

  it("deve excluir uma mensalidade existente e retornar status 204", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
      });

    const deleteStub = sinon
      .stub(mensalidadeService, "deleteMensalidade")
      .resolves(true);

    const req = criarReq();
    const res = criarRes();

    await mensalidadeController.deleteMensalidade(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 204);
    assert.strictEqual(res.send.calledOnce, true);

    assert.deepStrictEqual(
      deleteStub.firstCall.args,
      [MENSALIDADE_ID]
    );
  });

  // ==========================================
  // 7. MENSALIDADES PENDENTES DO RESPONSÁVEL
  // ==========================================

  it("deve listar as mensalidades pendentes do responsável autenticado", async () => {
    const resultadoEsperado = {
      totalPendente: 350,
      quantidadeFaturas: 1,
      faturas: [
        {
          id: MENSALIDADE_ID,
          valor: 350,
          status: "PENDENTE",
        },
      ],
    };

    const findStub = sinon
      .stub(
        mensalidadeService,
        "getMensalidadesPendentesDoResponsavel"
      )
      .resolves(resultadoEsperado);

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await mensalidadeController.getMensalidadesPendentesDoResponsavel(
      req,
      res
    );

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      resultadoEsperado
    );

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [RESPONSAVEL_ID]
    );
  });

  it("deve impedir que um responsável consulte as pendências de outra pessoa", async () => {
    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesPendentesDoResponsavel"
    );

    const req = criarReq({
      params: {
        responsavelId: "outro-responsavel",
      },
      user: {
        tipo: "RESPONSAVEL",
        responsavel: { id: RESPONSAVEL_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesPendentesDoResponsavel(
        req,
        res
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);
        assert.strictEqual(
          erro.message,
          "Acesso não autorizado às mensalidades deste responsável."
        );
        return true;
      }
    );

    assert.strictEqual(findStub.notCalled, true);
  });

});
