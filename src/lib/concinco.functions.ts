import { createServerFn } from "@tanstack/react-start";

import { configSchema, nfeSchema } from "./concinco-schemas";

export const getConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { readConfig } = await import("./concinco.server");
  return readConfig();
});

export const saveConfig = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => configSchema.parse(data))
  .handler(async ({ data }) => {
    const { writeConfig } = await import("./concinco.server");
    return writeConfig(data);
  });

export const testarConexao = createServerFn({ method: "POST" }).handler(async () => {
  const { testConnection } = await import("./concinco.server");
  return testConnection();
});

export const gerarPedidoCompra = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => nfeSchema.parse(data))
  .handler(async ({ data }) => {
    const { enviarPedido } = await import("./concinco.server");
    return enviarPedido(data);
  });

export const listarHistorico = createServerFn({ method: "GET" }).handler(async () => {
  const { readHistory } = await import("./concinco.server");
  return readHistory();
});
