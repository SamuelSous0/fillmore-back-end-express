import { userService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const getUsers = async (req, res) => {
  const users = await userService.getAllUsers();
  return res.status(200).send(users);
};

const getUser = async (req, res) => {
  if (req.user.id !== req.params.userId) {
    throw new AppError("Acesso não autorizado aos dados de outro usuário.", 403);
  }

  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }
  return res.status(200).send(user);
};

const createUser = async (req, res) => {
  const { nome, email, senha, tipo, telefone, cnh, placaVeiculo, capacidadeVan } =
    req.body || {};

  if (!nome || !email || !senha) {
    throw new AppError("Nome, e-mail e senha são campos obrigatórios.", 400);
  }

  const user = await userService.createUser({
    nome,
    email,
    senha,
    tipo,
    telefone,
    cnh,
    placaVeiculo,
    capacidadeVan,
  });

  return res.status(201).send(user);
};

const updateUser = async (req, res) => {
  if (req.user.id !== req.params.userId) {
    throw new AppError("Acesso não autorizado aos dados de outro usuário.", 403);
  }

  const user = await userService.updateUser(req.params.userId, req.body || {});
  if (!user) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  return res.status(200).send(user);
};

const deleteUser = async (req, res) => {
  if (req.user.id !== req.params.userId) {
    throw new AppError("Acesso não autorizado aos dados de outro usuário.", 403);
  }

  const isDeleted = await userService.deleteUser(req.params.userId);
  if (!isDeleted) {
    throw new AppError("Usuário não encontrado.", 404);
  }

  return res.status(204).send();
};

export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
