import models from "../models/index.js";

const revokeToken = async (token, expiraEm) => {
  return await models.TokenRevogado.create({
    token,
    expiraEm: expiraEm ? new Date(expiraEm * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
};

const isTokenRevoked = async (token) => {
  const revoked = await models.TokenRevogado.findOne({
    where: { token },
  });
  return !!revoked;
};

export default {
  revokeToken,
  isTokenRevoked,
};
