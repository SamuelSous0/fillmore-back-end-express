const getUserModel = (sequelize, { DataTypes }) => {
  const User = sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "O nome não pode ser vazio." },
        },
      },
      email: {
        type: DataTypes.STRING,
        unique: {
          msg: "Este e-mail já está em uso.",
        },
        allowNull: false,
        validate: {
          isEmail: { msg: "Forneça um e-mail válido." },
          notEmpty: { msg: "O e-mail não pode ser vazio." },
        },
      },
      senha: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "A senha não pode ser vazia." },
        },
      },
      tipo: {
        type: DataTypes.ENUM("MOTORISTA", "RESPONSAVEL"),
        allowNull: false,
        defaultValue: "MOTORISTA",
        validate: {
          isIn: {
            args: [["MOTORISTA", "RESPONSAVEL"]],
            msg: "O tipo de usuário deve ser MOTORISTA ou RESPONSAVEL.",
          },
        },
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "users",
    },
  );

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.senha;
    return values;
  };

  User.associate = (models) => {
    User.hasOne(models.Motorista, { foreignKey: "usuarioId", as: "motorista", onDelete: "CASCADE" });
    User.hasOne(models.Responsavel, { foreignKey: "usuarioId", as: "responsavel", onDelete: "CASCADE" });
  };

  User.findByEmail = async (email) => {
    return await User.findOne({
      where: { email },
    });
  };

  return User;
};

export default getUserModel;
