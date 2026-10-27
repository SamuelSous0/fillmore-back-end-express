import { Op } from "sequelize";
import models from "../models/index.js";
import { AppError } from "../utils/index.js";
import rotaService from "./rotaService.js";

const getAlunoIncludes = () => [
  {
    model: models.Responsavel,
    as: "responsavel",
    include: [
      {
        model: models.User,
        as: "usuario",
        attributes: ["id", "nome", "email", "telefone"],
      },
    ],
  },
  { model: models.Rota, as: "rotaIda" },
  { model: models.Rota, as: "rotaVolta" },
];

const getAlunos = async (filtro = {}) => {
  return await models.Aluno.findAll({
    where: filtro,
    include: getAlunoIncludes(),
  });
};

const getAlunoById = async (id) => {
  return await models.Aluno.findByPk(id, {
    include: getAlunoIncludes(),
  });
};

const createAluno = async (data) => {
  const responsavel = await models.Responsavel.findByPk(data.responsavelId);
  if (!responsavel) {
    throw new AppError("Responsável informado não foi encontrado.", 404);
  }

  if (data.rotaIdaId) {
    await rotaService.validarCapacidadeRota(data.rotaIdaId);
  }
  if (data.rotaVoltaId) {
    await rotaService.validarCapacidadeRota(data.rotaVoltaId);
  }

  const aluno = await models.Aluno.create({
    nome: data.nome,
    escola: data.escola,
    responsavelId: data.responsavelId,
    modalidade: data.modalidade || "IDA_E_VOLTA",
    enderecoEmbarque: data.enderecoEmbarque || null,
    latitudeEmbarque: data.latitudeEmbarque !== undefined ? data.latitudeEmbarque : null,
    longitudeEmbarque: data.longitudeEmbarque !== undefined ? data.longitudeEmbarque : null,
    enderecoDesembarque: data.enderecoDesembarque || null,
    latitudeDesembarque: data.latitudeDesembarque !== undefined ? data.latitudeDesembarque : null,
    longitudeDesembarque: data.longitudeDesembarque !== undefined ? data.longitudeDesembarque : null,
    rotaIdaId: data.rotaIdaId || null,
    ordemNaRotaIda: data.ordemNaRotaIda !== undefined ? data.ordemNaRotaIda : null,
    rotaVoltaId: data.rotaVoltaId || null,
    ordemNaRotaVolta: data.ordemNaRotaVolta !== undefined ? data.ordemNaRotaVolta : null,
    nomeContatoEntrega: data.nomeContatoEntrega || null,
    telefoneContatoEntrega: data.telefoneContatoEntrega || null,
    diaVencimentoMensalidade:
      data.diaVencimentoMensalidade !== undefined ? data.diaVencimentoMensalidade : null,
  });

  return await getAlunoById(aluno.id);
};

