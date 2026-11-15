
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { default: models } = await import("../../src/models/index.js");

const { default: rotaService } = await import(
  "../../src/services/rotaService.js"
);

const alunoOriginal = models.Aluno;

afterEach(() => {
  sinon.restore();
  models.Aluno = alunoOriginal;
});

describe("rotaService - ramificações restantes", () => {
  it("deve buscar rotas sem incluir alunos quando o model Aluno não estiver disponível", async () => {
    models.Aluno = undefined;

    const findAllStub = sinon
      .stub(models.Rota, "findAll")
      .resolves([]);

    const resultado = await rotaService.getAllRotas("motorista-1");

    assert.deepEqual(resultado, []);
    assert.equal(findAllStub.calledOnce, true);

    const opcoes = findAllStub.firstCall.args[0];

    assert.deepEqual(opcoes.where, {
      motoristaId: "motorista-1",
    });

    assert.equal(opcoes.include.length, 1);
    assert.equal(opcoes.include[0].as, "motorista");
  });

  it("deve usar as coordenadas do primeiro aluno quando as coordenadas iniciais forem undefined", async () => {
    const aluno = {
      id: "aluno-1",
      nome: "Aluno Teste",
      escola: "Escola Teste",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      enderecoEmbarque: "Rua Teste",
      enderecoDesembarque: null,
      nomeContatoEntrega: "Responsável",
      telefoneContatoEntrega: "81999999999",
    };

    const rota = {
      id: "rota-1",
      motoristaId: "motorista-1",
      nome: "Rota Teste",
      turno: "MANHA",
      pontoInicialLat: undefined,
      pontoInicialLng: undefined,
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([aluno]);
    sinon.stub(models.ViagemDiaria, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-1",
      "motorista-1",
      {
        data: "2026-11-14",
        salvarNoBanco: false,
      },
    );

    assert.equal(resultado.paradas.length, 1);

    const primeiraParada = resultado.paradas[0];

    assert.equal(primeiraParada.alunoId, "aluno-1");
    assert.equal(primeiraParada.distanciaTrechoKm, 0);
    assert.equal(primeiraParada.tempoTrechoMin, 2);

    assert.equal(resultado.resumo.distanciaTotalKm, 0);
    assert.equal(resultado.resumo.tempoEstimadoMin, 2);

    assert.equal(models.Rota.findByPk.calledOnce, true);
    assert.equal(models.Aluno.findAll.calledOnce, true);
    assert.equal(models.ViagemDiaria.findAll.calledOnce, true);

    assert.equal(rota.update.notCalled, true);
  });

  it("deve gerar automaticamente a data de referência quando nenhuma data for informada", async () => {
    const rota = {
      id: "rota-1",
      motoristaId: "motorista-1",
      nome: "Rota Teste",
      turno: "MANHA",
      pontoInicialLat: null,
      pontoInicialLng: null,
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-1",
      "motorista-1",
      {
        salvarNoBanco: false,
      },
    );

    assert.equal(typeof resultado.dataReferencia, "string");
    assert.notEqual(resultado.dataReferencia.length, 0);

    assert.deepEqual(resultado.paradas, []);

    assert.equal(resultado.resumo.totalAlunosVinculados, 0);
    assert.equal(resultado.resumo.alunosAtivosHoje, 0);
    assert.equal(resultado.resumo.alunosAusentesHoje, 0);

    assert.equal(rota.update.notCalled, true);
  });

  it("deve usar as coordenadas do primeiro aluno quando as coordenadas iniciais forem null", async () => {
    const aluno = {
      id: "aluno-null",
      nome: "Aluno Null",
      escola: "Escola Teste",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      enderecoEmbarque: "Rua Teste",
      enderecoDesembarque: null,
      nomeContatoEntrega: "Responsável",
      telefoneContatoEntrega: "81999999999",
    };

    const rota = {
      id: "rota-null",
      motoristaId: "motorista-1",
      nome: "Rota Teste",
      turno: "MANHA",
      pontoInicialLat: null,
      pontoInicialLng: null,
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([aluno]);
    sinon.stub(models.ViagemDiaria, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-null",
      "motorista-1",
      {
        data: "2026-11-14",
        salvarNoBanco: false,
      },
    );

    assert.equal(resultado.paradas.length, 1);
    assert.equal(resultado.paradas[0].alunoId, "aluno-null");
    assert.equal(resultado.paradas[0].distanciaTrechoKm, 0);
    assert.equal(resultado.paradas[0].tempoTrechoMin, 2);

    assert.equal(resultado.resumo.distanciaTotalKm, 0);
    assert.equal(resultado.resumo.tempoEstimadoMin, 2);

    assert.equal(rota.update.notCalled, true);
  });

  it("deve utilizar as coordenadas padrão quando nenhum aluno possuir coordenadas", async () => {
    const aluno = {
      id: "aluno-sem-coordenadas",
      nome: "Aluno Sem Coordenadas",
      escola: "Escola Teste",
      latitudeEmbarque: null,
      longitudeEmbarque: null,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      enderecoEmbarque: "Rua Teste",
      enderecoDesembarque: null,
      nomeContatoEntrega: "Responsável",
      telefoneContatoEntrega: "81999999999",
    };

    const rota = {
      id: "rota-sem-coordenadas",
      motoristaId: "motorista-1",
      nome: "Rota Sem Coordenadas",
      turno: "MANHA",
      pontoInicialLat: null,
      pontoInicialLng: null,
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([aluno]);
    sinon.stub(models.ViagemDiaria, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-sem-coordenadas",
      "motorista-1",
      {
        data: "2026-11-14",
        salvarNoBanco: false,
      },
    );

    assert.equal(resultado.paradas.length, 1);

    const parada = resultado.paradas[0];

    assert.equal(parada.alunoId, "aluno-sem-coordenadas");
    assert.equal(parada.latitude, null);
    assert.equal(parada.longitude, null);
    assert.equal(parada.distanciaTrechoKm, 0);
    assert.equal(parada.tempoTrechoMin, 2);

    assert.equal(resultado.resumo.totalAlunosVinculados, 1);
    assert.equal(resultado.resumo.alunosAtivosHoje, 1);
    assert.equal(resultado.resumo.distanciaTotalKm, 0);
    assert.equal(resultado.resumo.tempoEstimadoMin, 2);

    assert.equal(rota.update.notCalled, true);
  });

  it("deve utilizar as coordenadas iniciais cadastradas na rota", async () => {
    const aluno = {
      id: "aluno-coordenadas",
      nome: "Aluno Coordenadas",
      escola: "Escola Teste",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      enderecoEmbarque: "Rua Teste",
      enderecoDesembarque: null,
      nomeContatoEntrega: "Responsável",
      telefoneContatoEntrega: "81999999999",
    };

    const rota = {
      id: "rota-coordenadas",
      motoristaId: "motorista-1",
      nome: "Rota Com Coordenadas",
      turno: "MANHA",
      pontoInicialLat: "-8.10",
      pontoInicialLng: "-34.95",
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([aluno]);
    sinon.stub(models.ViagemDiaria, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-coordenadas",
      "motorista-1",
      {
        data: "2026-11-14",
        salvarNoBanco: false,
      },
    );

    assert.equal(resultado.paradas.length, 1);

    assert.equal(
      resultado.paradas[0].alunoId,
      "aluno-coordenadas",
    );

    assert.ok(resultado.paradas[0].distanciaTrechoKm > 0);
    assert.ok(resultado.paradas[0].tempoTrechoMin > 2);

    assert.equal(resultado.waypoints[0].tipo, "INICIO");
    assert.equal(resultado.waypoints[0].latitude, -8.1);
    assert.equal(resultado.waypoints[0].longitude, -34.95);

    assert.equal(rota.update.notCalled, true);
  });

  it("deve utilizar as coordenadas de embarque como fallback no turno da tarde", async () => {
    const aluno = {
      id: "aluno-fallback-tarde",
      nome: "Aluno Fallback",
      escola: "Escola Teste",
      latitudeEmbarque: -8.05,
      longitudeEmbarque: -34.9,
      latitudeDesembarque: null,
      longitudeDesembarque: null,
      enderecoEmbarque: "Rua de Embarque",
      enderecoDesembarque: null,
      nomeContatoEntrega: "Responsável",
      telefoneContatoEntrega: "81999999999",
    };

    const rota = {
      id: "rota-fallback-tarde",
      motoristaId: "motorista-1",
      nome: "Rota Tarde",
      turno: "TARDE",
      pontoInicialLat: null,
      pontoInicialLng: null,
      pontoFinalLat: null,
      pontoFinalLng: null,
      update: sinon.stub().resolves(),
    };

    sinon.stub(models.Rota, "findByPk").resolves(rota);
    sinon.stub(models.Aluno, "findAll").resolves([aluno]);
    sinon.stub(models.ViagemDiaria, "findAll").resolves([]);

    const resultado = await rotaService.otimizarRota(
      "rota-fallback-tarde",
      "motorista-1",
      {
        data: "2026-11-14",
        salvarNoBanco: false,
      },
    );

    assert.equal(resultado.paradas.length, 1);

    assert.equal(resultado.paradas[0].tipoParada, "DESEMBARQUE");
    assert.equal(resultado.paradas[0].latitude, -8.05);
    assert.equal(resultado.paradas[0].longitude, -34.9);
    assert.equal(resultado.paradas[0].endereco, "Rua de Embarque");

    assert.equal(rota.update.notCalled, true);
  });
});
