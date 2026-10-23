const getMotoristaModel = (sequelize, { DataTypes }) => {
  const Motorista = sequelize.define(
    "motorista",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      usuarioId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      cnh: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      placaVeiculo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      capacidadeVan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
        validate: {
          min: { args: [1], msg: "A capacidade da van deve ser de no mínimo 1 passageiro." },
        },
      },
      chavePix: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      titularPix: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "motoristas",
    },
  );

  Motorista.associate = (models) => {
    Motorista.belongsTo(models.User, { foreignKey: "usuarioId", as: "usuario" });
    if (models.Rota) {
      Motorista.hasMany(models.Rota, { foreignKey: "motoristaId", as: "rotas", onDelete: "CASCADE" });
    }
  };

  return Motorista;
};

export default getMotoristaModel;
