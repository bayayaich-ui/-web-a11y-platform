# Web Accessibility Platform - Database

## Overview

This database stores all data related to the web accessibility scanning platform.

It tracks users, websites, scans, detected accessibility issues, and generated fixes.

---

## Tables

### 1. users
Stores platform users.

- id: unique identifier
- email: user email
- name: user name
- created_at: account creation date

---

### 2. sites
Stores websites added by users.

- id: unique identifier
- user_id: owner of the site
- url: website URL
- name: optional site name
- created_at: creation date

---

### 3. scans
Represents each accessibility scan.

- id: unique identifier
- site_id: scanned website
- status: pending / running / completed / failed
- max_pages: number of pages scanned
- started_at / finished_at: scan timing

---

### 4. pages
Stores pages visited during a scan.

- id: unique identifier
- scan_id: related scan
- url: page URL
- screenshot_url: stored screenshot
- status: success / timeout / error

---

### 5. violations
Stores accessibility issues found.

- id: unique identifier
- page_id: related page
- rule: WCAG rule (example: color-contrast)
- impact: critical / serious / moderate / minor
- selector: HTML element
- details: JSON extra info

---

### 6. fixes
Stores AI or system-generated fixes.

- id: unique identifier
- violation_id: related issue
- method: widget_patch / pull_request
- code_diff: suggested fix
- status: suggested / applied / rejected

---

## Relationships

users → sites → scans → pages → violations → fixes
