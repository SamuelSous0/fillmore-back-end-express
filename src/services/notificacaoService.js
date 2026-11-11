import models from "../models/index.js";
import { AppError } from "../utils/index.js";

// Lista as notificações de um aluno, com filtro opcional por lida (true/false).
const getNotificacoesDoAluno = async (alunoId, { lida } = {}) => {
  const where = { alunoId };

  if (lida !== undefined) {
    where.lida = lida === "true" || lida === true;
  }

  return await models.Notificacao.findAll({
    where,
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        attributes: ["id", "nome", "escola"],
      },
    ],
    order: [["timestamp", "DESC"]],
  });
};

// Busca notificação por ID.
const getNotificacaoById = async (id) => {
  return await models.Notificacao.findByPk(id, {
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        attributes: [
          "id",
          "nome",
          "escola",
          "responsavelId",
          "rotaIdaId",
          "rotaVoltaId",
        ],
      },
    ],
  });
};

// Cria uma notificação vinculada ao aluno.
const createNotificacao = async (alunoId, dados) => {
  const aluno = await models.Aluno.findByPk(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const { tipo, mensagem } = dados;

  if (!mensagem) {
    throw new AppError("A mensagem da notificação é obrigatória.", 400);
  }

  return await models.Notificacao.create({
    alunoId,
    tipo: tipo || "GERAL",
    mensagem,
    timestamp: dados.timestamp || new Date(),
    lida: false,
  });
};

// Atualiza uma notificação.
const updateNotificacao = async (id, dados) => {
  const notificacao = await models.Notificacao.findByPk(id);

  if (!notificacao) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  const { tipo, mensagem, lida } = dados;

  return await notificacao.update({
    ...(tipo !== undefined && { tipo }),
    ...(mensagem !== undefined && { mensagem }),
    ...(lida !== undefined && { lida }),
  });
};

// Exclui uma notificação.
const deleteNotificacao = async (id) => {
  const notificacao = await models.Notificacao.findByPk(id);

  if (!notificacao) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  await notificacao.destroy();
  return true;
};

// Marca notificação como lida.
const marcarComoLida = async (id) => {
  const notificacao = await models.Notificacao.findByPk(id);

  if (!notificacao) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  return await notificacao.update({ lida: true });
};

// Lista notificações de todos os alunos de um responsável.
const getNotificacoesDoResponsavel = async (responsavelId, { lida } = {}) => {
  const alunos = await models.Aluno.findAll({
    where: { responsavelId },
    attributes: ["id"],
  });

  const alunoIds = alunos.map((a) => a.id);

  if (alunoIds.length === 0) {
    return [];
  }

  const where = {
    alunoId: alunoIds,
  };

  if (lida !== undefined) {
    where.lida = lida === "true" || lida === true;
  }

  return await models.Notificacao.findAll({
    where,
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        attributes: ["id", "nome", "escola"],
      },
    ],
    order: [["timestamp", "DESC"]],
  });
};

// Dispara cobrança de mensalidade em 1 clique (gera Notificação COBRANCA_MENSALIDADE).
const enviarLembreteMensalidade = async (alunoId, mensalidadeId) => {
  const aluno = await models.Aluno.findByPk(alunoId, {
    include: [
      {
        model: models.Rota,
        as: "rotaIda",
        include: [{ model: models.Motorista, as: "motorista" }],
      },
      {
        model: models.Rota,
        as: "rotaVolta",
        include: [{ model: models.Motorista, as: "motorista" }],
      },
    ],
  });

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const mensalidade = await models.Mensalidade.findByPk(mensalidadeId);

  if (!mensalidade || mensalidade.alunoId !== alunoId) {
    throw new AppError("Mensalidade não encontrada para este aluno.", 404);
  }

  const motorista =
    aluno.rotaIda?.motorista || aluno.rotaVolta?.motorista || null;

  const chavePix = motorista?.chavePix || "Chave Pix não informada";
  const titularPix = motorista?.titularPix ? ` (${motorista.titularPix})` : "";

  const mesFormatado = String(mensalidade.mesReferencia).padStart(2, "0");
  const referencia = `${mesFormatado}/${mensalidade.anoReferencia}`;
  const vencimento = mensalidade.dataVencimento;

  const mensagem = `Lembrete: A mensalidade de ${aluno.nome} referente ao mês ${referencia} está em aberto (Vencimento: ${vencimento}). Chave Pix do motorista: ${chavePix}${titularPix}.`;

  const notificacao = await models.Notificacao.create({
    alunoId,
    tipo: "COBRANCA_MENSALIDADE",
    mensagem,
    timestamp: new Date(),
    lida: false,
  });

  return notificacao;
};

export default {
  getNotificacoesDoAluno,
  getNotificacaoById,
  createNotificacao,
  updateNotificacao,
  deleteNotificacao,
  marcarComoLida,
  getNotificacoesDoResponsavel,
  enviarLembreteMensalidade,
};
