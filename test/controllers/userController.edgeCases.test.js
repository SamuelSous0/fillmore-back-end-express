
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import sinon from "sinon";

process.env.DATABASE_URL ||=
  "postgres://test:test@localhost:5432/fillmore_test";

const { userService } = await import(
  "../../src/services/index.js"
);

const { default: userController } = await import(
  "../../src/controllers/userController.js"
);

const USER_ID = "usuario-teste-123";

const criarRes = () => {
  const res = {};

  res.status = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);

  return res;
};

afterEach(() => {
  sinon.restore();
});

describe("userController - casos adicionais", () => {
  it("deve lançar erro 400 quando o body da criação não for informado", async () => {
    const createStub = sinon.stub(
      userService,
      "createUser"
    );

    const req = {
      params: {
        userId: USER_ID,
      },
      user: {
        id: USER_ID,
      },
      // body propositalmente ausente
    };

    const res = criarRes();

    await assert.rejects(
      userController.createUser(req, res),
      (erro) => {
        assert.equal(erro.statusCode, 400);

        assert.equal(
          erro.message,
          "Nome, e-mail e senha são campos obrigatórios."
        );

        return true;
      }
    );

    assert.equal(createStub.notCalled, true);
    assert.equal(res.status.notCalled, true);
    assert.equal(res.send.notCalled, true);
  });

  it("deve utilizar um objeto vazio quando o body da atualização não for informado", async () => {
    const usuarioAtualizado = {
      id: USER_ID,
      nome: "Usuário Teste",
      email: "usuario@teste.com",
    };

    const updateStub = sinon
      .stub(userService, "updateUser")
      .resolves(usuarioAtualizado);

    const req = {
      params: {
        userId: USER_ID,
      },
      user: {
        id: USER_ID,
      },
      // body propositalmente ausente
    };

    const res = criarRes();

    await userController.updateUser(req, res);

    assert.deepEqual(
      updateStub.firstCall.args,
      [USER_ID, {}]
    );

    assert.equal(updateStub.calledOnce, true);
    assert.equal(res.status.firstCall.args[0], 200);

    assert.deepEqual(
      res.send.firstCall.args[0],
      usuarioAtualizado
    );
  });
});
