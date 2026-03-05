# MVP Scope Directive

## Goal
Deliver the Phase 1 MVP of OptiSight AI (retail_insight) — a cloud-based retail analytics platform for retail executives.

## MVP Features
1. **User Registration & Authentication** — JWT-based auth with RBAC (admin, executive, manager)
2. **Data Ingestion** — API for pushing transaction, product, and store data
3. **Performance Dashboard** — Real-time KPIs (revenue, transaction count, AOV, customer count), trend charts, top products, anomaly alerts
4. **AI Recommendations** — Collaborative filtering with popularity-based cold-start fallback
5. **Notifications** — Basic alert infrastructure for anomalies
6. **Dark Mode** — Theme toggle with localStorage persistence
7. **Responsive Design** — Desktop, tablet, mobile breakpoints

## Architecture
- Full microservices: 5 Node.js services + Python AI engine + React SPA
- Shared PostgreSQL database (service-owned tables)
- Docker Compose for local orchestration
- No cloud deployment in MVP

## Constraints
- Test-first validation per CLAUDE.md
- No secrets in codebase
- All changes must be auditable
- Junior developer must be able to understand any change
