import models from "../models/index.js";
import { AppError } from "../utils/index.js";

// Lista os cancelamentos de viagem de um aluno.
const getViagensDoAluno = async (alunoId, { data } = {}) => {
  const where = { alunoId };

  if (data) {
    where.data = data;
  }

  return await models.ViagemDiaria.findAll({
    where,
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        attributes: ["id", "nome", "escola"],
      },
    ],
    order: [["data", "DESC"]],
  });
};

// Busca cancelamento de viagem por ID.
const getViagemById = async (id) => {
  return await models.ViagemDiaria.findByPk(id, {
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

// Registra cancelamento de viagem pelo responsável (ou motorista).
const createViagem = async (alunoId, dados) => {
  const aluno = await models.Aluno.findByPk(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const { data, turnoCancelado, canceladaPeloResponsavel, motivoCancelamento } =
    dados;

  if (!data || !turnoCancelado) {
    throw new AppError("Data e turno cancelado são obrigatórios.", 400);
  }

  // Verifica se já existe cancelamento para esta data e turno
  const existente = await models.ViagemDiaria.findOne({
    where: { alunoId, data, turnoCancelado },
  });

  if (existente) {
    throw new AppError(
      "Já existe cancelamento registrado para este aluno nesta data e turno.",
      409,
    );
  }

  const viagem = await models.ViagemDiaria.create({
    alunoId,
    data,
    turnoCancelado,
    canceladaPeloResponsavel:
      canceladaPeloResponsavel !== undefined ? canceladaPeloResponsavel : true,
    motivoCancelamento: motivoCancelamento || null,
  });

  // Emite notificação automática de viagem cancelada
  try {
    const turnoTexto =
      turnoCancelado === "AMBOS"
        ? "ida e volta"
        : turnoCancelado === "MANHA"
          ? "manhã"
          : "tarde";

    const motivoTexto = motivoCancelamento
      ? ` Motivo: ${motivoCancelamento}.`
      : "";

    await models.Notificacao.create({
      alunoId,
      tipo: "VIAGEM_CANCELADA",
      mensagem: `A viagem de ${aluno.nome} do dia ${data} (${turnoTexto}) foi cancelada.${motivoTexto}`,
    });
  } catch (err) {
    console.error("Erro ao gerar notificação de cancelamento de viagem:", err);
  }

  return viagem;
};

// Atualiza cancelamento de viagem.
const updateViagem = async (id, dados) => {
  const viagem = await models.ViagemDiaria.findByPk(id);

  if (!viagem) {
    throw new AppError("Cancelamento de viagem não encontrado.", 404);
  }

  const { data, turnoCancelado, canceladaPeloResponsavel, motivoCancelamento } =
    dados;

  return await viagem.update({
    ...(data !== undefined && { data }),
    ...(turnoCancelado !== undefined && { turnoCancelado }),
    ...(canceladaPeloResponsavel !== undefined && { canceladaPeloResponsavel }),
    ...(motivoCancelamento !== undefined && { motivoCancelamento }),
  });
};

// Exclui cancelamento de viagem (reativa a viagem).
const deleteViagem = async (id) => {
  const viagem = await models.ViagemDiaria.findByPk(id);

  if (!viagem) {
    throw new AppError("Cancelamento de viagem não encontrado.", 404);
  }

  await viagem.destroy();
  return true;
};

export default {
  getViagensDoAluno,
  getViagemById,
  createViagem,
  updateViagem,
  deleteViagem,
};
