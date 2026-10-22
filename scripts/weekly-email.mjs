// 📬 The weekly email about Ben: `npm run email:weekly` (§25).
//
//   npm run email:weekly              read, build, send
//   npm run email:weekly -- --dry-run build it and print it, send nothing
//   npm run email:weekly -- --out f   also write the HTML to a file (to open in a browser)
//
// Same shape as the CheckSites page-watch digest: nodemailer over Gmail SMTP,
// with the App Password read from the macOS Keychain at send time so it is
// never on disk and never in this repo.
//
// This script is READ-ONLY against Firestore. It pulls Ben's whole world and
// the shared market series, hands them to the TypeScript report (which catches
// the bank up on a copy), and sends what comes back. A cron job that quietly
// mutated his save at 08:30 on a Sunday would be a bug nobody would ever see.
//
// It spends no AI: every number in the email is computed from his own data by
// the app's own logic. (CLAUDE.md — the OpenRouter key is the app's, not a tool.)
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import nodemailer from 'nodemailer'
import { loadTs } from './lib/se-bundle.mjs'

const firebaseConfig = {
  apiKey: 'AIzaSyAeCyBJ-P2e6E5LDHwC2yBGKb3uYITo_V4',
  authDomain: 'spinningwheel-6ff51.firebaseapp.com',
  projectId: 'spinningwheel-6ff51',
  storageBucket: 'spinningwheel-6ff51.firebasestorage.app',
  messagingSenderId: '30669970378',
  appId: '1:30669970378:web:e15a8d3b24d87bacd28d33',
}

const KID_ID = 'ben'
const TO = 'diogoweb@gmail.com'

/**
 * The Gmail App Password, from the macOS Keychain. Never stored on disk.
 *
 * `wheels-gmail` first, then the entry CheckSites already made for the same
 * address — one Gmail account, one App Password, and no reason to make you
 * create a second one to turn this on.
 */
function gmailAppPassword(address) {
  for (const service of ['wheels-gmail', 'ryfc-watch-gmail']) {
    try {
      // Google shows App Passwords as "abcd efgh ijkl mnop"; SMTP wants them unspaced.
      return execFileSync('/usr/bin/security', ['find-generic-password', '-s', service, '-a', address, '-w'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).replace(/\s+/g, '')
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    `No Gmail App Password in the Keychain for ${address}. Add one with:\n` +
      `  security add-generic-password -s wheels-gmail -a ${address} -w`,
  )
}

async function read() {
  const app = initializeApp(firebaseConfig)
  await signInAnonymously(getAuth(app))
  const db = getFirestore(app)
  const [kid, market] = await Promise.all([getDoc(doc(db, 'profiles', KID_ID)), getDoc(doc(db, 'app', 'marketData'))])
  if (!kid.exists()) throw new Error(`no Firestore document at profiles/${KID_ID}`)
  return { data: kid.data(), market: market.exists() ? market.data() : null }
}

const dryRun = process.argv.includes('--dry-run')
const outAt = process.argv.indexOf('--out')
const outFile = outAt > -1 ? process.argv[outAt + 1] : null

const { data, market } = await read()
const { buildWeeklyEmail } = await loadTs(fileURLToPath(new URL('./weekly-email.entry.ts', import.meta.url)))
const mail = buildWeeklyEmail({ data, market })

if (outFile) {
  writeFileSync(outFile, mail.html)
  console.log(`wrote ${outFile}`)
}

if (dryRun) {
  console.log(mail.text)
  console.log('\n(dry run: nothing sent)')
  process.exit(0)
}

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: TO, pass: gmailAppPassword(TO) },
})
await transport.sendMail({
  from: `Wheels of Procrastination <${TO}>`,
  to: TO,
  subject: mail.subject,
  text: mail.text,
  html: mail.html,
})
transport.close()
console.log(`sent — "${mail.subject}"`)
process.exit(0)
