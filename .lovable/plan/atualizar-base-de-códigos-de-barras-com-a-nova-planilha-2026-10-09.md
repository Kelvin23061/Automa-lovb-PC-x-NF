# Atualizar base de códigos de barras com a nova planilha

## Objetivo
Carregar a planilha enviada (Tabela_cód-2.xlsx, 337.762 códigos de barras) na base de produtos do sistema, aproveitando o fluxo de atualização incremental já existente: códigos novos são adicionados, códigos já existentes são atualizados e nada é apagado.

## O que será feito

1. **Carga incremental da nova planilha**
   - Ler a planilha enviada (colunas SEQPRODUTO, FORNECEDOR, CODACESSO, DESCCOMPLETA, EMBALAGEM, TIPCODIGO — mesmo formato da base atual).
   - Inserir na tabela `produto_codigo_barras` apenas o que mudou: códigos de barras novos entram como novos cadastros; códigos já existentes têm descrição, fornecedor e embalagem atualizados.
   - A base atual tem 337.517 linhas; a planilha tem 337.762 — espera-se cerca de 245 novos cadastros e possíveis atualizações nos demais.

2. **Atualizar o painel de informações da base**
   - Atualizar `produto_base_info` com o novo total de itens, o nome do arquivo (Tabela_cód-2.xlsx) e a data da atualização, para o cartão em Configurações mostrar a base atualizada.

3. **Verificação**
   - Conferir o total final de linhas na tabela e testar a consulta de um código de barras novo para confirmar que o vínculo com o código interno funciona.

## Detalhes técnicos
- Sem alteração de código: usa a lógica incremental já existente (`substituirBaseProdutos` em modo incremental / lotes em `src/lib/produto-lote.ts`).
- Sem migração de banco: apenas operação de dados (INSERT/UPDATE em lotes).
- A carga é feita via script no servidor por causa do tamanho do arquivo (~17 MB), não pela tela.
