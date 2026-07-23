# Contrats de données — Files RabbitMQ

Ce document décrit le format exact des messages échangés entre le **Scanner Service** (Node.js) et le **Backend FastAPI** (Python) via RabbitMQ. Toute modification de ces contrats doit être communiquée aux deux équipes avant d'être déployée.

## Vue d'ensemble

Deux files, un sens de circulation par file. Ni le Backend ni le Scanner ne s'appellent jamais directement — toute communication passe par RabbitMQ.

---

## File `scan.jobs`

**Producteur** : Backend FastAPI
**Consommateur** : Scanner Service
**Durable** : oui (le message survit à un redémarrage de RabbitMQ)

### Schéma du message

| Champ       | Type          | Obligatoire | Description                                       |
| ----------- | ------------- | ----------- | ------------------------------------------------- |
| `scan_id`   | string (UUID) | oui         | Identifiant unique du scan, généré par le Backend |
| `site_id`   | string (UUID) | oui         | Identifiant du site associé                       |
| `url`       | string        | oui         | URL de départ à scanner                           |
| `max_pages` | integer       | oui         | Nombre maximum de pages à crawler                 |
| `max_depth` | integer       | oui         | Profondeur maximale de crawl                      |

### Exemple

```json
{
  "scan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "site_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "url": "https://client-site.com",
  "max_pages": 50,
  "max_depth": 3
}
```

### Comportement du Scanner en cas de réception

1. Consomme le message avec `prefetch(1)` — un seul job traité à la fois par instance
2. En cas d'échec, republie automatiquement avec un header `x-retry-count` incrémenté (max 3 tentatives, backoff exponentiel 2s/4s/8s)
3. Après 3 échecs, le message est acquitté (retiré) sans être retraité — le Backend doit surveiller l'absence de résultats pour détecter un scan silencieusement abandonné (amélioration future : publier un événement `scan.failed`, pas encore implémenté)

---

## File `scan.page_completed`

**Producteur** : Scanner Service
**Consommateur** : Backend FastAPI
**Durable** : oui
**Fréquence** : un message par page scannée (pas un seul message pour tout le scan)

### Schéma du message

| Champ            | Type              | Obligatoire | Description                                                                             |
| ---------------- | ----------------- | ----------- | --------------------------------------------------------------------------------------- |
| `scan_id`        | string (UUID)     | oui         | Doit correspondre au `scan_id` du job d'origine                                         |
| `page_url`       | string            | oui         | URL de la page scannée                                                                  |
| `violations`     | array             | oui         | Liste des violations détectées (voir schéma ci-dessous) — peut être vide `[]`           |
| `screenshot_key` | string            | oui         | Référence au fichier dans MinIO/S3, format `bucket/screenshots/{scan_id}/{page_id}.png` |
| `scanned_at`     | string (ISO 8601) | oui         | Horodatage de la capture                                                                |

### Schéma d'un objet `violation` (dans le tableau `violations`)

| Champ           | Type            | Obligatoire | Description                                              |
| --------------- | --------------- | ----------- | -------------------------------------------------------- |
| `rule`          | string          | oui         | Identifiant de la règle axe-core, ex: `"color-contrast"` |
| `impact`        | string          | oui         | `"critical"` \| `"serious"` \| `"moderate"` \| `"minor"` |
| `selector`      | string          | oui         | Sélecteur CSS de l'élément fautif                        |
| `wcag_criteria` | array de string | oui         | Critères WCAG concernés, ex: `["1.4.3"]`                 |
| `details`       | object          | non         | Détails spécifiques à la règle (ex: ratio de contraste)  |

### Exemple complet

```json
{
  "scan_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "page_url": "https://client-site.com/contact",
  "violations": [
    {
      "rule": "color-contrast",
      "impact": "serious",
      "selector": ".btn-primary",
      "wcag_criteria": ["1.4.3"],
      "details": { "ratio": 2.1, "required": 4.5 }
    },
    {
      "rule": "image-alt",
      "impact": "critical",
      "selector": "img.hero-banner",
      "wcag_criteria": ["1.1.1"],
      "details": {}
    }
  ],
  "screenshot_key": "a11y-platform/screenshots/a1b2c3d4-e5f6-7890-abcd-ef1234567890/7f8a9b0c.png",
  "scanned_at": "2026-07-19T14:32:00.000Z"
}
```

### Ce que le Backend doit faire à la réception

1. Retrouver le `scan_id` en base (table `scans`)
2. Créer une ligne dans `pages` avec `page_url`, `screenshot_key`, `scanned_at`
3. Créer une ligne dans `violations` pour chaque élément du tableau, liée à cette page
4. Mettre à jour le compteur `pages_scanned` sur la table `scans`

---

## Points d'attention pour l'implémentation Python

- **Encodage** : tous les messages sont en UTF-8, JSON standard — `json.loads(msg.body)` suffit côté `aio-pika` ou `pika`
- **Idempotence recommandée** : si un message est traité deux fois par erreur (redélivrance RabbitMQ après crash), l'insertion en base ne doit pas créer de doublon — utiliser une contrainte unique sur `(scan_id, page_url)` dans la table `pages` est recommandé
- **`violations` peut être un tableau vide** : une page sans violation est un résultat valide, pas une erreur
- **Ne pas bloquer le consommateur** : si l'insertion en base échoue, ne pas laisser planter tout le processus — logger l'erreur et `nack` le message pour qu'il soit retraité

## Historique des versions de ce contrat

| Date       | Changement       |
| ---------- | ---------------- |
| 2026-07-19 | Version initiale |

---

_Ce document doit être mis à jour et communiqué aux deux parties avant tout changement de schéma._
