# Toledo Mobile

Maakt van KU Leuven Toledo een echte app op je iPhone: **Vandaag**, **Vakken**, **Rooster**, **Updates** en **Meer**, met cursusmateriaal, pdf's en weblectures op één tik. Werkt met je eigen Toledo-login in Safari; het script stuurt niets door.

## Installeren (iPhone)

1. Installeer de gratis app [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) en zet de extensie aan in Safari (Instellingen → Safari → Extensies → Userscripts → toestaan op alle websites).
2. Open in Safari: <https://raw.githubusercontent.com/vj4542662/toledo-mobile/main/toledo-mobile.user.js>
3. Tik op het Userscripts-icoon (in het **aA**-menu) en kies **Installeren**.
4. Open <https://toledo.kuleuven.be/portal/> in Safari.

## Updaten

Open in Safari het Userscripts-menu: staat er een nieuwe versie klaar, dan tik je op **Update**.

## Broncode

De onderdelen staan in `src/`; `python3 build.py` bouwt er `toledo-mobile.user.js` van. Verhoog bij elke nieuwe versie `VERSION` in `build.py`, anders ziet Userscripts de update niet.
