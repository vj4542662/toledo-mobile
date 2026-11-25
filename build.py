#!/usr/bin/env python3
"""Builds toledo-mobile.user.js (v4): app layer + the v3.1 classic layer for the remaining Blackboard / KU Loket pages."""
import re, json, pathlib, os, subprocess
here = pathlib.Path(__file__).parent
src = here / 'src'
VERSION = "4.33.0"
# Two channels: the branch 'beta' is the test channel (only Jeremy's iPhone points there), 'main' is for everyone.
# The built file points its update links at the branch it was built on. Only on main (or TM_CHANNEL=main) does it
# build for everyone; anything else builds for the test channel. Release to everyone with: sh release.sh
def _branch():
    try: return subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=pathlib.Path(__file__).parent, capture_output=True, text=True).stdout.strip()
    except Exception: return ''  # noqa: BLE001
CHANNEL = os.environ.get('TM_CHANNEL') or ('main' if _branch() == 'main' else 'beta')
assert CHANNEL in ('main', 'beta'), CHANNEL
# What's new, in plain language for students (no technical terms). Add a line for every version you publish:
# the app shows these in the update screen and once more right after updating.
NEWS = {
    "4.33.0": [
        "Rooster heet nu Agenda: je lessen, studieplek-reservaties, deadlines en examens staan samen per dag, en de lijst springt meteen naar vandaag. Onder Examens zie je hoeveel dagen studietijd je tussen twee examens hebt.",
    ],
    "4.32.0": [
        "Alma opent nu binnen de app en schuift pas in beeld als het menu klaarstaat: je ziet de oude website niet meer even flitsen. Kies je Alma's één keer opnieuw.",
    ],
    "4.31.0": [
        "Studieplek toont of een bibliotheek nu open is: \"Sluit om 20:00\" vlak voor sluiten en \"Nu gesloten\" daarna.",
        "Kom je na een tijdje terug in Studieplek, dan zijn de vrije plaatsen meteen opnieuw geladen.",
        "Examens blijft niet meer eindeloos laden: lukt KU Loket niet, dan zie je meteen de knop om je examenrooster te laden.",
    ],
    "4.30.0": [
        "Studieplek: nieuwe knop Vind mijn stoel bij je reservatie. Je krijgt de route naar de bibliotheek, de juiste zaal en je plaats op de plattegrond.",
    ],
    "4.29.3": [
        "Attesten: de app zegt nu dat het tot een 5-tal minuten kan duren voor je attest in je mailbox staat.",
    ],
    "4.29.2": [
        "Groepsruimte reserveren: het uur dat je al koos staat er gewoon, je hoeft het niet opnieuw te kiezen.",
        "Al je groepen uit Groepswerken staan in het reserveerblad: één tik op Voeg toe en je hele groep staat erin.",
    ],
    "4.29.1": [
        "Groepsruimte boeken vanuit Groepswerken: kies eerst een bibliotheek, daarna gaat het zoals altijd in Studieplek, met je groep al ingevuld.",
        "Reserveer je via Studieplek zelf een groepsruimte, dan kies je je groep in één tik.",
        "Groepswerken heeft rustigere kleuren.",
    ],
    "4.29.0": [
        "Nieuw in Meer: Attesten. Vraag je inschrijvingsbewijs, transcript of een ander attest aan met één tik; KU Loket mailt het meteen naar je studentenmail.",
    ],
    "4.28.6": [
        "Studieplek heeft een nieuw, duidelijker icoon.",
    ],
    "4.28.5": [
        "Groepswerken is eenvoudiger: per groep zie je de naam, het vak en de kleur van het vak, met Mail de groep en Groepsruimte boeken.",
    ],
    "4.28.4": [
        "Alma: een andere dag of Alma kiezen gaat meteen, en het menu van vorige keer staat er al terwijl het nieuwe laadt.",
    ],
    "4.28.3": [
        "Alma: uitklappen of een filter aanzetten laat je op je plek staan, en broodjes staan nu meteen onder de soep.",
    ],
    "4.28.2": [
        "Alma: de eerste keer zet je meteen een ster bij al je Alma's en tik je op Klaar.",
    ],
    "4.28.1": [
        "De melding voor een nieuwe versie verschijnt weer, ook als er kort na elkaar meerdere versies komen.",
    ],
    "4.28.0": [
        "Nieuw in Meer: Alma. Zie wat er vandaag op het menu staat in jouw Alma, met prijzen en openingsuren.",
        "Geef je vaste Alma een ster, dan opent die meteen. Filter op veggie, vegan of allergenen, of zet de goedkoopste gerechten eerst.",
    ],
    "4.27.1": [
        "Groepswerken opent nu altijd je groepen, niet meer soms een vak.",
    ],
    "4.27.0": [
        "Nieuw in Meer: Groepswerken. Zie in welke groepen je zit, met je groepsleden, en mail je hele groep in één tik.",
        "Vanuit je groep boek je meteen een groepswerkruimte in KURT: je groepsleden staan al klaar.",
    ],
    "4.26.1": [
        "Studieplek heet nu Studieplek (KURT) en heeft een nieuw icoon.",
        "Studievoortgang en Mijn ISP openen altijd bovenaan.",
    ],
    "4.26.0": [
        "Meer ziet eruit als een beginscherm: elke dienst heeft zijn eigen app-icoon.",
        "Weergave, mail en updates staan nu in de nieuwe app Instellingen.",
    ],
    "4.25.3": [
        "Nieuwe versies worden voortaan eerst getest voordat ze bij iedereen komen.",
    ],
    "4.25.2": [
        "Testversie om het nieuwe updatescherm te zien. Verder is er niets veranderd.",
    ],
    "4.25.1": [
        "De app start nu altijd in lichte modus. Liever donker of automatisch? Kies het bij Meer, Weergave.",
    ],
    "4.25.0": [
        "Updaten gaat nu via Userscripts zelf: tik op het wolkje, dan op Check Updates en dan op Update. De app toont je de stappen met plaatjes.",
    ],
    "4.24.1": [
        "Printen: laadt soepeler, zonder verspringende lijsten, en toont je nieuwe saldo meteen als je terugkomt na het opladen."
    ],
    "4.24.0": [
        "Printen: opladen ziet eruit zoals de app. Kies je bedrag, zie meteen je nieuwe saldo en tik op Betaal."
    ],
    "4.23.2": [
        "Printen: aanmelden werkt weer; je wordt niet meer meteen afgemeld na het inloggen."
    ],
    "4.23.1": [
        "Printen: je saldo en je afdrukken laden weer als je een tijd niet aangemeld was. De app stuurt je dan even langs de KU Leuven-login.",
        "Printen: bij Opladen staat je bedrag klaar op de betaalpagina; daar tik je zelf op Betaal."
    ],
    "4.23.0": [
        "Nieuw in Meer: Printen. Zie je printsaldo, laad op, en stuur een PDF of Word-bestand van je iPhone naar eender welke KU Leuven-printer. Daar scan je je studentenkaart en druk je af."
    ],
    "4.22.0": [
        "Vakken: kies je favoriete vakken nu in de app. Tik bovenaan op de ster en geef een vak een ster; dat geldt ook in Toledo zelf.",
        "Vakken: zoek in al je vakken tegelijk. Typ een woord in het zoekveld en tik op Zoek in al je vakken: je vindt bestanden, mappen en opdrachten uit al je vakken van dit semester.",
    ],
    "4.21.1": [
        "Toledo-agenda in Meer opent nu altijd het juiste scherm, en niet meer een vak of de lijst met vakken."
    ],
    "4.21.0": [
        "Nieuw in Meer: Toledo-agenda op je iPhone. Met één tik komen je deadlines in de Agenda-app, en ze blijven daar vanzelf bijgewerkt."
    ],
    "4.20.2": [
        "Twee kleine verbeteringen: op de donkere kaarten van Studievoortgang is het label bovenaan weer goed leesbaar, en lijsten met een lange titel (zoals Mijn ISP) gebruiken weer de volle breedte."
    ],
    "4.20.1": [
        "Mooiere randen: bovenaan geen lichte balk meer, en onderaan loopt alles zacht weg achter de balk in plaats van met een schaduw."
    ],
    "4.20.0": [
        "Nieuwe, zachtere stijl: rondere kaarten, rustigere kleuren in het petrolblauw van het logo, een nieuw lettertype en een zwevende balk onderaan. Alles staat nog op dezelfde plek."
    ],
    "4.19.0": [
        "Groepswerkruimtes eenvoudiger: kies bovenaan je beginuur en hoelang, en je ziet meteen welke lokalen dan vrij zijn, met een knop Kies. Lokalen die korter vrij zijn of bezet zijn, staan apart.",
    ],
    "4.18.0": [
        "Groepswerkruimtes: schuif met je vinger over de balk van een lokaal. Het uur onder je vinger wordt groter, je ziet erboven welk uur het is en of het vrij is, en hetzelfde uur licht op bij alle lokalen. Laat los op groen om dat uur te kiezen.",
        "Elk uur heeft nu zijn eigen vakje, met het uur er recht boven.",
    ],
    "4.17.4": [
        "Groepswerkruimtes: elk lokaal heeft nu één tijdbalk over de hele dag (groen = vrij), allemaal op dezelfde urenschaal. Zo zie je in één oogopslag welke lokalen vrij zijn op jouw uur. Tik op het groen om te reserveren.",
    ],
    "4.17.3": [
        "Groepswerkruimtes rustiger: één lijst met per lokaal de vrije blokken (bv. 17:00–20:00). Tik op een lokaal en kies daar van wanneer tot wanneer.",
        "Studieplek begint weer met je reservaties en favorieten. Groepswerkruimtes vind je bij de bib zelf.",
    ],
    "4.17.2": [
        "De uitlegpagina bij het updaten toont het logo weer, en de voorbeelden kleuren mee met licht of donker.",
    ],
    "4.17.1": [
        "Groepswerkruimtes: elk lokaal toont nu alleen de vrije uren, als grote knoppen in nette rijen. Volzette lokalen staan apart onderaan.",
    ],
    "4.17.0": [
        "Studieplek: groepswerkruimtes reserveer je nu in de app. Kies een bib, zie per lokaal welke uren vrij zijn, tik op een groen uur en voeg je groepsleden toe met hun r-nummer.",
        "Studieplek: de route naar de bib staat nu als kleine link bovenaan.",
    ],
    "4.16.2": [
        "De uitleg bij het updaten toont nu duidelijk waar je moet tikken: onderaan op Install, niet op het vinkje.",
    ],
    "4.16.1": [
        "Duidelijkere stappen bij het updaten, met plaatjes van wat je echt ziet.",
        "Lukt een update niet, dan zegt de app dat en helpt ze je verder.",
    ],
    "4.16.0": [
        "Studieplek: inchecken en uitchecken gebeurt nu in de app zelf. Na het inchecken verandert de knop in Uitchecken, en uitchecken vraagt eerst of je het zeker weet.",
        "Studieplek: na reserveren, verwijderen of vernieuwen verschijnt er geen foutmelding meer.",
    ],
    "4.15.0": [
        "De hele app laadt sneller: Toledo Mobile zelf is een derde kleiner geworden.",
        "Vandaag en je vakken openen vlotter, ook met een vol lessenrooster.",
        "Een vak openen voelt sneller: de app zoekt op de achtergrond rustiger door je mappen.",
    ],
    "4.14.0": [
        "KURT: de plattegrond vult nu het hele scherm. Bovenaan zie je hoeveel plaatsen er vrij zijn, en met de knop Lijst zie je alle vrije stoelen.",
        "KURT: bij een stoel (ook een favoriet) kies je nu zelf de dag en het uur, tot een week op voorhand.",
        "KURT: favoriete bibliotheken staan bovenaan, je favoriete stoelen eronder.",
        "KURT laadt sneller: wat je net bekeek opent meteen, en een bibliotheek begint al te laden zodra je ze aanraakt.",
    ],
    "4.13.1": [
        "Een nieuwe versie verschijnt nu echt meteen, niet pas na een paar minuten.",
    ],
    "4.13.0": [
        "KURT: je reservaties staan altijd bovenaan, met een vuilbakje om ze te verwijderen.",
        "KURT: zet een ster bij een bibliotheek of een stoel, dan zie je meteen of je favoriete stoel vrij is.",
        "KURT: dag en uur kies je nu met één knop, en de plattegronden laden sneller.",
    ],
    "4.12.2": [
        "Testversie om de nieuwe updatemelding te zien. Verder is er niets veranderd.",
    ],
    "4.12.1": [
        "Toledo Mobile kijkt nu bij elk openen of er een nieuwe versie is.",
    ],
    "4.12.0": [
        "Updates gaan nu veel makkelijker: je krijgt meteen een melding bovenaan als er een nieuwe versie is.",
        "Eén knop om te installeren, met duidelijke stappen in plaats van een pagina vol code.",
        "Na een update zie je meteen wat er nieuw is.",
    ],
}
css = (src / 'app.css').read_text()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
css = re.sub(r'\n\s*', '\n', css).strip()
# Manrope (SIL Open Font License, src/fonts/OFL.txt) goes inside the script: the Toledo pages may not load Google Fonts
import base64
css = css.replace('__MANROPE__', 'data:font/woff2;base64,' + base64.b64encode((src / 'fonts' / 'manrope-latin.woff2').read_bytes()).decode())
# the "Wat is er nieuw" after an update only needs the last versions (older ones stay here for reference)
APP_NEWS = dict(sorted(NEWS.items(), key=lambda kv: tuple(int(x) for x in kv[0].split('.')), reverse=True)[:15])
app = ''.join((src / f).read_text() for f in ['core.js', 'study.js', 'portal.js', 'ultra.js', 'loket.js', 'attest.js', 'kurt.js', 'print.js', 'alma.js', 'main.js'])
app = app.replace('__VERSION__', VERSION).replace('__NEWS__', json.dumps(APP_NEWS, ensure_ascii=False)).replace('__BRANCH__', CHANNEL)

