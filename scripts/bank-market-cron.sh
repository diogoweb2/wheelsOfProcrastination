#!/bin/zsh
# Wrapper for the daily/monthly market refresh, invoked by cron (see crontab -l).
#
# Cron runs with a bare environment, so we put fnm's *default*-alias bin on PATH
# (stable across node upgrades) to reach node/npm and the `claude` CLI the script
# shells out to. The underlying npm job (scripts/bank-market.mjs) is safe to run
# daily: it no-ops once it has succeeded this calendar month, and a failed day just
# retries tomorrow. Output is appended to scripts/.bank-market.log for debugging.
export PATH="$HOME/.local/share/fnm/aliases/default/bin:/usr/local/bin:/usr/bin:/bin"
cd "$HOME/dev/spinningWheel" || exit 1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') bank:market run ===" >> scripts/.bank-market.log
npm run bank:market >> scripts/.bank-market.log 2>&1
echo "--- exit $? ---" >> scripts/.bank-market.log