const updateAluno = async (id, data) => {
  const aluno = await models.Aluno.findByPk(id);
  if (!aluno) {
    return null;
  }

  if (data.responsavelId && data.responsavelId !== aluno.responsavelId) {
    const responsavel = await models.Responsavel.findByPk(data.responsavelId);
    if (!responsavel) {
      throw new AppError("Responsável informado não foi encontrado.", 404);
    }
  }

  if (data.rotaIdaId && data.rotaIdaId !== aluno.rotaIdaId) {
    await rotaService.validarCapacidadeRota(data.rotaIdaId);
  }
  if (data.rotaVoltaId && data.rotaVoltaId !== aluno.rotaVoltaId) {
    await rotaService.validarCapacidadeRota(data.rotaVoltaId);
  }

  const updateData = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.escola !== undefined) updateData.escola = data.escola;
  if (data.responsavelId !== undefined) updateData.responsavelId = data.responsavelId;
  if (data.modalidade !== undefined) updateData.modalidade = data.modalidade;
  if (data.enderecoEmbarque !== undefined) updateData.enderecoEmbarque = data.enderecoEmbarque;
  if (data.latitudeEmbarque !== undefined) updateData.latitudeEmbarque = data.latitudeEmbarque;
  if (data.longitudeEmbarque !== undefined) updateData.longitudeEmbarque = data.longitudeEmbarque;
  if (data.enderecoDesembarque !== undefined) updateData.enderecoDesembarque = data.enderecoDesembarque;
  if (data.latitudeDesembarque !== undefined) updateData.latitudeDesembarque = data.latitudeDesembarque;
  if (data.longitudeDesembarque !== undefined) updateData.longitudeDesembarque = data.longitudeDesembarque;
  if (data.rotaIdaId !== undefined) updateData.rotaIdaId = data.rotaIdaId;
  if (data.ordemNaRotaIda !== undefined) updateData.ordemNaRotaIda = data.ordemNaRotaIda;
  if (data.rotaVoltaId !== undefined) updateData.rotaVoltaId = data.rotaVoltaId;
  if (data.ordemNaRotaVolta !== undefined) updateData.ordemNaRotaVolta = data.ordemNaRotaVolta;
  if (data.nomeContatoEntrega !== undefined) updateData.nomeContatoEntrega = data.nomeContatoEntrega;
  if (data.telefoneContatoEntrega !== undefined) updateData.telefoneContatoEntrega = data.telefoneContatoEntrega;
  if (data.diaVencimentoMensalidade !== undefined) updateData.diaVencimentoMensalidade = data.diaVencimentoMensalidade;

  if (Object.keys(updateData).length > 0) {
    await aluno.update(updateData);
  }

  return await getAlunoById(id);
};

const deleteAluno = async (id) => {
  const aluno = await models.Aluno.findByPk(id);
  if (!aluno) {
    return false;
  }

  await aluno.destroy();
  return true;
};

const associarAlunoARota = async (alunoId, rotaId, options = {}) => {
  const aluno = await models.Aluno.findByPk(alunoId);
  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const { rota } = await rotaService.validarCapacidadeRota(rotaId);

  let trajeto = options.tipoTrajeto;
  if (!trajeto) {
    trajeto = rota.turno === "TARDE" ? "VOLTA" : "IDA";
  }

  const updateData = {};
  if (trajeto === "VOLTA" || rota.turno === "TARDE") {
    updateData.rotaVoltaId = rota.id;
    if (options.ordemNaRota !== undefined) {
      updateData.ordemNaRotaVolta = options.ordemNaRota;
    }
  } else {
    updateData.rotaIdaId = rota.id;
    if (options.ordemNaRota !== undefined) {
      updateData.ordemNaRotaIda = options.ordemNaRota;
    }
  }

  await aluno.update(updateData);
  return await getAlunoById(aluno.id);
};

const desassociarAlunoDaRota = async (alunoId, rotaId) => {
  const aluno = await models.Aluno.findByPk(alunoId);
  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const updateData = {};
  if (aluno.rotaIdaId === rotaId) {
    updateData.rotaIdaId = null;
    updateData.ordemNaRotaIda = null;
  }
  if (aluno.rotaVoltaId === rotaId) {
    updateData.rotaVoltaId = null;
    updateData.ordemNaRotaVolta = null;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("O aluno informado não está associado a esta rota.", 400);
  }

  await aluno.update(updateData);
  return await getAlunoById(aluno.id);
};

const getAlunosByRota = async (rotaId) => {
  const rota = await models.Rota.findByPk(rotaId);
  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  return await models.Aluno.findAll({
    where: {
      [Op.or]: [{ rotaIdaId: rotaId }, { rotaVoltaId: rotaId }],
    },
    include: getAlunoIncludes(),
  });
};

const getAlunosByResponsavel = async (responsavelId) => {
  const responsavel = await models.Responsavel.findByPk(responsavelId);
  if (!responsavel) {
    throw new AppError("Responsável não encontrado.", 404);
  }

  return await models.Aluno.findAll({
    where: { responsavelId },
    include: getAlunoIncludes(),
  });
};

export default {
  getAlunos,
  getAlunoById,
  createAluno,
  updateAluno,
  deleteAluno,
  associarAlunoARota,
  desassociarAlunoDaRota,
  getAlunosByRota,
  getAlunosByResponsavel,
};
