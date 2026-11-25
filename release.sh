#!/bin/sh
# Brings the current test version (branch beta) out to everyone (branch main).
# main gets beta's sources and is rebuilt there, so its update links point to main again.
# Use: sh release.sh   (from a clone with push access)
set -e
git fetch origin beta main
git checkout -B main origin/main
git checkout origin/beta -- src build.py README.md release.sh
TM_CHANNEL=main python3 build.py
grep -q 'toledo-mobile/main/toledo-mobile.user.js' toledo-mobile.user.js || { echo "FOUT: bouw wijst niet naar main"; exit 1; }
V=$(sed -n 's/^VERSION = "\(.*\)"/\1/p' build.py)
git add -A src build.py README.md release.sh toledo-mobile.user.js version.json
git commit -m "Naar iedereen uitgebracht: versie $V"
git push origin main
echo "Versie $V staat nu op main (voor iedereen)."
