const getPresencaModel = (sequelize, { DataTypes }) => {
  const Presenca = sequelize.define(
    "presenca",
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
          notEmpty: { msg: "A data da presença é obrigatória." },
        },
      },
      turno: {
        type: DataTypes.ENUM("MANHA", "TARDE"),
        allowNull: false,
        validate: {
          isIn: {
            args: [["MANHA", "TARDE"]],
            msg: "O turno deve ser MANHA ou TARDE.",
          },
        },
      },
      embarcou: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      horarioEmbarque: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "presencas",
    },
  );

  Presenca.associate = (models) => {
    Presenca.belongsTo(models.Aluno, {
      foreignKey: "alunoId",
      as: "aluno",
    });
  };

  return Presenca;
};

export default getPresencaModel;
