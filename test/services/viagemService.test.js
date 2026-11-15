
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";

import models from "../../src/models/index.js";
import { AppError } from "../../src/utils/index.js";
import viagemService from "../../src/services/viagemService.js";

afterEach(() => {
  sinon.restore();
});

describe("viagemService", () => {
  describe("getViagensDoAluno", () => {
    it("deve listar viagens de um aluno sem filtros", async () => {
      const viagens = [{ id: "viagem-1" }];

      const findAllStub = sinon
        .stub(models.ViagemDiaria, "findAll")
        .resolves(viagens);

      const resultado = await viagemService.getViagensDoAluno("aluno-1");

      assert.deepEqual(resultado, viagens);
      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
      });
      assert.deepEqual(findAllStub.firstCall.args[0].order, [
        ["data", "DESC"],
      ]);
    });

    it("deve filtrar viagens pela data", async () => {
      const findAllStub = sinon
        .stub(models.ViagemDiaria, "findAll")
        .resolves([]);

      await viagemService.getViagensDoAluno("aluno-1", {
        data: "2026-11-14",
      });

      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-14",
      });
    });

    it("deve incluir os dados básicos do aluno na consulta", async () => {
      const findAllStub = sinon
        .stub(models.ViagemDiaria, "findAll")
        .resolves([]);

      await viagemService.getViagensDoAluno("aluno-1");

      const options = findAllStub.firstCall.args[0];

      assert.equal(options.include[0].model, models.Aluno);
      assert.equal(options.include[0].as, "aluno");
      assert.deepEqual(options.include[0].attributes, [
        "id",
        "nome",
        "escola",
      ]);
    });
  });

  describe("getViagemById", () => {
    it("deve buscar uma viagem pelo ID", async () => {
      const viagem = { id: "viagem-1" };

      const findByPkStub = sinon
        .stub(models.ViagemDiaria, "findByPk")
        .resolves(viagem);

      const resultado = await viagemService.getViagemById("viagem-1");

      assert.equal(resultado, viagem);
      assert.equal(findByPkStub.firstCall.args[0], "viagem-1");
    });

    it("deve incluir os dados completos do aluno na consulta", async () => {
      const findByPkStub = sinon
        .stub(models.ViagemDiaria, "findByPk")
        .resolves(null);

      await viagemService.getViagemById("viagem-1");

      const options = findByPkStub.firstCall.args[1];

      assert.equal(options.include[0].model, models.Aluno);
      assert.equal(options.include[0].as, "aluno");
      assert.deepEqual(options.include[0].attributes, [
        "id",
        "nome",
        "escola",
        "responsavelId",
        "rotaIdaId",
        "rotaVoltaId",
      ]);
    });

    it("deve retornar null quando a viagem não existir", async () => {
      sinon.stub(models.ViagemDiaria, "findByPk").resolves(null);

      const resultado = await viagemService.getViagemById("inexistente");

      assert.equal(resultado, null);
    });
  });

  describe("createViagem", () => {
    const dadosValidos = {
      data: "2026-11-14",
      turnoCancelado: "MANHA",
      canceladaPeloResponsavel: true,
      motivoCancelamento: "Compromisso familiar",
    };

    const prepararCriacao = () => {
      sinon.stub(models.Aluno, "findByPk").resolves({
        id: "aluno-1",
        nome: "João",
      });

      sinon.stub(models.ViagemDiaria, "findOne").resolves(null);

      sinon.stub(models.ViagemDiaria, "create").resolves({
        id: "viagem-1",
        ...dadosValidos,
      });

      sinon.stub(models.Notificacao, "create").resolves({
        id: "notificacao-1",
      });
    };

    it("deve criar um cancelamento com dados válidos", async () => {
      prepararCriacao();

      const resultado = await viagemService.createViagem(
        "aluno-1",
        dadosValidos,
      );

      assert.equal(resultado.id, "viagem-1");

      sinon.assert.calledOnceWithExactly(
        models.ViagemDiaria.create,
        {
          alunoId: "aluno-1",
          ...dadosValidos,
        },
      );
    });

    it("deve lançar erro 404 quando o aluno não existir", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves(null);

      const createStub = sinon.stub(models.ViagemDiaria, "create");

      await assert.rejects(
        viagemService.createViagem("aluno-inexistente", dadosValidos),
        (error) =>
          error instanceof AppError &&
          error.message === "Aluno não encontrado.",
      );

      sinon.assert.notCalled(createStub);
    });

    it("deve lançar erro 400 quando a data não for informada", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({
        id: "aluno-1",
        nome: "João",
      });

      const findOneStub = sinon.stub(models.ViagemDiaria, "findOne");

      await assert.rejects(
        viagemService.createViagem("aluno-1", {
          turnoCancelado: "MANHA",
        }),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Data e turno cancelado são obrigatórios.",
      );

      sinon.assert.notCalled(findOneStub);
    });

    it("deve lançar erro 400 quando o turno não for informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({
        id: "aluno-1",
        nome: "João",
      });

      const findOneStub = sinon.stub(models.ViagemDiaria, "findOne");

      await assert.rejects(
        viagemService.createViagem("aluno-1", {
          data: "2026-11-14",
        }),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Data e turno cancelado são obrigatórios.",
      );

      sinon.assert.notCalled(findOneStub);
    });

    it("deve lançar erro 409 quando já existir cancelamento na mesma data e turno", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({
        id: "aluno-1",
        nome: "João",
      });

      sinon.stub(models.ViagemDiaria, "findOne").resolves({
        id: "viagem-existente",
      });

      const createStub = sinon.stub(models.ViagemDiaria, "create");

      await assert.rejects(
        viagemService.createViagem("aluno-1", dadosValidos),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Já existe cancelamento registrado para este aluno nesta data e turno.",
      );

      sinon.assert.notCalled(createStub);
    });

    it("deve definir canceladaPeloResponsavel como true por padrão", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
      });

      assert.equal(
        models.ViagemDiaria.create.firstCall.args[0]
          .canceladaPeloResponsavel,
        true,
      );
    });

    it("deve manter canceladaPeloResponsavel como false quando informado", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
        canceladaPeloResponsavel: false,
      });

      assert.equal(
        models.ViagemDiaria.create.firstCall.args[0]
          .canceladaPeloResponsavel,
        false,
      );
    });

    it("deve definir motivoCancelamento como null quando não informado", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
      });

      assert.equal(
        models.ViagemDiaria.create.firstCall.args[0].motivoCancelamento,
        null,
      );
    });

    it("deve definir motivoCancelamento como null quando receber valor vazio", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
        motivoCancelamento: "",
      });

      assert.equal(
        models.ViagemDiaria.create.firstCall.args[0].motivoCancelamento,
        null,
      );
    });

    it("deve criar notificação para cancelamento de ambos os turnos", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "AMBOS",
      });

      sinon.assert.calledOnceWithExactly(models.Notificacao.create, {
        alunoId: "aluno-1",
        tipo: "VIAGEM_CANCELADA",
        mensagem:
          "A viagem de João do dia 2026-11-14 (ida e volta) foi cancelada.",
      });
    });

    it("deve criar notificação para cancelamento da manhã", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
      });

      sinon.assert.calledOnceWithExactly(models.Notificacao.create, {
        alunoId: "aluno-1",
        tipo: "VIAGEM_CANCELADA",
        mensagem:
          "A viagem de João do dia 2026-11-14 (manhã) foi cancelada.",
      });
    });

    it("deve criar notificação para cancelamento da tarde", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "TARDE",
      });

      sinon.assert.calledOnceWithExactly(models.Notificacao.create, {
        alunoId: "aluno-1",
        tipo: "VIAGEM_CANCELADA",
        mensagem:
          "A viagem de João do dia 2026-11-14 (tarde) foi cancelada.",
      });
    });

    it("deve incluir o motivo do cancelamento na notificação", async () => {
      prepararCriacao();

      await viagemService.createViagem("aluno-1", {
        data: "2026-11-14",
        turnoCancelado: "MANHA",
        motivoCancelamento: "Consulta médica",
      });

      assert.equal(
        models.Notificacao.create.firstCall.args[0].mensagem,
        "A viagem de João do dia 2026-11-14 (manhã) foi cancelada. Motivo: Consulta médica.",
      );
    });

    it("deve retornar a viagem mesmo quando a criação da notificação falhar", async () => {
      const viagemCriada = {
        id: "viagem-1",
        alunoId: "aluno-1",
      };

      sinon.stub(models.Aluno, "findByPk").resolves({
        id: "aluno-1",
        nome: "João",
      });

      sinon.stub(models.ViagemDiaria, "findOne").resolves(null);

      sinon.stub(models.ViagemDiaria, "create").resolves(viagemCriada);

      sinon.stub(models.Notificacao, "create").rejects(
        new Error("Falha ao criar notificação"),
      );

      const consoleErrorStub = sinon.stub(console, "error");

      const resultado = await viagemService.createViagem(
        "aluno-1",
        dadosValidos,
      );

      assert.equal(resultado, viagemCriada);
      sinon.assert.calledOnce(consoleErrorStub);
    });
  });

  describe("updateViagem", () => {
    it("deve atualizar um cancelamento existente", async () => {
      const viagemAtualizada = {
        id: "viagem-1",
        motivoCancelamento: "Outro motivo",
      };

      const viagem = {
        id: "viagem-1",
        update: sinon.stub().resolves(viagemAtualizada),
      };

      sinon.stub(models.ViagemDiaria, "findByPk").resolves(viagem);

      const resultado = await viagemService.updateViagem("viagem-1", {
        motivoCancelamento: "Outro motivo",
      });

      assert.equal(resultado, viagemAtualizada);

      sinon.assert.calledOnceWithExactly(viagem.update, {
        motivoCancelamento: "Outro motivo",
      });
    });

    it("deve lançar erro 404 quando o cancelamento não existir", async () => {
      sinon.stub(models.ViagemDiaria, "findByPk").resolves(null);

      await assert.rejects(
        viagemService.updateViagem("inexistente", {
          motivoCancelamento: "Outro motivo",
        }),
        (error) =>
          error instanceof AppError &&
          error.message === "Cancelamento de viagem não encontrado.",
      );
    });

    it("deve atualizar todos os campos informados", async () => {
      const viagem = {
        id: "viagem-1",
        update: sinon.stub().resolves({ id: "viagem-1" }),
      };

      sinon.stub(models.ViagemDiaria, "findByPk").resolves(viagem);

      await viagemService.updateViagem("viagem-1", {
        data: "2026-11-15",
        turnoCancelado: "TARDE",
        canceladaPeloResponsavel: false,
        motivoCancelamento: "Compromisso",
      });

      sinon.assert.calledOnceWithExactly(viagem.update, {
        data: "2026-11-15",
        turnoCancelado: "TARDE",
        canceladaPeloResponsavel: false,
        motivoCancelamento: "Compromisso",
      });
    });

    it("não deve incluir campos não informados na atualização", async () => {
      const viagem = {
        id: "viagem-1",
        update: sinon.stub().resolves({ id: "viagem-1" }),
      };

      sinon.stub(models.ViagemDiaria, "findByPk").resolves(viagem);

      await viagemService.updateViagem("viagem-1", {});

      sinon.assert.calledOnceWithExactly(viagem.update, {});
    });
  });

  describe("deleteViagem", () => {
    it("deve excluir um cancelamento existente e retornar true", async () => {
      const viagem = {
        id: "viagem-1",
        destroy: sinon.stub().resolves(),
      };

      sinon.stub(models.ViagemDiaria, "findByPk").resolves(viagem);

      const resultado = await viagemService.deleteViagem("viagem-1");

      assert.equal(resultado, true);
      sinon.assert.calledOnce(viagem.destroy);
    });

    it("deve lançar erro 404 quando o cancelamento não existir", async () => {
      sinon.stub(models.ViagemDiaria, "findByPk").resolves(null);

      await assert.rejects(
        viagemService.deleteViagem("inexistente"),
        (error) =>
          error instanceof AppError &&
          error.message === "Cancelamento de viagem não encontrado.",
      );
    });
  });
});
