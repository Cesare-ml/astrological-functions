/** VirgoStars arithmetic lots, ported from the user's historical Regolo-Alpha-Leonis
 * @api/routes/api/parti-arabe.js (blob 51c5ae87451a1718212153e77139920a12a1f871).
 * Pure arithmetic only: no Swiss Ephemeris, time/date inference, network or personal data.
 * Keep the original names, sequence, formula strings and offsets for the desktop renderer.
 */
const governatoriSegni=Object.freeze(['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']);
const mod360=x=>((x%360)+360)%360;
function rulerOf(longitude) {return governatoriSegni[Math.floor(mod360(longitude)/30)];}
function getGovernatoreCasa(temaRender,domificazioneInUso,casa) {
  return rulerOf(temaRender.houses[domificazioneInUso].house[casa-1]);
}
function getGovernatorePianeta(temaRender,nomePianeta) {
  return rulerOf(temaRender.planets[nomePianeta].longitude);
}
function getGovernatoreAsc(temaRender,domificazioneInUso) {
  return rulerOf(temaRender.houses[domificazioneInUso].ascendant);
}
function getLngLunaNuova(temaRender) {
  return temaRender.previousNewMoonDeg;
}
function getGovernatoreLunaNuova(temaRender) {
  return Number.isFinite(temaRender.previousNewMoonDeg)
    ? rulerOf(temaRender.previousNewMoonDeg)
    : 'LNG-NaN';
}
// Absence of separately calculated previous new moon does NOT authorize
// invented longitude or its ruler. Omit those two formulas only.
function initParte(nome,descrizione,lngOffs,nomePianetaHighlight,nomePianetaCardinale) {
  if(!Number.isFinite(lngOffs)||typeof nomePianetaHighlight!=='string'||
    /^(?:LNG-(?:NaN|undefined)|unknown)$/.test(nomePianetaHighlight)) return null;
  return Object.freeze({nome,descrizione,lngOffs,nomePianetaHighlight,nomePianetaCardinale});
}

function getPartiArabeEssenziali(temaRender,domificazioneInUso) {
  var parti = [];

  parti.push(initParte(
    'Padre',
    'ASC+SOLE-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Madre',
    'ASC+LUNA-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Figli',
    'ASC+SATURNO-GIOVE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Beni Immobiliari',
    'ASC+LUNA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Eredità',
    'ASC+GIOVE-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Lavoro',
    'ASC+LUNA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Arte',
    'ASC+VENERE-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Successo',
    'ASC+DAIMON-TYCHE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude,
    'Daimon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Guadagni',
    'ASC+CUSP2a-GOV2a',
    temaRender.houses[domificazioneInUso].ascendant -  temaRender.planets[getGovernatoreCasa(temaRender,domificazioneInUso,2)].longitude,
    'LNG-'+temaRender.houses[domificazioneInUso].house[2-1], //Cuspide Seconda Casa
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Viaggi',
    'ASC+CUSP9a-GOV9a',
    temaRender.houses[domificazioneInUso].ascendant -  temaRender.planets[getGovernatoreCasa(temaRender,domificazioneInUso,9)].longitude,
    'LNG-'+temaRender.houses[domificazioneInUso].house[9-1],
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Vita',
    'ASC+SATURNO-GIOVE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Malattia',
    'ASC+SATURNO-MARTE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Morte',
    'CUSP8a+SATURNO-LUNA',
    temaRender.houses[domificazioneInUso].house[8-1] - temaRender.planets['Moon'].longitude,
    'Saturn',
    'CUSP-7' //ottava
  ));
  parti.push(initParte(
    'Matrimonio',
    'ASC+SATURNO-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'Matrimonio (Ermete)',
    'ASC+DS-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'ASSE-ds',
    'ASSE-ascendant'
  ));

  return parti;
}

function getPartiArabeAbuMashar1(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'vita',
    diurno? 'Asc+Saturno-Giove' : 'Asc+Giove-Saturno',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : 'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'durata della vita',
    diurno? 'Asc+Daimon-Tyche' : 'Asc+Tyche-Daimon',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude,
    diurno? 'Daimon' : 'Tyche',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'senno',
    diurno? 'Asc+Marte-Mercurio' : 'Asc+Mercurio-Marte',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Mercury',
    'ASSE-ascendant'
  ));

  return parti;
}

