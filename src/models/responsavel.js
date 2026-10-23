const getResponsavelModel = (sequelize, { DataTypes }) => {
  const Responsavel = sequelize.define(
    "responsavel",
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
    },
    {
      tableName: "responsaveis",
    },
  );

  Responsavel.associate = (models) => {
    Responsavel.belongsTo(models.User, { foreignKey: "usuarioId", as: "usuario" });
    if (models.Aluno) {
      Responsavel.hasMany(models.Aluno, { foreignKey: "responsavelId", as: "alunos", onDelete: "CASCADE" });
    }
  };

  return Responsavel;
};

export default getResponsavelModel;
