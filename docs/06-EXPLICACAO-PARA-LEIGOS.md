# Como o Ilumina Coruripe é organizado

Explicação da arquitetura de software para quem não é da área de tecnologia.

## O que o sistema faz

O sistema ajuda a prefeitura a cuidar da iluminação pública. Ele tem dois aplicativos, que abrem pelo navegador do celular:

- **App do cidadão:** o morador informa que um poste está com defeito, envia a localização por GPS e uma foto.
- **App da equipe:** o técnico vê os chamados e registra o conserto, o gestor acompanha o serviço e o almoxarife controla as peças.

## As três partes principais

Pense em um restaurante:

```text
   CELULAR                 SERVIDOR                  BANCO DE DADOS
  (a mesa)      <--->   (a equipe do       <--->     (a despensa
                         restaurante)                 trancada)
```

| Parte | No restaurante | O que faz |
|---|---|---|
| **Celular** | Mesa | Mostra as telas, lê o GPS e tira a foto |
| **Servidor** | Equipe | Confere quem está pedindo, aplica as regras e organiza o trabalho |
| **Banco de dados e arquivos de fotos** | Despensa | Guarda chamados, postes, peças e usuários |

O cliente não entra na despensa, e o celular também não acessa o banco diretamente. Tudo passa pelo servidor, o que protege os dados.

## A divisão de tarefas

O código é separado por função, como as tarefas de uma equipe:

| Camada | No restaurante | Exemplo no sistema |
|---|---|---|
| **Apresentação** | Garçom: recebe o pedido e entrega a resposta | Formulário e botão "Enviar reporte" |
| **Aplicação** | Gerente: coordena as etapas | "Para fechar um chamado, siga estes passos" |
| **Domínio** | Regras da casa | "Um chamado já fechado não pode ser fechado de novo" |
| **Infraestrutura** | Estoquista: busca e guarda as coisas | Gravar no banco e salvar a foto |
| **Dados** | Despensa | As informações guardadas |

Com essa divisão, mudar o visual de uma tela não deveria afetar as regras, e os erros ficam mais fáceis de encontrar. As regras também podem ser testadas sem um banco de dados real.

O nome técnico é **monólito modular**: é um único programa, como um só restaurante com setores bem definidos. Para o tamanho do projeto, isso é mais simples e barato do que manter vários sistemas separados.

## Três situações do dia a dia

### 1. O morador está sem internet

1. O app guarda o reporte no próprio celular.
2. Quando a conexão volta, ele tenta enviar de novo.
3. Se falhar, espera cada vez mais entre as tentativas: 30 segundos, 1 minuto, 2 minutos e assim por diante.

### 2. O mesmo reporte é enviado duas vezes

Cada reporte tem um código único, criado no celular. Se ele chegar de novo, o servidor reconhece o código e não cria um chamado duplicado.

### 3. Dois técnicos fecham o mesmo chamado ao mesmo tempo

- O primeiro "tranca" o chamado enquanto o registro é feito.
- O segundo espera e depois recebe o aviso de que o chamado já foi fechado.
- O fechamento segue a regra do **tudo ou nada**: se faltar uma peça no estoque, o registro inteiro é desfeito. Assim, o chamado não fica fechado com o estoque errado.

## O que ainda não está funcionando

> Situação verificada em 05/11/2026. Revise esta seção quando as telas forem ligadas ao novo servidor.

A explicação acima descreve a arquitetura planejada, e **as telas ainda não estão ligadas a ela**. É como ter a cozinha nova pronta, mas os garçons ainda levarem os pedidos para o endereço antigo.

- **Telas:** os botões ainda usam o código antigo. No app do cidadão, por exemplo, o botão chama a função antiga `submitReport`, em [`public/index.html`](../public/index.html).
- **Servidor:** ao simular os pedidos que as telas enviam, os dois foram recusados:
  - O login do técnico deu erro 404, porque o endereço não existe no servidor.
  - O reporte do cidadão deu erro 400, porque o servidor não entende o formato enviado.
- **Testes:** os 13 testes automáticos passam, mas verificam as peças separadamente e não cobrem essa ligação entre telas e servidor. Nada foi testado com um banco de dados real.
- **Site no ar:** segundo o [`README.md`](../README.md), o que está publicado ainda são os dois sites antigos, e o deploy unificado está pendente.
- **Documentação:** o README ainda diz que o sistema usa Google Apps Script e planilha, enquanto os documentos de arquitetura já falam do servidor novo.

Em resumo, essa arquitetura está construída em partes, mas ainda não integrada às telas.
