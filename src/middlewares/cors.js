import cors from "cors";

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

const corsOptions = {
  origin: (origin, callback) => {
    // Requisições sem header Origin (ex.: Postman, cURL, apps mobile) são permitidas
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Origem não permitida: sem lançar erro, apenas não envia headers de CORS
    return callback(null, false);
  },
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
