
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import { Op } from "sequelize";

// URL fictícia para o ambiente de testes.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importações dos models e services.
const { default: models } = await import(
  "../../src/models/index.js"
);

const { default: mensalidadeService } = await import(
  "../../src/services/mensalidadeService.js"
);

// IDs utilizados nos testes.
const ALUNO_ID = "aluno-teste-123";
const MENSALIDADE_ID = "mensalidade-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";

const dadosMensalidade = {
  mesReferencia: 11,
  anoReferencia: 2026,
  valor: 350,
  dataVencimento: "2026-11-10",
};

// Retorna a data atual no fuso de Recife.
const obterDataRecife = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

// Adiciona ou subtrai dias de uma data YYYY-MM-DD.
const adicionarDias = (data, quantidade) => {
  const [ano, mes, dia] = data.split("-").map(Number);

  return new Date(
    Date.UTC(ano, mes - 1, dia + quantidade)
  )
    .toISOString()
    .slice(0, 10);
};

describe("mensalidadeService", () => {
  afterEach(() => {
    sinon.restore();
  });

  // ==========================================
  // 1. CREATE MENSALIDADE
  // ==========================================

  it("deve criar uma mensalidade quando os dados forem válidos", async () => {
    const mensalidadeCompleta = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      ...dadosMensalidade,
      status: "PENDENTE",
    };

    sinon.stub(models.Aluno, "findByPk").resolves({
      id: ALUNO_ID,
    });

    sinon.stub(models.Mensalidade, "findOne").resolves(null);

    const createStub = sinon
      .stub(models.Mensalidade, "create")
      .resolves({ id: MENSALIDADE_ID });

    sinon
      .stub(models.Mensalidade, "findByPk")
      .resolves(mensalidadeCompleta);

    const resultado = await mensalidadeService.createMensalidade(
      ALUNO_ID,
      dadosMensalidade
    );

    assert.deepStrictEqual(resultado, mensalidadeCompleta);

    assert.deepStrictEqual(createStub.firstCall.args[0], {
      alunoId: ALUNO_ID,
      ...dadosMensalidade,
      status: "PENDENTE",
    });

    assert.strictEqual(createStub.calledOnce, true);
  });

  it("deve lançar erro 404 quando o aluno não existir", async () => {
    sinon.stub(models.Aluno, "findByPk").resolves(null);

    const findOneStub = sinon.stub(
      models.Mensalidade,
      "findOne"
    );

    const createStub = sinon.stub(
      models.Mensalidade,
      "create"
    );

    await assert.rejects(
      mensalidadeService.createMensalidade(
        ALUNO_ID,
        dadosMensalidade
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

    assert.strictEqual(findOneStub.notCalled, true);
    assert.strictEqual(createStub.notCalled, true);
  });

  it("deve lançar erro 409 quando já existir mensalidade no período", async () => {
    sinon.stub(models.Aluno, "findByPk").resolves({
      id: ALUNO_ID,
    });

    sinon.stub(models.Mensalidade, "findOne").resolves({
      id: "mensalidade-existente",
    });

    const createStub = sinon.stub(
      models.Mensalidade,
      "create"
    );

    await assert.rejects(
      mensalidadeService.createMensalidade(
        ALUNO_ID,
        dadosMensalidade
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 409);
        assert.strictEqual(
          erro.message,
          "Já existe uma mensalidade para este aluno neste período."
        );
        return true;
      }
    );

    assert.strictEqual(createStub.notCalled, true);
  });

  // ==========================================
  // 2. REGISTRAR PAGAMENTO
  // ==========================================

  it("deve registrar o pagamento de uma mensalidade", async () => {
    const dataPagamento = new Date(
      "2026-11-14T12:00:00.000Z"
    );

    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const mensalidadeAtualizada = {
      id: MENSALIDADE_ID,
      status: "PAGO",
      dataPagamento,
    };

    const findByPkStub = sinon.stub(
      models.Mensalidade,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves(mensalidadeAtualizada);

    const resultado = await mensalidadeService.registrarPagamento(
      MENSALIDADE_ID,
      dataPagamento
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      {
        status: "PAGO",
        dataPagamento,
      }
    );

    assert.deepStrictEqual(
      resultado,
      mensalidadeAtualizada
    );

    assert.strictEqual(findByPkStub.callCount, 2);
  });

  it("deve lançar erro 404 ao registrar pagamento de mensalidade inexistente", async () => {
    sinon.stub(models.Mensalidade, "findByPk").resolves(null);

    await assert.rejects(
      mensalidadeService.registrarPagamento(MENSALIDADE_ID),
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
  // 3. UPDATE MENSALIDADE
  // ==========================================

  it("deve atualizar uma mensalidade existente", async () => {
    const dadosAtualizacao = {
      valor: 400,
      dataVencimento: "2026-11-15",
    };

    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const mensalidadeAtualizada = {
      id: MENSALIDADE_ID,
      valor: 400,
      dataVencimento: "2026-11-15",
    };

    const findByPkStub = sinon.stub(
      models.Mensalidade,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves(mensalidadeAtualizada);

    const resultado = await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      dadosAtualizacao
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      dadosAtualizacao
    );

    assert.deepStrictEqual(
      resultado,
      mensalidadeAtualizada
    );

    assert.strictEqual(findByPkStub.callCount, 2);
  });

  it("deve atualizar mês, ano, valor e vencimento da mensalidade", async () => {
    const dadosAtualizacao = {
      mesReferencia: 12,
      anoReferencia: 2027,
      valor: 450,
      dataVencimento: "2027-12-10",
    };

    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const mensalidadeAtualizada = {
      id: MENSALIDADE_ID,
      ...dadosAtualizacao,
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves(mensalidadeAtualizada);

    const resultado = await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      dadosAtualizacao
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      dadosAtualizacao
    );

    assert.deepStrictEqual(resultado, mensalidadeAtualizada);
  });

  it("deve atualizar o status para PAGO com uma data de pagamento informada", async () => {
    const dataPagamento = new Date(
      "2026-11-14T12:00:00.000Z"
    );

    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves({
        id: MENSALIDADE_ID,
        status: "PAGO",
        dataPagamento,
      });

    const resultado = await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      {
        status: "PAGO",
        dataPagamento,
      }
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      {
        status: "PAGO",
        dataPagamento,
      }
    );

    assert.equal(resultado.status, "PAGO");
    assert.equal(resultado.dataPagamento, dataPagamento);
  });

  it("deve utilizar a data atual quando o status mudar para PAGO sem data informada", async () => {
    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves({
        id: MENSALIDADE_ID,
        status: "PAGO",
      });

    const antes = new Date();

    await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      { status: "PAGO" }
    );

    const depois = new Date();

    const dadosEnviados =
      mensalidadeBanco.update.firstCall.args[0];

    assert.equal(dadosEnviados.status, "PAGO");
    assert.ok(dadosEnviados.dataPagamento instanceof Date);
    assert.ok(dadosEnviados.dataPagamento >= antes);
    assert.ok(dadosEnviados.dataPagamento <= depois);
  });

  it("deve limpar a data de pagamento quando o status não for PAGO", async () => {
    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves({
        id: MENSALIDADE_ID,
        status: "PENDENTE",
        dataPagamento: null,
      });

    await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      { status: "PENDENTE" }
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      {
        status: "PENDENTE",
        dataPagamento: null,
      }
    );
  });

  it("deve permitir atualizar somente a data de pagamento", async () => {
    const dataPagamento = new Date(
      "2026-11-14T15:00:00.000Z"
    );

    const mensalidadeBanco = {
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(mensalidadeBanco);

    findByPkStub
      .onSecondCall()
      .resolves({
        id: MENSALIDADE_ID,
        dataPagamento,
      });

    await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      { dataPagamento }
    );

    assert.deepStrictEqual(
      mensalidadeBanco.update.firstCall.args[0],
      { dataPagamento }
    );
  });

  it("deve retornar null ao atualizar uma mensalidade inexistente", async () => {
    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk")
      .resolves(null);

    const resultado = await mensalidadeService.updateMensalidade(
      MENSALIDADE_ID,
      { valor: 400 }
    );

    assert.strictEqual(resultado, null);
    assert.strictEqual(findByPkStub.calledOnce, true);
  });

  // ==========================================
  // 4. DELETE MENSALIDADE
  // ==========================================

  it("deve excluir uma mensalidade existente", async () => {
    const mensalidadeBanco = {
      destroy: sinon.stub().resolves(),
    };

    sinon
      .stub(models.Mensalidade, "findByPk")
      .resolves(mensalidadeBanco);

    const resultado = await mensalidadeService.deleteMensalidade(
      MENSALIDADE_ID
    );

    assert.strictEqual(
      mensalidadeBanco.destroy.calledOnce,
      true
    );

    assert.strictEqual(resultado, true);
  });

  it("deve retornar false ao excluir uma mensalidade inexistente", async () => {
    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk")
      .resolves(null);

    const resultado = await mensalidadeService.deleteMensalidade(
      MENSALIDADE_ID
    );

    assert.strictEqual(resultado, false);
    assert.strictEqual(findByPkStub.calledOnce, true);
  });

  // ==========================================
  // 5. GET ALUNO COM MOTORISTAS
  // ==========================================

  it("deve buscar um aluno incluindo suas rotas e motoristas", async () => {
    const alunoEsperado = {
      id: ALUNO_ID,
      nome: "Aluno Teste",
      rotaIda: {
        motorista: {
          id: "motorista-123",
        },
      },
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoEsperado);

    const resultado =
      await mensalidadeService.getAlunoComMotoristas(ALUNO_ID);

    assert.deepStrictEqual(resultado, alunoEsperado);

    assert.strictEqual(
      findByPkStub.firstCall.args[0],
      ALUNO_ID
    );

    const opcoes = findByPkStub.firstCall.args[1];

    assert.deepStrictEqual(
      opcoes.include.map((item) => item.as),
      ["rotaIda", "rotaVolta"]
    );

    assert.strictEqual(
      opcoes.include[0].include[0].as,
      "motorista"
    );
  });

  // ==========================================
  // 6. GET MENSALIDADES DO ALUNO
  // ==========================================

  it("deve listar todas as mensalidades de um aluno", async () => {
    const mensalidadesEsperadas = [
      {
        id: "mensalidade-1",
        alunoId: ALUNO_ID,
        valor: 350,
      },
      {
        id: "mensalidade-2",
        alunoId: ALUNO_ID,
        valor: 350,
      },
    ];

    const findAllStub = sinon
      .stub(models.Mensalidade, "findAll")
      .resolves(mensalidadesEsperadas);

    const resultado =
      await mensalidadeService.getMensalidadesDoAluno(ALUNO_ID);

    assert.deepStrictEqual(
      resultado,
      mensalidadesEsperadas
    );

    const opcoes = findAllStub.firstCall.args[0];

    assert.deepStrictEqual(opcoes.where, {
      alunoId: ALUNO_ID,
    });

    assert.deepStrictEqual(opcoes.order, [
      ["anoReferencia", "DESC"],
      ["mesReferencia", "DESC"],
    ]);

    assert.strictEqual(
      opcoes.include[0].as,
      "aluno"
    );
  });

  it("deve retornar uma lista vazia quando o aluno não possuir mensalidades", async () => {
    const findAllStub = sinon
      .stub(models.Mensalidade, "findAll")
      .resolves([]);

    const resultado =
      await mensalidadeService.getMensalidadesDoAluno(ALUNO_ID);

    assert.deepStrictEqual(resultado, []);
    assert.strictEqual(findAllStub.calledOnce, true);

    assert.deepStrictEqual(
      findAllStub.firstCall.args[0].where,
      { alunoId: ALUNO_ID }
    );
  });

  // ==========================================
  // 7. GET MENSALIDADE BY ID
  // ==========================================

  it("deve buscar uma mensalidade pelo ID", async () => {
    const mensalidadeEsperada = {
      id: MENSALIDADE_ID,
      alunoId: ALUNO_ID,
      valor: 350,
      status: "PENDENTE",
    };

    const findByPkStub = sinon
      .stub(models.Mensalidade, "findByPk")
      .resolves(mensalidadeEsperada);

    const resultado =
      await mensalidadeService.getMensalidadeById(
        MENSALIDADE_ID
      );

    assert.deepStrictEqual(
      resultado,
      mensalidadeEsperada
    );

    assert.strictEqual(
      findByPkStub.firstCall.args[0],
      MENSALIDADE_ID
    );

    assert.strictEqual(
      findByPkStub.firstCall.args[1].include[0].as,
      "aluno"
    );
  });

  // ==========================================
  // 8. PENDÊNCIAS DO RESPONSÁVEL
  // ==========================================

  it("deve listar as mensalidades pendentes e calcular atrasos e valores", async () => {
    const hoje = obterDataRecife();

    const vencimentoAtrasado = adicionarDias(hoje, -4);
    const vencimentoFuturo = adicionarDias(hoje, 2);

    const mensalidades = [
      {
        id: "mensalidade-atrasada",
        mesReferencia: 11,
        anoReferencia: 2026,
        valor: "350.00",
        dataVencimento: vencimentoAtrasado,
        status: "PENDENTE",
        aluno: {
          id: "aluno-1",
          nome: "Aluno Um",
          rotaIda: {
            motorista: {
              chavePix: "pix-aluno-1",
              titularPix: "Motorista Um",
            },
          },
          rotaVolta: null,
        },
      },
      {
        id: "mensalidade-futura",
        mesReferencia: 12,
        anoReferencia: 2026,
        valor: "150.00",
        dataVencimento: vencimentoFuturo,
        status: "PENDENTE",
        aluno: {
          id: "aluno-2",
          nome: "Aluno Dois",
          rotaIda: null,
          rotaVolta: {
            motorista: {
              chavePix: "pix-aluno-2",
              titularPix: "Motorista Dois",
            },
          },
        },
      },
    ];

    const findAllStub = sinon
      .stub(models.Mensalidade, "findAll")
      .resolves(mensalidades);

    const resultado =
      await mensalidadeService.getMensalidadesPendentesDoResponsavel(
        RESPONSAVEL_ID
      );

    assert.strictEqual(resultado.totalPendente, 500);
    assert.strictEqual(resultado.quantidadeFaturas, 2);

    assert.strictEqual(
      resultado.faturas[0].status,
      "ATRASADO"
    );

    assert.strictEqual(
      resultado.faturas[0].diasEmAtraso,
      4
    );

    assert.strictEqual(
      resultado.faturas[0].pagamentoPix.chavePix,
      "pix-aluno-1"
    );

    assert.strictEqual(
      resultado.faturas[1].status,
      "PENDENTE"
    );

    assert.strictEqual(
      resultado.faturas[1].diasEmAtraso,
      0
    );

    assert.strictEqual(
      resultado.faturas[1].pagamentoPix.chavePix,
      "pix-aluno-2"
    );

    assert.strictEqual(
      resultado.faturas[1].pagamentoPix.titularPix,
      "Motorista Dois"
    );

    const opcoes = findAllStub.firstCall.args[0];

    assert.deepStrictEqual(
      opcoes.where.status[Op.in],
      ["PENDENTE", "ATRASADO"]
    );

    assert.strictEqual(
      opcoes.include[0].where.responsavelId,
      RESPONSAVEL_ID
    );

    assert.deepStrictEqual(opcoes.order, [
      ["dataVencimento", "ASC"],
    ]);
  });

  it("deve retornar total zero quando o responsável não possuir mensalidades pendentes", async () => {
    const findAllStub = sinon
      .stub(models.Mensalidade, "findAll")
      .resolves([]);

    const resultado =
      await mensalidadeService.getMensalidadesPendentesDoResponsavel(
        RESPONSAVEL_ID
      );

    assert.deepStrictEqual(resultado, {
      totalPendente: 0,
      quantidadeFaturas: 0,
      faturas: [],
    });

    assert.strictEqual(findAllStub.calledOnce, true);
  });

  it("deve retornar dados PIX nulos quando o aluno não possuir motorista associado", async () => {
    const hoje = obterDataRecife();

    const mensalidades = [
      {
        id: "mensalidade-sem-motorista",
        mesReferencia: 11,
        anoReferencia: 2026,
        valor: "99.90",
        dataVencimento: hoje,
        status: "PENDENTE",
        aluno: {
          id: "aluno-sem-motorista",
          nome: "Aluno Sem Motorista",
          rotaIda: null,
          rotaVolta: null,
        },
      },
    ];

    sinon
      .stub(models.Mensalidade, "findAll")
      .resolves(mensalidades);

    const resultado =
      await mensalidadeService.getMensalidadesPendentesDoResponsavel(
        RESPONSAVEL_ID
      );

    assert.equal(resultado.totalPendente, 99.9);
    assert.equal(resultado.quantidadeFaturas, 1);

    assert.deepStrictEqual(
      resultado.faturas[0].pagamentoPix,
      {
        chavePix: null,
        titularPix: null,
      }
    );

    assert.equal(resultado.faturas[0].diasEmAtraso, 0);
    assert.equal(resultado.faturas[0].status, "PENDENTE");
  });

  it("deve retornar dados PIX nulos quando o motorista não possuir chave ou titular", async () => {
    const hoje = obterDataRecife();

    const mensalidades = [
      {
        id: "mensalidade-sem-pix",
        mesReferencia: 11,
        anoReferencia: 2026,
        valor: "100.50",
        dataVencimento: hoje,
        status: "ATRASADO",
        aluno: {
          id: "aluno-sem-pix",
          nome: "Aluno Sem PIX",
          rotaIda: {
            motorista: {},
          },
          rotaVolta: null,
        },
      },
    ];

    sinon
      .stub(models.Mensalidade, "findAll")
      .resolves(mensalidades);

    const resultado =
      await mensalidadeService.getMensalidadesPendentesDoResponsavel(
        RESPONSAVEL_ID
      );

    assert.deepStrictEqual(
      resultado.faturas[0].pagamentoPix,
      {
        chavePix: null,
        titularPix: null,
      }
    );

    assert.equal(resultado.totalPendente, 100.5);
    assert.equal(resultado.faturas[0].status, "ATRASADO");
    assert.equal(resultado.faturas[0].diasEmAtraso, 0);
  });
});
