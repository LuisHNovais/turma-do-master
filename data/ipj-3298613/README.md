# IPJ-A nº 3298613/2026 — extração

Segunda fonte de dados da Turma do Master, ao lado do export de conversas com Martha
Graeff (`data/messages.json`).

## Documento

| | |
|---|---|
| Documento | Informação de Polícia Judiciária de Análise (IPJ-A) nº 3298613/2026 |
| Unidade | NADIP/DFIN/CGRC/DICOR/PF |
| Procedimento | 2026.0098110–CGRC/DICOR/PF (Registro Especial) |
| Destinatário | Ministro André Mendonça — PET nº 15.556 |
| Data | 27/08/2026 |
| Objeto | iPhone 17 Pro apreendido de Daniel Bueno Vorcaro (Termo de Apreensão 4473731/2025) |
| Laudo da extração | 4281/2025 - SETEC/SR/PF/SP |
| Ferramentas da perícia | IPED 4.2.2 e Cellebrite Reader 10.7.1.5013 |
| PDF | `data/source/IPJ-A-3298613-2026.pdf` (versionado no repo) — 218 páginas, sha256 `23cfdfa4…5192b60` |

O relatório responde à requisição judicial que mandou identificar os
interlocutores das notas reproduzidas na IPJ-M nº 144738439.2026, incluindo
detentores de foro por prerrogativa de função.

## Por que a extração é manual

O conteúdo das mensagens não está na camada de texto do PDF: cada conversa é uma
**imagem** (captura do Cellebrite Reader ou do bloco de notas do iPhone). A
camada de texto tem só a narrativa policial, as legendas das figuras e as tabelas
forenses. Não há parser possível — as 218 páginas foram renderizadas a 130 DPI e
transcritas por leitura visual, página a página.

Cobertura: páginas 9 a 216. Ficaram de fora as páginas que só contêm tabelas de
"Sequência dos eventos" (linha do tempo de logs, sem conteúdo de mensagem),
recortes de contrato e os anexos que repetem notas já transcritas.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `chat-moraes.jsonl` | A thread WhatsApp DV ↔ "Alexandre de Moraes BRASILIA" (556192664093), incluindo avisos de sistema e mensagens apagadas |
| `notas.jsonl` | As 52 notas do app Notas que DV capturou e enviou àquele terminal, com os carimbos de criação, screenshot e envio |
| `mensagens.jsonl` | Trechos de todas as outras conversas citadas no relatório, uma linha por mensagem |
| `paginas.txt` | Censo página a página do PDF (nº da página, volume de texto, legendas das figuras) — mapa usado na transcrição |

Cada linha traz `page` e `fig`, que apontam para a página e a figura do PDF de
origem, então qualquer mensagem pode ser conferida contra o documento.

## A dinâmica das notas

A perícia reconstruiu um padrão que se repete 52 vezes: VORCARO abre o app Notas,
escreve, tira um print, o iOS gera um PDF temporário idêntico em `tmp/`, ele fecha
o Notas, abre o WhatsApp e envia a imagem em **visualização única** para
556192664093. As categorias "Logs" e "Uso de Aplicativos" da extração amarram cada
print ao envio correspondente.

Consequência para os dados: as mensagens que VORCARO mandou ao ministro são
imagens de visualização única cujo texto só existe porque a perícia recuperou as
notas. É por isso que `notas.jsonl` e `chat-moraes.jsonl` são fontes separadas —
e por que `scripts/build-ipj-data.mjs` funde as duas ao montar a conversa.

**Horários:** os logs do sistema estão em UTC e o WhatsApp exibe UTC-3. As notas
guardam os dois (`sent_utc` e `sent_br`); a build usa `sent_br`, para bater com o
horário mostrado nos prints das conversas.

**As mensagens recebidas não foram recuperadas.** O que o contato "Alexandre de
Moraes BRASILIA" respondeu era também visualização única e continua ilegível — no
viewer aparece como placeholder. O lado de lá da conversa só pode ser inferido
pelo que VORCARO escreve em seguida.

## Como reconstruir os dados

```bash
node scripts/build-ipj-data.mjs     # JSONL → data/conversations/*.json
npm run split-data                  # → public/data/ (chunks por dia)
```

A conversa com Martha Graeff citada no relatório **não** vira conversa própria:
ela já está completa em `data/messages.json`, e emitir os trechos criaria um id
duplicado. Ver `SKIP_CONVERSATIONS` em `scripts/build-ipj-data.mjs`.

## Ressalvas do próprio relatório

O documento se declara não exaustivo: foi produzido em 72 horas, transcreveu
apenas as menções nominais diretamente identificadas e não fez aprofundamento
investigativo sobre magistrados ou membros do Ministério Público (LOMAN / Lei
Orgânica do MP). Nada aqui é conclusão sobre conduta de ninguém — é o material
bruto que a PF reuniu e apresentou ao relator.