classic = (src / 'classic-v3.js').read_text()
classic = classic.split('// ==/UserScript==', 1)[1]
classic = re.sub(r'^\s*/\*.*?\*/\s*', '\n', classic, count=1, flags=re.S)  # drop the v3 comment block
# (the app-specific changes to the v3 layer now live in src/classic-v3.js itself)

header = f"""// ==UserScript==
// @name         Toledo Mobile
// @namespace    https://toledo.kuleuven.be/portal
// @version      {VERSION}
// @description  KU Leuven Toledo as a real phone app: Vandaag, Vakken, Rooster, Updates and Meer, with course content, files and weblectures one tap away. Runs on your own Toledo session.
// @match        https://toledo.kuleuven.be/portal*
// @match        https://ultra.edu.kuleuven.cloud/ultra/*
// @match        https://webwsp.aps.kuleuven.be/sap/bc/ui2/flp*
// @match        https://idp.kuleuven.be/idp/*
// @match        https://icts-p-toledo-journey.cloud.icts.kuleuven.be/*
// @match        https://kurt3.ghum.kuleuven.be/*
// @match        https://print.kuleuven.be/*
// @match        https://www.alma.be/*
// @match        https://alma.be/*
// @match        https://raw.githubusercontent.com/vj4542662/toledo-mobile/*
// @updateURL    https://raw.githubusercontent.com/vj4542662/toledo-mobile/{CHANNEL}/toledo-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/vj4542662/toledo-mobile/{CHANNEL}/toledo-mobile.user.js
// @run-at       document-start
// @inject-into  content
// @grant        none
// ==/UserScript==

/*
  Toledo Mobile 4 for iPhone (Userscripts extension in Safari).
  - toledo.kuleuven.be/portal/ becomes the app: Vandaag, Vakken, Rooster, Updates, Meer.
  - A course opens on ultra.edu.kuleuven.cloud/ultra/app: content, announcements and grades. PDFs, files and weblectures open directly.
  - The timetable and exams come from KU Loket (same KU Leuven sign-in), read in a hidden frame.
  - Pages the app doesn't cover (submitting an assignment, tests, KU Loket apps) keep the phone layout of version 3.
  - KURT (study places, kurt3.ghum.kuleuven.be) becomes an app screen: libraries with live occupancy, rooms with free seats, and the floor plan to tap a seat and book it.
  - Alma (www.alma.be, the student restaurants) becomes an app screen: the menu of your own Alma with prices, hours and filters.
  - The KU Leuven sign-in page gets an app look, and "Log in via KU Leuven Authenticator" opens the
    Authenticator app straight away. The script never reads or fills in your username or password there.
  - The update page on GitHub (this file) shows simple steps instead of code, and the app checks GitHub's small
    version.json now and then so it can show a notification as soon as there is a new version.
  - While the app is open, Toledo, Blackboard and KU Loket get a small request every few minutes so their sessions don't time out.
  Everything uses your own session in your own browser. The only thing sent elsewhere: once a day a random,
  anonymous install id plus the version number, so the author can count how many people use the script.
*/
"""
classic = ("\n/* ===== version 3 phone layout, for the Blackboard and KU Loket pages the app does not replace ===== */\n"
           "(() => {\n  const run = () => {" + classic.rstrip() + "\n  };\n"
           "  if (document.documentElement) run();\n"
           "  else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); run(); } }); mo.observe(document, { childList: true }); }\n})();\n")
