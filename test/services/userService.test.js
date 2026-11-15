
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";
import argon2 from "argon2";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { default: models, sequelize } = await import(
  "../../src/models/index.js"
);

const { default: userService } = await import(
  "../../src/services/userService.js"
);

const USER_ID = "usuario-teste-123";

const dadosMotorista = {
  nome: "Motorista Teste",
  email: "motorista@teste.com",
  senha: "SenhaTeste123",
  telefone: "81999999999",
  cnh: "12345678900",
  placaVeiculo: "ABC1D23",
  capacidadeVan: 15,
  chavePix: "motorista@teste.com",
  titularPix: "Motorista Teste",
};

const simularTransacao = () => {
  const transaction = {
    id: "transacao-ficticia",
  };

  const transactionStub = sinon
    .stub(sequelize, "transaction")
    .callsFake(async (callback) => callback(transaction));

  return {
    transaction,
    transactionStub,
  };
};

describe("userService", () => {
  afterEach(() => {
    sinon.restore();
  });

  // ==========================================
  // 1. GET ALL USERS
  // ==========================================

  it("deve listar todos os usuários", async () => {
    const usuariosEsperados = [
      {
        id: USER_ID,
        nome: "Motorista Teste",
        tipo: "MOTORISTA",
      },
    ];

    const findAllStub = sinon
      .stub(models.User, "findAll")
      .resolves(usuariosEsperados);

    const resultado = await userService.getAllUsers();

    assert.deepStrictEqual(resultado, usuariosEsperados);

    assert.deepStrictEqual(
      findAllStub.firstCall.args[0].include.map(
        (item) => item.as
      ),
      ["motorista", "responsavel"]
    );

    assert.strictEqual(findAllStub.calledOnce, true);
  });

  // ==========================================
  // 2. GET USER BY ID
  // ==========================================

  it("deve buscar um usuário pelo ID", async () => {
    const usuarioEsperado = {
      id: USER_ID,
      nome: "Motorista Teste",
      tipo: "MOTORISTA",
    };

    const findByPkStub = sinon
      .stub(models.User, "findByPk")
      .resolves(usuarioEsperado);

    const resultado = await userService.getUserById(USER_ID);

    assert.deepStrictEqual(resultado, usuarioEsperado);

    assert.strictEqual(
      findByPkStub.firstCall.args[0],
      USER_ID
    );

    assert.deepStrictEqual(
      findByPkStub.firstCall.args[1].include.map(
        (item) => item.as
      ),
      ["motorista", "responsavel"]
    );
  });

  // ==========================================
  // 3. GET USER BY EMAIL
  // ==========================================

  it("deve buscar um usuário pelo e-mail", async () => {
    const email = "motorista@teste.com";

    const usuarioEsperado = {
      id: USER_ID,
      email,
      nome: "Motorista Teste",
    };

    const findOneStub = sinon
      .stub(models.User, "findOne")
      .resolves(usuarioEsperado);

    const resultado = await userService.getUserByEmail(email);

    assert.deepStrictEqual(resultado, usuarioEsperado);

    assert.deepStrictEqual(
      findOneStub.firstCall.args[0].where,
      { email }
    );

    assert.deepStrictEqual(
      findOneStub.firstCall.args[0].include.map(
        (item) => item.as
      ),
      ["motorista", "responsavel"]
    );
  });

  // ==========================================
  // 4. CREATE MOTORISTA
  // ==========================================

  it("deve criar um usuário motorista com senha criptografada e perfil associado", async () => {
    const senhaHash = "hash-da-senha";

    const usuarioEsperado = {
      id: USER_ID,
      nome: dadosMotorista.nome,
      email: dadosMotorista.email,
      tipo: "MOTORISTA",
      motorista: {
        usuarioId: USER_ID,
      },
    };

    const { transaction, transactionStub } =
      simularTransacao();

    const hashStub = sinon
      .stub(argon2, "hash")
      .resolves(senhaHash);

    const userCreateStub = sinon
      .stub(models.User, "create")
      .resolves({ id: USER_ID });

    const motoristaCreateStub = sinon
      .stub(models.Motorista, "create")
      .resolves({
        usuarioId: USER_ID,
      });

    const findByPkStub = sinon
      .stub(models.User, "findByPk")
      .resolves(usuarioEsperado);

    const resultado = await userService.createUser(
      dadosMotorista
    );

    assert.deepStrictEqual(resultado, usuarioEsperado);

    assert.deepStrictEqual(
      hashStub.firstCall.args,
      [dadosMotorista.senha]
    );

    assert.deepStrictEqual(
      userCreateStub.firstCall.args[0],
      {
        nome: dadosMotorista.nome,
        email: dadosMotorista.email,
        senha: senhaHash,
        tipo: "MOTORISTA",
        telefone: dadosMotorista.telefone,
      }
    );

    assert.deepStrictEqual(
      motoristaCreateStub.firstCall.args[0],
      {
        usuarioId: USER_ID,
        cnh: dadosMotorista.cnh,
        placaVeiculo: dadosMotorista.placaVeiculo,
        capacidadeVan: dadosMotorista.capacidadeVan,
        chavePix: dadosMotorista.chavePix,
        titularPix: dadosMotorista.titularPix,
      }
    );

    assert.strictEqual(
      userCreateStub.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(
      motoristaCreateStub.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(
      findByPkStub.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(hashStub.calledOnce, true);
    assert.strictEqual(transactionStub.calledOnce, true);
  });

  it("deve utilizar valores padrão quando os dados opcionais do motorista estiverem vazios", async () => {
    const { transaction } = simularTransacao();

    sinon
      .stub(argon2, "hash")
      .resolves("hash-da-senha");

    const userCreateStub = sinon
      .stub(models.User, "create")
      .resolves({ id: USER_ID });

    const motoristaCreateStub = sinon
      .stub(models.Motorista, "create")
      .resolves({ usuarioId: USER_ID });

    sinon
      .stub(models.Responsavel, "create");

    sinon
      .stub(models.User, "findByPk")
      .resolves({ id: USER_ID });

    await userService.createUser({
      nome: "Motorista Sem Dados",
      email: "sem-dados@teste.com",
      senha: "senha123",
      cnh: "",
      placaVeiculo: "",
      chavePix: "",
      titularPix: "",
    });

    assert.deepStrictEqual(
      motoristaCreateStub.firstCall.args[0],
      {
        usuarioId: USER_ID,
        cnh: null,
        placaVeiculo: null,
        capacidadeVan: 15,
        chavePix: null,
        titularPix: null,
      }
    );

    assert.equal(
      "telefone" in userCreateStub.firstCall.args[0],
      false
    );

    assert.strictEqual(
      motoristaCreateStub.firstCall.args[1].transaction,
      transaction
    );
  });

  it("não deve criar perfil quando o tipo não for MOTORISTA nem RESPONSAVEL", async () => {
    const { transaction } = simularTransacao();

    sinon
      .stub(argon2, "hash")
      .resolves("hash-da-senha");

    const userCreateStub = sinon
      .stub(models.User, "create")
      .resolves({ id: USER_ID });

    const motoristaCreateStub = sinon.stub(
      models.Motorista,
      "create"
    );

    const responsavelCreateStub = sinon.stub(
      models.Responsavel,
      "create"
    );

    const usuarioEsperado = {
      id: USER_ID,
      nome: "Usuário Teste",
      tipo: "OUTRO",
    };

    sinon
      .stub(models.User, "findByPk")
      .resolves(usuarioEsperado);

    const resultado = await userService.createUser({
      nome: "Usuário Teste",
      email: "outro@teste.com",
      senha: "senha123",
      tipo: "OUTRO",
    });

    assert.deepStrictEqual(resultado, usuarioEsperado);

    assert.equal(
      userCreateStub.firstCall.args[0].tipo,
      "OUTRO"
    );

    assert.equal(motoristaCreateStub.notCalled, true);
    assert.equal(responsavelCreateStub.notCalled, true);

    assert.equal(
      userCreateStub.firstCall.args[1].transaction,
      transaction
    );
  });

  // ==========================================
  // 5. CREATE RESPONSÁVEL
  // ==========================================

  it("deve criar um usuário responsável com seu perfil associado", async () => {
    const senhaHash = "hash-responsavel";

    const dadosResponsavel = {
      nome: "Responsável Teste",
      email: "responsavel@teste.com",
      senha: "SenhaResponsavel123",
      tipo: "RESPONSAVEL",
    };

    const usuarioEsperado = {
      id: USER_ID,
      nome: dadosResponsavel.nome,
      email: dadosResponsavel.email,
      tipo: "RESPONSAVEL",
      responsavel: {
        usuarioId: USER_ID,
      },
    };

    const { transaction, transactionStub } =
      simularTransacao();

    sinon
      .stub(argon2, "hash")
      .resolves(senhaHash);

    const userCreateStub = sinon
      .stub(models.User, "create")
      .resolves({ id: USER_ID });

    const responsavelCreateStub = sinon
      .stub(models.Responsavel, "create")
      .resolves({
        usuarioId: USER_ID,
      });

    const motoristaCreateStub = sinon.stub(
      models.Motorista,
      "create"
    );

    sinon
      .stub(models.User, "findByPk")
      .resolves(usuarioEsperado);

    const resultado = await userService.createUser(
      dadosResponsavel
    );

    assert.deepStrictEqual(resultado, usuarioEsperado);

    assert.deepStrictEqual(
      userCreateStub.firstCall.args[0],
      {
        nome: dadosResponsavel.nome,
        email: dadosResponsavel.email,
        senha: senhaHash,
        tipo: "RESPONSAVEL",
      }
    );

    assert.deepStrictEqual(
      responsavelCreateStub.firstCall.args[0],
      {
        usuarioId: USER_ID,
      }
    );

    assert.strictEqual(motoristaCreateStub.notCalled, true);

    assert.strictEqual(
      responsavelCreateStub.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(
      userCreateStub.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(transactionStub.calledOnce, true);
  });

  // ==========================================
  // 6. UPDATE USER
  // ==========================================

  it("deve atualizar os dados do usuário e do perfil de motorista", async () => {
    const senhaHash = "nova-senha-hash";

    const dadosAtualizacao = {
      nome: "Motorista Atualizado",
      telefone: "81888888888",
      senha: "NovaSenha123",
      cnh: "98765432100",
      placaVeiculo: "XYZ9A99",
      capacidadeVan: 20,
      chavePix: "novo-pix@teste.com",
      titularPix: "Novo Titular",
    };

    const motorista = {
      update: sinon.stub().resolves(),
    };

    const usuarioBanco = {
      id: USER_ID,
      tipo: "MOTORISTA",
      motorista,
      update: sinon.stub().resolves(),
    };

    const usuarioAtualizado = {
      id: USER_ID,
      nome: dadosAtualizacao.nome,
      telefone: dadosAtualizacao.telefone,
      tipo: "MOTORISTA",
      motorista: {
        cnh: dadosAtualizacao.cnh,
        placaVeiculo: dadosAtualizacao.placaVeiculo,
      },
    };

    const { transaction, transactionStub } =
      simularTransacao();

    const hashStub = sinon
      .stub(argon2, "hash")
      .resolves(senhaHash);

    const findByPkStub = sinon.stub(
      models.User,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(usuarioBanco);

    findByPkStub
      .onSecondCall()
      .resolves(usuarioAtualizado);

    const resultado = await userService.updateUser(
      USER_ID,
      dadosAtualizacao
    );

    assert.deepStrictEqual(resultado, usuarioAtualizado);

    assert.deepStrictEqual(
      hashStub.firstCall.args,
      [dadosAtualizacao.senha]
    );

    assert.deepStrictEqual(
      usuarioBanco.update.firstCall.args[0],
      {
        nome: dadosAtualizacao.nome,
        telefone: dadosAtualizacao.telefone,
        senha: senhaHash,
      }
    );

    assert.strictEqual(
      usuarioBanco.update.firstCall.args[1].transaction,
      transaction
    );

    assert.deepStrictEqual(
      motorista.update.firstCall.args[0],
      {
        cnh: dadosAtualizacao.cnh,
        placaVeiculo: dadosAtualizacao.placaVeiculo,
        capacidadeVan: dadosAtualizacao.capacidadeVan,
        chavePix: dadosAtualizacao.chavePix,
        titularPix: dadosAtualizacao.titularPix,
      }
    );

    assert.strictEqual(
      motorista.update.firstCall.args[1].transaction,
      transaction
    );

    assert.strictEqual(hashStub.calledOnce, true);
    assert.strictEqual(transactionStub.calledOnce, true);
    assert.strictEqual(findByPkStub.callCount, 2);
  });

  it("não deve atualizar nada quando os dados forem vazios e o usuário for responsável", async () => {
    const usuarioBanco = {
      id: USER_ID,
      tipo: "RESPONSAVEL",
      responsavel: {
        usuarioId: USER_ID,
      },
      update: sinon.stub().resolves(),
    };

    const usuarioAtualizado = {
      id: USER_ID,
      tipo: "RESPONSAVEL",
    };

    const { transaction, transactionStub } =
      simularTransacao();

    const findByPkStub = sinon.stub(
      models.User,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(usuarioBanco);

    findByPkStub
      .onSecondCall()
      .resolves(usuarioAtualizado);

    const hashStub = sinon.stub(argon2, "hash");

    const resultado = await userService.updateUser(
      USER_ID,
      {}
    );

    assert.deepStrictEqual(resultado, usuarioAtualizado);

    assert.equal(usuarioBanco.update.notCalled, true);
    assert.equal(hashStub.notCalled, true);
    assert.equal(findByPkStub.callCount, 2);
    assert.equal(transactionStub.calledOnce, true);
  });

  it("deve atualizar somente os dados do usuário quando o motorista não possuir perfil associado", async () => {
    const usuarioBanco = {
      id: USER_ID,
      tipo: "MOTORISTA",
      motorista: null,
      update: sinon.stub().resolves(),
    };

    const usuarioAtualizado = {
      id: USER_ID,
      nome: "Motorista Atualizado",
      tipo: "MOTORISTA",
      motorista: null,
    };

    simularTransacao();

    const findByPkStub = sinon.stub(
      models.User,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(usuarioBanco);

    findByPkStub
      .onSecondCall()
      .resolves(usuarioAtualizado);

    const resultado = await userService.updateUser(
      USER_ID,
      { nome: "Motorista Atualizado" }
    );

    assert.deepStrictEqual(resultado, usuarioAtualizado);

    assert.deepStrictEqual(
      usuarioBanco.update.firstCall.args[0],
      { nome: "Motorista Atualizado" }
    );

    assert.equal(findByPkStub.callCount, 2);
  });

  it("não deve atualizar o perfil do motorista quando nenhum campo do veículo for informado", async () => {
    const motorista = {
      update: sinon.stub().resolves(),
    };

    const usuarioBanco = {
      id: USER_ID,
      tipo: "MOTORISTA",
      motorista,
      update: sinon.stub().resolves(),
    };

    const usuarioAtualizado = {
      id: USER_ID,
      nome: "Nome atualizado",
      tipo: "MOTORISTA",
    };

    simularTransacao();

    const findByPkStub = sinon.stub(
      models.User,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(usuarioBanco);

    findByPkStub
      .onSecondCall()
      .resolves(usuarioAtualizado);

    await userService.updateUser(USER_ID, {
      nome: "Nome atualizado",
    });

    sinon.assert.calledOnceWithExactly(
      usuarioBanco.update,
      { nome: "Nome atualizado" },
      sinon.match.has("transaction")
    );

    assert.equal(motorista.update.notCalled, true);
  });

  it("não deve criptografar nem atualizar senha quando ela estiver vazia", async () => {
    const usuarioBanco = {
      id: USER_ID,
      tipo: "RESPONSAVEL",
      update: sinon.stub().resolves(),
    };

    const usuarioAtualizado = {
      id: USER_ID,
      tipo: "RESPONSAVEL",
    };

    simularTransacao();

    const hashStub = sinon.stub(argon2, "hash");

    const findByPkStub = sinon.stub(
      models.User,
      "findByPk"
    );

    findByPkStub
      .onFirstCall()
      .resolves(usuarioBanco);

    findByPkStub
      .onSecondCall()
      .resolves(usuarioAtualizado);

    await userService.updateUser(USER_ID, {
      senha: "",
    });

    assert.equal(hashStub.notCalled, true);
    assert.equal(usuarioBanco.update.notCalled, true);
  });

  // ==========================================
  // 7. UPDATE USER INEXISTENTE
  // ==========================================

  it("deve retornar null ao atualizar um usuário inexistente", async () => {
    const findByPkStub = sinon
      .stub(models.User, "findByPk")
      .resolves(null);

    const transactionStub = sinon.stub(
      sequelize,
      "transaction"
    );

    const resultado = await userService.updateUser(
      USER_ID,
      { nome: "Novo Nome" }
    );

    assert.strictEqual(resultado, null);
    assert.strictEqual(findByPkStub.calledOnce, true);
    assert.strictEqual(transactionStub.notCalled, true);
  });

  // ==========================================
  // 8. DELETE USER
  // ==========================================

  it("deve excluir um usuário existente", async () => {
    const destroyStub = sinon
      .stub(models.User, "destroy")
      .resolves(1);

    const resultado = await userService.deleteUser(USER_ID);

    assert.strictEqual(resultado, true);

    assert.deepStrictEqual(
      destroyStub.firstCall.args[0],
      {
        where: { id: USER_ID },
      }
    );

    assert.strictEqual(destroyStub.calledOnce, true);
  });

  it("deve retornar false quando o usuário não existir para exclusão", async () => {
    const destroyStub = sinon
      .stub(models.User, "destroy")
      .resolves(0);

    const resultado = await userService.deleteUser(USER_ID);

    assert.strictEqual(resultado, false);

    assert.deepStrictEqual(
      destroyStub.firstCall.args[0],
      {
        where: { id: USER_ID },
      }
    );

    assert.strictEqual(destroyStub.calledOnce, true);
  });
});
