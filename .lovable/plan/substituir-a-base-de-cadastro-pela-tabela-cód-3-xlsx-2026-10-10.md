# Substituir a base de cadastro pela Tabela_cód-3.xlsx

## Objetivo
Apagar toda a base de códigos de barras gravada hoje e carregar do zero a planilha enviada (aba Plan2, ~337.918 linhas, colunas SEQPRODUTO, FORNECEDOR, CODACESSO, DESCCOMPLETA, EMBALAGEM, TIPCODIGO).

## O que será feito
1. **Excluir a base atual** — remover todas as linhas da base de produtos (pede sua confirmação antes de apagar).
2. **Importar a nova planilha** com a mesma regra de conciliação:
   - código de barras normalizado (só dígitos, sem zeros à esquerda);
   - descartadas linhas sem código interno ou sem código de barras;
   - um registro por par código de barras + código interno (repetições exatas viram uma só).
3. **Atualizar o cartão "Base de produtos"** em Configurações com o novo total, nome do arquivo (Tabela_cód-3.xlsx) e data.
4. **Verificar** o total gravado e testar a busca de um código (ex.: 7899050511764 → 141).

## Detalhes técnicos
- Sem alteração de código nem de estrutura do banco; apenas operação de dados.
- Conversão para CSV via script no servidor e carga em massa (arquivo grande demais para a tela).
- Atualização de `produto_base_info` (arquivo, updated_at).
