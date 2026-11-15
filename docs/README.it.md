# Astrological Functions — panoramica italiana

**Stato (15 novembre 2026): libreria sperimentale ESM JavaScript, repository privato e non ancora distribuito con licenza open source.** Questa documentazione serve a preparare l'apertura pubblica, non ne costituisce autorizzazione.

Il branch `main` contiene funzioni matematiche per angoli, zodiaco, dodecatemorie, aspetti e metodi sperimentali per le case (Vehlow, Porfirio, Placido, Regiomontano, Koch), oltre a test Node e alcune dichiarazioni TypeScript. Non è ancora un motore completo per temi natali, sinastrie e transiti di produzione.

L'astronomia è compito esclusivo di [VirgoStars Ephemeris](https://github.com/Cesare-ml/VirgoStars-Ephemeris), con nucleo Rust e dataset esterni; questa libreria applica metodi astrologici a dati dichiarati. Nessuna duplicazione del motore astronomico, copia di Swiss Ephemeris, fallback silenzioso o accesso a dati personali. Le integrazioni DE441 sperimentali non certificano da sole la correttezza scientifica generale.

Per lavorare nel repository con Node.js >=20: `npm test`. Le prove TypeScript e quelle che richiedono un adapter Rust e dati DE441 esterni devono essere verificate separatamente. Il pacchetto rimane `"private": true` su npm.

La preferenza ora è per **crediti VirgoStars visibili nelle applicazioni che incorporano la libreria**, non soltanto nel codice sorgente. CPAL-1.0 con Exhibit B è un candidato da verificare: la clausola può richiedere l'attribuzione all'avvio della sessione e non soltanto una pagina Credits/About consultabile a richiesta. Nessuna licenza è ancora concessa.

Prima dell'apertura pubblica vanno verificati diritti su codice, dati e fixture, compatibilità della licenza, audit di sicurezza e privacy dell'**intera cronologia Git**, e autorizzazione separata al cambio di visibilità.

Documenti: [README principale](../README.md), [architettura](ARCHITECTURE.md), [contratti](CONTRACTS.md), [licenza](LICENSING_OPTIONS.md), [controlli di pubblicazione](PUBLICATION_READINESS.md), [provenienza](PROVENANCE_REVIEW.md).
