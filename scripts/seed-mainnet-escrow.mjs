/**
 * scripts/seed-mainnet-escrow.mjs
 *
 * Seeds ONE real Milestone Escrow on BCH Mainnet into Supabase:
 *  - Derives the CashScript P2SH32 contract address on BCH Mainnet
 *  - Inserts project row into `projects` table
 *  - Inserts contract row into `contracts` table (with creator, oracle pubkey, milestoneIdHex)
 *  - Inserts milestone row into `milestones` table
 *
 * Usage:
 *   node scripts/seed-mainnet-escrow.mjs
 *
 * Rules:
 *   - No secrets printed or committed
 *   - Real mainnet flow with tiny amounts
 */

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { Contract, ElectrumNetworkProvider } from 'cashscript'
import { Wallet } from 'mainnet-js'
import * as libauth from '@bitauth/libauth'
import artifact from '../production/contracts/MilestoneEscrow.json' with { type: 'json' }

// ── 1. Load Environment ──────────────────────────────────────────────────────
let SUPABASE_URL = ''
let SUPABASE_KEY = ''
let ORACLE_WIF = ''

if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf8')
    for (const line of env.split(/\r?\n/)) {
        const [k, ...rest] = line.split('=')
        const v = rest.join('=').trim()
        if (k?.trim() === 'VITE_SUPABASE_URL') SUPABASE_URL = v
        if (k?.trim() === 'VITE_SUPABASE_ANON_KEY') SUPABASE_KEY = v
    }
}

if (fs.existsSync('backend/.env')) {
    const bEnv = fs.readFileSync('backend/.env', 'utf8')
    for (const line of bEnv.split(/\r?\n/)) {
        const [k, ...rest] = line.split('=')
        const v = rest.join('=').trim()
        if (k?.trim() === 'SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = v
        if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = v
        if (k?.trim() === 'ORACLE_WIF') ORACLE_WIF = v
    }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('✗ Missing Supabase configuration in .env or backend/.env')
    process.exit(1)
}

if (!ORACLE_WIF) {
    console.error('✗ Missing ORACLE_WIF in backend/.env')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
})

async function compressPubkey(pkBytes) {
    if (pkBytes.length === 33) return pkBytes
    if (pkBytes.length === 65 && pkBytes[0] === 0x04) {
        const secp = await libauth.instantiateSecp256k1()
        return secp.compressPublicKey(pkBytes)
    }
    throw new Error(`Invalid pubkey length: ${pkBytes.length}`)
}

