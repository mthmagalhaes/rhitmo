---
name: Continuous Feedback (Windmill reference)
description: Referência conceitual da feature "continuous-feedback" da Windmill (gowindmill.com) — base para repensar o menu Contexto do Rhitmo
type: reference
---

# Continuous Feedback — referência Windmill

Fonte: https://gowindmill.com/features/continuous-feedback/

## Tese central
Feedback leve e contínuo, não só em ciclos formais. "Feedback that moves as fast as your team."
Tradicional falha por: **infrequente/atrasado**, **só do gestor**, **vago/sem contexto**, **perdido em Slack/PRs/notas**.

## Mecânica Windmill (chatbot "Windy")
- Bot proativo no Slack pergunta sobre feedback **com base em quem a pessoa está realmente trabalhando** (sinais de colaboração) e **no que está trabalhando** (contexto do trabalho).
- Identifica **coaching moments quando acontecem**, não meses depois.
- Powered by **ONA (Organizational Network Analysis)** — entende padrões de colaboração reais.
- Coleta contínua de "Context from Business Apps" (amarelo, alto volume) + "Feedback from Employees" (verde, mais raro) ao longo do ano, vs. spike único da review tradicional.

## Output exemplo: Feedback Report — Sarah Chen
Relatório trimestral entregue **proativamente via Slack ao líder**, formato:
1. **Key Action Items** (3-4 focos: time mgmt, comunicação, documentação, mentorship)
2. **Executive Summary** (What's going well 🌟 + Growth opportunities 📈)
3. **Detailed Feedback Analysis** com **citações nominais** ("Mike Rodriguez, Engineering Manager noted: ...")
4. Métricas duras embutidas (ex.: "API response time 240ms→145ms", "migrou 2.3TB zero downtime")
5. **Recommendations & Development Plan** (30 dias / 90 dias)
6. Pulled from "1 employee + 2 integrations (Slack, GitHub)" — transparência de fontes

## Gap atual no Rhitmo (menu Contexto)
- Hoje `/lider/contexto` é feed bruto cronológico — se confunde com brief de 1:1.
- Falta: **(a)** chatbot proativo coletando feedback de pares, **(b)** ONA/grafo de colaboração, **(c)** integrações com ferramentas de trabalho (GitHub, Linear, Jira) além de Slack/Calendar/Recall, **(d)** report quarterly de pares com citações nominais entregue no Slack.

## Pontes possíveis no Rhitmo
- **Rhitmo Mensal/Trimestral** já é meio caminho: condensa sinais em padrões. Falta input de **pares**.
- **Pulse Surveys** (Sprint 9) já tocam pares pontualmente — pode virar coleta contínua orientada por colaboração detectada.
- **Slack ambient classifier** já existe — pode evoluir para detectar "quem trabalha com quem" (proto-ONA).
- Integrar com GitHub/Linear seria salto grande de produto.

## Decisão
Salvo como referência. Não implementar agora. Reavaliar quando explorarmos o redesenho do menu Contexto / continuous feedback.
