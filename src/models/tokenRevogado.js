const getTokenRevogadoModel = (sequelize, { DataTypes }) => {
  const TokenRevogado = sequelize.define(
    "tokenRevogado",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      expiraEm: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "tokens_revogados",
    },
  );

  return TokenRevogado;
};

export default getTokenRevogadoModel;
