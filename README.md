# Automação Pedido de Compra & Nota Fiscal

Crie uma aplicação web moderna e responsiva para automação de processos fiscais e de compras. O objetivo principal do sistema é permitir o upload e leitura de arquivos XML de notas fiscais faturadas para gerar automaticamente um pedido de compras no módulo de compras da Concinco, através de integração via API.

Requisitos funcionais da aplicação:

1. Interface de Importação de XML (Tela de Upload):

   - Uma área de "Drag and Drop" (arrastar e soltar) ou botão de seleção para upload de arquivos XML de Notas Fiscais Eletrônicas (NF-e).

   - Um painel de visualização/pré-parsing que extraia e exiba de forma clara os principais dados do XML antes do envio, tais como: Número da Nota, Série, CNPJ/Nome do Emitente, Valor Total, Data de Emissão e a listagem dos itens (códigos, quantidades, descrição, icms, ipi e valores unitários).

2. Mapeamento e Configuração da API:

   - Uma tela de configurações ou campos dedicados para inserir os parâmetros de conexão com o sistema Concinco (ex: URL base da API, chaves de autenticação/tokens de acesso).

   - O endpoint alvo para o envio dos dados é obrigatoriamente um POST na rota: [URLAPI]/PedidoComprasApi/api/v1/PedidoCompras/incluir-pedido-compra.

3. Regra de Negócio e Envio (Payload):

   - Ao confirmar a importação dos dados da nota fiscal, o sistema deve estruturar o JSON correspondente mapeando os dados extraídos do XML para o formato esperado pelo payload do endpoint da Concinco (incluindo cabeçalho do pedido e itens).

   - Disparar a requisição POST para a API informada.

4. Painel de Status e Retorno:

   - Exibir feedback visual em tempo real para o usuário (indicadores de sucesso, erro ou carregamento/loading).

   - Em caso de sucesso, mostrar o número do pedido gerado no módulo de compras da Concinco retornado pela API.

   - Em caso de falha, exibir a mensagem de erro detalhada retornada pelo servidor para facilitar a depuração.

5. Design e Experiência do Usuário (UI/UX):

   - Utilizar componentes limpos e modernos (estilo Tailwind CSS / shadcn-ui), com cartões organizados, tabelas legíveis para os itens da nota e alertas visuais intuitivos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c0740247-06b2-4752-9c2a-b107bb25f49e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
