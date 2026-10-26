import models from "../models/index.js";
import { AppError } from "../utils/index.js";

const getRotaIncludes = () => [
  { model: models.Motorista, as: "motorista" },
  ...(models.Aluno
    ? [
        { model: models.Aluno, as: "alunosIda" },
        { model: models.Aluno, as: "alunosVolta" },
      ]
    : []),
];

const getAllRotas = async (motoristaId) => {
  const where = motoristaId ? { motoristaId } : {};
  return await models.Rota.findAll({
    where,
    include: getRotaIncludes(),
  });
};

const getRotaById = async (id, motoristaId) => {
  const rota = await models.Rota.findByPk(id, {
    include: getRotaIncludes(),
  });

  if (!rota) {
    return null;
  }

  if (motoristaId && rota.motoristaId !== motoristaId) {
    throw new AppError("Acesso não autorizado a uma rota de outro motorista.", 403);
  }

  return rota;
};

const createRota = async (
  motoristaId,
  {
    nome,
    turno = "MANHA",
    pontoInicialLat,
    pontoInicialLng,
    pontoFinalLat,
    pontoFinalLng,
    distanciaTotalKm,
    tempoEstimadoMin,
  },
) => {
  const rota = await models.Rota.create({
    motoristaId,
    nome,
    turno,
    pontoInicialLat: pontoInicialLat !== undefined ? pontoInicialLat : null,
    pontoInicialLng: pontoInicialLng !== undefined ? pontoInicialLng : null,
    pontoFinalLat: pontoFinalLat !== undefined ? pontoFinalLat : null,
    pontoFinalLng: pontoFinalLng !== undefined ? pontoFinalLng : null,
    distanciaTotalKm: distanciaTotalKm !== undefined ? distanciaTotalKm : null,
    tempoEstimadoMin: tempoEstimadoMin !== undefined ? tempoEstimadoMin : null,
  });

  return await getRotaById(rota.id, motoristaId);
};

const updateRota = async (id, motoristaId, data) => {
  const rota = await getRotaById(id, motoristaId);
  if (!rota) {
    return null;
  }

  const updateData = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.turno !== undefined) updateData.turno = data.turno;
  if (data.pontoInicialLat !== undefined) updateData.pontoInicialLat = data.pontoInicialLat;
  if (data.pontoInicialLng !== undefined) updateData.pontoInicialLng = data.pontoInicialLng;
  if (data.pontoFinalLat !== undefined) updateData.pontoFinalLat = data.pontoFinalLat;
  if (data.pontoFinalLng !== undefined) updateData.pontoFinalLng = data.pontoFinalLng;
  if (data.distanciaTotalKm !== undefined) updateData.distanciaTotalKm = data.distanciaTotalKm;
  if (data.tempoEstimadoMin !== undefined) updateData.tempoEstimadoMin = data.tempoEstimadoMin;

  if (Object.keys(updateData).length > 0) {
    await rota.update(updateData);
  }

  return await getRotaById(id, motoristaId);
};

const deleteRota = async (id, motoristaId) => {
  const rota = await getRotaById(id, motoristaId);
  if (!rota) {
    return false;
  }

  await rota.destroy();
  return true;
};

const validarCapacidadeRota = async (rotaId) => {
  const rota = await models.Rota.findByPk(rotaId, {
    include: [{ model: models.Motorista, as: "motorista" }],
  });

  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  const capacidadeMaxima = rota.motorista?.capacidadeVan ?? 15;
  let vagasOcupadas = 0;

  if (models.Aluno) {
    const fkField = rota.turno === "TARDE" ? "rotaVoltaId" : "rotaIdaId";
    vagasOcupadas = await models.Aluno.count({
      where: { [fkField]: rota.id },
    });
  }

  if (vagasOcupadas >= capacidadeMaxima) {
    throw new AppError(
      `Capacidade máxima da van para esta rota (${rota.turno}) foi atingida.`,
      409,
    );
  }

  return {
    rota,
    capacidadeMaxima,
    vagasOcupadas,
    vagasDisponiveis: capacidadeMaxima - vagasOcupadas,
  };
};

export default {
  getAllRotas,
  getRotaById,
  createRota,
  updateRota,
  deleteRota,
  validarCapacidadeRota,
};

