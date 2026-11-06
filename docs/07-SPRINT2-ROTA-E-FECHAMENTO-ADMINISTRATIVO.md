# Sprint 2 — Itens 4 e 6

Os itens reutilizam o monólito modular em camadas. Nenhuma tabela, migration ou dado de aplicação foi criado nesta entrega.

## Item 4 — Rota do dia

O botão **Ambiente Gestor → Gerar roteiro de manutenções** usa `TechnicalControllers.calcularRotaDoDia()` e o caso de uso `application/CarregarRota.js`.

- Considera chamados abertos ou em atendimento com coordenadas válidas. Rejeita coordenadas ausentes, fora dos limites e `(0,0)`.
- Agrupa chamados a até 80 metros do primeiro chamado de cada grupo e representa a parada pelo centro do grupo.
- Ordena as paradas pelo vizinho mais próximo a partir do GPS informado. É uma estimativa por proximidade, sem promessa de trajeto mínimo pelas ruas.
- Sem GPS utilizável, pede confirmação antes de usar o primeiro chamado como partida. Não inventa uma posição fixa.
- Calcula com a lista já carregada mesmo sem internet. A navegação externa depende do Google Maps e da conectividade disponível.
- Divide o Maps em trechos com até três pontos intermediários por link, preservando todas as paradas. A origem de cada trecho é o destino do anterior.
- Mantém o roteiro imprimível com todos os chamados e links de todos os trechos.

O algoritmo saiu do HTML e permanece na camada de aplicação; validação de coordenadas e distância ficam no domínio. `MapView` monta os links de navegação, e a tela renderiza o resultado.

## Item 6 — Fechamento administrativo

O gestor usa **Ambiente Gestor → Fechar chamado administrativamente**. O formulário pede chamado, informante (até 120 caracteres), status final e justificativa com pelo menos 10 caracteres. Usa diálogo nativo com rótulos, navegação por teclado e confirmação antes de enviar.

Quando a API Node está configurada, a tela envia:

```http
POST /api/chamados/:protocolo/fechamento-admin
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "operacao_id": "11111111-1111-4111-8111-111111111111",
  "informante": "Responsável pelo atendimento",
  "justificativa": "Serviço confirmado pela equipe municipal.",
  "status": "Concluído"
}
```

O servidor exige perfil `gestor`, valida os dados e usa a transação existente para travar o chamado, registrar o fechamento e atualizar seu status. Registra gestor autenticado, informante, justificativa, data e a marca administrativa. Não salva foto nem debita materiais.

O UUID é criado ao abrir o formulário e permanece no reenvio após uma falha de rede. O servidor consulta a operação depois de travar o chamado: repetir os mesmos dados retorna o fechamento existente; outra operação para um chamado fechado ou reutilização do UUID com outros dados retorna `409`. Uma falha na atualização reverte a transação.

Sem sessão ou com sessão inválida, retorna `401`; um técnico recebe `403`. A restrição é aplicada pelo backend, mesmo se alguém contornar a interface. Durante o envio, os campos ficam bloqueados. Se a confirmação não chegar, os dados permanecem no formulário para nova tentativa; fechar ou recarregar a página não os preserva.

## API, MySQL e compatibilidade

Login e listagem existentes foram ligados à API como dependências desses itens. O cliente respeita o resultado HTTP, sem permitir que um campo JSON transforme uma resposta `403` em sucesso. A configuração legada do Apps Script continua disponível; configurar `ILUMINA_API_URL` seleciona a API Node.

Com a API selecionada, o build ignora os endpoints legados, inclusive os placeholders do `.env.example`. Use `ILUMINA_API_URL=/` para uma API na mesma origem ou a URL base do servidor Node; deixe vazia apenas para usar os endpoints reais do Apps Script.

As consultas dos repositórios `ChamadoRepository`, `FechamentoRepository`, `UsuarioRepository` e `SessaoRepository` foram adaptadas ao MySQL, preservando o contrato atual do backend. **Esse contrato ainda espera as tabelas `chamados`, `fechamentos`, `usuarios`, `sessoes` e `tentativas_login`.** O DER do grupo utiliza outra nomenclatura, incluindo `chamado`, `ordem_servico` e `usuario`; é necessário alinhar e preparar o esquema antes de usar a persistência real.

O MySQL local permanece com zero tabelas de aplicação, conforme o escopo autorizado. A migration `001_inicial.sql` é PostgreSQL e não deve ser executada no MySQL. Outros repositórios, como estoque e postes, continuam pendentes de migração; esta entrega não declara toda a aplicação migrada.

## Verificação

```bash
npm install --prefix server
npm test
npm run build
npm run db:check
```

Os testes automatizados cobrem cálculo e agrupamento de rota, GPS inválido, divisão dos links, permissões HTTP, validação administrativa, reenvios simultâneos, conflitos, rollback e parâmetros MySQL. As gravações e a concorrência foram testadas com repositórios e travas simulados, sem criar tabelas.

As subpastas identificam as funcionalidades testadas: `server/tests/rota-do-dia/` e `server/tests/fechamento-administrativo/`. Elas contêm 15 testes específicos dos itens 4 e 6; com os testes compartilhados e anteriores, o conjunto tem 35 testes. Os testes de infraestrutura compartilhada ficam em `server/tests/`. O comando `npm test` descobre os testes de todas essas pastas.

Os [relatórios de testes](<Relatório de Testes/README.md>) registram a autoria de Orlando Henrique (RA 1272515070), os cenários executados e as capturas de tela em subpastas por funcionalidade.

A verificação com Playwright usa as telas reais e a API Node real com repositórios simulados: testa desktop, celular, roteiro imprimível, cálculo sem rede, perfil técnico bloqueado e perda de resposta seguida de reenvio sem duplicação. A configuração legada de login, rota e fechamento também foi verificada com respostas simuladas no formato do Apps Script. As consultas de estatísticas, perfis e janela de login foram exercitadas no MySQL real usando CTEs somente de leitura.

**Pendente para homologação:** validar login, gravação, rollback e concorrência contra o esquema MySQL definitivo do grupo, com usuários e chamados reais de teste. Os testes simulados não substituem essa etapa.
