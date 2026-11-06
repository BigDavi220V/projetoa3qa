# Relatório de Testes — Rota do dia

- **Aluno:** Orlando Henrique
- **RA:** 1272515070
- **Data:** 05/11/2026
- **Item da Segunda Sprint:** 4

## O que fiz

O painel já tinha uma rotina para montar o roteiro dentro do HTML. Meu trabalho foi levar essa regra para o módulo de aplicação, aproveitar o controlador existente e manter a tela responsável por mostrar o resultado. Assim, o cálculo pode ser testado sem precisar abrir a interface ou acessar um banco de dados.

A rota considera os chamados abertos ou em atendimento com localização válida. Os chamados próximos são agrupados em paradas, usando um raio de até 80 metros em relação ao primeiro chamado do grupo. Depois, as paradas são ordenadas por proximidade a partir da localização informada.

Também retirei a correção automática que dividia coordenadas fora do limite até elas parecerem válidas. Uma localização inválida agora é descartada. Quando o GPS do aparelho não pode ser usado, a tela pede confirmação antes de começar pelo primeiro chamado da lista.

Na navegação, dividi os links do Google Maps em trechos compatíveis com o navegador móvel. A divisão mantém todas as paradas e usa o destino de um trecho como origem do seguinte. O roteiro imprimível continua trazendo todos os chamados.

## Testes automatizados

Os quatro testes desta funcionalidade estão em [server/tests/rota-do-dia/rota.test.js](../../../server/tests/rota-do-dia/rota.test.js).

| Caso | O que verifiquei | Resultado |
|---|---|---|
| RD-01 | Agrupamento dentro de 80 metros, ordem das paradas e preservação da lista original. | Aprovado |
| RD-02 | Exclusão de chamados fechados ou cancelados e de coordenadas ausentes, zeradas, malformadas ou fora dos limites. | Aprovado |
| RD-03 | Rejeição de um ponto de partida inválido, sem inventar uma posição, e tratamento de lista vazia. | Aprovado |
| RD-04 | Divisão dos links do Maps, sem perder paradas e com continuidade entre os trechos. | Aprovado |

A [saída da execução](evidencias/execucao-automatizada.txt) apresenta **4 testes aprovados e nenhuma falha**. Para repetir:

```bash
node --test server/tests/rota-do-dia/rota.test.js
```

## Verificação no navegador

Usei a tela do projeto com a API Node e repositórios simulados. Conferi o login, o carregamento dos chamados, a montagem da rota com GPS, o agrupamento de dois chamados próximos, a exclusão de um chamado sem GPS e a presença de todos os trechos de navegação.

Abri o roteiro imprimível e conferi seus chamados e links. Também coloquei o navegador sem rede depois de carregar a lista: o cálculo continuou funcionando com os dados disponíveis. A navegação pelas ruas continua dependendo do Google Maps.

No celular, verifiquei se os cartões e os links cabiam na largura da tela, sem rolagem horizontal. O modo legado do Apps Script também foi exercitado com respostas simuladas, para conferir que o ajuste não impedia o fluxo anterior.

- [Captura no computador](evidencias/rota-desktop.png)
- [Captura no celular](evidencias/rota-mobile.png)

As capturas usam dados fictícios. A lista muda durante a verificação porque um dos chamados é fechado em outro cenário e deixa de fazer parte da rota seguinte.

## Conclusão e limite

O cálculo e a apresentação da rota passaram nos cenários executados. A distância exibida é uma estimativa por proximidade; ela não representa uma promessa de menor trajeto pelas ruas.

Para usar a lista vinda do MySQL real, o grupo ainda precisa preparar e alinhar o esquema do banco. Não criei tabelas nem cadastrei chamados reais nesta etapa.

**Orlando Henrique — RA 1272515070**