lcss = (src / 'login.css').read_text()
lcss = re.sub(r'/\*.*?\*/', '', lcss, flags=re.S)
lcss = re.sub(r'\n\s*', '\n', lcss).strip()
out = header + "(() => {\n  'use strict';\n  if (window.__TM4__) return;\n  window.__TM4__ = true;\n  const CSS = " + json.dumps(css) + ";\n  const LOGIN_CSS = " + json.dumps(lcss) + ";\n" + app + "})();\n" + classic
# Smaller file = Userscripts hands it to Safari faster on every page. terser shortens the code (same behaviour);
# the ==UserScript== header stays. Without Node.js the build still works, just with a bigger file.
def minify(js):
    import subprocess
    body = js.split('// ==/UserScript==\n', 1)
    try:
        r = subprocess.run(['npx', '--yes', 'terser@5.36.0', '--compress', 'passes=2', '--mangle', '--ecma', '2020'],
                           input=body[1], capture_output=True, text=True, timeout=300)
        if r.returncode or not r.stdout.strip():
            raise RuntimeError(r.stderr[-400:])
        return body[0] + '// ==/UserScript==\n' + r.stdout.strip() + '\n'
    except Exception as e:  # noqa: BLE001
        print('LET OP: niet verkleind (terser niet beschikbaar):', e)
        return js
