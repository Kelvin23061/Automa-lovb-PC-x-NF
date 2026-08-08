# Vínculo dos itens da NF-e com o cadastro interno da empresa

Antes de gerar o pedido de compras, cada item da nota passa a ser conferido contra o cadastro de produtos da Concinco, usando o código de barras (EAN) e a referência do fornecedor que vêm no XML. O painel mostra o código interno encontrado e destaca claramente os itens que ainda precisam ser cadastrados.

## O que muda na tela de importação

1. **Nova coluna de vínculo** na tabela de itens:
   - Código de barras (EAN) e referência do fornecedor lidos do XML.
   - Código interno da empresa quando o item é localizado, com a descrição cadastrada.
   - Selo "Cadastrado" (verde) ou "Sem cadastro" (vermelho) por item.
2. **Bloco "Itens pendentes de cadastro"** acima da tabela, listando apenas o que falta: sequência, descrição da nota, EAN, referência, unidade e quantidade — o suficiente para cadastrar na Concinco. Inclui botão para copiar a lista.
3. **Botão "Atualizar vínculos"**: reconsulta a API da Concinco depois que o usuário cadastrou os itens, e atualiza os selos e o resumo.
4. **Resumo de prontidão**: "X de Y itens cadastrados". Quando todos estão vinculados, aparece o aviso "Pronto para gerar o pedido".
5. **Bloqueio do envio**: o botão "Gerar pedido de compras" fica desabilitado enquanto houver item sem código interno, com tooltip explicando o motivo.
6. A conferência roda automaticamente quando o XML é carregado.

## Configurações

Novos campos na tela de Configurações:
- **Rota de consulta de produtos** (ex.: `/ProdutoApi/api/v1/Produto/consultar`), combinada com a URL base já existente.
- **Nome do parâmetro de código de barras** e **nome do parâmetro de referência** (com valores padrão sugeridos), para se ajustar ao contrato real sem alterar código.

A consulta usa a URL base e o token já guardados no servidor.

## Envio do pedido

O payload passa a incluir, por item, o código interno da empresa (produto Concinco) junto ao código do fornecedor, EAN e referência. Nenhum pedido é enviado com item não vinculado.

## Detalhes técnicos

- `src/lib/nfe.ts`: extrair `cEAN`, `cEANTrib` e `cProd`/`xPed` do XML; novos campos `ean` e `referencia` em `NfeItem` (e no schema Zod correspondente).
- `src/lib/concinco-schemas.ts`: estender `nfeItemSchema`/`configSchema`; novos tipos `ItemVinculo` e `ResultadoConsultaItens`.
- Banco: adicionar colunas em `api_config` para a rota de consulta e os nomes dos parâmetros.
- `src/lib/concinco.server.ts`: função `consultarItens(itens)` que chama a rota configurada por item (EAN primeiro, referência como fallback), com tratamento de 404 = sem cadastro, e retorna `{ sequencia, codigoInterno, descricaoInterna, encontradoPor, mensagem }`.
- `src/lib/concinco.functions.ts`: nova server function `consultarCadastroItens`.
- `src/lib/concinco-payload.ts`: aceitar mapa de vínculos e incluir `codigoInternoProduto`, `codigoBarras` e `referenciaFornecedor` em cada item.
- `src/routes/index.tsx` e `src/components/NfePreview.tsx`: estado de vínculos por nota, botão Atualizar, painel de pendências e bloqueio do envio.
- `src/routes/configuracoes.tsx`: campos novos do formulário.
