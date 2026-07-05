# Web Accessibility Platform

Plateforme SaaS qui utilise l'intelligence artificielle pour auditer, diagnostiquer et corriger automatiquement les problèmes d'accessibilité web (WCAG 2.2, RGAA, conformité EAA).

## 🎯 Le projet

L'European Accessibility Act (EAA) rend l'accessibilité obligatoire pour des millions de sites web en Europe. Cette plateforme automatise tout le processus, de la détection à la correction :

1. **Scan** du site en quelques minutes
2. **Détection** des violations WCAG via axe-core
3. **Diagnostic IA** — priorisation et explication en langage clair
4. **Correction automatique** — patch live (widget) ou pull request Git
5. **Rapports** complets avec score de conformité
6. **Monitoring continu** pour rester conforme dans le temps

## 🏗️ Architecture

Monorepo géré avec **Turborepo**, organisé en microservices :

## 🛠️ Stack technique

- **Backend** : Node.js, TypeScript
- **Frontend** : Next.js, Tailwind CSS
- **Scan** : Playwright, axe-core
- **IA** : Claude API (Anthropic)
- **Base de données** : PostgreSQL, Redis
- **Stockage fichiers** : S3 (screenshots, rapports)
- **File de messages** : Kafka / RabbitMQ
- **Infra** : Docker, Kubernetes, Terraform
- **Monorepo** : Turborepo

## 📋 Prérequis

- Node.js 20+
- npm 10+
- Docker et Docker Compose
- Git

## 🚀 Installation

```bash
# Cloner le dépôt
git clone https://github.com/bayayaich-ui/-web-a11y-platform.git
cd -web-a11y-platform

# Installer les dépendances de tous les workspaces
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer les services d'infrastructure (Postgres, Redis, Kafka, S3 local)
docker-compose -f infra/docker/docker-compose.yml up -d
```

## 💻 Développement

```bash
# Lancer tous les services en mode dev
npx turbo dev

# Builder tous les services
npx turbo build

# Lancer les tests
npx turbo test

# Linter le code
npx turbo lint
```

## 📁 Documentation

- [Architecture détaillée](docs/architecture.md)
- [Mapping des règles WCAG](docs/wcag-mapping.md)
- [Méthodologie de scoring](docs/scoring-methodology.md)

## 🤝 Contribuer

Ce projet est développé en binôme. Workflow de contribution :

1. Créer une branche par ticket : `git checkout -b feature/ticket-X-nom`
2. Commiter avec des messages clairs : `git commit -m "feat: description"`
3. Pousser et ouvrir une pull request
4. Faire relire par l'autre développeur avant merge

Suivi des tâches sur [Trello](#) _(lien à ajouter)_.

## 📄 Licence

Projet privé — usage interne uniquement.
