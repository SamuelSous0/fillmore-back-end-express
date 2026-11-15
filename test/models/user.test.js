
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import getUserModel from "../../src/models/user.js";
import argon2 from "argon2";

describe("User Model", () => {
  let User;
  let hooks;
  let associations;
  let attributes;
  let options;

  beforeEach(() => {
    associations = [];

    const DataTypes = {
      UUID: "UUID",
      UUIDV4: "UUIDV4",
      STRING: "STRING",
      ENUM: (...values) => ({ type: "ENUM", values }),
    };

    const sequelize = {
      define: (name, modelAttributes, modelOptions) => {
        attributes = modelAttributes;
        options = modelOptions;

        class User {}

        User.hasOne = (...args) => {
          associations.push(args);
        };

        User.findOne = async () => null;

        hooks = modelOptions.hooks;

        return User;
      },
    };

    User = getUserModel(sequelize, { DataTypes });
  });

  describe("beforeCreate", () => {
    it("deve criptografar uma senha em texto puro", async () => {
      const user = { senha: "senha123" };

      await hooks.beforeCreate(user);

      assert.notEqual(user.senha, "senha123");
      assert.ok(user.senha.startsWith("$argon2"));
      assert.equal(await argon2.verify(user.senha, "senha123"), true);
    });

    it("não deve criptografar uma senha já criptografada", async () => {
      const senhaHash = await argon2.hash("senha123");
      const user = { senha: senhaHash };

      await hooks.beforeCreate(user);

      assert.equal(user.senha, senhaHash);
    });

    it("não deve tentar criptografar quando a senha não existir", async () => {
      const user = {};

      await hooks.beforeCreate(user);

      assert.equal(user.senha, undefined);
    });
  });

  describe("beforeUpdate", () => {
    it("deve criptografar uma senha alterada", async () => {
      const user = {
        senha: "novaSenha123",
        changed: (field) => field === "senha",
      };

      await hooks.beforeUpdate(user);

      assert.notEqual(user.senha, "novaSenha123");
      assert.ok(user.senha.startsWith("$argon2"));
      assert.equal(
        await argon2.verify(user.senha, "novaSenha123"),
        true,
      );
    });

    it("não deve criptografar quando a senha não foi alterada", async () => {
      const user = {
        senha: "senha123",
        changed: () => false,
      };

      await hooks.beforeUpdate(user);

      assert.equal(user.senha, "senha123");
    });

    it("não deve criptografar quando a senha já está protegida", async () => {
      const senhaHash = await argon2.hash("senha123");

      const user = {
        senha: senhaHash,
        changed: () => true,
      };

      await hooks.beforeUpdate(user);

      assert.equal(user.senha, senhaHash);
    });

    it("não deve criptografar quando a senha estiver vazia", async () => {
      const user = {
        senha: "",
        changed: () => true,
      };

      await hooks.beforeUpdate(user);

      assert.equal(user.senha, "");
    });
  });

  describe("validatePassword", () => {
    it("deve retornar true para uma senha correta", async () => {
      const senhaHash = await argon2.hash("senha123");
      const user = new User();

      user.senha = senhaHash;

      assert.equal(await user.validatePassword("senha123"), true);
    });

    it("deve retornar false para uma senha incorreta", async () => {
      const senhaHash = await argon2.hash("senha123");
      const user = new User();

      user.senha = senhaHash;

      assert.equal(await user.validatePassword("senhaErrada"), false);
    });
  });

  describe("toJSON", () => {
    it("deve remover a senha dos dados retornados", () => {
      const user = new User();

      user.get = () => ({
        id: "123",
        nome: "Paulo",
        email: "paulo@email.com",
        senha: "senhaSecreta",
      });

      const resultado = user.toJSON();

      assert.equal(resultado.id, "123");
      assert.equal(resultado.nome, "Paulo");
      assert.equal(resultado.email, "paulo@email.com");
      assert.equal("senha" in resultado, false);
    });

    it("não deve alterar os dados originais do usuário", () => {
      const user = new User();

      const dados = {
        id: "123",
        senha: "senhaSecreta",
      };

      user.get = () => dados;

      user.toJSON();

      assert.equal(dados.senha, "senhaSecreta");
    });
  });

  describe("associate", () => {
    it("deve criar os relacionamentos com Motorista e Responsavel", () => {
      const models = {
        Motorista: {},
        Responsavel: {},
      };

      User.associate(models);

      assert.equal(associations.length, 2);

      assert.equal(associations[0][0], models.Motorista);
      assert.deepEqual(associations[0][1], {
        foreignKey: "usuarioId",
        as: "motorista",
        onDelete: "CASCADE",
      });

      assert.equal(associations[1][0], models.Responsavel);
      assert.deepEqual(associations[1][1], {
        foreignKey: "usuarioId",
        as: "responsavel",
        onDelete: "CASCADE",
      });
    });
  });

  describe("findByEmail", () => {
    it("deve buscar o usuário pelo e-mail informado", async () => {
      const usuarioEsperado = {
        id: "123",
        email: "paulo@email.com",
      };

      User.findOne = async (query) => {
        assert.deepEqual(query, {
          where: { email: "paulo@email.com" },
        });

        return usuarioEsperado;
      };

      const resultado = await User.findByEmail("paulo@email.com");

      assert.equal(resultado, usuarioEsperado);
    });

    it("deve retornar null quando o usuário não for encontrado", async () => {
      User.findOne = async () => null;

      const resultado = await User.findByEmail("inexistente@email.com");

      assert.equal(resultado, null);
    });
  });

  describe("Definição do modelo", () => {
    it("deve configurar o nome da tabela como users", () => {
      assert.equal(options.tableName, "users");
    });

    it("deve definir os campos obrigatórios do usuário", () => {
      assert.equal(attributes.nome.allowNull, false);
      assert.equal(attributes.email.allowNull, false);
      assert.equal(attributes.senha.allowNull, false);
      assert.equal(attributes.tipo.allowNull, false);
      assert.equal(attributes.telefone.allowNull, true);
    });

    it("deve definir MOTORISTA como tipo padrão", () => {
      assert.equal(attributes.tipo.defaultValue, "MOTORISTA");
    });
  });
});
