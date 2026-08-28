<a id="top"></a>

<div align="center">

[![Deutsch](https://img.shields.io/badge/🇩🇪_Deutsch-24292f?style=for-the-badge)](#deutsch)
[![English](https://img.shields.io/badge/🇬🇧_English-24292f?style=for-the-badge)](#english)

</div>

---

<a id="deutsch"></a>

# KI-Broker: Validierung und Designnachweise

Der ausführbare Broker liegt unter [`broker/`](../../broker/). Dieser Ordner
enthält nur die dazugehörigen, weiterhin gepflegten Entscheidungen, Sicherheits-
und Protokollnachweise.

<div align="center">

[![Protokoll](https://img.shields.io/badge/Action--Protokoll-24292f?style=for-the-badge)](action-protocol/spec.md)
[![Sicherheit](https://img.shields.io/badge/Sicherheit-24292f?style=for-the-badge)](security/threat-model.md)
[![Tests](https://img.shields.io/badge/Tests-24292f?style=for-the-badge)](testing/test-matrix.md)

</div>

## Gültiger Umfang

- Chat und bestätigte Schaltungsaktionen beziehen sich ausschließlich auf die
  aktuell geöffnete Schaltung.
- Der Browser überträgt den Provider-Schlüssel einmal an den lokalen Broker und
  verwendet danach nur die sitzungsgebundene Referenz. Der Broker reduziert den
  Kontext und setzt Limits sowie Host-Allowlisting durch.
- Aktionen werden vollständig validiert, in der Oberfläche als Vorschau
  bestätigt und anschließend als genau ein atomarer Batch ausgeführt.
- Allgemeiner oder vom Modell steuerbarer Dateisystemzugriff, Projekt-Scanning
  und eine allgemeine Remote-Steuerung sind nicht Teil der Schnittstelle.

## Kanonische Dokumente

| Dokument | Inhalt |
|---|---|
| [`broker/README.md`](../../broker/README.md) | Installation, Konfiguration und Betrieb |
| [`action-protocol/spec.md`](action-protocol/spec.md) | striktes v1-Aktionsformat und atomare Ausführung |
| [`decisions/adr-001-current-circuit-only.md`](decisions/adr-001-current-circuit-only.md) | Begrenzung auf die offene Schaltung |
| [`decisions/adr-002-byo-key-via-backend-broker.md`](decisions/adr-002-byo-key-via-backend-broker.md) | BYO-Key über lokalen Broker |
| [`security/threat-model.md`](security/threat-model.md) | Bedrohungen und Gegenmaßnahmen |
| [`security/secret-handling.md`](security/secret-handling.md) | Umgang mit Provider-Schlüsseln |
| [`testing/test-matrix.md`](testing/test-matrix.md) | Testklassen und Pflichtpfade |

Der Browser-Smoke-Runner schreibt ausschließlich nach
`.artifacts/validation/broker-ui/`.

[Validierungsübersicht](../README.md) · [Nach oben](#top)

---

<a id="english"></a>

# AI Broker: Validation and Design Records

The executable broker lives in [`broker/`](../../broker/README.md#english).
This directory keeps only its maintained decisions, security notes, protocol
specification, and test matrix.

## Supported scope

- Chat and confirmed circuit actions operate on the currently open circuit only.
- The browser sends the provider key to the local broker once and then uses only
  its session-bound reference. The broker reduces context and enforces limits
  and outbound-host allowlisting.
- Actions are fully validated, previewed for explicit confirmation, and then
  dispatched as one atomic batch.
- General or model-controlled file-system access, project scanning, and remote
  control are outside the interface.

The canonical documents are the [broker operations guide](../../broker/README.md#english),
[action protocol](action-protocol/spec.md), [architecture decisions](decisions/),
[threat model](security/threat-model.md),
[secret-handling rules](security/secret-handling.md), and
[test matrix](testing/test-matrix.md). Browser smoke output is generated only
below `.artifacts/validation/broker-ui/`.

[Validation overview](../README.md#english) · [Back to top](#top)
