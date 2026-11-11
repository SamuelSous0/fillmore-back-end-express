const getNotificacaoModel = (sequelize, { DataTypes }) => {
  const Notificacao = sequelize.define(
    "notificacao",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      alunoId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
          notEmpty: { msg: "O ID do aluno é obrigatório." },
        },
      },
      tipo: {
        type: DataTypes.ENUM(
          "VAN_CHEGANDO",
          "VIAGEM_CANCELADA",
          "COBRANCA_MENSALIDADE",
          "GERAL",
        ),
        allowNull: false,
        defaultValue: "GERAL",
        validate: {
          isIn: {
            args: [
              [
                "VAN_CHEGANDO",
                "VIAGEM_CANCELADA",
                "COBRANCA_MENSALIDADE",
                "GERAL",
              ],
            ],
            msg: "Tipo de notificação inválido.",
          },
        },
      },
      mensagem: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "A mensagem da notificação não pode ser vazia." },
        },
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      lida: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "notificacoes",
    },
  );

  Notificacao.associate = (models) => {
    Notificacao.belongsTo(models.Aluno, {
      foreignKey: "alunoId",
      as: "aluno",
    });
  };

  return Notificacao;
};

export default getNotificacaoModel;
