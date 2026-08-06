# Automação de Pedido de Compras a partir de XML de NF-e

Aplicação web para importar XMLs de notas fiscais, revisar os dados extraídos e gerar automaticamente um pedido de compras na Concinco via API, com histórico das importações.

## Telas

### 1. Importação (página inicial `/`)
- Área de drag-and-drop + botão de seleção, aceitando um ou vários arquivos `.xml`.
- Parsing no navegador (sem enviar nada ainda) e painel de pré-visualização em cartões:
  - Cabeçalho: número da nota, série, CNPJ e razão social do emitente, CNPJ do destinatário, data de emissão, valor total, chave da NF-e.
  - Tabela de itens: código, descrição, NCM/CFOP, unidade, quantidade, valor unitário, valor total, ICMS e IPI.
- Botão "Gerar pedido de compras" com estado de carregamento.

### 2. Configurações (`/configuracoes`)
- Campos para URL base da API Concinco, token/chave de autenticação e parâmetros fixos do pedido (ex.: código da empresa/filial, condição de pagamento, tipo de pedido).
- Token guardado com segurança no backend (Lovable Cloud) — nunca no navegador. Campos sensíveis exibidos mascarados.
- Botão "Testar conexão".

### 3. Histórico (`/historico`)
- Lista das notas importadas: nota/série, emitente, valor, data do envio, status (sucesso/erro), número do pedido gerado.
- Ao clicar, detalhe com payload enviado e resposta da API (útil para depuração).

## Envio e retorno
- O envio é feito pelo backend do app (evita CORS e mantém o token protegido): `POST {URL_BASE}/PedidoComprasApi/api/v1/PedidoCompras/incluir-pedido-compra`.
- Feedback em tempo real: loading, alerta verde com o número do pedido retornado, alerta vermelho com a mensagem de erro detalhada (status HTTP + corpo da resposta).

## Payload
Como a especificação exata dos campos não foi fornecida, o mapeamento será construído com uma estrutura padrão de cabeçalho + itens derivada do XML:

```text
{ cabecalho: { cnpjFornecedor, nomeFornecedor, numeroNota, serie, dataEmissao,
               valorTotal, empresa, filial, condicaoPagamento, observacao },
  itens: [ { sequencia, codigoProduto, descricao, ncm, cfop, unidade,
             quantidade, valorUnitario, valorTotal, valorIcms, valorIpi } ] }
```

O mapeamento fica isolado em um único módulo, e a tela de detalhe do histórico mostra o JSON enviado. Assim, quando você tiver o contrato oficial da Concinco (ou o primeiro erro de validação da API), ajustamos apenas esse módulo rapidamente.

## Design
Tailwind + shadcn-ui: layout com cabeçalho e navegação entre as três telas, cartões organizados, tabelas legíveis, badges de status e alertas/toasts. Paleta sóbria corporativa (azul-petróleo + neutros), tipografia limpa, responsivo do mobile ao desktop.

## Detalhes técnicos
- Parsing do XML com `DOMParser` no cliente (namespace NF-e), tolerante a `nfeProc` e `NFe`.
- Lovable Cloud habilitado para: tabela `api_config` (URL base e parâmetros; token como secret no servidor) e tabela `import_history` (nota, emitente, valores, status, número do pedido, payload e resposta), ambas com RLS.
- Envio via server function do TanStack Start, retornando status + corpo bruto da API para exibição.
- Autenticação de usuários não está incluída neste escopo; o histórico e as configurações ficam compartilhados no app. Posso adicionar login depois se quiser.