function getPartiArabeAbuMashar2(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'ricchezza',
    'ASC+CUSP2a-GOV2a',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatoreCasa(temaRender,domificazioneInUso,2)].longitude,
    'LNG-'+temaRender.houses[domificazioneInUso].house[2-1],
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'prestito',
    'ASC+MERCURIO-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'ritrovamento',
    diurno? 'ASC+VENERE-MERCURIO' : 'ASC+MERCURIO-VENERE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    diurno? 'Venus' : 'Mercury',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar3(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'fratelli',
    'ASC+GIOVE-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'quantità dei fratelli',
    'ASC+SATURNO-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'morte dei fratelli',
    diurno? 'ASC+MC-SOLE' : 'ASC+SOLE-MC',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.houses[domificazioneInUso].mc,
    diurno? 'MC' : 'Sun',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar4(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'genitori (del padre)',
    diurno? 'ASC+SATURNO-SOLE' : 'ASC+SOLE-SATURNO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : 'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'morte dei genitori',
    diurno? 'ASC+GIOVE-SATURNO' : 'ASC+SATURNO-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nonni',
    diurno? 'ASC+SATURNO-GOV.SOLE' : 'ASC+GOV.SOLE-SATURNO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatorePianeta(temaRender,'Sun')].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : getGovernatorePianeta(temaRender,'Sun'),
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nobile nascite',
    diurno? 'ASC+MARTE-SATURNO' : 'ASC+SATURNO-MARTE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'beni immobili',
    'ASC+LUNA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'edifici',
    diurno? 'ASC+GIOVE-MERCURIO' : 'ASC+MERCURIO-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'esito',
    'ASC+LUNA NUOVA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'LNG-'+getLngLunaNuova(temaRender),
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar5(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'figli',
    diurno? 'ASC+SATURNO-GIOVE' : 'ASC+GIOVE-SATURNO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : 'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'tempo dei figli',
    'ASC+GIOVE-MARTE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'figli maschi',
    'ASC+GIOVE-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'figli femmina',
    'ASC+GIOVE-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'Jupiter',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'sesso del nascituro',
    diurno? 'ASC+LUNA-GOV.LUNA' : 'ASC+GOV.LUNA-LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatorePianeta(temaRender,'Moon')].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    diurno? 'Moon' : getGovernatorePianeta(temaRender,'Moon'),
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar6(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'malattia e della sofferenza',
    diurno? 'ASC+MARTE-SATURNO' : 'ASC+SATURNO-MARTE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'durata delle malattie',
    'ASC+MARTE-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'servi',
    'ASC+LUNA-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'cattività',
    diurno? 'ASC+SOLE-GOV.SOLE' : 'ASC+LUNA-GOV.LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatorePianeta(temaRender,'Sun')].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatorePianeta(temaRender,'Moon')].longitude,
    diurno? 'Sun' : 'Moon',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar7(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'nozze degli uomini',
    'ASC+VENERE-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nozze degli uomini secondo Valente',
    'ASC+VENERE-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'tradimento dell\'uomo verso la donna',
    'ASC+VENERE-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'coito dell\'uomo',
    'ASC+VENERE-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'dissolutezza dell\'uomo',
    'ASC+VENERE-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nozze delle donne',
    'ASC+SATURNO-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'tradimento della donna verso l\'uomo',
    'ASC+MARTE-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'coito della donna',
    'ASC+MARTE-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'adulterio della donna',
    'ASC+MARTE-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'costumatezza dell donna',
    'ASC+VENERE-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nozze egli uomini e delle donne',
    'ASC+DS-VENERE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    'ASSE-ds',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'tempo delle nozze',
    'ASC+LUNA-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'propensione o della contrarietà al matrimonio',
    'ASC+LUNA-SOLE',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'generi',
    'ASC+VENERE-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'rivalità',
    diurno? 'ASC+GIOVE-MARTE' : 'ASC+MARTE-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Mars',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar8(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'morte',
    'CUSP8a+SATURNO-LUNA',
    temaRender.houses[domificazioneInUso].house[8-1] - temaRender.planets['Moon'].longitude,
    'Saturn',
    'CUSP-7' //ottava
  ));
  parti.push(initParte(
    'astro uccisore',
    'ASC+LUNA-GOV.ASC',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatoreAsc(temaRender,domificazioneInUso)].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'tempo della morte',
    'ASC+GOV.LUNA.NUOVA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    getGovernatoreLunaNuova(temaRender),
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'avversità',
    diurno? 'ASC+MARTE-SATURNO' : 'ASC+SATURNO-MARTE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'angustia',
    diurno? 'ASC+VENERE-SATURNO' : 'ASC+SATURNO-VENERE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    diurno? 'Venus' : 'Saturn',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar9(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'viaggi',
    'ASC+CUSP9a-GOV9a',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatoreCasa(temaRender,domificazioneInUso,9)].longitude,
    'LNG-'+temaRender.houses[domificazioneInUso].house[9-1],
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'navigazione',
    diurno? 'ASC+14°CANCRO-SATURNO' : 'ASC+SATURNO-14°CANCRO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - 134,
    diurno? 'LNG-134' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'prudenza',
    diurno? 'ASC+MARTE-LUNA' : 'ASC+LUNA-MARTE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'riflessione',
    diurno? 'ASC+LUNA-SATURNO' : 'ASC+SATURNO-LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    diurno? 'Moon' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'conoscenza',
    diurno? 'ASC+GIOVE-SATURNO' : 'ASC+SATURNO-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'compagnia',
    diurno? 'ASC+GIOVE-SOLE' : 'ASC+SOLE-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'diceria',
    'ASC+LUNA-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar10(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'nobile origine',
    diurno? 'ASC+19°ARIETE-SOLE' : 'ASC+3°TORO-LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    diurno? 'LNG-19' : 'LNG-33', //19°Ariete, 3° Toro
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'autorità',
    diurno? 'ASC+LUNA-MARTE' : 'ASC+MARTE-LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    diurno? 'Moon' : 'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'amministrazione delle cose pubbliche',
    diurno? 'ASC+MARTE-MERCURIO' : 'ASC+MERCURIO-MARTE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude,
    diurno? 'Mars' : 'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'vittoria e del trofeo',
    diurno? 'ASC+SATURNO-SOLE' : 'ASC+SOLE-SATURNO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : 'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'promozione inattesa',
    diurno? 'ASC+TYCHE-SATURNO' : 'ASC+SATURNO-TYCHE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude,
    diurno? 'Tyche' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'persone di alto rango',
    'ASC+SOLE-MERCURIO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude,
    'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'assistenti dei re',
    diurno? 'ASC+SATURNO-MARTE' : 'ASC+MARTE-SATURNO',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mars'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    diurno? 'Saturn' : 'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'azione e della dignità',
    'ASC+LUNA-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Moon',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'arti e dei mestieri',
    diurno? 'ASC+VENERE-MERCURIO' : 'ASC+MERCURIO-VENERE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    diurno? 'Venus' : 'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'compravendita',
    diurno? 'ASC+TYCHE-DAIMON' : 'ASC+DAIMON-TYCHE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude,
    diurno? 'Tyche' : 'DAIMON',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'opere di pregio',
    diurno? 'ASC+GIOVE-SOLE' : 'ASC+SOLE-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Sun',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'madre',
    diurno? 'ASC+LUNA-VENERE' : 'ASC+VENERE-LUNA',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    diurno? 'Moon' : 'Venus',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar11(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'successo',
    diurno? 'ASC+DAIMON-TYCHE' : 'ASC+TYCHE-DAIMON',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude,
    diurno? 'Daimon' : 'Tyche',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'amicizia e dell\'odio',
    diurno? 'ASC+DAIMON-TYCHE' : 'ASC+TYCHE-DAIMON',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude,
    diurno? 'Daimon' : 'Tyche',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'onore',
    diurno? 'ASC+SOLE-TYCHE' : 'ASC+TYCHE-SOLE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    diurno? 'Sun' : 'Tyche',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'buon esito',
    diurno? 'ASC+GIOVE-TYCHE' : 'ASC+TYCHE-GIOVE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Tyche'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude,
    diurno? 'Jupiter' : 'Tyche',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'bramosie',
    diurno? 'ASC+VENERE-SATURNO' : 'ASC+SATURNO-VENERE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    diurno? 'Venus' : 'Saturn',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'amici',
    'ASC+MERCURIO-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'mutua amicizia',
    'ASC+VENERE-DAIMON',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude,
    'Venus',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'beni domestici',
    'ASC+MERCURIO-LUNA',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Moon'].longitude,
    'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'liberalità d\'animo',
    diurno? 'ASC+SOLE-MERCURIO' : 'ASC+MERCURIO-SOLE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Mercury'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Sun'].longitude,
    diurno? 'Sun' : 'Mercury',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'lodi',
    diurno? 'ASC+VENERE-GIOVE' : 'ASC+GIOVE-VENERE',
    diurno?
      temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Jupiter'].longitude
      : temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Venus'].longitude,
    diurno? 'Venus' : 'Jupiter',
    'ASSE-ascendant'
  ));

  return parti;
}
function getPartiArabeAbuMashar12(temaRender,domificazioneInUso,diurno) {
  var parti = [];

  parti.push(initParte(
    'nemici',
    'ASC+MARTE-SATURNO',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Saturn'].longitude,
    'Mars',
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'nemici secondo Ermete',
    'ASC+CUSP12a-GOV12a',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets[getGovernatoreCasa(temaRender,domificazioneInUso,12)].longitude,
    'LNG-'+temaRender.houses[domificazioneInUso].house[12-1],
    'ASSE-ascendant'
  ));
  parti.push(initParte(
    'sciagura',
    'ASC+TYCHE-DAIMON',
    temaRender.houses[domificazioneInUso].ascendant - temaRender.planets['Daimon'].longitude,
    'Tyche',
    'ASSE-ascendant'
  ));

  return parti;
}

function getPartiArabeAbuMashar(temaRender,domificazioneInUso,diurno) {
  var c = [
    getPartiArabeAbuMashar1(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar2(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar3(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar4(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar5(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar6(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar7(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar8(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar9(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar10(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar11(temaRender,domificazioneInUso,diurno),
    getPartiArabeAbuMashar12(temaRender,domificazioneInUso,diurno)
  ];
  return c;
}
/** Caller supplies only already calculated, finite zodiac coordinates. */
export function calculateRegoloArabicParts(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||!['DAY','NIGHT'].includes(input.sect)
    ||!Number.isFinite(input.ascendantDeg)||!Number.isFinite(input.mcDeg)
    ||!Array.isArray(input.cuspsDeg)||input.cuspsDeg.length!==12||
    !input.cuspsDeg.every(Number.isFinite)||!input.planets||
    typeof input.planets!=='object'||Array.isArray(input.planets))
    throw new TypeError('Valid ascendant, MC, 12 cusps, planets and explicit sect are required');
  const required=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Tyche','Daimon'];
  if(required.some(name=>!Number.isFinite(input.planets[name])))
    throw new TypeError('Required native-calculated planetary and kleros longitudes are missing');
  if(input.previousNewMoonDeg!==undefined&&!Number.isFinite(input.previousNewMoonDeg))
    throw new TypeError('Previous new moon longitude must be finite when supplied');
  const chart={
    houses:{current:{ascendant:input.ascendantDeg,ds:mod360(input.ascendantDeg+180),
      mc:input.mcDeg,ic:mod360(input.mcDeg+180),house:input.cuspsDeg}},
    planets:Object.fromEntries(Object.entries(input.planets).map(([key,longitude])=>[key,{longitude}])),
    previousNewMoonDeg:input.previousNewMoonDeg
  };
  const filter=list=>Object.freeze(list.filter(item=>item!==null));
  const diurno=input.sect==='DAY';
  return Object.freeze({
    essenziali:filter(getPartiArabeEssenziali(chart,'current')),
    abumashar:Object.freeze(getPartiArabeAbuMashar(chart,'current',diurno).map(filter))
  });
}
