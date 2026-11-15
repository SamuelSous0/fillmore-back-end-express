
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

// URL fictícia para impedir conexão com o banco real.
process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

// Importação do Service e Controller.
const { userService } = await import(
  "../../src/services/index.js"
);

const { default: userController } = await import(
  "../../src/controllers/userController.js"
);

// Dados utilizados nos testes.
const USER_ID = "usuario-teste-123";
const OUTRO_USER_ID = "outro-usuario-456";

// Cria uma requisição fictícia.
const criarReq = ({
  params = {},
  body = {},
  user = { id: USER_ID },
} = {}) => ({
  params: {
    userId: USER_ID,
    ...params,
  },
  body,
  user,
});

// Cria uma resposta HTTP simulada.
const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

// Restaura os Stubs após cada teste.
afterEach(() => {
  sinon.restore();
});

describe("userController", () => {

  // ==========================================
  // 1. GET USERS
  // ==========================================

  it("deve listar todos os usuários", async () => {
    const usuariosEsperados = [
      {
        id: USER_ID,
        nome: "Usuário Teste",
        email: "usuario@teste.com",
      },
      {
        id: OUTRO_USER_ID,
        nome: "Outro Usuário",
        email: "outro@teste.com",
      },
    ];

    const findStub = sinon
      .stub(userService, "getAllUsers")
      .resolves(usuariosEsperados);

    const req = criarReq();
    const res = criarRes();

    await userController.getUsers(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      usuariosEsperados
    );

    assert.strictEqual(findStub.calledOnce, true);
  });

  // ==========================================
  // 2. GET USER
  // ==========================================

  it("deve buscar os dados do próprio usuário", async () => {
    const usuarioEsperado = {
      id: USER_ID,
      nome: "Usuário Teste",
      email: "usuario@teste.com",
    };

    const findStub = sinon
      .stub(userService, "getUserById")
      .resolves(usuarioEsperado);

    const req = criarReq();
    const res = criarRes();

    await userController.getUser(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      usuarioEsperado
    );

    assert.deepStrictEqual(
      findStub.firstCall.args,
      [USER_ID]
    );

    assert.strictEqual(findStub.calledOnce, true);
  });

  it("deve lançar erro 403 quando tentar consultar outro usuário", async () => {
    const findStub = sinon.stub(
      userService,
      "getUserById"
    );

    const req = criarReq({
      params: {
        userId: OUTRO_USER_ID,
      },
    });

    const res = criarRes();

    await assert.rejects(
      userController.getUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);

        assert.strictEqual(
          erro.message,
          "Acesso não autorizado aos dados de outro usuário."
        );

        return true;
      }
    );

    // Não deve consultar outro usuário.
    assert.strictEqual(findStub.notCalled, true);
  });

  it("deve lançar erro 404 quando o usuário não existir", async () => {
    const findStub = sinon
      .stub(userService, "getUserById")
      .resolves(null);

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      userController.getUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);

        assert.strictEqual(
          erro.message,
          "Usuário não encontrado."
        );

        return true;
      }
    );

    assert.strictEqual(findStub.calledOnce, true);
  });

  // ==========================================
  // 3. CREATE USER
  // ==========================================

  it("deve criar um usuário quando os dados forem válidos", async () => {
    const dadosUsuario = {
      nome: "Motorista Teste",
      email: "motorista@teste.com",
      senha: "SenhaTeste123",
      tipo: "MOTORISTA",
      telefone: "81999999999",
      cnh: "12345678900",
      placaVeiculo: "ABC1D23",
      capacidadeVan: 15,
      chavePix: "motorista@teste.com",
      titularPix: "Motorista Teste",
    };

    const usuarioEsperado = {
      id: USER_ID,
      ...dadosUsuario,
    };

    const createStub = sinon
      .stub(userService, "createUser")
      .resolves(usuarioEsperado);

    const req = criarReq({
      body: dadosUsuario,
    });

    const res = criarRes();

    await userController.createUser(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 201);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      usuarioEsperado
    );

    assert.deepStrictEqual(
      createStub.firstCall.args,
      [dadosUsuario]
    );

    assert.strictEqual(createStub.calledOnce, true);
  });

  it("deve lançar erro 400 quando faltar nome, e-mail ou senha", async () => {
    const createStub = sinon.stub(
      userService,
      "createUser"
    );

    const req = criarReq({
      body: {
        nome: "Usuário Teste",
        email: "usuario@teste.com",
        // Senha ausente.
      },
    });

    const res = criarRes();

    await assert.rejects(
      userController.createUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 400);

        assert.strictEqual(
          erro.message,
          "Nome, e-mail e senha são campos obrigatórios."
        );

        return true;
      }
    );

    // Não deve criar usuário com dados incompletos.
    assert.strictEqual(createStub.notCalled, true);
  });

  // ==========================================
  // 4. UPDATE USER
  // ==========================================

  it("deve atualizar os dados do próprio usuário", async () => {
    const dadosAtualizacao = {
      nome: "Usuário Atualizado",
      telefone: "81888888888",
    };

    const usuarioAtualizado = {
      id: USER_ID,
      ...dadosAtualizacao,
    };

    const updateStub = sinon
      .stub(userService, "updateUser")
      .resolves(usuarioAtualizado);

    const req = criarReq({
      body: dadosAtualizacao,
    });

    const res = criarRes();

    await userController.updateUser(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 200);

    assert.deepStrictEqual(
      res.send.firstCall.args[0],
      usuarioAtualizado
    );

    assert.deepStrictEqual(
      updateStub.firstCall.args,
      [USER_ID, dadosAtualizacao]
    );

    assert.strictEqual(updateStub.calledOnce, true);
  });

  it("deve lançar erro 403 quando tentar atualizar outro usuário", async () => {
    const updateStub = sinon.stub(
      userService,
      "updateUser"
    );

    const req = criarReq({
      params: {
        userId: OUTRO_USER_ID,
      },
      body: {
        nome: "Tentativa de alteração",
      },
    });

    const res = criarRes();

    await assert.rejects(
      userController.updateUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);

        assert.strictEqual(
          erro.message,
          "Acesso não autorizado aos dados de outro usuário."
        );

        return true;
      }
    );

    assert.strictEqual(updateStub.notCalled, true);
  });

  it("deve lançar erro 404 quando o usuário não existir na atualização", async () => {
    const updateStub = sinon
      .stub(userService, "updateUser")
      .resolves(null);

    const req = criarReq({
      body: {
        nome: "Novo Nome",
      },
    });

    const res = criarRes();

    await assert.rejects(
      userController.updateUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);

        assert.strictEqual(
          erro.message,
          "Usuário não encontrado."
        );

        return true;
      }
    );

    assert.strictEqual(updateStub.calledOnce, true);
  });

  // ==========================================
  // 5. DELETE USER
  // ==========================================

  it("deve excluir o próprio usuário e retornar status 204", async () => {
    const deleteStub = sinon
      .stub(userService, "deleteUser")
      .resolves(true);

    const req = criarReq();
    const res = criarRes();

    await userController.deleteUser(req, res);

    assert.strictEqual(res.status.firstCall.args[0], 204);

    assert.strictEqual(res.send.calledOnce, true);

    assert.strictEqual(
      res.send.firstCall.args.length,
      0
    );

    assert.deepStrictEqual(
      deleteStub.firstCall.args,
      [USER_ID]
    );

    assert.strictEqual(deleteStub.calledOnce, true);
  });

  it("deve lançar erro 403 quando tentar excluir outro usuário", async () => {
    const deleteStub = sinon.stub(
      userService,
      "deleteUser"
    );

    const req = criarReq({
      params: {
        userId: OUTRO_USER_ID,
      },
    });

    const res = criarRes();

    await assert.rejects(
      userController.deleteUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 403);

        assert.strictEqual(
          erro.message,
          "Acesso não autorizado aos dados de outro usuário."
        );

        return true;
      }
    );

    assert.strictEqual(deleteStub.notCalled, true);
  });

  it("deve lançar erro 404 quando o usuário não existir na exclusão", async () => {
    const deleteStub = sinon
      .stub(userService, "deleteUser")
      .resolves(false);

    const req = criarReq();
    const res = criarRes();

    await assert.rejects(
      userController.deleteUser(req, res),
      (erro) => {
        assert.strictEqual(erro.statusCode, 404);

        assert.strictEqual(
          erro.message,
          "Usuário não encontrado."
        );

        return true;
      }
    );

    assert.strictEqual(deleteStub.calledOnce, true);
  });

});
