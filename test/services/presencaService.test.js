
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";

import models from "../../src/models/index.js";
import { AppError } from "../../src/utils/index.js";
import presencaService from "../../src/services/presencaService.js";

afterEach(() => {
  sinon.restore();
});

describe("presencaService", () => {
  describe("getPresencasDoAluno", () => {
    it("deve listar presenças de um aluno sem filtros", async () => {
      const presencas = [{ id: "presenca-1" }];
      const findAllStub = sinon
        .stub(models.Presenca, "findAll")
        .resolves(presencas);

      const resultado = await presencaService.getPresencasDoAluno("aluno-1");

      assert.deepEqual(resultado, presencas);
      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
      });
      assert.deepEqual(findAllStub.firstCall.args[0].order, [
        ["data", "DESC"],
        ["turno", "ASC"],
      ]);
    });

    it("deve filtrar presenças por data", async () => {
      const findAllStub = sinon
        .stub(models.Presenca, "findAll")
        .resolves([]);

      await presencaService.getPresencasDoAluno("aluno-1", {
        data: "2026-11-14",
      });

      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-14",
      });
    });

    it("deve filtrar presenças por turno", async () => {
      const findAllStub = sinon
        .stub(models.Presenca, "findAll")
        .resolves([]);

      await presencaService.getPresencasDoAluno("aluno-1", {
        turno: "MANHA",
      });

      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        turno: "MANHA",
      });
    });

    it("deve filtrar presenças por data e turno", async () => {
      const findAllStub = sinon
        .stub(models.Presenca, "findAll")
        .resolves([]);

      await presencaService.getPresencasDoAluno("aluno-1", {
        data: "2026-11-14",
        turno: "TARDE",
      });

      assert.deepEqual(findAllStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "TARDE",
      });
    });

    it("deve incluir os dados básicos do aluno na consulta", async () => {
      const findAllStub = sinon
        .stub(models.Presenca, "findAll")
        .resolves([]);

      await presencaService.getPresencasDoAluno("aluno-1");

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

  describe("getPresencaById", () => {
    it("deve buscar uma presença pelo ID", async () => {
      const presenca = { id: "presenca-1" };

      const findByPkStub = sinon
        .stub(models.Presenca, "findByPk")
        .resolves(presenca);

      const resultado = await presencaService.getPresencaById("presenca-1");

      assert.equal(resultado, presenca);
      assert.equal(findByPkStub.firstCall.args[0], "presenca-1");
    });

    it("deve incluir os dados do aluno na consulta", async () => {
      const findByPkStub = sinon
        .stub(models.Presenca, "findByPk")
        .resolves(null);

      await presencaService.getPresencaById("presenca-1");

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

    it("deve retornar null quando a presença não existir", async () => {
      sinon.stub(models.Presenca, "findByPk").resolves(null);

      const resultado = await presencaService.getPresencaById("inexistente");

      assert.equal(resultado, null);
    });
  });

  describe("createPresenca", () => {
    it("deve criar uma presença com dados válidos", async () => {
      const aluno = { id: "aluno-1" };
      const presencaCriada = { id: "presenca-1" };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon.stub(models.Presenca, "findOne").resolves(null);

      const createStub = sinon
        .stub(models.Presenca, "create")
        .resolves(presencaCriada);

      const resultado = await presencaService.createPresenca("aluno-1", {
        data: "2026-11-14",
        turno: "MANHA",
        embarcou: true,
        horarioEmbarque: "07:00",
      });

      assert.equal(resultado, presencaCriada);
      assert.deepEqual(createStub.firstCall.args[0], {
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        embarcou: true,
        horarioEmbarque: "07:00",
      });
    });

    it("deve lançar erro 404 quando o aluno não existir", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves(null);

      const createStub = sinon.stub(models.Presenca, "create");

      await assert.rejects(
        presencaService.createPresenca("aluno-inexistente", {
          data: "2026-11-14",
          turno: "MANHA",
        }),
        (error) =>
          error instanceof AppError &&
          error.message === "Aluno não encontrado.",
      );

      sinon.assert.notCalled(createStub);
    });

    it("deve lançar erro 400 quando a data não for informada", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });

      const findOneStub = sinon.stub(models.Presenca, "findOne");

      await assert.rejects(
        presencaService.createPresenca("aluno-1", {
          turno: "MANHA",
        }),
        (error) =>
          error instanceof AppError &&
          error.message === "Data e turno são obrigatórios.",
      );

      sinon.assert.notCalled(findOneStub);
    });

    it("deve lançar erro 400 quando o turno não for informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });

      const findOneStub = sinon.stub(models.Presenca, "findOne");

      await assert.rejects(
        presencaService.createPresenca("aluno-1", {
          data: "2026-11-14",
        }),
        (error) =>
          error instanceof AppError &&
          error.message === "Data e turno são obrigatórios.",
      );

      sinon.assert.notCalled(findOneStub);
    });

    it("deve lançar erro 409 quando já existir presença na mesma data e turno", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });
      sinon
        .stub(models.Presenca, "findOne")
        .resolves({ id: "presenca-existente" });

      const createStub = sinon.stub(models.Presenca, "create");

      await assert.rejects(
        presencaService.createPresenca("aluno-1", {
          data: "2026-11-14",
          turno: "MANHA",
        }),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Já existe registro de presença para este aluno nesta data e turno.",
      );

      sinon.assert.notCalled(createStub);
    });

    it("deve definir embarcou como true quando não for informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });
      sinon.stub(models.Presenca, "findOne").resolves(null);

      const createStub = sinon
        .stub(models.Presenca, "create")
        .resolves({ id: "presenca-1" });

      await presencaService.createPresenca("aluno-1", {
        data: "2026-11-14",
        turno: "MANHA",
      });

      assert.equal(createStub.firstCall.args[0].embarcou, true);
    });

    it("deve manter embarcou como false quando informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });
      sinon.stub(models.Presenca, "findOne").resolves(null);

      const createStub = sinon
        .stub(models.Presenca, "create")
        .resolves({ id: "presenca-1" });

      await presencaService.createPresenca("aluno-1", {
        data: "2026-11-14",
        turno: "MANHA",
        embarcou: false,
      });

      assert.equal(createStub.firstCall.args[0].embarcou, false);
    });

    it("deve definir horarioEmbarque como null quando não for informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });
      sinon.stub(models.Presenca, "findOne").resolves(null);

      const createStub = sinon
        .stub(models.Presenca, "create")
        .resolves({ id: "presenca-1" });

      await presencaService.createPresenca("aluno-1", {
        data: "2026-11-14",
        turno: "MANHA",
      });

      assert.equal(createStub.firstCall.args[0].horarioEmbarque, null);
    });

    it("deve definir horarioEmbarque como null quando receber valor vazio", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });
      sinon.stub(models.Presenca, "findOne").resolves(null);

      const createStub = sinon
        .stub(models.Presenca, "create")
        .resolves({ id: "presenca-1" });

      await presencaService.createPresenca("aluno-1", {
        data: "2026-11-14",
        turno: "MANHA",
        horarioEmbarque: "",
      });

      assert.equal(createStub.firstCall.args[0].horarioEmbarque, null);
    });
  });

  describe("updatePresenca", () => {
    it("deve atualizar uma presença existente", async () => {
      const presencaAtualizada = { id: "presenca-1", embarcou: false };

      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves(presencaAtualizada),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const resultado = await presencaService.updatePresenca("presenca-1", {
        embarcou: false,
      });

      assert.equal(resultado, presencaAtualizada);
      sinon.assert.calledOnceWithExactly(presenca.update, {
        embarcou: false,
      });
    });

    it("deve lançar erro 404 quando a presença não existir", async () => {
      sinon.stub(models.Presenca, "findByPk").resolves(null);

      await assert.rejects(
        presencaService.updatePresenca("inexistente", {
          embarcou: false,
        }),
        (error) =>
          error instanceof AppError &&
          error.message === "Registro de presença não encontrado.",
      );
    });

    it("deve verificar duplicidade quando a data for alterada", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const findOneStub = sinon
        .stub(models.Presenca, "findOne")
        .resolves(null);

      await presencaService.updatePresenca("presenca-1", {
        data: "2026-11-15",
      });

      assert.deepEqual(findOneStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-15",
        turno: "MANHA",
      });
    });

    it("deve verificar duplicidade quando o turno for alterado", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const findOneStub = sinon
        .stub(models.Presenca, "findOne")
        .resolves(null);

      await presencaService.updatePresenca("presenca-1", {
        turno: "TARDE",
      });

      assert.deepEqual(findOneStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "TARDE",
      });
    });

    it("deve usar a data e o turno atuais quando apenas um deles for alterado", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const findOneStub = sinon
        .stub(models.Presenca, "findOne")
        .resolves(null);

      await presencaService.updatePresenca("presenca-1", {
        data: "2026-11-15",
      });

      assert.deepEqual(findOneStub.firstCall.args[0].where, {
        alunoId: "aluno-1",
        data: "2026-11-15",
        turno: "MANHA",
      });
    });

    it("não deve verificar duplicidade quando data e turno não forem alterados", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const findOneStub = sinon.stub(models.Presenca, "findOne");

      await presencaService.updatePresenca("presenca-1", {
        embarcou: false,
      });

      sinon.assert.notCalled(findOneStub);
    });

    it("deve lançar erro 409 quando encontrar outra presença duplicada", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub(),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);
      sinon
        .stub(models.Presenca, "findOne")
        .resolves({ id: "presenca-2" });

      await assert.rejects(
        presencaService.updatePresenca("presenca-1", {
          data: "2026-11-15",
        }),
        (error) =>
          error instanceof AppError &&
          error.message ===
            "Já existe registro de presença para este aluno nesta data e turno.",
      );

      sinon.assert.notCalled(presenca.update);
    });

    it("não deve considerar conflito quando encontrar a própria presença", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);
      sinon
        .stub(models.Presenca, "findOne")
        .resolves({ id: "presenca-1" });

      await presencaService.updatePresenca("presenca-1", {
        data: "2026-11-15",
      });

      sinon.assert.calledOnce(presenca.update);
    });

    it("deve incluir todos os campos informados na atualização", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);
      sinon.stub(models.Presenca, "findOne").resolves(null);

      await presencaService.updatePresenca("presenca-1", {
        data: "2026-11-15",
        turno: "TARDE",
        embarcou: false,
        horarioEmbarque: "13:00",
      });

      sinon.assert.calledOnceWithExactly(presenca.update, {
        data: "2026-11-15",
        turno: "TARDE",
        embarcou: false,
        horarioEmbarque: "13:00",
      });
    });

    it("não deve incluir campos não informados na atualização", async () => {
      const presenca = {
        id: "presenca-1",
        alunoId: "aluno-1",
        data: "2026-11-14",
        turno: "MANHA",
        update: sinon.stub().resolves({ id: "presenca-1" }),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      await presencaService.updatePresenca("presenca-1", {});

      sinon.assert.calledOnceWithExactly(presenca.update, {});
    });
  });

  describe("deletePresenca", () => {
    it("deve excluir uma presença existente e retornar true", async () => {
      const presenca = {
        id: "presenca-1",
        destroy: sinon.stub().resolves(),
      };

      sinon.stub(models.Presenca, "findByPk").resolves(presenca);

      const resultado =
        await presencaService.deletePresenca("presenca-1");

      assert.equal(resultado, true);
      sinon.assert.calledOnce(presenca.destroy);
    });

    it("deve lançar erro 404 quando a presença não existir", async () => {
      sinon.stub(models.Presenca, "findByPk").resolves(null);

      await assert.rejects(
        presencaService.deletePresenca("inexistente"),
        (error) =>
          error instanceof AppError &&
          error.message === "Registro de presença não encontrado.",
      );
    });
  });
});
