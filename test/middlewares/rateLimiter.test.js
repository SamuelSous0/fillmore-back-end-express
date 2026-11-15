
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";

import {
  limiterMiddleware,
  authLimiterMiddleware,
} from "../../src/middlewares/rateLimiter.js";

const startServer = async (middleware) => {
  const app = express();

  app.use(middleware);

  app.get("/", (req, res) => {
    res.status(200).json({ message: "Requisição permitida." });
  });

  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      message: err.message,
    });
  });

  const server = app.listen(0, "127.0.0.1");

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
};

describe("rateLimiterMiddleware", () => {
  it("deve permitir até 100 requisições e bloquear a 101ª", async () => {
    const server = await startServer(limiterMiddleware);

    try {
      for (let i = 0; i < 100; i++) {
        const response = await fetch(server.url);

        assert.equal(response.status, 200);
      }

      const response = await fetch(server.url);
      const body = await response.json();

      assert.equal(response.status, 429);

      assert.equal(
        body.message,
        "Muitas requisições originadas deste IP. Tente novamente em 15 minutos."
      );
    } finally {
      await server.close();
    }
  });

  it("deve permitir até 5 tentativas de autenticação e bloquear a 6ª", async () => {
    const server = await startServer(authLimiterMiddleware);

    try {
      for (let i = 0; i < 5; i++) {
        const response = await fetch(server.url);

        assert.equal(response.status, 200);
      }

      const response = await fetch(server.url);
      const body = await response.json();

      assert.equal(response.status, 429);

      assert.equal(
        body.message,
        "Muitas tentativas de autenticação originadas deste IP. Tente novamente em 15 minutos."
      );
    } finally {
      await server.close();
    }
  });
});
