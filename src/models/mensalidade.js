
const getMensalidadeModel = (sequelize, { DataTypes }) => {
  const Mensalidade = sequelize.define(
    "mensalidade",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      alunoId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      mesReferencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [1],
            msg: "O mês de referência deve estar entre 1 e 12.",
          },
          max: {
            args: [12],
            msg: "O mês de referência deve estar entre 1 e 12.",
          },
        },
      },

      anoReferencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [2000],
            msg: "O ano de referência é inválido.",
          },
        },
      },

      valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0.01],
            msg: "O valor da mensalidade deve ser maior que zero.",
          },
        },
      },

      dataVencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("PAGO", "PENDENTE", "ATRASADO"),
        allowNull: false,
        defaultValue: "PENDENTE",
      },

      dataPagamento: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "mensalidades",
    },
  );

  Mensalidade.associate = (models) => {
    Mensalidade.belongsTo(models.Aluno, {
      foreignKey: "alunoId",
      as: "aluno",
    });
  };

  return Mensalidade;
};

export default getMensalidadeModel;
