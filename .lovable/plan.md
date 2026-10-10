# Campo de importação da planilha com atualização automática

## Objetivo
Ter um campo de importação da planilha de produtos que, ao enviar o arquivo, atualiza a base automaticamente: códigos novos entram, códigos existentes são atualizados, e nada é apagado.

## O que já existe
- Em Configurações, o cartão "Base de produtos" já tem o botão "Adicionar novos cadastros", que faz a atualização incremental (novos entram, existentes atualizam, nada apaga) e mostra o resumo "X novos, Y atualizados".

## Mudanças propostas

1. **Tornar a atualização incremental o comportamento padrão e único do campo principal**
   - Um único campo/botão de destaque "Importar planilha e atualizar base": ao escolher o arquivo, a conciliação é atualizada automaticamente (modo incremental, sem perguntas).
   - O botão "Substituir base completa" fica como opção secundária, com confirmação, para o caso de querer zerar e recarregar tudo.

2. **Levar o campo de importação também para a tela inicial (Upload de XML)**
   - Um cartão compacto "Base de produtos" na página inicial, mostrando o total de códigos, a data da última atualização e o mesmo campo de importação incremental — assim dá para atualizar a base sem sair da tela de trabalho.

3. **Resumo claro após cada importação**
   - Mensagem com quantos códigos novos entraram e quantos foram atualizados, além do novo total da base.

## Detalhes técnicos
- Reutilizar `BaseProdutosCard` (extrair versão compacta) e as funções `importarBaseProdutos` / `infoBaseProdutos` já existentes.
- Sem migração de banco: a tabela `produto_codigo_barras` e o upsert por (código de barras + código interno) já estão prontos.
- Ajustes apenas em `src/components/BaseProdutosCard.tsx` e `src/routes/index.tsx`.
