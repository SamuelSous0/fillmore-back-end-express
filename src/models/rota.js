const getRotaModel = (sequelize, { DataTypes }) => {
  const Rota = sequelize.define(
    "rota",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      motoristaId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "O nome da rota não pode ser vazio." },
        },
      },
      pontoInicialLat: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      pontoInicialLng: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      pontoFinalLat: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      pontoFinalLng: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      turno: {
        type: DataTypes.ENUM("MANHA", "TARDE"),
        allowNull: false,
        defaultValue: "MANHA",
        validate: {
          isIn: {
            args: [["MANHA", "TARDE"]],
            msg: "O turno da rota deve ser MANHA ou TARDE.",
          },
        },
      },
      distanciaTotalKm: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      tempoEstimadoMin: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "rotas",
    },
  );

  Rota.associate = (models) => {
    Rota.belongsTo(models.Motorista, { foreignKey: "motoristaId", as: "motorista" });
    if (models.Aluno) {
      Rota.hasMany(models.Aluno, { foreignKey: "rotaIdaId", as: "alunosIda" });
      Rota.hasMany(models.Aluno, { foreignKey: "rotaVoltaId", as: "alunosVolta" });
    }
  };

  return Rota;
};

export default getRotaModel;