async function main() {
    console.log('\n🚀 Seeding ONE Milestone Escrow on BCH Mainnet...\n')

    // ── 2. Derive Oracle Pubkey from backend ORACLE_WIF ────────────────────────
    const wifResult = libauth.decodePrivateKeyWif(ORACLE_WIF)
    if (typeof wifResult === 'string') {
        throw new Error(`Failed to decode ORACLE_WIF: ${wifResult}`)
    }
    const secp = await libauth.instantiateSecp256k1()
    const oraclePubkeyBytes = secp.derivePublicKeyCompressed(wifResult.privateKey)
    const oraclePubkeyHex = libauth.binToHex(oraclePubkeyBytes)
    console.log('✓ Oracle public key derived:', oraclePubkeyHex)

    // ── 3. Creator Wallet ──────────────────────────────────────────────────────
    // Check if .seed-wallet exists (local gitignored file) or create one
    let seedWallet
    const SEED_WALLET_FILE = '.seed-wallet'
    if (fs.existsSync(SEED_WALLET_FILE)) {
        const savedWif = fs.readFileSync(SEED_WALLET_FILE, 'utf8').trim()
        seedWallet = await Wallet.fromWIF(savedWif)
        console.log('✓ Loaded existing seed creator wallet from', SEED_WALLET_FILE)
    } else {
        seedWallet = await Wallet.newRandom()
        // Save to .seed-wallet (gitignored) so it persists across runs without printing key
        fs.writeFileSync(SEED_WALLET_FILE, seedWallet.privateKeyWif, { mode: 0o600 })
        console.log('✓ Created new seed creator wallet and saved to', SEED_WALLET_FILE)
    }

    const creatorPkRaw = seedWallet.publicKey
    const creatorPkBytes = creatorPkRaw instanceof Uint8Array
        ? creatorPkRaw
        : libauth.hexToBin(creatorPkRaw)
    const creatorPkCompressed = await compressPubkey(creatorPkBytes)
    const creatorPkHex = libauth.binToHex(creatorPkCompressed)
    const creatorAddress = seedWallet.cashaddr
    console.log('✓ Creator wallet address :', creatorAddress)
    console.log('✓ Creator public key     :', creatorPkHex)

    // ── 4. Instantiate MilestoneEscrow Contract on Mainnet ─────────────────────
    const sha256 = await libauth.instantiateSha256()
    const milestoneId = sha256.hash(libauth.utf8ToBin('MileVault-Mainnet-Milestone-Escrow-1'))
    const milestoneIdHex = libauth.binToHex(milestoneId)
    const deadline = 2000000 // far-future block height

    const provider = new ElectrumNetworkProvider('mainnet')
    const contract = new Contract(
        artifact,
        [
            creatorPkCompressed,
            creatorPkCompressed,
            oraclePubkeyBytes,
            milestoneId,
            BigInt(deadline),
        ],
        { provider },
    )

    const contractAddress = contract.address
    console.log('✓ CashScript Mainnet Escrow Address:', contractAddress)

    // ── 5. Seed into Supabase ──────────────────────────────────────────────────
    const PROJECT_TITLE = 'MileVault Mainnet Escrow'

    // Clean up any existing sample project with this title
    const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('title', PROJECT_TITLE)

    if (existingProjects && existingProjects.length > 0) {
        for (const ep of existingProjects) {
            console.log('→ Cleaning up previous seeded project:', ep.id)
            await supabase.from('projects').delete().eq('id', ep.id)
        }
    }

    const description =
        'Live Bitcoin Cash Mainnet milestone escrow prototype for BCH BLAZE 2026.\n' +
        'Funds are locked in a CashScript P2SH32 escrow until approved by governance and signed by the Tally Oracle.\n\n' +
        `[On-Chain Address: ${contractAddress}]\n` +
        `[Milestone ID: ${milestoneIdHex}]\n` +
        `[Deadline: ${deadline}]`

    // Insert project
    const { data: project, error: pError } = await supabase
        .from('projects')
        .insert({
            title: PROJECT_TITLE,
            description,
            goal_amount: 0.001,
            raised_amount: 0,
            owner_wallet: creatorAddress,
            status: 'active',
        })
        .select()
        .single()

    if (pError) {
        throw new Error(`Failed to insert project: ${pError.message}`)
    }
    console.log('✓ Inserted project:', project.id)

    // Insert contracts row
    const { error: cError } = await supabase
        .from('contracts')
        .insert({
            project_id: project.id,
            contract_address: contractAddress,
            creator_pubkey: creatorPkHex,
            funder_pubkey: creatorPkHex,
            oracle_pubkey: oraclePubkeyHex,
            milestone_id_hex: milestoneIdHex,
            deadline: deadline,
        })

    if (cError) {
        throw new Error(`Failed to insert contract: ${cError.message}`)
    }
    console.log('✓ Inserted contract metadata')

    // Insert milestone row
    const { data: milestone, error: mError } = await supabase
        .from('milestones')
        .insert({
            project_id: project.id,
            title: 'Milestone 1: Deliver Mainnet Prototype',
            description: 'Non-custodial CashScript milestone escrow on Bitcoin Cash Mainnet with Oracle-verified release.',
            amount: 0.001,
            approved: false,
            status: 'pending',
        })
        .select()
        .single()

    if (mError) {
        throw new Error(`Failed to insert milestone: ${mError.message}`)
    }
    console.log('✓ Inserted milestone:', milestone.id)

    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('🎉 Mainnet Milestone Escrow Pre-Seeded Successfully!')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('Project Title   :', PROJECT_TITLE)
    console.log('Project ID      :', project.id)
    console.log('Milestone ID    :', milestone.id)
    console.log('Contract Address:', contractAddress)
    console.log('Network         : Bitcoin Cash Mainnet')
    console.log('Explorer URL    : https://blockchair.com/bitcoin-cash/address/' + contractAddress)
    console.log('═══════════════════════════════════════════════════════════════\n')
}

main().catch(err => {
    console.error('✗ Seed failed:', err)
    process.exit(1)
})
