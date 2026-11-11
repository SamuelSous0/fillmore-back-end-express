import models from "../models/index.js";
import { AppError } from "../utils/index.js";

// Lista presenças de um aluno, com filtro opcional por data e turno.
const getPresencasDoAluno = async (alunoId, { data, turno } = {}) => {
  const where = { alunoId };

  if (data) {
    where.data = data;
  }

  if (turno) {
    where.turno = turno;
  }

  return await models.Presenca.findAll({
    where,
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        attributes: ["id", "nome", "escola"],
      },
    ],
    order: [
      ["data", "DESC"],
      ["turno", "ASC"],
    ],
  });
};

// Busca uma presença por ID.
const getPresencaById = async (id) => {
  return await models.Presenca.findByPk(id, {
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

// Cria uma presença para o aluno.
const createPresenca = async (alunoId, dados) => {
  const aluno = await models.Aluno.findByPk(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const { data, turno, embarcou, horarioEmbarque } = dados;

  if (!data || !turno) {
    throw new AppError("Data e turno são obrigatórios.", 400);
  }

  // Verifica se já existe registro de presença nesta data e turno para este aluno
  const existente = await models.Presenca.findOne({
    where: { alunoId, data, turno },
  });

  if (existente) {
    throw new AppError(
      "Já existe registro de presença para este aluno nesta data e turno.",
      409,
    );
  }

  return await models.Presenca.create({
    alunoId,
    data,
    turno,
    embarcou: embarcou !== undefined ? embarcou : true,
    horarioEmbarque: horarioEmbarque || null,
  });
};

// Atualiza uma presença.
const updatePresenca = async (id, dados) => {
  const presenca = await models.Presenca.findByPk(id);

  if (!presenca) {
    throw new AppError("Registro de presença não encontrado.", 404);
  }

  const { data, turno, embarcou, horarioEmbarque } = dados;

  // Se alterar data ou turno, verificar duplicidade
  if (
    (data && data !== presenca.data) ||
    (turno && turno !== presenca.turno)
  ) {
    const novaData = data || presenca.data;
    const novoTurno = turno || presenca.turno;

    const conflito = await models.Presenca.findOne({
      where: {
        alunoId: presenca.alunoId,
        data: novaData,
        turno: novoTurno,
      },
    });

    if (conflito && conflito.id !== id) {
      throw new AppError(
        "Já existe registro de presença para este aluno nesta data e turno.",
        409,
      );
    }
  }

  return await presenca.update({
    ...(data !== undefined && { data }),
    ...(turno !== undefined && { turno }),
    ...(embarcou !== undefined && { embarcou }),
    ...(horarioEmbarque !== undefined && { horarioEmbarque }),
  });
};

// Exclui uma presença.
const deletePresenca = async (id) => {
  const presenca = await models.Presenca.findByPk(id);

  if (!presenca) {
    throw new AppError("Registro de presença não encontrado.", 404);
  }

  await presenca.destroy();
  return true;
};

export default {
  getPresencasDoAluno,
  getPresencaById,
  createPresenca,
  updatePresenca,
  deletePresenca,
};
