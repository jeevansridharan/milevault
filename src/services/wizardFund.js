/**
 * wizardFund.js
 *
 * Fund a CashScript escrow contract using a WizardConnect-connected wallet.
 *
 * Flow:
 *  1. Derive sender address from manager.getPubkey(0, 0n) → P2PKH cashaddr
 *  2. Fetch UTXOs for that address from Blockchair API
 *  3. Build a libauth Transaction (inputs + outputs)
 *  4. Build sourceOutputs array (each input's locking script + value)
 *  5. Call manager.signTransaction({ transaction, inputPaths }) → signedTransaction hex
 *  6. Broadcast signed hex via Blockchair push API
 *  7. Return txid (from signedTransactionHash or decode from hex)
 *
 * Known limitations:
 *  - Only covers simple P2PKH inputs at derivation path receive/0 (m/44'/145'/0'/0/0)
 *  - If the wallet has UTXOs at other derivation paths, they won't be used
 *  - Coin selection: uses greedy (largest first) to cover amount + fee
 *  - Fee: flat 1000 sat estimate (conservative for a 1–2 input tx)
 */

import {
    hash160,
    encodeCashAddress,
    CashAddressNetworkPrefix,
    CashAddressType,
    decodeCashAddress,
    hexToBin,
} from '@bitauth/libauth'
import { MAX_FUND_BCH } from '../config/network'

const BLOCKCHAIR_BCH = 'https://api.blockchair.com/bitcoin-cash'
const FEE_SAT = 1000n  // flat fee estimation

// ── Address helpers ──────────────────────────────────────────────────────────

export function pubkeyToAddress(pubkeyBytes) {
    const pkh = hash160(pubkeyBytes)
    const result = encodeCashAddress({
        prefix: CashAddressNetworkPrefix.mainnet,
        type: CashAddressType.p2pkh,
        payload: pkh,
    })
    if (typeof result !== 'string') throw new Error('Failed to encode cash address')
    return result  // "bitcoincash:q..."
}

export function addressToLockingScript(cashaddr) {
    const decoded = decodeCashAddress(cashaddr)
    if (typeof decoded === 'string') throw new Error(`Invalid cashaddr: ${decoded}`)
    // P2PKH locking script: OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG
    const pkh = decoded.payload
    const script = new Uint8Array([
        0x76,          // OP_DUP
        0xa9,          // OP_HASH160
        0x14,          // push 20 bytes
        ...pkh,
        0x88,          // OP_EQUALVERIFY
        0xac,          // OP_CHECKSIG
    ])
    return script
}

function uint8ArrayToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Blockchair UTXO fetch ────────────────────────────────────────────────────

async function fetchUTXOs(cashaddr) {
    // Strip prefix for API
    const bare = cashaddr.replace('bitcoincash:', '')
    const url = `${BLOCKCHAIR_BCH}/dashboards/address/${bare}?limit=50`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Blockchair address lookup failed: ${res.status}`)
    const json = await res.json()
    const data = json?.data?.[bare]
    if (!data) throw new Error('No address data from Blockchair')
    const utxos = (data.utxo || []).map(u => ({
        txid: u.transaction_hash,
        vout: u.index,
        value: BigInt(u.value),  // satoshis
    }))
    return utxos
}

// ── Coin selection ───────────────────────────────────────────────────────────

function selectCoins(utxos, targetSat) {
    const needed = targetSat + FEE_SAT
    const sorted = [...utxos].sort((a, b) => Number(b.value - a.value))  // largest first
    const selected = []
    let total = 0n
    for (const u of sorted) {
        selected.push(u)
        total += u.value
        if (total >= needed) break
    }
    if (total < needed) throw new Error(`Insufficient funds. Have ${total} sat, need ${needed} sat (including ${FEE_SAT} sat fee).`)
    return { selected, total, change: total - targetSat - FEE_SAT }
}

// ── Build libauth Transaction object ────────────────────────────────────────

function buildTransaction(selected, senderScript, amountSat, contractAddress, changeAddress) {
    const { change } = selectCoins(selected, amountSat)
    const contractScript = addressToLockingScript(contractAddress)

    const inputs = selected.map(u => ({
        outpointTransactionHash: hexToBin(u.txid).reverse(),  // little-endian
        outpointIndex: u.vout,
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(0),  // empty placeholder; wallet fills this
    }))

    const outputs = []

    // Output 0: payment to escrow contract
    outputs.push({
        valueSatoshis: amountSat,
        lockingBytecode: contractScript,
    })

    // Output 1 (change): back to sender if > dust (546 sat)
    const changeAmt = change
    if (changeAmt > 546n) {
        outputs.push({
            valueSatoshis: changeAmt,
            lockingBytecode: senderScript,
        })
    }

    return {
        version: 2,
        inputs,
        outputs,
        locktime: 0,
    }
}

// ── Build sourceOutputs for WizardConnect ────────────────────────────────────

function buildSourceOutputs(selected, senderScript) {
    return selected.map(u => ({
        outpointTransactionHash: hexToBin(u.txid).reverse(),
        outpointIndex: u.vout,
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(0),
        valueSatoshis: u.value,
        lockingBytecode: senderScript,
        // no contract info — plain P2PKH
    }))
}

// ── Broadcast ────────────────────────────────────────────────────────────────

async function broadcastTx(signedHex) {
    const res = await fetch(`${BLOCKCHAIR_BCH}/push/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: signedHex }),
    })
    const json = await res.json()
    if (json?.data?.transaction_hash) return json.data.transaction_hash
    // If Blockchair returns the txid in another field
    if (json?.data?.hash) return json.data.hash
    if (!res.ok) throw new Error(json?.context?.error || `Broadcast failed: ${res.status}`)
    // Derive txid from hex as fallback
    return null
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * fundProjectWithWizard
 *
 * @param {object} manager          - DappConnectionManager from useWizardConnect
 * @param {number} amountBch        - Amount in BCH to send
 * @param {string} contractAddress  - CashScript P2SH / P2PKH escrow address
 * @returns {Promise<string>}       - Transaction ID (hex)
 */
