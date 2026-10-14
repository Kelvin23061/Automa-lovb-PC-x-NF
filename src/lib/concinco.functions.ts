import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { configSchema, nfeItemSchema, nfeSchema } from "./concinco-schemas";

const pedidoInputSchema = z.object({
  nfe: nfeSchema,
  codigosInternos: z.record(z.string(), z.string().nullable()).default({}),
});

const consultaInputSchema = z.object({ itens: z.array(nfeItemSchema) });

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

export const consultarCadastroItens = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => consultaInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { consultarItens } = await import("./concinco.server");
    return consultarItens(data.itens);
  });

export const gerarPedidoCompra = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pedidoInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { enviarPedido } = await import("./concinco.server");
    const codigos: Record<number, string | null> = {};
    for (const [key, value] of Object.entries(data.codigosInternos)) {
      codigos[Number(key)] = value;
    }
    return enviarPedido(data.nfe, codigos);
  });

export const listarHistorico = createServerFn({ method: "GET" }).handler(async () => {
  const { readHistory } = await import("./concinco.server");
  return readHistory();
});

