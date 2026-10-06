# Conciliação por código de barras usando a planilha de produtos

A planilha enviada (aba "Plan2", cerca de 337 mil linhas) traz: SEQPRODUTO (código interno), FORNECEDOR, CODACESSO (código de barras), DESCCOMPLETA, EMBALAGEM e TIPCODIGO. Ela passa a ser a base de conciliação: o código de barras de cada item da nota é procurado em CODACESSO e, ao encontrar, o SEQPRODUTO vira o código interno.

## O que muda para o usuário

1. **Conciliação automática pela planilha**: ao carregar o XML, cada item é conferido pelo código de barras (EAN) contra a base. Encontrou: aparece o código interno (SEQPRODUTO), a descrição cadastrada e a embalagem, com selo "Cadastrado".
2. **Fallback na API da Concinco**: se o código de barras não estiver na planilha e a rota de consulta estiver configurada, o sistema ainda tenta pela API (como hoje). Sem nenhum dos dois, o item vai para "Pendentes de cadastro".
3. **Origem do vínculo**: cada item mostra se foi encontrado "pela planilha" ou "pela API".
4. **Atualizar base de produtos**: em Configurações, nova seção para enviar uma planilha atualizada (.xlsx no mesmo formato). Mostra quantos produtos estão na base e a data da última importação. O botão "Atualizar cadastro" da importação reconsulta a base já atualizada.
5. A planilha anexada já é carregada na base agora, pronta para uso.

## Regras de conciliação

- Comparação só pelos dígitos do código de barras (zeros à esquerda normalizados, para EAN-13 x GTIN-14).
- Se o mesmo código de barras aparecer em mais de um produto, usa o primeiro e mostra aviso "código duplicado na base".
- O envio do pedido continua bloqueado enquanto houver item sem código interno.

## Detalhes técnicos

- Nova tabela `produto_codigo_barras` (seq_produto, fornecedor, cod_acesso normalizado com índice, descricao, embalagem, tipo_codigo) com RLS habilitada e acesso só pelo servidor; tabela `produto_base_info` com total e data da última carga.
- Carga inicial da planilha anexada em lotes via script no sandbox (não por migração, dado o volume).
- `concinco.server.ts`: `consultarItens` primeiro busca todos os EANs da nota numa única consulta (`in`), depois usa a API apenas para os não encontrados. `encontradoPor` ganha o valor `"planilha"`.
- Upload em Configurações: leitura do .xlsx no navegador (biblioteca `xlsx`), envio em lotes para uma server function que substitui a base.
- `NfePreview.tsx` e `index.tsx`: exibir origem e embalagem.
