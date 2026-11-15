
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { Op } from "sequelize";

import models from "../../src/models/index.js";
import { AppError } from "../../src/utils/index.js";
import rotaService from "../../src/services/rotaService.js";

afterEach(() => {
  sinon.restore();
});

const criarRota = (dados = {}) => ({
  id: "rota-1",
  motoristaId: "motorista-1",
  nome: "Rota escolar",
  turno: "MANHA",
  pontoInicialLat: null,
  pontoInicialLng: null,
  pontoFinalLat: null,
  pontoFinalLng: null,
  update: sinon.stub().resolves(),
  destroy: sinon.stub().resolves(),
  ...dados,
});

const prepararOtimizacao = (rota, alunos = [], cancelamentos = []) => {
  sinon.stub(models.Rota, "findByPk").resolves(rota);
  sinon.stub(models.Aluno, "findAll").resolves(alunos);
  sinon.stub(models.ViagemDiaria, "findAll").resolves(cancelamentos);
};

describe("rotaService", () => {
  describe("getAllRotas", () => {
    it("deve listar todas as rotas sem filtro de motorista", async () => {
      const rotas = [{ id: "rota-1" }];

      const findAllStub = sinon
        .stub(models.Rota, "findAll")
        .resolves(rotas);

      const resultado = await rotaService.getAllRotas();

      assert.equal(resultado, rotas);
      assert.deepEqual(findAllStub.firstCall.args[0].where, {});
    });

    it("deve filtrar rotas pelo motorista informado", async () => {
      const findAllStub = sinon
        .stub(models.Rota, "findAll")
        .resolves([]);

      await rotaService.getAllRotas("motorista-1");

      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        motoristaId: "motorista-1",
      });
    });

    it("deve incluir motorista e alunos da rota", async () => {
      const findAllStub = sinon
        .stub(models.Rota, "findAll")
        .resolves([]);

      await rotaService.getAllRotas();

      const includes = findAllStub.firstCall.args[0].include;

      assert.equal(includes[0].model, models.Motorista);
      assert.equal(includes[0].as, "motorista");
      assert.equal(includes[1].model, models.Aluno);
      assert.equal(includes[1].as, "alunosIda");
      assert.equal(includes[2].model, models.Aluno);
      assert.equal(includes[2].as, "alunosVolta");
    });
  });

  describe("getRotaById", () => {
    it("deve buscar uma rota pelo ID", async () => {
      const rota = criarRota();

      const findByPkStub = sinon
        .stub(models.Rota, "findByPk")
        .resolves(rota);

      const resultado = await rotaService.getRotaById("rota-1");

      assert.equal(resultado, rota);
      assert.equal(findByPkStub.firstCall.args[0], "rota-1");
    });

    it("deve retornar null quando a rota não existir", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(null);

      const resultado = await rotaService.getRotaById("inexistente");

      assert.equal(resultado, null);
    });

    it("deve lançar erro 403 quando o motorista tentar acessar rota de outro motorista", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(
        criarRota({ motoristaId: "outro-motorista" }),
      );

      await assert.rejects(
        rotaService.getRotaById("rota-1", "motorista-1"),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Acesso não autorizado a uma rota de outro motorista.",
      );
    });

    it("deve permitir buscar rota sem informar motorista", async () => {
      const rota = criarRota({
        motoristaId: "outro-motorista",
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const resultado = await rotaService.getRotaById("rota-1");

      assert.equal(resultado, rota);
    });
  });

  describe("createRota", () => {
    it("deve criar uma rota com os dados informados", async () => {
      const rota = criarRota();

      const createStub = sinon
        .stub(models.Rota, "create")
        .resolves({ id: "rota-1" });

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const resultado = await rotaService.createRota("motorista-1", {
        nome: "Rota escolar",
        turno: "MANHA",
      });

      assert.equal(resultado, rota);

      assert.deepEqual(createStub.firstCall.args[0], {
        motoristaId: "motorista-1",
        nome: "Rota escolar",
        turno: "MANHA",
        pontoInicialLat: null,
        pontoInicialLng: null,
        pontoFinalLat: null,
        pontoFinalLng: null,
        distanciaTotalKm: null,
        tempoEstimadoMin: null,
      });
    });

    it("deve usar MANHA como turno padrão", async () => {
      const createStub = sinon
        .stub(models.Rota, "create")
        .resolves({ id: "rota-1" });

      sinon.stub(models.Rota, "findByPk").resolves(criarRota());

      await rotaService.createRota("motorista-1", {
        nome: "Rota escolar",
      });

      assert.equal(createStub.firstCall.args[0].turno, "MANHA");
    });

    it("deve manter coordenadas e métricas informadas", async () => {
      const createStub = sinon
        .stub(models.Rota, "create")
        .resolves({ id: "rota-1" });

      sinon.stub(models.Rota, "findByPk").resolves(criarRota());

      await rotaService.createRota("motorista-1", {
        nome: "Rota escolar",
        turno: "TARDE",
        pontoInicialLat: -8.05,
        pontoInicialLng: -34.9,
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
        distanciaTotalKm: 12.5,
        tempoEstimadoMin: 35,
      });

      assert.deepEqual(createStub.firstCall.args[0], {
        motoristaId: "motorista-1",
        nome: "Rota escolar",
        turno: "TARDE",
        pontoInicialLat: -8.05,
        pontoInicialLng: -34.9,
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
        distanciaTotalKm: 12.5,
        tempoEstimadoMin: 35,
      });
    });

    it("deve retornar a rota criada buscando novamente pelo ID", async () => {
      const rota = criarRota();

      sinon.stub(models.Rota, "create").resolves({ id: "rota-1" });

      const findByPkStub = sinon
        .stub(models.Rota, "findByPk")
        .resolves(rota);

      const resultado = await rotaService.createRota("motorista-1", {
        nome: "Rota escolar",
      });

      assert.equal(resultado, rota);
      assert.equal(findByPkStub.firstCall.args[0], "rota-1");
    });
  });

  describe("updateRota", () => {
    it("deve retornar null quando a rota não existir", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(null);

      const resultado = await rotaService.updateRota(
        "inexistente",
        "motorista-1",
        { nome: "Nova rota" },
      );

      assert.equal(resultado, null);
    });

    it("deve atualizar os campos informados", async () => {
      const rota = criarRota();

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const resultado = await rotaService.updateRota(
        "rota-1",
        "motorista-1",
        {
          nome: "Nova rota",
          turno: "TARDE",
          pontoInicialLat: -8.05,
          pontoInicialLng: -34.9,
          pontoFinalLat: -8.1,
          pontoFinalLng: -34.95,
          distanciaTotalKm: 10,
          tempoEstimadoMin: 30,
        },
      );

      sinon.assert.calledOnceWithExactly(rota.update, {
        nome: "Nova rota",
        turno: "TARDE",
        pontoInicialLat: -8.05,
        pontoInicialLng: -34.9,
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
        distanciaTotalKm: 10,
        tempoEstimadoMin: 30,
      });

      assert.equal(resultado, rota);
    });

    it("não deve atualizar quando nenhum campo for informado", async () => {
      const rota = criarRota();

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      await rotaService.updateRota("rota-1", "motorista-1", {});

      sinon.assert.notCalled(rota.update);
    });

    it("deve retornar null quando a rota desaparecer na segunda consulta", async () => {
      const rota = criarRota();

      sinon.stub(models.Rota, "findByPk")
        .onFirstCall()
        .resolves(rota)
        .onSecondCall()
        .resolves(null);

      const resultado = await rotaService.updateRota(
        "rota-1",
        "motorista-1",
        { nome: "Nova rota" },
      );

      assert.equal(resultado, null);
      sinon.assert.calledOnce(rota.update);
    });

    it("deve propagar erro de acesso não autorizado", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(
        criarRota({ motoristaId: "outro-motorista" }),
      );

      await assert.rejects(
        rotaService.updateRota("rota-1", "motorista-1", {
          nome: "Nova rota",
        }),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Acesso não autorizado a uma rota de outro motorista.",
      );
    });
  });

  describe("deleteRota", () => {
    it("deve retornar false quando a rota não existir", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(null);

      const resultado = await rotaService.deleteRota(
        "inexistente",
        "motorista-1",
      );

      assert.equal(resultado, false);
    });

    it("deve excluir uma rota existente e retornar true", async () => {
      const rota = criarRota();

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const resultado = await rotaService.deleteRota(
        "rota-1",
        "motorista-1",
      );

      assert.equal(resultado, true);
      sinon.assert.calledOnce(rota.destroy);
    });

    it("deve propagar erro de acesso não autorizado", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(
        criarRota({ motoristaId: "outro-motorista" }),
      );

      await assert.rejects(
        rotaService.deleteRota("rota-1", "motorista-1"),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Acesso não autorizado a uma rota de outro motorista.",
      );
    });
  });

  describe("validarCapacidadeRota", () => {
    it("deve lançar erro 404 quando a rota não existir", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(null);

      await assert.rejects(
        rotaService.validarCapacidadeRota("inexistente"),
        (error) =>
          error instanceof AppError &&
          error.message === "Rota não encontrada.",
      );
    });

    it("deve usar capacidade padrão de 15 quando motorista não tiver capacidade definida", async () => {
      const rota = criarRota({
        motorista: {},
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);
      sinon.stub(models.Aluno, "count").resolves(5);

      const resultado =
        await rotaService.validarCapacidadeRota("rota-1");

      assert.equal(resultado.capacidadeMaxima, 15);
      assert.equal(resultado.vagasOcupadas, 5);
      assert.equal(resultado.vagasDisponiveis, 10);
    });

    it("deve usar a capacidade definida pelo motorista", async () => {
      const rota = criarRota({
        motorista: { capacidadeVan: 10 },
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);
      sinon.stub(models.Aluno, "count").resolves(4);

      const resultado =
        await rotaService.validarCapacidadeRota("rota-1");

      assert.equal(resultado.capacidadeMaxima, 10);
      assert.equal(resultado.vagasDisponiveis, 6);
    });

    it("deve contar alunos pela rota de volta no turno da tarde", async () => {
      const rota = criarRota({
        turno: "TARDE",
        motorista: { capacidadeVan: 15 },
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const countStub = sinon
        .stub(models.Aluno, "count")
        .resolves(3);

      await rotaService.validarCapacidadeRota("rota-1");

      assert.deepEqual(countStub.firstCall.args[0].where, {
        rotaVoltaId: "rota-1",
      });
    });

    it("deve contar alunos pela rota de ida nos demais turnos", async () => {
      const rota = criarRota({
        turno: "MANHA",
        motorista: { capacidadeVan: 15 },
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);

      const countStub = sinon
        .stub(models.Aluno, "count")
        .resolves(3);

      await rotaService.validarCapacidadeRota("rota-1");

      assert.deepEqual(countStub.firstCall.args[0].where, {
        rotaIdaId: "rota-1",
      });
    });

    it("deve lançar erro 409 quando a capacidade máxima for atingida", async () => {
      const rota = criarRota({
        motorista: { capacidadeVan: 10 },
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);
      sinon.stub(models.Aluno, "count").resolves(10);

      await assert.rejects(
        rotaService.validarCapacidadeRota("rota-1"),
        (error) =>
          error instanceof AppError &&
          error.message.includes("Capacidade máxima da van"),
      );
    });

    it("deve retornar os dados da capacidade quando houver vagas", async () => {
      const rota = criarRota({
        motorista: { capacidadeVan: 12 },
      });

      sinon.stub(models.Rota, "findByPk").resolves(rota);
      sinon.stub(models.Aluno, "count").resolves(7);

      const resultado =
        await rotaService.validarCapacidadeRota("rota-1");

      assert.deepEqual(resultado, {
        rota,
        capacidadeMaxima: 12,
        vagasOcupadas: 7,
        vagasDisponiveis: 5,
      });
    });
  });

  describe("otimizarRota", () => {
    it("deve lançar erro 404 quando a rota não existir", async () => {
      sinon.stub(models.Rota, "findByPk").resolves(null);

      await assert.rejects(
        rotaService.otimizarRota("inexistente", "motorista-1"),
        (error) =>
          error instanceof AppError &&
          error.message === "Rota não encontrada.",
      );
    });

    it("deve retornar uma rota sem paradas quando não houver alunos", async () => {
      const rota = criarRota();

      prepararOtimizacao(rota, []);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.rotaId, "rota-1");
      assert.equal(resultado.dataReferencia, "2026-11-14");
      assert.equal(resultado.resumo.totalAlunosVinculados, 0);
      assert.equal(resultado.resumo.alunosAtivosHoje, 0);
      assert.deepEqual(resultado.paradas, []);
      sinon.assert.notCalled(models.ViagemDiaria.findAll);
    });

    it("deve usar a data informada como referência", async () => {
      const rota = criarRota();

      prepararOtimizacao(rota, []);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-20", salvarNoBanco: false },
      );

      assert.equal(resultado.dataReferencia, "2026-11-20");
    });

    it("deve ordenar alunos com coordenadas pela proximidade", async () => {
      const rota = criarRota({
        pontoInicialLat: -8.05,
        pontoInicialLng: -34.9,
      });

      const alunos = [
        {
          id: "aluno-longe",
          nome: "Aluno distante",
          latitudeEmbarque: -8.2,
          longitudeEmbarque: -34.9,
        },
        {
          id: "aluno-perto",
          nome: "Aluno próximo",
          latitudeEmbarque: -8.051,
          longitudeEmbarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.paradas.length, 2);
      assert.equal(resultado.paradas[0].alunoId, "aluno-perto");
      assert.equal(resultado.paradas[1].alunoId, "aluno-longe");
      assert.equal(resultado.paradas[0].ordem, 1);
      assert.equal(resultado.paradas[1].ordem, 2);
    });

    it("deve adicionar alunos sem coordenadas ao final da rota", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-sem-coordenada",
          nome: "Sem coordenada",
          enderecoEmbarque: "Rua A",
          latitudeEmbarque: null,
          longitudeEmbarque: null,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.paradas.length, 1);
      assert.equal(resultado.paradas[0].latitude, null);
      assert.equal(resultado.paradas[0].longitude, null);
      assert.equal(resultado.paradas[0].distanciaTrechoKm, 0);
      assert.equal(resultado.paradas[0].tempoTrechoMin, 2);
      assert.equal(resultado.resumo.tempoEstimadoMin, 2);
    });

    it("deve usar coordenadas e endereço alternativos quando os principais não existirem", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: null,
          longitudeEmbarque: null,
          latitudeDesembarque: -8.1,
          longitudeDesembarque: -34.9,
          enderecoEmbarque: null,
          enderecoDesembarque: "Endereço alternativo",
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.paradas[0].latitude, -8.1);
      assert.equal(
        resultado.paradas[0].endereco,
        "Endereço alternativo",
      );
    });

    it("deve considerar cancelamentos e separar alunos ausentes dos ativos", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-ativo",
          nome: "Aluno ativo",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
        {
          id: "aluno-cancelado",
          nome: "Aluno cancelado",
          latitudeEmbarque: -8.06,
          longitudeEmbarque: -34.91,
        },
      ];

      const cancelamentos = [
        {
          alunoId: "aluno-cancelado",
          turnoCancelado: "MANHA",
          motivoCancelamento: "Consulta",
        },
      ];

      prepararOtimizacao(rota, alunos, cancelamentos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.resumo.totalAlunosVinculados, 2);
      assert.equal(resultado.resumo.alunosAtivosHoje, 1);
      assert.equal(resultado.resumo.alunosAusentesHoje, 1);
      assert.equal(resultado.paradas.length, 1);
      assert.equal(
        resultado.alunosCanceladosNoDia[0].motivoCancelamento,
        "Consulta",
      );
    });

    it("deve consultar cancelamentos usando os IDs, data e turnos da rota", async () => {
      const rota = criarRota();

      const alunos = [
        { id: "aluno-1", nome: "Aluno 1" },
        { id: "aluno-2", nome: "Aluno 2" },
      ];

      prepararOtimizacao(rota, alunos);

      await rotaService.otimizarRota("rota-1", "motorista-1", {
        data: "2026-11-14",
        salvarNoBanco: false,
      });

      const options = models.ViagemDiaria.findAll.firstCall.args[0];

      assert.deepEqual(options.where.alunoId, {
        [Op.in]: ["aluno-1", "aluno-2"],
      });
      assert.equal(options.where.data, "2026-11-14");
      assert.deepEqual(options.where.turnoCancelado, {
        [Op.in]: ["MANHA", "AMBOS"],
      });
    });

    it("deve usar campos de rota de volta e desembarque no turno da tarde", async () => {
      const rota = criarRota({
        turno: "TARDE",
      });

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeDesembarque: -8.1,
          longitudeDesembarque: -34.95,
          enderecoDesembarque: "Endereço de desembarque",
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.paradas[0].tipoParada, "DESEMBARQUE");
      assert.equal(resultado.paradas[0].latitude, -8.1);
      assert.equal(
        resultado.paradas[0].endereco,
        "Endereço de desembarque",
      );

      assert.deepEqual(models.Aluno.findAll.firstCall.args[0].where, {
        rotaVoltaId: "rota-1",
      });
    });

    it("deve usar rota de ida no turno da manhã", async () => {
      const rota = criarRota();

      prepararOtimizacao(rota, []);

      await rotaService.otimizarRota("rota-1", "motorista-1", {
        data: "2026-11-14",
        salvarNoBanco: false,
      });

      assert.deepEqual(models.Aluno.findAll.firstCall.args[0].where, {
        rotaIdaId: "rota-1",
      });
    });

    it("deve incluir informações de contato nas paradas", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          nomeContatoEntrega: "Responsável",
          telefoneContatoEntrega: "81999999999",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
          escola: "Escola A",
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.deepEqual(resultado.paradas[0].contatoEntrega, {
        nome: "Responsável",
        telefone: "81999999999",
      });

      assert.equal(resultado.paradas[0].escola, "Escola A");
    });

    it("deve calcular trecho final quando houver ponto final e paradas", async () => {
      const rota = criarRota({
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
      });

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.ok(resultado.resumo.distanciaTotalKm > 0);
      assert.ok(resultado.resumo.tempoEstimadoMin > 0);
    });

    it("deve montar waypoints de início, paradas e fim", async () => {
      const rota = criarRota({
        pontoInicialLat: -8.05,
        pontoInicialLng: -34.9,
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
      });

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: -8.06,
          longitudeEmbarque: -34.91,
          enderecoEmbarque: "Rua A",
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.waypoints.length, 3);
      assert.equal(resultado.waypoints[0].tipo, "INICIO");
      assert.equal(resultado.waypoints[1].tipo, "PARADA_ALUNO");
      assert.equal(resultado.waypoints[2].tipo, "FIM");
    });

    it("não deve criar waypoint para aluno sem coordenadas", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: null,
          longitudeEmbarque: null,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.deepEqual(resultado.waypoints, []);
    });

    it("deve persistir a ordem dos alunos e as métricas da rota por padrão", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const updateAlunoStub = sinon
        .stub(models.Aluno, "update")
        .resolves([1]);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14" },
      );

      sinon.assert.calledOnceWithExactly(
        updateAlunoStub,
        { ordemNaRotaIda: 1 },
        { where: { id: "aluno-1" } },
      );

      sinon.assert.calledOnce(rota.update);
      assert.equal(
        rota.update.firstCall.args[0].distanciaTotalKm,
        resultado.resumo.distanciaTotalKm,
      );
      assert.equal(
        rota.update.firstCall.args[0].tempoEstimadoMin,
        resultado.resumo.tempoEstimadoMin,
      );
    });

    it("não deve persistir alterações quando salvarNoBanco for false", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const updateAlunoStub = sinon.stub(models.Aluno, "update");

      await rotaService.otimizarRota("rota-1", "motorista-1", {
        data: "2026-11-14",
        salvarNoBanco: false,
      });

      sinon.assert.notCalled(updateAlunoStub);
      sinon.assert.notCalled(rota.update);
    });

    it("deve persistir a ordem de desembarque no turno da tarde", async () => {
      const rota = criarRota({
        turno: "TARDE",
      });

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeDesembarque: -8.05,
          longitudeDesembarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const updateAlunoStub = sinon
        .stub(models.Aluno, "update")
        .resolves([1]);

      await rotaService.otimizarRota("rota-1", "motorista-1", {
        data: "2026-11-14",
      });

      sinon.assert.calledOnceWithExactly(
        updateAlunoStub,
        { ordemNaRotaVolta: 1 },
        { where: { id: "aluno-1" } },
      );
    });

    it("não deve atualizar métricas da rota quando não houver paradas", async () => {
      const rota = criarRota();

      prepararOtimizacao(rota, []);

      await rotaService.otimizarRota("rota-1", "motorista-1", {
        data: "2026-11-14",
      });

      sinon.assert.notCalled(rota.update);
    });

    it("deve usar coordenadas padrão quando não houver ponto inicial nem aluno com coordenadas", async () => {
      const rota = criarRota();

      prepararOtimizacao(rota, []);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.deepEqual(resultado.pontoInicial, {
        latitude: null,
        longitude: null,
      });
    });

    it("deve retornar alunos cancelados sem criar paradas para eles", async () => {
      const rota = criarRota();

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno cancelado",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
      ];

      const cancelamentos = [
        {
          alunoId: "aluno-1",
          turnoCancelado: "AMBOS",
          motivoCancelamento: "Viagem suspensa",
        },
      ];

      prepararOtimizacao(rota, alunos, cancelamentos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      assert.equal(resultado.paradas.length, 0);
      assert.equal(resultado.alunosCanceladosNoDia.length, 1);
      assert.equal(
        resultado.alunosCanceladosNoDia[0].turnoCancelado,
        "AMBOS",
      );
    });

    it("deve incluir ponto final nos waypoints quando configurado", async () => {
      const rota = criarRota({
        pontoFinalLat: -8.1,
        pontoFinalLng: -34.95,
      });

      const alunos = [
        {
          id: "aluno-1",
          nome: "Aluno",
          latitudeEmbarque: -8.05,
          longitudeEmbarque: -34.9,
        },
      ];

      prepararOtimizacao(rota, alunos);

      const resultado = await rotaService.otimizarRota(
        "rota-1",
        "motorista-1",
        { data: "2026-11-14", salvarNoBanco: false },
      );

      const waypointFinal = resultado.waypoints.at(-1);

      assert.equal(waypointFinal.tipo, "FIM");
      assert.ok(waypointFinal.distanciaTrechoFinalKm > 0);
      assert.ok(waypointFinal.tempoTrechoFinalMin > 0);
    });
  });
});
