
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { mensalidadeService } = await import(
  "../../src/services/index.js"
);

const { default: mensalidadeController } = await import(
  "../../src/controllers/mensalidadeController.js"
);

const ALUNO_ID = "aluno-teste-123";
const MENSALIDADE_ID = "mensalidade-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";
const MOTORISTA_ID = "motorista-teste-123";

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

const alunoResponsavel = {
  id: ALUNO_ID,
  responsavelId: RESPONSAVEL_ID,
  rotaIda: null,
  rotaVolta: null,
};

const criarReq = ({
  params = {},
  body = {},
  user,
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

const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

afterEach(() => {
  sinon.restore();
});

describe("mensalidadeController - casos adicionais", () => {
  // ==========================================
  // 1. AUTORIZAÇÃO DO MOTORISTA
  // ==========================================

  it("deve permitir acesso quando o motorista estiver associado somente à rota de volta", async () => {
    const aluno = {
      ...alunoResponsavel,
      rotaVolta: {
        motorista: {
          id: MOTORISTA_ID,
        },
      },
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(aluno);

    const mensalidades = [
      { id: MENSALIDADE_ID, valor: 350 },
    ];

    const findStub = sinon
      .stub(mensalidadeService, "getMensalidadesDoAluno")
      .resolves(mensalidades);

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await mensalidadeController.getMensalidadesDoAluno(
      req,
      res
    );

    assert.equal(res.status.firstCall.args[0], 200);
    assert.deepEqual(res.send.firstCall.args[0], mensalidades);
    assert.equal(findStub.calledOnce, true);
  });

  it("deve negar acesso quando o motorista não possuir perfil associado", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Você não tem acesso às mensalidades deste aluno."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  it("deve negar acesso quando o motorista não estiver associado a nenhuma rota do aluno", async () => {
    const aluno = {
      ...alunoResponsavel,
      rotaIda: null,
      rotaVolta: null,
    };

    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(aluno);

    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Você não tem acesso às mensalidades deste aluno."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  // ==========================================
  // 2. TIPOS DE USUÁRIO NÃO AUTORIZADOS
  // ==========================================

  it("deve negar acesso para um usuário com tipo não autorizado", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq({
      user: {
        tipo: "ADMIN",
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Você não tem permissão para acessar mensalidades."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  it("deve negar acesso quando não houver usuário autenticado", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesDoAluno"
    );

    const req = criarReq();
    delete req.user;

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesDoAluno(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Você não tem permissão para acessar mensalidades."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  // ==========================================
  // 3. CONSULTA DE MENSALIDADE
  // ==========================================

  it("deve lançar erro 404 quando a mensalidade não existir", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoResponsavel);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves(null);

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
        assert.equal(erro.statusCode, 404);
        assert.equal(
          erro.message,
          "Mensalidade não encontrada."
        );
        return true;
      }
    );
  });

  // ==========================================
  // 4. VALIDAÇÃO DA CRIAÇÃO
  // ==========================================

  const dadosValidos = {
    mesReferencia: 11,
    anoReferencia: 2026,
    valor: 350,
    dataVencimento: "2026-11-20",
  };

  const camposObrigatorios = [
    "mesReferencia",
    "anoReferencia",
    "valor",
    "dataVencimento",
  ];

  for (const campo of camposObrigatorios) {
    it(`deve rejeitar a criação quando ${campo} estiver ausente`, async () => {
      sinon
        .stub(mensalidadeService, "getAlunoComMotoristas")
        .resolves(alunoMotorista);

      const createStub = sinon.stub(
        mensalidadeService,
        "createMensalidade"
      );

      const body = {
        ...dadosValidos,
        [campo]: undefined,
      };

      const req = criarReq({
        body,
        user: {
          tipo: "MOTORISTA",
          motorista: { id: MOTORISTA_ID },
        },
      });

      const res = criarRes();

      await assert.rejects(
        mensalidadeController.createMensalidade(
          req,
          res
        ),
        (erro) => {
          assert.equal(erro.statusCode, 400);
          assert.equal(
            erro.message,
            "Mês, ano, valor e data de vencimento são obrigatórios."
          );
          return true;
        }
      );

      assert.equal(createStub.notCalled, true);
    });
  }

  it("deve rejeitar a criação quando o corpo da requisição estiver ausente", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const createStub = sinon.stub(
      mensalidadeService,
      "createMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    delete req.body;

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.createMensalidade(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  it("deve rejeitar a criação quando a data de vencimento estiver vazia", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    const createStub = sinon.stub(
      mensalidadeService,
      "createMensalidade"
    );

    const req = criarReq({
      body: {
        ...dadosValidos,
        dataVencimento: "",
      },
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.createMensalidade(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 400);
        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
  });

  // ==========================================
  // 5. REGISTRAR PAGAMENTO
  // ==========================================

  it("deve utilizar a data atual quando o pagamento não receber uma data", async () => {
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
      .resolves({
        id: MENSALIDADE_ID,
        status: "PAGO",
      });

    const req = criarReq({
      body: {},
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    const antes = new Date();

    await mensalidadeController.registrarPagamento(
      req,
      res
    );

    const depois = new Date();

    const dataRecebida = pagamentoStub.firstCall.args[1];

    assert.ok(dataRecebida instanceof Date);
    assert.ok(dataRecebida >= antes);
    assert.ok(dataRecebida <= depois);
    assert.equal(res.status.firstCall.args[0], 200);
  });

  it("deve utilizar a data atual quando dataPagamento for nula", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
      });

    const pagamentoStub = sinon
      .stub(mensalidadeService, "registrarPagamento")
      .resolves({ id: MENSALIDADE_ID });

    const req = criarReq({
      body: { dataPagamento: null },
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await mensalidadeController.registrarPagamento(req, res);

    assert.ok(
      pagamentoStub.firstCall.args[1] instanceof Date
    );
  });

  // ==========================================
  // 6. UPDATE MENSALIDADE
  // ==========================================

  it("deve passar um objeto vazio quando o corpo da atualização estiver ausente", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
      });

    const updateStub = sinon
      .stub(mensalidadeService, "updateMensalidade")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: ALUNO_ID,
      });

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    delete req.body;

    const res = criarRes();

    await mensalidadeController.updateMensalidade(
      req,
      res
    );

    assert.deepEqual(
      updateStub.firstCall.args,
      [MENSALIDADE_ID, {}]
    );

    assert.equal(res.status.firstCall.args[0], 200);
  });

  it("deve lançar erro 404 ao atualizar uma mensalidade inexistente", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves(null);

    const updateStub = sinon.stub(
      mensalidadeService,
      "updateMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.updateMensalidade(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        assert.equal(
          erro.message,
          "Mensalidade não encontrada."
        );
        return true;
      }
    );

    assert.equal(updateStub.notCalled, true);
  });

  it("deve impedir a atualização de mensalidade pertencente a outro aluno", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: "outro-aluno",
      });

    const updateStub = sinon.stub(
      mensalidadeService,
      "updateMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.updateMensalidade(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        return true;
      }
    );

    assert.equal(updateStub.notCalled, true);
  });

  // ==========================================
  // 7. DELETE MENSALIDADE
  // ==========================================

  it("deve lançar erro 404 ao excluir mensalidade inexistente", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves(null);

    const deleteStub = sinon.stub(
      mensalidadeService,
      "deleteMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.deleteMensalidade(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        return true;
      }
    );

    assert.equal(deleteStub.notCalled, true);
  });

  it("deve impedir a exclusão de mensalidade pertencente a outro aluno", async () => {
    sinon
      .stub(mensalidadeService, "getAlunoComMotoristas")
      .resolves(alunoMotorista);

    sinon
      .stub(mensalidadeService, "getMensalidadeById")
      .resolves({
        id: MENSALIDADE_ID,
        alunoId: "outro-aluno",
      });

    const deleteStub = sinon.stub(
      mensalidadeService,
      "deleteMensalidade"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.deleteMensalidade(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        return true;
      }
    );

    assert.equal(deleteStub.notCalled, true);
  });

  // ==========================================
  // 8. MENSALIDADES PENDENTES DO RESPONSÁVEL
  // ==========================================

  it("deve negar a consulta de pendências para um motorista", async () => {
    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesPendentesDoResponsavel"
    );

    const req = criarReq({
      user: {
        tipo: "MOTORISTA",
        motorista: { id: MOTORISTA_ID },
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesPendentesDoResponsavel(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        assert.equal(
          erro.message,
          "Acesso não autorizado às mensalidades deste responsável."
        );
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  it("deve negar a consulta de pendências quando não houver usuário autenticado", async () => {
    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesPendentesDoResponsavel"
    );

    const req = criarReq();
    delete req.user;

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesPendentesDoResponsavel(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });

  it("deve negar a consulta quando o responsável não possuir perfil associado", async () => {
    const findStub = sinon.stub(
      mensalidadeService,
      "getMensalidadesPendentesDoResponsavel"
    );

    const req = criarReq({
      user: {
        tipo: "RESPONSAVEL",
      },
    });

    const res = criarRes();

    await assert.rejects(
      mensalidadeController.getMensalidadesPendentesDoResponsavel(
        req,
        res
      ),
      (erro) => {
        assert.equal(erro.statusCode, 403);
        return true;
      }
    );

    assert.equal(findStub.notCalled, true);
  });
});
