import bcrypt from "bcrypt";
import models, { sequelize } from "../models/index.js";

const userIncludes = [
  { model: models.Motorista, as: "motorista" },
  { model: models.Responsavel, as: "responsavel" },
];

const getAllUsers = async () => {
  return await models.User.findAll({
    include: userIncludes,
  });
};

const getUserById = async (id) => {
  return await models.User.findByPk(id, {
    include: userIncludes,
  });
};

const getUserByEmail = async (email) => {
  return await models.User.findOne({
    where: { email },
    include: userIncludes,
  });
};

const createUser = async ({
  nome,
  email,
  senha,
  tipo = "MOTORISTA",
  telefone,
  cnh,
  placaVeiculo,
  capacidadeVan,
  chavePix,
  titularPix,
}) => {
  const saltRounds = 10;
  const hashSenha = await bcrypt.hash(senha, saltRounds);

  // Executa em transação para garantir criação atômica do usuário e do seu perfil
  return await sequelize.transaction(async (t) => {
    const user = await models.User.create(
      {
        nome,
        email,
        senha: hashSenha,
        tipo,
        ...(telefone !== undefined && { telefone }),
      },
      { transaction: t },
    );

    if (tipo === "MOTORISTA") {
      await models.Motorista.create(
        {
          usuarioId: user.id,
          cnh: cnh || null,
          placaVeiculo: placaVeiculo || null,
          capacidadeVan: capacidadeVan !== undefined ? capacidadeVan : 15,
          chavePix: chavePix || null,
          titularPix: titularPix || null,
        },
        { transaction: t },
      );
    } else if (tipo === "RESPONSAVEL") {
      await models.Responsavel.create(
        {
          usuarioId: user.id,
        },
        { transaction: t },
      );
    }

    return await models.User.findByPk(user.id, {
      include: userIncludes,
      transaction: t,
    });
  });
};

const updateUser = async (id, data) => {
  const user = await models.User.findByPk(id, {
    include: userIncludes,
  });

  if (!user) {
    return null;
  }

  const userUpdateData = {};
  if (data.nome !== undefined) userUpdateData.nome = data.nome;
  if (data.telefone !== undefined) userUpdateData.telefone = data.telefone;
  if (data.senha) {
    userUpdateData.senha = await bcrypt.hash(data.senha, 10);
  }

  await sequelize.transaction(async (t) => {
    if (Object.keys(userUpdateData).length > 0) {
      await user.update(userUpdateData, { transaction: t });
    }

    if (user.tipo === "MOTORISTA" && user.motorista) {
      const motoristaUpdate = {};
      if (data.cnh !== undefined) motoristaUpdate.cnh = data.cnh;
      if (data.placaVeiculo !== undefined) motoristaUpdate.placaVeiculo = data.placaVeiculo;
      if (data.capacidadeVan !== undefined) motoristaUpdate.capacidadeVan = data.capacidadeVan;
      if (data.chavePix !== undefined) motoristaUpdate.chavePix = data.chavePix;
      if (data.titularPix !== undefined) motoristaUpdate.titularPix = data.titularPix;

      if (Object.keys(motoristaUpdate).length > 0) {
        await user.motorista.update(motoristaUpdate, { transaction: t });
      }
    }
  });

  return await getUserById(id);
};

const deleteUser = async (id) => {
  const count = await models.User.destroy({
    where: { id },
  });
  return count > 0;
};

export default {
  getAllUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
};
