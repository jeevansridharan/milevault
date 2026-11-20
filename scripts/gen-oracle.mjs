/**
 * scripts/gen-oracle.mjs
 *
 * Generates a fresh oracle key pair, writes ORACLE_WIF to backend/.env,
 * and prints ONLY the new compressed public key — never the WIF.
 *
 * Usage:
 *   node scripts/gen-oracle.mjs
 *
 * Rules:
 *   - WIF is written directly to backend/.env (never printed to stdout)
 *   - Only the compressed public key is printed
 *   - Run from the project root (bch1/)
 */

import fs   from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import * as libauth from '@bitauth/libauth'

// ── Generate key pair ─────────────────────────────────────────────────────────
const privKey = new Uint8Array(randomBytes(32))
const secp    = await libauth.instantiateSecp256k1()

const pubKeyBytes = secp.derivePublicKeyCompressed(privKey)
if (typeof pubKeyBytes === 'string') {
    console.error('✗ Public key derivation failed:', pubKeyBytes)
    process.exit(1)
}
const newPubkeyHex = libauth.binToHex(pubKeyBytes)

const newWif = libauth.encodePrivateKeyWif(privKey, 'mainnet')
if (typeof newWif !== 'string') {
    console.error('✗ WIF encoding failed')
    process.exit(1)
}

// ── Write WIF to backend/.env ─────────────────────────────────────────────────
const envPath = path.resolve('backend/.env')
if (!fs.existsSync(envPath)) {
    console.error('✗ backend/.env not found — run from the bch1 project root.')
    process.exit(1)
}

let envContent = fs.readFileSync(envPath, 'utf8')
if (/^ORACLE_WIF=.*/m.test(envContent)) {
    envContent = envContent.replace(/^ORACLE_WIF=.*/m, `ORACLE_WIF=${newWif}`)
} else {
    envContent += `\nORACLE_WIF=${newWif}\n`
}
fs.writeFileSync(envPath, envContent, { mode: 0o600 })

// ── Print ONLY the public key ─────────────────────────────────────────────────
console.log('')
console.log('══════════════════════════════════════════════════════')
console.log('  🔑  New Oracle Key Generated')
console.log('══════════════════════════════════════════════════════')
console.log('  Compressed public key (store in Supabase):')
console.log(' ', newPubkeyHex)
console.log('')
console.log('  ORACLE_WIF written to backend/.env (never printed).')
console.log('  Next steps:')
console.log('  1. Run node scripts/seed-mainnet-escrow.mjs to redeploy')
console.log('     the escrow contract with the new oracle pubkey.')
console.log('  2. Start the backend: cd backend && npm start')
console.log('══════════════════════════════════════════════════════')
console.log('')
