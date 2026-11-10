# Rubrica de nota

A nota é calculada, não sentida. Duas auditorias do mesmo projeto devem chegar à
mesma nota (±0,5).

## Passo 1 — Pontuação base (0–10)

| Dimensão | Peso | 0 | metade | cheio |
|---|---|---|---|---|
| Corretude do fluxo principal (Saga/fluxo central funciona de ponta a ponta só pelos mecanismos declarados) | 2,0 | não funciona ou depende de atalho manual | funciona com ressalvas | provado por E2E |
| Integridade sob concorrência e duplicidade (V4, V6) | 1,5 | corrida reproduzida | protegido sem prova | provado contra infra real |
| Segurança e autorização (V1, V2, V3) | 1,5 | falha crítica aberta | sem falha crítica, lacunas médias | provado por testes de abuso |
| Resiliência (V5, V9) | 1,5 | falha silenciosa no boot/queda | recupera com intervenção | cold start limpo + caos provado |
| Testes (pirâmide no nível certo) | 1,5 | só unitário com fakes | integração parcial | unitário + contrato/integração + E2E no CI |
| Arquitetura e contratos (V7, V8, V10) | 1,0 | contratos quebrados/gateway contornável | inconsistências menores | contratos completos e testados |
| Observabilidade e operação (V11) | 0,5 | sem rastreio | rastreio parcial | fluxo reconstruível ponta a ponta |
| Documentação e higiene (V12) | 0,5 | docs falsos/ferramentas mentem | divergências menores | docs conferidos com o código, limitações declaradas |

## Passo 2 — Tetos (aplique o menor que couber)

| Condição | Teto |
|---|---|
| Sistema não foi executado pelo auditor | **6,0** |
| Qualquer falha 🔴 crítica confirmada e não corrigida | **5,0** |
| Fluxo principal depende de passo manual/HTTP que deveria ser evento | **5,5** |
| Corrida de dinheiro/estoque reproduzida e aberta | **4,0** |
| Escalada de privilégio aberta | **3,0** |
| Nenhum teste além de unitários com fakes | **7,0** |
| Sem E2E/integração no CI (existe só local) | **8,0** |
| README promete garantia que o código não cumpre | **8,0** |
| Falha 🟠 alta aberta (ex.: Saga sem saída para estado intermediário crítico) | **8,5** |

## Passo 3 — O que separa 9 de 10

- **9:** nenhum crítico/alto aberto; E2E no CI cobrindo caminho feliz, compensação,
  concorrência e abuso; cold start e caos provados; docs fiéis com limitações
  declaradas.
- **10:** tudo do 9 **mais** ausência de limitações relevantes para o escopo declarado
  (ex.: reservas expiram, tracing com spans, credenciais de serviço entre serviços,
  testes de contrato automatizados entre produtor e consumidor). 10 é raro e deve ser
  justificado item a item.

## Como reportar
Mostre a conta: pontuação por dimensão, teto aplicado (se houver) e o motivo. Diga o
que falta para subir 1 ponto — isso é mais útil do que a nota em si.
