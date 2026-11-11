import Sequelize from "sequelize";
import pg from "pg";

import getUserModel from "./user.js";
import getMotoristaModel from "./motorista.js";
import getResponsavelModel from "./responsavel.js";
import getTokenRevogadoModel from "./tokenRevogado.js";
import getRotaModel from "./rota.js";
import getAlunoModel from "./aluno.js";
import getMensalidadeModel from "./mensalidade.js";
import getPresencaModel from "./presenca.js";
import getViagemDiariaModel from "./viagemDiaria.js";
import getNotificacaoModel from "./notificacao.js";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

const models = {
  User: getUserModel(sequelize, Sequelize),
  Motorista: getMotoristaModel(sequelize, Sequelize),
  Responsavel: getResponsavelModel(sequelize, Sequelize),
  TokenRevogado: getTokenRevogadoModel(sequelize, Sequelize),
  Rota: getRotaModel(sequelize, Sequelize),
  Aluno: getAlunoModel(sequelize, Sequelize),
  Mensalidade: getMensalidadeModel(sequelize, Sequelize),
  Presenca: getPresencaModel(sequelize, Sequelize),
  ViagemDiaria: getViagemDiariaModel(sequelize, Sequelize),
  Notificacao: getNotificacaoModel(sequelize, Sequelize),
};

Object.keys(models).forEach((key) => {
  if ("associate" in models[key]) {
    models[key].associate(models);
  }
});

export { sequelize };
export default models;
