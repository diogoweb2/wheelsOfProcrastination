#!/bin/zsh
# Wrapper for the weekly Firestore snapshot (`npm run backup`), invoked by cron
# (see crontab -l). Saturdays 08:00, when the Mac is likeliest to be awake.
#
# Cron runs with a bare environment, so we put fnm's *default*-alias bin on PATH
# (stable across node upgrades) to reach node/npm.
#
# The job only reads Firestore; it writes to ~/Backups/wheels-of-procrastination/.
# Output is appended to scripts/.firestore-backup.log for debugging.
export PATH="$HOME/.local/share/fnm/aliases/default/bin:/usr/local/bin:/usr/bin:/bin"
cd "$HOME/dev/spinningWheel" || exit 1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') backup run ===" >> scripts/.firestore-backup.log
npm run backup >> scripts/.firestore-backup.log 2>&1
echo "--- exit $? ---" >> scripts/.firestore-backup.log
