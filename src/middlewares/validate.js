// Middleware genérico para validação de requisições com Zod
const validate = (schema) => async (req, res, next) => {
  const result = await schema.parseAsync({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (result.body !== undefined) req.body = result.body;
  if (result.params !== undefined) req.params = result.params;
  if (result.query !== undefined) req.query = result.query;

  next();
};

export default validate;
