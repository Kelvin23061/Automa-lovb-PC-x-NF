# Dashboard e novo visual (claro/escuro)

## 1. Nova aba "Dashboard"

Uma nova página, primeira do menu, com indicadores calculados a partir dos envios já registrados no histórico:

- **Cartões de resumo**: pedidos gerados hoje, no mês atual, total de fornecedores atendidos e valor total dos pedidos.
- **Pedidos por dia**: gráfico de barras/área dos últimos 30 dias.
- **Pedidos por mês**: gráfico de barras dos últimos 12 meses.
- **Pedidos por fornecedor**: gráfico horizontal com os principais emitentes.
- **Valores por pedido**: gráfico mostrando o valor de cada pedido gerado, do mais recente para o mais antigo.
- **Ranking de fornecedores**: tabela ordenada por quantidade de pedidos, com CNPJ, quantidade, valor total e ticket médio, e destaque para o 1º, 2º e 3º lugares.
- Filtro simples de período (30 dias / 90 dias / 12 meses / tudo) e botão de atualizar.
- Estado vazio amigável quando ainda não houver pedidos enviados.

Somente pedidos enviados com sucesso entram na contagem de pedidos; falhas aparecem apenas como indicador separado.

## 2. Visual moderno com tema claro e escuro

- Botão de alternância sol/lua no cabeçalho, com a escolha lembrada no navegador e respeito à preferência do sistema na primeira visita.
- Ajuste do tema escuro para a mesma identidade azul-petróleo do tema claro (hoje o escuro usa cores cinza/azul genéricas que não combinam).
- Refino geral do layout: cabeçalho com navegação em pílulas, cartões com bordas suaves e sombra leve, tipografia e espaçamentos mais consistentes, tabelas com cabeçalho fixo e melhor leitura em telas pequenas.
- Todas as telas existentes (Importar XML, Configurações, Histórico) passam a funcionar bem nos dois temas.

## Detalhes técnicos

- Nova rota `src/routes/dashboard.tsx` com `head()` próprio; agregações feitas no cliente a partir de `listarHistorico` via TanStack Query (sem novas tabelas nem migrações).
- Gráficos com `recharts` (já instalado), usando os tokens de cor do design system (`--chart-1..5`).
- Tema: pequeno provider próprio (classe `dark` no `<html>` + `localStorage`), sem novas dependências; script inline no shell para evitar piscar de tema.
- Ajuste dos tokens do bloco `.dark` em `src/styles.css`; nenhuma cor fixa nos componentes.
- Nenhuma alteração na lógica de parsing do XML nem no envio à Concinco.
