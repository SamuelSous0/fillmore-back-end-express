const getViagemDiariaModel = (sequelize, { DataTypes }) => {
  const ViagemDiaria = sequelize.define(
    "viagemDiaria",
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
      data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notEmpty: { msg: "A data da viagem é obrigatória." },
        },
      },
      turnoCancelado: {
        type: DataTypes.ENUM("MANHA", "TARDE", "AMBOS"),
        allowNull: false,
        validate: {
          isIn: {
            args: [["MANHA", "TARDE", "AMBOS"]],
            msg: "O turno cancelado deve ser MANHA, TARDE ou AMBOS.",
          },
        },
      },
      canceladaPeloResponsavel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      motivoCancelamento: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "viagens_diarias",
    },
  );

  ViagemDiaria.associate = (models) => {
    ViagemDiaria.belongsTo(models.Aluno, {
      foreignKey: "alunoId",
      as: "aluno",
    });
  };

  return ViagemDiaria;
};

export default getViagemDiariaModel;
