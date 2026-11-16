const getRefreshTokenModel = (sequelize, { DataTypes }) => {
  const RefreshToken = sequelize.define(
    "refreshToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      usuarioId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      familiaId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      revogado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      substituidoPorToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      expiraEm: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "refresh_tokens",
    },
  );

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: "usuarioId",
      as: "usuario",
      onDelete: "CASCADE",
    });
  };

  return RefreshToken;
};

export default getRefreshTokenModel;