export async function fundProjectWithWizard(manager, amountBch, contractAddress) {
    if (amountBch > MAX_FUND_BCH) {
        throw new Error(`Funding is capped at ${MAX_FUND_BCH} BCH per transaction.`)
    }
    if (!contractAddress) {
        throw new Error('No escrow contract address provided.')
    }
    if (!manager || !manager.isWalletDiscovered()) {
        throw new Error('WizardConnect wallet is not ready. Please wait for it to connect.')
    }

    // 1. Derive sender address
    const pubkeyBytes = manager.getPubkey(0, 0n)
    if (!pubkeyBytes) {
        throw new Error('Could not get public key from wallet. The wallet may not have shared xpubs yet.')
    }
    const senderAddress = pubkeyToAddress(pubkeyBytes)
    const senderScript = addressToLockingScript(senderAddress)

    console.log('[wizardFund] Sender address:', senderAddress)
    console.log('[wizardFund] Contract address:', contractAddress)

    // 2. Fetch UTXOs
    const utxos = await fetchUTXOs(senderAddress)
    if (!utxos.length) {
        throw new Error(`No UTXOs found for ${senderAddress}. Please send BCH to this address first.`)
    }

    // 3. Coin selection
    const amountSat = BigInt(Math.round(amountBch * 1e8))
    const { selected, total, change } = selectCoins(utxos, amountSat)

    console.log('[wizardFund] Selected UTXOs:', selected.length, 'total:', total.toString(), 'sat')

    // 4. Build transaction
    const transaction = buildTransaction(selected, senderScript, amountSat, contractAddress, senderAddress)
    const sourceOutputs = buildSourceOutputs(selected, senderScript)

    // 5. inputPaths: [childIndex, pathName, addressIndex]
    //    All inputs are from receive/0 (child 0, path 'receive', index 0)
    const inputPaths = selected.map(() => [0, 'receive', 0])

    console.log('[wizardFund] Calling manager.signTransaction...')

    // 6. Request signature
    // SignTransactionRequest.transaction is WcSignTransactionRequest:
    //   { transaction: Transaction, sourceOutputs: WcSourceOutput[], broadcast?: boolean, userPrompt?: string }
    const wcTxRequest = {
        transaction,         // libauth Transaction object
        sourceOutputs,       // WcSourceOutput[] — inputs with locking scripts + values
        broadcast: true,     // ask wallet to broadcast; response may include txid
        userPrompt: `Fund MileVault escrow with ${amountBch} BCH`,
    }

    const response = await manager.signTransaction({
        transaction: wcTxRequest,
        inputPaths,
    })

    // The response.signedTransaction is a hex string
    const signedHex = response.signedTransaction
    if (!signedHex) throw new Error('Wallet did not return a signed transaction.')

    console.log('[wizardFund] Got signed tx, broadcasting...')

    // 7. Broadcast
    let txid = await broadcastTx(signedHex)
    if (!txid) {
        // Derive txid from the hex hash returned by wallet
        txid = response.signedTransactionHash || signedHex.slice(0, 64)
    }

    console.log('[wizardFund] Broadcast txid:', txid)
    return txid
}
