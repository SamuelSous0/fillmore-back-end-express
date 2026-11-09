
import { Op } from "sequelize";
import models from "../models/index.js";
import { AppError } from "../utils/index.js";

const getMensalidadeIncludes = () => [
  {
    model: models.Aluno,
    as: "aluno",
    include: [
      {
        model: models.Rota,
        as: "rotaIda",
        include: [
          {
            model: models.Motorista,
            as: "motorista",
          },
        ],
      },
      {
        model: models.Rota,
        as: "rotaVolta",
        include: [
          {
            model: models.Motorista,
            as: "motorista",
          },
        ],
      },
    ],
  },
];

// Busca aluno incluindo os motoristas das rotas.
const getAlunoComMotoristas = async (alunoId) => {
  return await models.Aluno.findByPk(alunoId, {
    include: [
      {
        model: models.Rota,
        as: "rotaIda",
        include: [
          {
            model: models.Motorista,
            as: "motorista",
          },
        ],
      },
      {
        model: models.Rota,
        as: "rotaVolta",
        include: [
          {
            model: models.Motorista,
            as: "motorista",
          },
        ],
      },
    ],
  });
};

// Lista todas as mensalidades de um aluno.
const getMensalidadesDoAluno = async (alunoId) => {
  return await models.Mensalidade.findAll({
    where: { alunoId },
    include: getMensalidadeIncludes(),
    order: [
      ["anoReferencia", "DESC"],
      ["mesReferencia", "DESC"],
    ],
  });
};

// Busca uma mensalidade pelo ID.
const getMensalidadeById = async (id) => {
  return await models.Mensalidade.findByPk(id, {
    include: getMensalidadeIncludes(),
  });
};

// Cria uma mensalidade.
const createMensalidade = async (alunoId, data) => {
  const aluno = await models.Aluno.findByPk(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  const mensalidadeExistente = await models.Mensalidade.findOne({
    where: {
      alunoId,
      mesReferencia: data.mesReferencia,
      anoReferencia: data.anoReferencia,
    },
  });

  if (mensalidadeExistente) {
    throw new AppError(
      "Já existe uma mensalidade para este aluno neste período.",
      409,
    );
  }

  const mensalidade = await models.Mensalidade.create({
    alunoId,
    mesReferencia: data.mesReferencia,
    anoReferencia: data.anoReferencia,
    valor: data.valor,
    dataVencimento: data.dataVencimento,
    status: "PENDENTE",
  });

  return await getMensalidadeById(mensalidade.id);
};

// Registra o pagamento de uma mensalidade.
const registrarPagamento = async (id, dataPagamento = new Date()) => {
  const mensalidade = await models.Mensalidade.findByPk(id);

  if (!mensalidade) {
    throw new AppError("Mensalidade não encontrada.", 404);
  }

  await mensalidade.update({
    status: "PAGO",
    dataPagamento,
  });

  return await getMensalidadeById(id);
};

// Atualiza uma mensalidade.
const updateMensalidade = async (id, data) => {
  const mensalidade = await models.Mensalidade.findByPk(id);

  if (!mensalidade) {
    return null;
  }

  const updateData = {};

  if (data.mesReferencia !== undefined) {
    updateData.mesReferencia = data.mesReferencia;
  }

  if (data.anoReferencia !== undefined) {
    updateData.anoReferencia = data.anoReferencia;
  }

  if (data.valor !== undefined) {
    updateData.valor = data.valor;
  }

  if (data.dataVencimento !== undefined) {
    updateData.dataVencimento = data.dataVencimento;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;

    if (data.status === "PAGO") {
      updateData.dataPagamento = data.dataPagamento || new Date();
    } else {
      updateData.dataPagamento = null;
    }
  }

  if (data.dataPagamento !== undefined) {
    updateData.dataPagamento = data.dataPagamento;
  }

  await mensalidade.update(updateData);

  return await getMensalidadeById(id);
};

// Exclui uma mensalidade.
const deleteMensalidade = async (id) => {
  const mensalidade = await models.Mensalidade.findByPk(id);

  if (!mensalidade) {
    return false;
  }

  await mensalidade.destroy();

  return true;
};

// Lista mensalidades pendentes de um responsável.
const getMensalidadesPendentesDoResponsavel = async (responsavelId) => {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const mensalidades = await models.Mensalidade.findAll({
    where: {
      status: {
        [Op.in]: ["PENDENTE", "ATRASADO"],
      },
    },
    include: [
      {
        model: models.Aluno,
        as: "aluno",
        where: { responsavelId },
        include: [
          {
            model: models.Rota,
            as: "rotaIda",
            include: [
              {
                model: models.Motorista,
                as: "motorista",
              },
            ],
          },
          {
            model: models.Rota,
            as: "rotaVolta",
            include: [
              {
                model: models.Motorista,
                as: "motorista",
              },
            ],
          },
        ],
      },
    ],
    order: [["dataVencimento", "ASC"]],
  });

  const faturas = mensalidades.map((mensalidade) => {
    const aluno = mensalidade.aluno;

    const diasEmAtraso = Math.max(
      0,
      Math.floor(
        (new Date(`${hoje}T00:00:00`) -
          new Date(`${mensalidade.dataVencimento}T00:00:00`)) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const motorista =
      aluno.rotaIda?.motorista || aluno.rotaVolta?.motorista;

    return {
      id: mensalidade.id,
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      mesReferencia: mensalidade.mesReferencia,
      anoReferencia: mensalidade.anoReferencia,
      valor: mensalidade.valor,
      dataVencimento: mensalidade.dataVencimento,
      status: diasEmAtraso > 0 ? "ATRASADO" : mensalidade.status,
      diasEmAtraso,
      pagamentoPix: {
        chavePix: motorista?.chavePix || null,
        titularPix: motorista?.titularPix || null,
      },
    };
  });

  const totalPendente = faturas.reduce(
    (total, fatura) => total + Number(fatura.valor),
    0,
  );

  return {
    totalPendente: Number(totalPendente.toFixed(2)),
    quantidadeFaturas: faturas.length,
    faturas,
  };
};

export default {
  getAlunoComMotoristas,
  getMensalidadesDoAluno,
  getMensalidadeById,
  createMensalidade,
  registrarPagamento,
  updateMensalidade,
  deleteMensalidade,
  getMensalidadesPendentesDoResponsavel,
};
