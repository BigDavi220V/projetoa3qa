# Relatório de Testes — Fechamento administrativo

- **Aluno:** Orlando Henrique
- **RA:** 1272515070
- **Data:** 05/11/2026
- **Item da Segunda Sprint:** 6

## O que fiz

Já existiam o formulário e uma base do serviço de fechamento administrativo. Completei a comunicação da tela com a API Node e reforçei as verificações para que a operação dependa do perfil de gestor, tenha uma justificativa válida e não seja registrada duas vezes após um reenvio.

O gestor seleciona o chamado, informa quem confirmou o serviço, escolhe o status final e escreve uma justificativa com pelo menos dez caracteres. O servidor utiliza a identidade do usuário autenticado para registrar quem fez o fechamento. Nesse fluxo, não são exigidos foto ou GPS, e não há baixa de material no estoque.

Cada formulário recebe um identificador de operação. Se a conexão falhar, a nova tentativa mantém esse identificador. No servidor, a consulta da operação ocorre depois da trava do chamado. Isso permite reconhecer uma repetição e devolver o fechamento já registrado, em vez de inserir outro.

Também mantive o registro do fechamento e a atualização do chamado na mesma transação. Se uma das etapas falhar, a operação deve ser revertida. Na interface, os campos ficam bloqueados durante o envio e os dados permanecem no formulário quando não é possível confirmar a resposta.

## Testes automatizados

Os testes estão separados em [cliente.test.js](../../../server/tests/fechamento-administrativo/cliente.test.js) e [servidor.test.js](../../../server/tests/fechamento-administrativo/servidor.test.js).

| Caso | O que verifiquei | Resultado |
|---|---|---|
| FA-01 | Obrigatoriedade e formato do identificador, informante, justificativa e status. | Aprovado |
| FA-02 | Registro do gestor, informante, motivo e data, sem salvar foto ou movimentar estoque. | Aprovado |
| FA-03 | Dois reenvios simultâneos da mesma operação retornam um único fechamento. | Aprovado |
| FA-04 | Outra operação concorrente para o mesmo chamado recebe conflito. | Aprovado |
| FA-05 | O identificador não pode ser reutilizado com dados ou gestor diferentes. | Aprovado |
| FA-06 | Chamado inexistente retorna 404; falha na atualização reverte a transação. | Aprovado |
| FA-07 | Parâmetro de endereço malformado retorna 400 sem interromper o servidor. | Aprovado |
| FA-08 | A API aplica autenticação e perfil antes da gravação; testa sucesso, repetição e conflito. | Aprovado |
| FA-09 | O cliente impede o envio sem dados válidos, identificador estável ou sessão. | Aprovado |
| FA-10 | A chamada usa a API REST e mantém o identificador depois de uma falha de rede. | Aprovado |
| FA-11 | Respostas 401, 403, 409 e 503 continuam sendo tratadas como falha pelo cliente. | Aprovado |

A [saída da execução](evidencias/execucao-automatizada.txt) apresenta **11 testes aprovados e nenhuma falha**. Para repetir:

```bash
node --test server/tests/fechamento-administrativo/cliente.test.js server/tests/fechamento-administrativo/servidor.test.js
```

## Verificação no navegador

No teste da tela, simulei uma situação importante: o servidor processou o fechamento, mas a resposta não chegou ao navegador. O formulário manteve os dados e permitiu tentar novamente. A segunda tentativa usou o mesmo identificador e não criou outro registro no repositório simulado.

Conferi que um técnico não consegue abrir o fechamento pela tela e recebe 403 se tentar chamar a API diretamente. Também verifiquei os campos obrigatórios, o bloqueio de fechamento do diálogo durante uma gravação em andamento, o retorno do formulário após falha e sua apresentação no celular. O diálogo utiliza os recursos nativos do navegador para foco e navegação por teclado.

O fluxo legado do Apps Script foi verificado com respostas simuladas no formato anterior. Na execução final do navegador, não foram registrados erros de JavaScript.

- [Captura no computador](evidencias/administrativo-desktop.png)
- [Captura no celular](evidencias/administrativo-mobile.png)

## Conclusão e limite

Os cenários de regras, comunicação e controle de acesso passaram. Os testes de gravação, trava e rollback utilizaram repositórios simulados; portanto, não apresentam uma gravação real no MySQL como evidência.

O banco de aplicação continua sem tabelas, conforme o escopo combinado. A validação final depende do esquema MySQL definitivo do grupo, incluindo o alinhamento dos nomes e relacionamentos usados pelo backend. Depois disso, será necessário repetir os cenários de gravação e concorrência no banco real.

Se a resposta se perder, os dados ficam apenas no formulário aberto. Fechar ou recarregar a página não preserva esse preenchimento.

**Orlando Henrique — RA 1272515070**
