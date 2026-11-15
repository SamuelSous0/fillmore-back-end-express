
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";

import models from "../../src/models/index.js";
import notificacaoService from "../../src/services/notificacaoService.js";

afterEach(() => {
  sinon.restore();
});

describe("notificacaoService", () => {
  describe("getNotificacoesDoAluno", () => {
    it("deve listar notificações de um aluno", async () => {
      const notificacoes = [{ id: "notificacao-1" }];
      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves(notificacoes);

      const resultado =
        await notificacaoService.getNotificacoesDoAluno("aluno-1");

      assert.deepEqual(resultado, notificacoes);
      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: "aluno-1",
      });
      assert.deepEqual(findAll.firstCall.args[0].order, [
        ["timestamp", "DESC"],
      ]);
    });

    it("deve filtrar notificações lidas quando lida for true", async () => {
      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoAluno("aluno-1", {
        lida: "true",
      });

      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: "aluno-1",
        lida: true,
      });
    });

    it("deve filtrar notificações não lidas quando lida for false", async () => {
      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoAluno("aluno-1", {
        lida: "false",
      });

      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: "aluno-1",
        lida: false,
      });
    });

    it("deve aceitar o valor booleano true no filtro lida", async () => {
      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoAluno("aluno-1", {
        lida: true,
      });

      assert.equal(findAll.firstCall.args[0].where.lida, true);
    });

    it("deve aceitar o valor booleano false no filtro lida", async () => {
      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoAluno("aluno-1", {
        lida: false,
      });

      assert.equal(findAll.firstCall.args[0].where.lida, false);
    });
  });

  describe("getNotificacaoById", () => {
    it("deve buscar uma notificação pelo ID", async () => {
      const notificacao = { id: "notificacao-1" };

      const findByPk = sinon
        .stub(models.Notificacao, "findByPk")
        .resolves(notificacao);

      const resultado =
        await notificacaoService.getNotificacaoById("notificacao-1");

      assert.equal(resultado, notificacao);
      assert.equal(findByPk.calledOnce, true);
      assert.equal(findByPk.firstCall.args[0], "notificacao-1");
      assert.deepEqual(findByPk.firstCall.args[1].include[0].attributes, [
        "id",
        "nome",
        "escola",
        "responsavelId",
        "rotaIdaId",
        "rotaVoltaId",
      ]);
    });
  });

  describe("createNotificacao", () => {
    it("deve criar uma notificação com os dados informados", async () => {
      const aluno = { id: "aluno-1" };
      const notificacao = { id: "notificacao-1" };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves(notificacao);

      const resultado = await notificacaoService.createNotificacao(
        "aluno-1",
        {
          tipo: "AVISO",
          mensagem: "Aviso de teste",
        }
      );

      assert.equal(resultado, notificacao);

      const dadosCriacao = create.firstCall.args[0];

      assert.equal(dadosCriacao.alunoId, "aluno-1");
      assert.equal(dadosCriacao.tipo, "AVISO");
      assert.equal(dadosCriacao.mensagem, "Aviso de teste");
      assert.equal(dadosCriacao.lida, false);
      assert.ok(dadosCriacao.timestamp instanceof Date);
    });

    it("deve utilizar o tipo GERAL quando nenhum tipo for informado", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.createNotificacao("aluno-1", {
        mensagem: "Mensagem geral",
      });

      assert.equal(create.firstCall.args[0].tipo, "GERAL");
    });

    it("deve utilizar o timestamp informado", async () => {
      const timestamp = new Date("2026-11-14T12:00:00.000Z");

      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.createNotificacao("aluno-1", {
        mensagem: "Mensagem",
        timestamp,
      });

      assert.equal(create.firstCall.args[0].timestamp, timestamp);
    });

    it("deve lançar erro quando o aluno não existir", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves(null);

      const create = sinon.stub(models.Notificacao, "create");

      await assert.rejects(
        notificacaoService.createNotificacao("aluno-inexistente", {
          mensagem: "Mensagem",
        }),
        { message: "Aluno não encontrado." }
      );

      assert.equal(create.called, false);
    });

    it("deve lançar erro quando a mensagem não for informada", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves({ id: "aluno-1" });

      const create = sinon.stub(models.Notificacao, "create");

      await assert.rejects(
        notificacaoService.createNotificacao("aluno-1", {
          tipo: "AVISO",
        }),
        { message: "A mensagem da notificação é obrigatória." }
      );

      assert.equal(create.called, false);
    });
  });

  describe("updateNotificacao", () => {
    it("deve atualizar os campos informados", async () => {
      const notificacao = {
        id: "notificacao-1",
      };

      const notificacaoAtualizada = {
        id: "notificacao-1",
        tipo: "AVISO",
        mensagem: "Mensagem atualizada",
        lida: true,
      };

      notificacao.update = sinon.stub().resolves(notificacaoAtualizada);

      sinon.stub(models.Notificacao, "findByPk").resolves(notificacao);

      const resultado = await notificacaoService.updateNotificacao(
        "notificacao-1",
        {
          tipo: "AVISO",
          mensagem: "Mensagem atualizada",
          lida: true,
        }
      );

      assert.equal(resultado, notificacaoAtualizada);
      assert.deepEqual(notificacao.update.firstCall.args[0], {
        tipo: "AVISO",
        mensagem: "Mensagem atualizada",
        lida: true,
      });
    });

    it("deve atualizar somente os campos enviados", async () => {
      const notificacao = {
        update: sinon.stub().resolves({ id: "notificacao-1" }),
      };

      sinon.stub(models.Notificacao, "findByPk").resolves(notificacao);

      await notificacaoService.updateNotificacao("notificacao-1", {
        lida: true,
      });

      assert.deepEqual(notificacao.update.firstCall.args[0], {
        lida: true,
      });
    });

    it("deve aceitar uma atualização sem campos informados", async () => {
      const notificacao = {
        update: sinon.stub().resolves({ id: "notificacao-1" }),
      };

      sinon.stub(models.Notificacao, "findByPk").resolves(notificacao);

      await notificacaoService.updateNotificacao("notificacao-1", {});

      assert.deepEqual(notificacao.update.firstCall.args[0], {});
    });

    it("deve lançar erro quando a notificação não existir", async () => {
      sinon.stub(models.Notificacao, "findByPk").resolves(null);

      await assert.rejects(
        notificacaoService.updateNotificacao("inexistente", {
          lida: true,
        }),
        { message: "Notificação não encontrada." }
      );
    });
  });

  describe("deleteNotificacao", () => {
    it("deve excluir uma notificação existente", async () => {
      const notificacao = {
        destroy: sinon.stub().resolves(),
      };

      sinon.stub(models.Notificacao, "findByPk").resolves(notificacao);

      const resultado =
        await notificacaoService.deleteNotificacao("notificacao-1");

      assert.equal(resultado, true);
      assert.equal(notificacao.destroy.calledOnce, true);
    });

    it("deve lançar erro quando a notificação não existir", async () => {
      sinon.stub(models.Notificacao, "findByPk").resolves(null);

      await assert.rejects(
        notificacaoService.deleteNotificacao("inexistente"),
        { message: "Notificação não encontrada." }
      );
    });
  });

  describe("marcarComoLida", () => {
    it("deve marcar uma notificação como lida", async () => {
      const notificacao = {
        update: sinon.stub().resolves({ id: "notificacao-1", lida: true }),
      };

      sinon.stub(models.Notificacao, "findByPk").resolves(notificacao);

      const resultado =
        await notificacaoService.marcarComoLida("notificacao-1");

      assert.equal(resultado.lida, true);
      assert.deepEqual(notificacao.update.firstCall.args[0], {
        lida: true,
      });
    });

    it("deve lançar erro quando a notificação não existir", async () => {
      sinon.stub(models.Notificacao, "findByPk").resolves(null);

      await assert.rejects(
        notificacaoService.marcarComoLida("inexistente"),
        { message: "Notificação não encontrada." }
      );
    });
  });

  describe("getNotificacoesDoResponsavel", () => {
    it("deve retornar lista vazia quando o responsável não tiver alunos", async () => {
      sinon.stub(models.Aluno, "findAll").resolves([]);

      const findAll = sinon.stub(models.Notificacao, "findAll");

      const resultado =
        await notificacaoService.getNotificacoesDoResponsavel("responsavel-1");

      assert.deepEqual(resultado, []);
      assert.equal(findAll.called, false);
    });

    it("deve listar notificações dos alunos do responsável", async () => {
      const notificacoes = [{ id: "notificacao-1" }];

      sinon.stub(models.Aluno, "findAll").resolves([
        { id: "aluno-1" },
        { id: "aluno-2" },
      ]);

      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves(notificacoes);

      const resultado =
        await notificacaoService.getNotificacoesDoResponsavel("responsavel-1");

      assert.deepEqual(resultado, notificacoes);
      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: ["aluno-1", "aluno-2"],
      });
    });

    it("deve filtrar notificações lidas do responsável", async () => {
      sinon.stub(models.Aluno, "findAll").resolves([
        { id: "aluno-1" },
      ]);

      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoResponsavel(
        "responsavel-1",
        { lida: "true" }
      );

      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: ["aluno-1"],
        lida: true,
      });
    });

    it("deve filtrar notificações não lidas do responsável", async () => {
      sinon.stub(models.Aluno, "findAll").resolves([
        { id: "aluno-1" },
      ]);

      const findAll = sinon
        .stub(models.Notificacao, "findAll")
        .resolves([]);

      await notificacaoService.getNotificacoesDoResponsavel(
        "responsavel-1",
        { lida: false }
      );

      assert.deepEqual(findAll.firstCall.args[0].where, {
        alunoId: ["aluno-1"],
        lida: false,
      });
    });
  });

  describe("enviarLembreteMensalidade", () => {
    const criarMensalidade = (dados = {}) => ({
      alunoId: "aluno-1",
      mesReferencia: 11,
      anoReferencia: 2026,
      dataVencimento: "2026-11-10",
      ...dados,
    });

    it("deve enviar lembrete com os dados do motorista da rota de ida", async () => {
      const aluno = {
        id: "aluno-1",
        nome: "Aluno Teste",
        rotaIda: {
          motorista: {
            chavePix: "pix-teste",
            titularPix: "Motorista Teste",
          },
        },
        rotaVolta: null,
      };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon
        .stub(models.Mensalidade, "findByPk")
        .resolves(criarMensalidade());

      const notificacao = { id: "notificacao-1" };
      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves(notificacao);

      const resultado =
        await notificacaoService.enviarLembreteMensalidade(
          "aluno-1",
          "mensalidade-1"
        );

      assert.equal(resultado, notificacao);

      const dados = create.firstCall.args[0];

      assert.equal(dados.alunoId, "aluno-1");
      assert.equal(dados.tipo, "COBRANCA_MENSALIDADE");
      assert.equal(dados.lida, false);
      assert.match(dados.mensagem, /Aluno Teste/);
      assert.match(dados.mensagem, /11\/2026/);
      assert.match(dados.mensagem, /pix-teste/);
      assert.match(dados.mensagem, /Motorista Teste/);
    });

    it("deve utilizar o motorista da rota de volta quando não houver motorista na ida", async () => {
      const aluno = {
        id: "aluno-1",
        nome: "Aluno Teste",
        rotaIda: null,
        rotaVolta: {
          motorista: {
            chavePix: "pix-volta",
            titularPix: "Titular Volta",
          },
        },
      };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon
        .stub(models.Mensalidade, "findByPk")
        .resolves(criarMensalidade());

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.enviarLembreteMensalidade(
        "aluno-1",
        "mensalidade-1"
      );

      assert.match(create.firstCall.args[0].mensagem, /pix-volta/);
      assert.match(create.firstCall.args[0].mensagem, /Titular Volta/);
    });

    it("deve utilizar a mensagem padrão quando não houver chave Pix", async () => {
      const aluno = {
        id: "aluno-1",
        nome: "Aluno Teste",
        rotaIda: null,
        rotaVolta: null,
      };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon
        .stub(models.Mensalidade, "findByPk")
        .resolves(criarMensalidade());

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.enviarLembreteMensalidade(
        "aluno-1",
        "mensalidade-1"
      );

      assert.match(
        create.firstCall.args[0].mensagem,
        /Chave Pix não informada/
      );
    });

    it("deve enviar lembrete sem titular Pix quando ele não for informado", async () => {
      const aluno = {
        id: "aluno-1",
        nome: "Aluno Teste",
        rotaIda: {
          motorista: {
            chavePix: "pix-teste",
            titularPix: null,
          },
        },
      };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon
        .stub(models.Mensalidade, "findByPk")
        .resolves(criarMensalidade());

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.enviarLembreteMensalidade(
        "aluno-1",
        "mensalidade-1"
      );

      assert.match(create.firstCall.args[0].mensagem, /pix-teste/);
      assert.doesNotMatch(create.firstCall.args[0].mensagem, /\(null\)/);
    });

    it("deve lançar erro quando o aluno não existir", async () => {
      sinon.stub(models.Aluno, "findByPk").resolves(null);

      const mensalidadeFind = sinon.stub(models.Mensalidade, "findByPk");

      await assert.rejects(
        notificacaoService.enviarLembreteMensalidade(
          "aluno-inexistente",
          "mensalidade-1"
        ),
        { message: "Aluno não encontrado." }
      );

      assert.equal(mensalidadeFind.called, false);
    });

    it("deve lançar erro quando a mensalidade não existir", async () => {
      sinon
        .stub(models.Aluno, "findByPk")
        .resolves({ id: "aluno-1", nome: "Aluno Teste" });

      sinon.stub(models.Mensalidade, "findByPk").resolves(null);

      const create = sinon.stub(models.Notificacao, "create");

      await assert.rejects(
        notificacaoService.enviarLembreteMensalidade(
          "aluno-1",
          "mensalidade-inexistente"
        ),
        {
          message: "Mensalidade não encontrada para este aluno.",
        }
      );

      assert.equal(create.called, false);
    });

    it("deve lançar erro quando a mensalidade pertencer a outro aluno", async () => {
      sinon
        .stub(models.Aluno, "findByPk")
        .resolves({ id: "aluno-1", nome: "Aluno Teste" });

      sinon.stub(models.Mensalidade, "findByPk").resolves(
        criarMensalidade({ alunoId: "outro-aluno" })
      );

      const create = sinon.stub(models.Notificacao, "create");

      await assert.rejects(
        notificacaoService.enviarLembreteMensalidade(
          "aluno-1",
          "mensalidade-1"
        ),
        {
          message: "Mensalidade não encontrada para este aluno.",
        }
      );

      assert.equal(create.called, false);
    });

    it("deve formatar mês com dois dígitos", async () => {
      const aluno = {
        id: "aluno-1",
        nome: "Aluno Teste",
      };

      sinon.stub(models.Aluno, "findByPk").resolves(aluno);
      sinon
        .stub(models.Mensalidade, "findByPk")
        .resolves(criarMensalidade({ mesReferencia: 3 }));

      const create = sinon
        .stub(models.Notificacao, "create")
        .resolves({});

      await notificacaoService.enviarLembreteMensalidade(
        "aluno-1",
        "mensalidade-1"
      );

      assert.match(create.firstCall.args[0].mensagem, /03\/2026/);
    });
  });
});