out = minify(out)
(here / 'toledo-mobile.user.js').write_text(out)
# the app checks this small file (not the whole script) to see whether there is a new version
def vkey(v): return tuple(int(x) for x in v.split('.'))
recent = dict(sorted(NEWS.items(), key=lambda kv: vkey(kv[0]), reverse=True)[:12])
import time
# built: when this version was published; the app waits until Userscripts' Check Updates can see it (GitHub caches 5 min)
# builds: the last few published versions with their time. When versions follow each other quickly, the app can
# still announce the update as soon as an earlier newer version is old enough (Check Updates then sees at least that one).
now = int(time.time() * 1000)
try: builds = json.loads((here / 'version.json').read_text()).get('builds') or []
except Exception: builds = []  # noqa: BLE001
try: prev = json.loads((here / 'version.json').read_text())
except Exception: prev = {}  # noqa: BLE001
if prev.get('version') and prev.get('built') and not any(x.get('v') == prev['version'] for x in builds):
    builds.append({'v': prev['version'], 'built': prev['built']})
builds = [x for x in builds if x.get('v') != VERSION][-7:] + [{'v': VERSION, 'built': now}]
(here / 'version.json').write_text(json.dumps({'version': VERSION, 'built': now, 'builds': builds, 'news': recent}, ensure_ascii=False, indent=1) + '\n')
print(len(out), 'bytes,', 'kanaal:', CHANNEL, '(iedereen)' if CHANNEL == 'main' else '(alleen testers)')
