const getAlunoModel = (sequelize, { DataTypes }) => {
  const Aluno = sequelize.define(
    "aluno",
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
          notEmpty: { msg: "O nome do aluno não pode ser vazio." },
        },
      },
      escola: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "A escola do aluno não pode ser vazia." },
        },
      },
      responsavelId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      modalidade: {
        type: DataTypes.ENUM("IDA_E_VOLTA", "APENAS_IDA", "APENAS_VOLTA"),
        allowNull: false,
        defaultValue: "IDA_E_VOLTA",
        validate: {
          isIn: {
            args: [["IDA_E_VOLTA", "APENAS_IDA", "APENAS_VOLTA"]],
            msg: "A modalidade deve ser IDA_E_VOLTA, APENAS_IDA ou APENAS_VOLTA.",
          },
        },
      },
      enderecoEmbarque: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitudeEmbarque: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      longitudeEmbarque: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      enderecoDesembarque: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      latitudeDesembarque: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      longitudeDesembarque: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      rotaIdaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ordemNaRotaIda: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rotaVoltaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ordemNaRotaVolta: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nomeContatoEntrega: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefoneContatoEntrega: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      diaVencimentoMensalidade: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: { args: [1], msg: "O dia de vencimento deve ser entre 1 e 31." },
          max: { args: [31], msg: "O dia de vencimento deve ser entre 1 e 31." },
        },
      },
    },
    {
      tableName: "alunos",
    },
  );

  Aluno.associate = (models) => {
    Aluno.belongsTo(models.Responsavel, {
      foreignKey: "responsavelId",
      as: "responsavel",
    });
    Aluno.belongsTo(models.Rota, {
      foreignKey: "rotaIdaId",
      as: "rotaIda",
    });
    Aluno.belongsTo(models.Rota, {
      foreignKey: "rotaVoltaId",
      as: "rotaVolta",
    });
    if (models.Mensalidade) {
      Aluno.hasMany(models.Mensalidade, {
        foreignKey: "alunoId",
        as: "mensalidades",
        onDelete: "CASCADE",
      });
    }
    if (models.Presenca) {
      Aluno.hasMany(models.Presenca, {
        foreignKey: "alunoId",
        as: "presencas",
        onDelete: "CASCADE",
      });
    }
    if (models.ViagemDiaria) {
      Aluno.hasMany(models.ViagemDiaria, {
        foreignKey: "alunoId",
        as: "viagens",
        onDelete: "CASCADE",
      });
    }
    if (models.Notificacao) {
      Aluno.hasMany(models.Notificacao, {
        foreignKey: "alunoId",
        as: "notificacoes",
        onDelete: "CASCADE",
      });
    }
  };

  return Aluno;
};

export default getAlunoModel;
