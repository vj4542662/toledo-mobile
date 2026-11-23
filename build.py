#!/usr/bin/env python3
"""Builds toledo-mobile.user.js (v4): app layer + the v3.1 classic layer for the remaining Blackboard / KU Loket pages."""
import re, json, pathlib
here = pathlib.Path(__file__).parent
src = here / 'src'
VERSION = "4.13.1"
# What's new, in plain language for students (no technical terms). Add a line for every version you publish:
# the app shows these in the update screen and once more right after updating.
NEWS = {
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
app = ''.join((src / f).read_text() for f in ['core.js', 'study.js', 'portal.js', 'ultra.js', 'loket.js', 'kurt.js', 'main.js'])
app = app.replace('__VERSION__', VERSION).replace('__NEWS__', json.dumps(NEWS, ensure_ascii=False))

classic = (src / 'classic-v3.js').read_text()
classic = classic.split('// ==/UserScript==', 1)[1]
classic = re.sub(r'^\s*/\*.*?\*/\s*', '\n', classic, count=1, flags=re.S)  # drop the v3 comment block

def sub(old, new, count=1):
    global classic
    assert old in classic, old[:70]
    classic = classic.replace(old, new, count)

sub("  if (window.top !== window && !window.__TM_TEST__) return; // top frame only",
    "  if (window.__TM_MODE__ !== 'classic') return; // the app layer (above) decided this page keeps its own layout\n"
    "  if (window.top !== window && !window.__TM_TEST__) return; // top frame only")
sub("    menu: '<path d=\"M4 7h16M4 12h16M4 17h16\"/>',",
    "    menu: '<path d=\"M4 7h16M4 12h16M4 17h16\"/>',\n"
    "    vandaag: '<path d=\"M3.8 10.4 12 3.8l8.2 6.6V19a1.6 1.6 0 0 1-1.6 1.6h-4v-5.8H9.4v5.8h-4A1.6 1.6 0 0 1 3.8 19z\"/>',\n"
    "    vakken: '<path d=\"M5 5.6A2.1 2.1 0 0 1 7.1 3.5H19v13.8H7.1A2.1 2.1 0 0 0 5 19.4z\"/><path d=\"M5 19.4a2.1 2.1 0 0 0 2.1 2.1H19v-4.2\"/><path d=\"M9 7.8h6\"/>',\n"
    "    rooster: '<rect x=\"3.6\" y=\"4.8\" width=\"16.8\" height=\"15.8\" rx=\"3\"/><path d=\"M3.6 9.6h16.8M8 3v3.4M16 3v3.4\"/>',\n"
    "    meer: '<rect x=\"4\" y=\"4\" width=\"6.6\" height=\"6.6\" rx=\"1.8\"/><rect x=\"13.4\" y=\"4\" width=\"6.6\" height=\"6.6\" rx=\"1.8\"/><rect x=\"4\" y=\"13.4\" width=\"6.6\" height=\"6.6\" rx=\"1.8\"/><rect x=\"13.4\" y=\"13.4\" width=\"6.6\" height=\"6.6\" rx=\"1.8\"/>',")
# outside the portal the tab bar leads to the app's five tabs
sub("    (document.head || document.documentElement).appendChild(s);",
    "    const put = () => (document.head || document.documentElement).appendChild(s);\n"
    "    if (document.head || document.documentElement) put();\n"
    "    else { const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); put(); } }); mo.observe(document, { childList: true }); }")
sub("  const TABS = [", "  const TABS = SITE !== 'portal' ? [\n"
    "    { id: 'vandaag', label: 'Vandaag', url: PORTAL + '?tm=vandaag' },\n"
    "    { id: 'vakken', label: 'Vakken', url: PORTAL + '?tm=vakken' },\n"
    "    { id: 'rooster', label: 'Rooster', url: PORTAL + '?tm=rooster' },\n"
    "    { id: 'updates', label: 'Updates', url: PORTAL + '?tm=updates' },\n"
    "    { id: 'meer', label: 'Meer', url: PORTAL + '?tm=meer' },\n"
    "  ] : [")
sub("setActiveTab(/^\\/ultra\\/(courses|course)\\b/.test(location.pathname) ? 'courses' : '');",
    "setActiveTab(/^\\/ultra\\/(courses|course)\\b/.test(location.pathname) ? 'vakken' : '');")
sub("        setInterval(() => { if (location.href !== last) { last = location.href; schedule(); } }, 400);",
    "        // closing an item in Blackboard lands on the course outline: go back to the app's course page\n"
    "        const toApp = () => {\n"
    "          const m = /^\\/ultra\\/courses\\/(_\\d+_\\d+)\\/outline\\/?$/.exec(location.pathname);\n"
    "          let c = 0; try { c = Number(sessionStorage.getItem('tm4-classic-ultra')) || 0; } catch (_) {}\n"
    "          const classic = c && Date.now() - c < 30 * 60e3;\n"
    "          if (classic || Math.min(screen.width, screen.height) >= 600) return;\n"
    "          if (m && !location.search) {\n"
    "            const toAppUrl = 'https://ultra.edu.kuleuven.cloud/ultra/courses/' + m[1] + '/outline?tm=app#/c/' + m[1];\n"
    "            const noapp = Number(sessionStorage.getItem('tm4-noapp')) || 0;\n"
    "            if (noapp && Date.now() - noapp < 5 * 60e3) {\n"
    "              // the app stepped aside so Blackboard could sign you in: go back once that is done\n"
    "              if (window.__tm4wait) return;\n"
    "              window.__tm4wait = true;\n"
    "              const check = () => fetch('/learn/api/public/v1/users/me', { credentials: 'include', headers: { Accept: 'application/json' } })\n"
    "                .then((r) => { if (r.ok && /json/.test(r.headers.get('content-type') || '')) { sessionStorage.removeItem('tm4-noapp'); location.replace(toAppUrl); } else setTimeout(check, 2500); }, () => setTimeout(check, 4000));\n"
    "              setTimeout(check, 1500);\n"
    "              return;\n"
    "            }\n"
    "            location.replace(toAppUrl);\n"
    "            return;\n"
    "          }\n"
    "          // Blackboard's own start pages (e.g. after signing in): back to the app\n"
    "          const home = /^\\/ultra\\/?$|^\\/ultra\\/(course|stream|institution-page)\\/?$/.exec(location.pathname);\n"
    "          if (home) location.replace('https://toledo.kuleuven.be/portal/' + (/stream/.test(location.pathname) ? '?tm=updates' : /\\/course\\/?$/.test(location.pathname) ? '?tm=vakken' : '?tm=vandaag'));\n"
    "        };\n"
    "        // the app's tab bar: handle the tap before Blackboard's own click handling can swallow it\n"
    "        window.addEventListener('click', (e) => {\n"
    "          const a = e.target && e.target.closest && e.target.closest('#tm-tabbar a[href]');\n"
    "          if (!a) return;\n"
    "          e.preventDefault(); e.stopImmediatePropagation();\n"
    "          location.href = a.href;\n"
    "        }, true);\n"
    "        toApp();\n"
    "        setInterval(() => { if (location.href !== last) { last = location.href; toApp(); schedule(); } }, 400);")

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
// @match        https://raw.githubusercontent.com/vj4542662/toledo-mobile/*
// @updateURL    https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js
// @downloadURL  https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js
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
(here / 'toledo-mobile.user.js').write_text(out)
# the app checks this small file (not the whole script) to see whether there is a new version
def vkey(v): return tuple(int(x) for x in v.split('.'))
recent = dict(sorted(NEWS.items(), key=lambda kv: vkey(kv[0]), reverse=True)[:12])
(here / 'version.json').write_text(json.dumps({'version': VERSION, 'news': recent}, ensure_ascii=False, indent=1) + '\n')
print(len(out), 'bytes')
