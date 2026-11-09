# Astrological Functions — sintesi italiana

**Stato: progettazione. Repository privato; possibile apertura futura, non ancora autorizzata.**

`astrological-functions` raccoglierà soltanto le funzioni astrologiche riutilizzabili (tema natale, posizioni zodiacali, case, aspetti, sinastria, transiti, rivoluzioni, sinodi, ore planetarie ed eventuali estensioni). Non è un duplicato del backend; alcune routine legacy rimarranno applicative o saranno abbandonate dopo verifica.

La libreria riceverà i calcoli astronomici dal **repository pubblico** [VirgoStars Ephemeris](https://github.com/Cesare-ml/virgostars-ephemeris), non da `swisseph` né da un suo porting. Swiss Ephemeris rimane nel backend oggi online soltanto durante il periodo di transizione. La nuova libreria non effettuerà fallback a Swiss.

Il frontend VirgoStars e la libreria grafica `astrological-charts` utilizzeranno dati canonici prodotti dal backend/motore, senza duplicare le regole per aspetti, domificazioni o interpretazione degli aspetti. `astrological-assets` rimane il repository delle risorse visive e non è dipendenza del calcolo.

Il codice esistente contiene regole personalizzate (ad esempio inversione australe e etichetta legacy `egizia` per codice case V) che andranno riprodotte **soltanto** in una modalità di compatibilità testata, distinguendole dalle nuove regole standard.

Documenti: [architettura](ARCHITECTURE.md), [contratti](CONTRACTS.md), [inventario](MIGRATION_INVENTORY.md), [test](VALIDATION.md), [roadmap](ROADMAP.md), [licenza](LEGAL_AND_PUBLICATION.md).
