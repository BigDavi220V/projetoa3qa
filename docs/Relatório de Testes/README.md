# Relatório de Testes — Segunda Sprint

- **Aluno:** Orlando Henrique
- **RA:** 1272515070
- **Data:** 05/11/2026
- **Funcionalidades:** Rota do dia e Fechamento administrativo

Nesta sprint, minha parte ficou com o planejamento da rota do dia e o fechamento administrativo dos chamados. O projeto já tinha a estrutura em camadas e algumas implementações dessas telas. Aproveitei essa base, completei a ligação dos fluxos com a API e organizei os testes por funcionalidade.

Procurei verificar os caminhos de uso normal e as situações que poderiam gerar problemas: localização inválida, perda de conexão, reenvio de uma operação, dois fechamentos para o mesmo chamado e tentativa de acesso por um técnico sem permissão de gestor.

## Relatórios por funcionalidade

- [Rota do dia](<Rota do dia/README.md>) — implementação, quatro testes automatizados e verificação da tela.
- [Fechamento administrativo](<Fechamento administrativo/README.md>) — implementação, onze testes automatizados e verificação do fluxo de envio.

As duas subpastas contêm as capturas de tela e a saída dos testes correspondentes. A [síntese da verificação com Playwright](resultado-playwright.json) registra o resultado da execução no navegador.

## Resultado da execução

A suíte completa passou com **35 testes e nenhuma falha**. Antes desta etapa, havia 14 testes. Acrescentei 21: 15 específicos dessas duas funcionalidades e seis para os componentes de apoio, como persistência MySQL, comunicação com a API e preparação dos registros exibidos na tela.

Também conferi o build e os fluxos no navegador em tamanho de computador e celular. A verificação incluiu o roteiro imprimível, o cálculo de rota sem rede usando a lista já carregada, o bloqueio do perfil técnico no fechamento administrativo e o reenvio depois de uma resposta perdida. Não foram registrados erros de JavaScript na execução final.

O ambiente utilizado foi Windows, Node.js 24.19.0, MySQL 8.4.11 e Chromium com Playwright 1.62.1. Para executar a suíte do projeto:

```bash
npm install --prefix server
npm test
npm run build
```

## O que este resultado comprova

Os testes cobrem as regras e o fluxo entre tela, API, serviços e repositórios simulados. No MySQL real, confirmei a conexão e exercitei consultas de estatísticas, perfis e janela de login por meio de CTEs, sem criar tabelas.

Mantive o combinado de não criar as tabelas de aplicação nesta etapa. Por isso, **a gravação e a concorrência ainda precisam ser homologadas no esquema MySQL definitivo do grupo**. O DER recebido usa nomes diferentes de algumas tabelas esperadas pelo backend; esse alinhamento continua pendente. As capturas usam dados fictícios e não representam atendimentos reais.

Quando registro um teste como aprovado, estou me referindo ao cenário e ao ambiente descritos no relatório. Esse resultado não substitui a validação final com o banco preparado e os dados de teste da equipe.

Os detalhes da implementação e os limites da entrega estão no [guia dos itens 4 e 6](../07-SPRINT2-ROTA-E-FECHAMENTO-ADMINISTRATIVO.md).

**Orlando Henrique — RA 1272515070**
