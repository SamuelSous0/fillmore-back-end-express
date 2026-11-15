
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import { Op } from "sequelize";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { default: models } = await import(
  "../../src/models/index.js"
);

const { default: alunoService } = await import(
  "../../src/services/alunoService.js"
);

const { default: rotaService } = await import(
  "../../src/services/rotaService.js"
);

const ALUNO_ID = "aluno-teste-123";
const RESPONSAVEL_ID = "responsavel-teste-123";
const ROTA_ID = "rota-teste-123";

describe("alunoService", () => {
  afterEach(() => {
    sinon.restore();
  });

  // ==========================================
  // 1. GET ALUNOS
  // ==========================================

  it("deve listar todos os alunos aplicando os filtros informados", async () => {
    const filtro = {
      responsavelId: RESPONSAVEL_ID,
    };

    const alunosEsperados = [
      { id: ALUNO_ID, nome: "Aluno Teste" },
    ];

    const findAllStub = sinon
      .stub(models.Aluno, "findAll")
      .resolves(alunosEsperados);

    const resultado = await alunoService.getAlunos(filtro);

    assert.deepStrictEqual(resultado, alunosEsperados);

    const opcoes = findAllStub.firstCall.args[0];

    assert.deepStrictEqual(opcoes.where, filtro);

    assert.deepStrictEqual(
      opcoes.include.map((item) => item.as),
      ["responsavel", "rotaIda", "rotaVolta"]
    );

    assert.strictEqual(
      opcoes.include[0].include[0].as,
      "usuario"
    );
  });

  it("deve listar todos os alunos sem informar filtros", async () => {
    const alunosEsperados = [
      { id: ALUNO_ID, nome: "Aluno Teste" },
    ];

    const findAllStub = sinon
      .stub(models.Aluno, "findAll")
      .resolves(alunosEsperados);

    const resultado = await alunoService.getAlunos();

    assert.deepStrictEqual(resultado, alunosEsperados);
    assert.deepStrictEqual(
      findAllStub.firstCall.args[0].where,
      {}
    );
  });

  // ==========================================
  // 2. GET ALUNO BY ID
  // ==========================================

  it("deve buscar um aluno pelo ID incluindo seus relacionamentos", async () => {
    const alunoEsperado = {
      id: ALUNO_ID,
      nome: "Aluno Teste",
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoEsperado);

    const resultado = await alunoService.getAlunoById(ALUNO_ID);

    assert.deepStrictEqual(resultado, alunoEsperado);

    assert.strictEqual(
      findByPkStub.firstCall.args[0],
      ALUNO_ID
    );

    assert.deepStrictEqual(
      findByPkStub.firstCall.args[1].include.map(
        (item) => item.as
      ),
      ["responsavel", "rotaIda", "rotaVolta"]
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

    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves({ id: RESPONSAVEL_ID });

    const createStub = sinon
      .stub(models.Aluno, "create")
      .resolves({ id: ALUNO_ID });

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoEsperado);

    const resultado = await alunoService.createAluno(dadosAluno);

    assert.deepStrictEqual(resultado, alunoEsperado);

    assert.deepStrictEqual(createStub.firstCall.args[0], {
      nome: "Aluno Novo",
      escola: "Escola de Teste",
      responsavelId: RESPONSAVEL_ID,
      modalidade: "IDA_E_VOLTA",
      enderecoEmbarque: null,
      latitudeEmbarque: null,
      longitudeEmbarque: null,
      enderecoDesembarque: null,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      rotaIdaId: null,
      ordemNaRotaIda: null,
      rotaVoltaId: null,
      ordemNaRotaVolta: null,
      nomeContatoEntrega: null,
      telefoneContatoEntrega: null,
      diaVencimentoMensalidade: null,
    });

    assert.strictEqual(createStub.calledOnce, true);
  });

  it("deve criar um aluno validando as rotas de ida e volta", async () => {
    const dadosAluno = {
      nome: "Aluno Completo",
      escola: "Escola Central",
      responsavelId: RESPONSAVEL_ID,
      modalidade: "IDA_E_VOLTA",
      enderecoEmbarque: "Rua A",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      enderecoDesembarque: "Rua B",
      latitudeDesembarque: -8.06,
      longitudeDesembarque: -34.91,
      rotaIdaId: "rota-ida",
      ordemNaRotaIda: 2,
      rotaVoltaId: "rota-volta",
      ordemNaRotaVolta: 3,
      nomeContatoEntrega: "Maria",
      telefoneContatoEntrega: "81999999999",
      diaVencimentoMensalidade: 10,
    };

    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves({ id: RESPONSAVEL_ID });

    const validarCapacidadeStub = sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({});

    const createStub = sinon
      .stub(models.Aluno, "create")
      .resolves({ id: ALUNO_ID });

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves({ id: ALUNO_ID, ...dadosAluno });

    const resultado = await alunoService.createAluno(dadosAluno);

    assert.equal(resultado.id, ALUNO_ID);
    assert.equal(validarCapacidadeStub.callCount, 2);

    assert.equal(
      validarCapacidadeStub.firstCall.args[0],
      "rota-ida"
    );

    assert.equal(
      validarCapacidadeStub.secondCall.args[0],
      "rota-volta"
    );

    assert.deepStrictEqual(
      createStub.firstCall.args[0],
      dadosAluno
    );
  });

  it("deve transformar valores vazios em valores padrão durante a criação", async () => {
    const dadosAluno = {
      nome: "Aluno Novo",
      escola: "Escola de Teste",
      responsavelId: RESPONSAVEL_ID,
      modalidade: "",
      enderecoEmbarque: "",
      enderecoDesembarque: "",
      rotaIdaId: "",
      rotaVoltaId: "",
      nomeContatoEntrega: "",
      telefoneContatoEntrega: "",
      latitudeEmbarque: null,
      longitudeEmbarque: null,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      ordemNaRotaIda: null,
      ordemNaRotaVolta: null,
      diaVencimentoMensalidade: null,
    };

    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves({ id: RESPONSAVEL_ID });

    const createStub = sinon
      .stub(models.Aluno, "create")
      .resolves({ id: ALUNO_ID });

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves({ id: ALUNO_ID });

    await alunoService.createAluno(dadosAluno);

    const dadosEnviados = createStub.firstCall.args[0];

    assert.equal(dadosEnviados.modalidade, "IDA_E_VOLTA");
    assert.equal(dadosEnviados.enderecoEmbarque, null);
    assert.equal(dadosEnviados.enderecoDesembarque, null);
    assert.equal(dadosEnviados.rotaIdaId, null);
    assert.equal(dadosEnviados.rotaVoltaId, null);
    assert.equal(dadosEnviados.nomeContatoEntrega, null);
    assert.equal(dadosEnviados.telefoneContatoEntrega, null);

    assert.equal(dadosEnviados.latitudeEmbarque, null);
    assert.equal(dadosEnviados.longitudeEmbarque, null);
    assert.equal(dadosEnviados.ordemNaRotaIda, null);
  });

  it("deve lançar erro 404 quando o responsável não existir na criação", async () => {
    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves(null);

    const createStub = sinon.stub(models.Aluno, "create");

    await assert.rejects(
      alunoService.createAluno({
        nome: "Aluno Novo",
        escola: "Escola de Teste",
        responsavelId: RESPONSAVEL_ID,
      }),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Responsável informado não foi encontrado."
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
      modalidade: "IDA",
    };

    const alunoBanco = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
      rotaIdaId: null,
      rotaVoltaId: null,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      ...dadosAtualizacao,
    };

    const findByPkStub = sinon.stub(
      models.Aluno,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves(alunoAtualizado);

    const resultado = await alunoService.updateAluno(
      ALUNO_ID,
      dadosAtualizacao
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      dadosAtualizacao
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);

    assert.strictEqual(findByPkStub.callCount, 2);
  });

  it("deve atualizar todos os campos e validar novos responsáveis e rotas", async () => {
    const dadosAtualizacao = {
      nome: "Aluno Atualizado",
      escola: "Nova Escola",
      responsavelId: "novo-responsavel",
      modalidade: "IDA",
      enderecoEmbarque: "Rua Nova A",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      enderecoDesembarque: "Rua Nova B",
      latitudeDesembarque: -8.06,
      longitudeDesembarque: -34.91,
      rotaIdaId: "nova-rota-ida",
      ordemNaRotaIda: 2,
      rotaVoltaId: "nova-rota-volta",
      ordemNaRotaVolta: 3,
      nomeContatoEntrega: "Maria",
      telefoneContatoEntrega: "81999999999",
      diaVencimentoMensalidade: 10,
    };

    const alunoBanco = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
      rotaIdaId: "rota-antiga-ida",
      rotaVoltaId: "rota-antiga-volta",
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      ...dadosAtualizacao,
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves(alunoAtualizado);

    const responsavelStub = sinon
      .stub(models.Responsavel, "findByPk")
      .resolves({ id: "novo-responsavel" });

    const validarCapacidadeStub = sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({});

    const resultado = await alunoService.updateAluno(
      ALUNO_ID,
      dadosAtualizacao
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      dadosAtualizacao
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);

    assert.equal(responsavelStub.calledOnce, true);
    assert.equal(validarCapacidadeStub.callCount, 2);

    assert.equal(
      validarCapacidadeStub.firstCall.args[0],
      "nova-rota-ida"
    );

    assert.equal(
      validarCapacidadeStub.secondCall.args[0],
      "nova-rota-volta"
    );
  });

  it("deve lançar erro 404 quando o novo responsável não existir na atualização", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
      update: sinon.stub().resolves(),
    };

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoBanco);

    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves(null);

    const validarCapacidadeStub = sinon.stub(
      rotaService,
      "validarCapacidadeRota"
    );

    await assert.rejects(
      alunoService.updateAluno(ALUNO_ID, {
        responsavelId: "responsavel-inexistente",
      }),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        assert.equal(
          erro.message,
          "Responsável informado não foi encontrado."
        );
        return true;
      }
    );

    assert.equal(alunoBanco.update.notCalled, true);
    assert.equal(validarCapacidadeStub.notCalled, true);
  });

  it("não deve validar responsável ou capacidade quando os vínculos não mudarem", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
      rotaIdaId: ROTA_ID,
      rotaVoltaId: "rota-volta",
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves({ id: ALUNO_ID });

    const responsavelStub = sinon.stub(
      models.Responsavel,
      "findByPk"
    );

    const validarCapacidadeStub = sinon.stub(
      rotaService,
      "validarCapacidadeRota"
    );

    await alunoService.updateAluno(ALUNO_ID, {
      nome: "Novo Nome",
      responsavelId: RESPONSAVEL_ID,
      rotaIdaId: ROTA_ID,
      rotaVoltaId: "rota-volta",
    });

    assert.equal(responsavelStub.notCalled, true);
    assert.equal(validarCapacidadeStub.notCalled, true);
    assert.equal(alunoBanco.update.calledOnce, true);
  });

  it("deve retornar null ao atualizar um aluno inexistente", async () => {
    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .resolves(null);

    const resultado = await alunoService.updateAluno(
      ALUNO_ID,
      { nome: "Novo Nome" }
    );

    assert.strictEqual(resultado, null);
    assert.strictEqual(findByPkStub.calledOnce, true);
  });

  it("não deve executar update quando nenhum campo for informado", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      responsavelId: RESPONSAVEL_ID,
      rotaIdaId: null,
      rotaVoltaId: null,
      update: sinon.stub().resolves(),
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk");

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves(alunoBanco);

    const resultado = await alunoService.updateAluno(
      ALUNO_ID,
      {}
    );

    assert.equal(alunoBanco.update.notCalled, true);
    assert.equal(findByPkStub.callCount, 2);
    assert.equal(resultado, alunoBanco);
  });

  // ==========================================
  // 5. DELETE ALUNO
  // ==========================================

  it("deve excluir um aluno existente", async () => {
    const alunoBanco = {
      destroy: sinon.stub().resolves(),
    };

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoBanco);

    const resultado = await alunoService.deleteAluno(ALUNO_ID);

    assert.strictEqual(alunoBanco.destroy.calledOnce, true);
    assert.strictEqual(resultado, true);
  });

  it("deve retornar false ao excluir um aluno inexistente", async () => {
    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .resolves(null);

    const resultado = await alunoService.deleteAluno(ALUNO_ID);

    assert.strictEqual(resultado, false);
    assert.strictEqual(findByPkStub.calledOnce, true);
  });

  // ==========================================
  // 6. ASSOCIAR ALUNO A ROTA
  // ==========================================

  it("deve associar um aluno a uma rota de manhã", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaIdaId: ROTA_ID,
      ordemNaRotaIda: 2,
    };

    const findByPkStub = sinon.stub(
      models.Aluno,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves(alunoAtualizado);

    sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({
        rota: {
          id: ROTA_ID,
          turno: "MANHA",
        },
      });

    const resultado = await alunoService.associarAlunoARota(
      ALUNO_ID,
      ROTA_ID,
      { ordemNaRota: 2 }
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaIdaId: ROTA_ID,
        ordemNaRotaIda: 2,
      }
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);
  });

  it("deve associar um aluno à rota de volta quando o turno for TARDE", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaVoltaId: ROTA_ID,
      ordemNaRotaVolta: 3,
    };

    const findByPkStub = sinon.stub(
      models.Aluno,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(alunoBanco);

    findByPkStub
      .onSecondCall()
      .resolves(alunoAtualizado);

    sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({
        rota: {
          id: ROTA_ID,
          turno: "TARDE",
        },
      });

    const resultado = await alunoService.associarAlunoARota(
      ALUNO_ID,
      ROTA_ID,
      { ordemNaRota: 3 }
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaVoltaId: ROTA_ID,
        ordemNaRotaVolta: 3,
      }
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);
  });

  it("deve lançar erro 404 ao associar um aluno inexistente", async () => {
    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(null);

    const validarCapacidadeStub = sinon.stub(
      rotaService,
      "validarCapacidadeRota"
    );

    await assert.rejects(
      alunoService.associarAlunoARota(ALUNO_ID, ROTA_ID),
      (erro) => {
        assert.equal(erro.statusCode, 404);
        assert.equal(erro.message, "Aluno não encontrado.");
        return true;
      }
    );

    assert.equal(validarCapacidadeStub.notCalled, true);
  });

  it("deve associar explicitamente à volta e otimizar quando a ordem não for informada", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaVoltaId: ROTA_ID,
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .callsFake(async (_id, opcoes) => {
        if (opcoes?.include) {
          return alunoAtualizado;
        }

        return alunoBanco;
      });

    sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({
        rota: {
          id: ROTA_ID,
          turno: "MANHA",
        },
      });

    const otimizarStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves();

    const resultado = await alunoService.associarAlunoARota(
      ALUNO_ID,
      ROTA_ID,
      { tipoTrajeto: "VOLTA" }
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaVoltaId: ROTA_ID,
      }
    );

    assert.equal(otimizarStub.calledOnce, true);

    assert.deepStrictEqual(
      otimizarStub.firstCall.args,
      [ROTA_ID, null, { salvarNoBanco: true }]
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);
    assert.equal(findByPkStub.callCount, 2);
  });

  it("deve otimizar automaticamente a rota de ida quando a ordem não for informada", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaIdaId: ROTA_ID,
    };

    sinon
      .stub(models.Aluno, "findByPk")
      .callsFake(async (_id, opcoes) => {
        if (opcoes?.include) {
          return alunoAtualizado;
        }

        return alunoBanco;
      });

    sinon
      .stub(rotaService, "validarCapacidadeRota")
      .resolves({
        rota: {
          id: ROTA_ID,
          turno: "MANHA",
        },
      });

    const otimizarStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves();

    await alunoService.associarAlunoARota(
      ALUNO_ID,
      ROTA_ID
    );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaIdaId: ROTA_ID,
      }
    );

    assert.equal(otimizarStub.calledOnce, true);
  });

  // ==========================================
  // 7. DESASSOCIAR ALUNO DA ROTA
  // ==========================================

  it("deve desassociar um aluno de sua rota de ida", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      rotaIdaId: ROTA_ID,
      rotaVoltaId: "outra-rota",
      ordemNaRotaIda: 2,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaIdaId: null,
      rotaVoltaId: "outra-rota",
      ordemNaRotaIda: null,
    };

    const findByPkStub = sinon
      .stub(models.Aluno, "findByPk")
      .callsFake(async (_id, options) => {
        if (options?.include) {
          return alunoAtualizado;
        }

        return alunoBanco;
      });

    const otimizarRotaStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves();

    const resultado =
      await alunoService.desassociarAlunoDaRota(
        ALUNO_ID,
        ROTA_ID
      );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaIdaId: null,
        ordemNaRotaIda: null,
      }
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);
    assert.strictEqual(findByPkStub.callCount, 2);
    assert.strictEqual(otimizarRotaStub.calledOnce, true);

    assert.deepStrictEqual(
      otimizarRotaStub.firstCall.args,
      [ROTA_ID, null, { salvarNoBanco: true }]
    );
  });

  it("deve desassociar o aluno das rotas de ida e volta quando ambas coincidirem", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      rotaIdaId: ROTA_ID,
      rotaVoltaId: ROTA_ID,
      ordemNaRotaIda: 1,
      ordemNaRotaVolta: 2,
      update: sinon.stub().resolves(),
    };

    const alunoAtualizado = {
      id: ALUNO_ID,
      rotaIdaId: null,
      rotaVoltaId: null,
      ordemNaRotaIda: null,
      ordemNaRotaVolta: null,
    };

    sinon
      .stub(models.Aluno, "findByPk")
      .callsFake(async (_id, opcoes) => {
        if (opcoes?.include) {
          return alunoAtualizado;
        }

        return alunoBanco;
      });

    const otimizarStub = sinon
      .stub(rotaService, "otimizarRota")
      .resolves();

    const resultado =
      await alunoService.desassociarAlunoDaRota(
        ALUNO_ID,
        ROTA_ID
      );

    assert.deepStrictEqual(
      alunoBanco.update.firstCall.args[0],
      {
        rotaIdaId: null,
        ordemNaRotaIda: null,
        rotaVoltaId: null,
        ordemNaRotaVolta: null,
      }
    );

    assert.deepStrictEqual(resultado, alunoAtualizado);
    assert.equal(otimizarStub.calledOnce, true);
  });

  it("deve lançar erro 400 quando o aluno não estiver associado à rota", async () => {
    const alunoBanco = {
      id: ALUNO_ID,
      rotaIdaId: "outra-rota-1",
      rotaVoltaId: "outra-rota-2",
      update: sinon.stub().resolves(),
    };

    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(alunoBanco);

    const otimizarRotaStub = sinon.stub(
      rotaService,
      "otimizarRota"
    );

    await assert.rejects(
      alunoService.desassociarAlunoDaRota(
        ALUNO_ID,
        ROTA_ID
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);
        assert.strictEqual(
          erro.message,
          "O aluno informado não está associado a esta rota."
        );
        return true;
      }
    );

    assert.strictEqual(alunoBanco.update.notCalled, true);
    assert.strictEqual(otimizarRotaStub.notCalled, true);
  });

  it("deve lançar erro 404 ao desassociar um aluno inexistente", async () => {
    sinon
      .stub(models.Aluno, "findByPk")
      .resolves(null);

    await assert.rejects(
      alunoService.desassociarAlunoDaRota(
        ALUNO_ID,
        ROTA_ID
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
  });

  // ==========================================
  // 8. GET ALUNOS BY ROTA
  // ==========================================

  it("deve buscar os alunos associados a uma rota", async () => {
    const alunosEsperados = [
      { id: ALUNO_ID, rotaIdaId: ROTA_ID },
    ];

    sinon
      .stub(models.Rota, "findByPk")
      .resolves({ id: ROTA_ID });

    const findAllStub = sinon
      .stub(models.Aluno, "findAll")
      .resolves(alunosEsperados);

    const resultado = await alunoService.getAlunosByRota(
      ROTA_ID
    );

    assert.deepStrictEqual(resultado, alunosEsperados);

    const opcoes = findAllStub.firstCall.args[0];

    assert.deepStrictEqual(opcoes.where[Op.or], [
      { rotaIdaId: ROTA_ID },
      { rotaVoltaId: ROTA_ID },
    ]);

    assert.deepStrictEqual(
      opcoes.include.map((item) => item.as),
      ["responsavel", "rotaIda", "rotaVolta"]
    );
  });

  it("deve lançar erro 404 quando a rota não existir na consulta", async () => {
    sinon
      .stub(models.Rota, "findByPk")
      .resolves(null);

    const findAllStub = sinon.stub(
      models.Aluno,
      "findAll"
    );

    await assert.rejects(
      alunoService.getAlunosByRota(ROTA_ID),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Rota não encontrada."
        );
        return true;
      }
    );

    assert.strictEqual(findAllStub.notCalled, true);
  });

  // ==========================================
  // 9. GET ALUNOS BY RESPONSÁVEL
  // ==========================================

  it("deve buscar todos os alunos de um responsável", async () => {
    const alunosEsperados = [
      { id: ALUNO_ID, responsavelId: RESPONSAVEL_ID },
    ];

    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves({ id: RESPONSAVEL_ID });

    const findAllStub = sinon
      .stub(models.Aluno, "findAll")
      .resolves(alunosEsperados);

    const resultado =
      await alunoService.getAlunosByResponsavel(
        RESPONSAVEL_ID
      );

    assert.deepStrictEqual(resultado, alunosEsperados);

    assert.deepStrictEqual(
      findAllStub.firstCall.args[0].where,
      { responsavelId: RESPONSAVEL_ID }
    );

    assert.deepStrictEqual(
      findAllStub.firstCall.args[0].include.map(
        (item) => item.as
      ),
      ["responsavel", "rotaIda", "rotaVolta"]
    );
  });

  it("deve lançar erro 404 quando o responsável não existir na consulta", async () => {
    sinon
      .stub(models.Responsavel, "findByPk")
      .resolves(null);

    const findAllStub = sinon.stub(
      models.Aluno,
      "findAll"
    );

    await assert.rejects(
      alunoService.getAlunosByResponsavel(
        RESPONSAVEL_ID
      ),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);
        assert.strictEqual(
          erro.message,
          "Responsável não encontrado."
        );
        return true;
      }
    );

    assert.strictEqual(findAllStub.notCalled, true);
  });
});
