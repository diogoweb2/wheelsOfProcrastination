#!/bin/zsh
# Wrapper for the Sunday email about Ben (§25), invoked by cron (see crontab -l).
#
# Cron runs with a bare environment, so we put fnm's *default*-alias bin on PATH
# (stable across node upgrades) to reach node/npm. It runs at 08:30 on Sundays,
# after the 08:13 bank:market refresh, so the balances it quotes are computed
# from that morning's market series rather than yesterday's.
#
# The job only reads: it never writes to Firestore and it spends no AI key.
# Output is appended to scripts/.weekly-email.log for debugging.
export PATH="$HOME/.local/share/fnm/aliases/default/bin:/usr/local/bin:/usr/bin:/bin"
cd "$HOME/dev/spinningWheel" || exit 1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') email:weekly run ===" >> scripts/.weekly-email.log
npm run email:weekly >> scripts/.weekly-email.log 2>&1
echo "--- exit $? ---" >> scripts/.weekly-email.log
