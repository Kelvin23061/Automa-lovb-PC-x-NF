# Manter a base de produtos sempre atualizada

Hoje, enviar uma planilha em Configurações apaga a base inteira e a substitui. Passa a existir a opção de apenas acrescentar e atualizar, sem perder o que já está carregado.

## O que muda para o usuário

1. **Dois modos de envio** no cartão "Base de produtos":
   - **Adicionar novos cadastros** (padrão): envie uma planilha só com os itens novos ou alterados. Os códigos de barras novos entram na base e os que já existem são atualizados (código interno, descrição, embalagem). Nada é apagado.
   - **Substituir base completa**: comportamento atual, pede confirmação antes de apagar.
2. **Resumo após o envio**: "X novos códigos, Y atualizados".
3. Mostra a data e o arquivo da última atualização e o total de códigos na base.
4. Na importação de nota, o botão "Atualizar cadastro" já usa a base atualizada, então os itens pendentes passam para "Cadastrado".

## Regras

- O vínculo é pelo par código de barras + código interno: mesmo par atualiza a linha; código de barras novo cria linha.
- Mesmo formato de colunas: SEQPRODUTO, FORNECEDOR, CODACESSO, DESCCOMPLETA, EMBALAGEM, TIPCODIGO.

## Detalhes técnicos

- Migração: remover duplicados exatos e criar índice único em `produto_codigo_barras (cod_acesso, seq_produto)`.
- `importarLoteProdutos` recebe `modo: "adicionar" | "substituir"`; no modo adicionar faz `upsert` com `onConflict: "cod_acesso,seq_produto"` e conta novos x atualizados (consulta prévia dos pares do lote).
- `BaseProdutosCard`: seletor de modo, diálogo de confirmação para substituir, toast com o resumo.
- Teste unitário para a normalização/deduplicação dos pares do lote.
