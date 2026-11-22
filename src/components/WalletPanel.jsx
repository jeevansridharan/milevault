/**
 * WalletPanel.jsx
 *
 * Primary wallet UX for MileVault (BCH Mainnet).
 *
 * Priority:
 *  1. WizardConnect — if connected, Fund uses the external wallet via signTransaction.
 *  2. In-app wallet (demo) — fallback, labeled clearly.
 *
 * Fund flow with WizardConnect:
 *  - Derives sender address from manager.getPubkey(0, 0n)
 *  - Fetches UTXOs via Blockchair API
 *  - Builds libauth Transaction + sourceOutputs
 *  - Calls manager.signTransaction() → wallet signs & optionally broadcasts
 *  - Shows txid with blockchair.com mainnet link
 */

import React, { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useWizard } from '../contexts/WizardContext'
import {
    fundProject,
    getExplorerUrl,
    shortenAddress,
} from '../services/bchWallet'
import { fundProjectWithWizard } from '../services/wizardFund'
import { QRCodeCanvas } from 'qrcode.react'
import { WizardConnectQRDialog } from '@wizardconnect/react'
import { BCH_NETWORK, IS_MAINNET, MAX_FUND_BCH } from '../config/network'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
    return (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    )
}

function shortenAddr(addr) {
    if (!addr) return ''
    const clean = addr.replace('bitcoincash:', '')
    return `q${clean.slice(0, 6)}…${clean.slice(-4)}`
}

function ErrorBox({ message, onClose }) {
    return (
        <div className="mt-4 p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.25)' }}>
            <span className="text-rose-400 mt-0.5">⚠</span>
            <p className="text-rose-300 text-sm flex-1">{message}</p>
            <button onClick={onClose} className="text-rose-400 hover:text-rose-200 text-lg leading-none">×</button>
        </div>
    )
}

function TxSuccess({ txId, amount }) {
    const url = getExplorerUrl(txId)
    return (
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span className="text-emerald-400 font-bold text-sm">Transaction Sent!</span>
                <span className="text-slate-400 text-xs ml-auto">{parseFloat(amount).toFixed(8)} BCH</span>
            </div>
            <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Transaction Hash</p>
            <p className="text-slate-300 text-xs font-mono break-all mb-3">{txId}</p>
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
                View on Blockchair
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
        </div>
    )
}

// ── WizardConnect section ────────────────────────────────────────────────────

function WizardSection({ onFund, contractAddress }) {
    const { state, manager, walletName, walletAddress, uri, qrUri, connect, disconnect, error } = useWizard()
    const [amount, setAmount] = useState('')
    const [txId, setTxId] = useState('')
    const [uiError, setUiError] = useState('')
    const [sending, setSending] = useState(false)
    const [txStatus, setTxStatus] = useState('idle')

    const isConnected = state === 'connected'
    const isConnecting = state === 'connecting' || state === 'reconnecting'

    const handleFund = async () => {
        setUiError('')
        const parsed = parseFloat(amount)
        if (!parsed || parsed <= 0) { setUiError('Enter a valid amount.'); return }
        if (parsed > MAX_FUND_BCH) { setUiError(`Capped at ${MAX_FUND_BCH} BCH.`); return }

        setSending(true)
        setTxStatus('sending')
        setTxId('')
        try {
            const hash = await fundProjectWithWizard(manager, parsed, contractAddress)
            setTxId(hash)
            setTxStatus('success')
            if (onFund) onFund(parsed, hash)
        } catch (e) {
            setTxStatus('error')
            setUiError(e.message || 'Transaction failed.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="card-glass rounded-2xl p-5 mb-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <strong className="text-white text-sm flex items-center gap-2">
                        <span>🔗</span> WizardConnect Wallet
                    </strong>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {isConnected
                            ? `${walletName || 'BCH Wallet'} · ${walletAddress ? shortenAddr(walletAddress) : 'address pending…'}`
                            : 'Connect your BCH wallet to fund campaigns.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isConnected && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 5px rgba(52,211,153,0.9)' }} />
                            Connected
                        </div>
                    )}
                    {isConnected
                        ? <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-lg border border-slate-700" onClick={disconnect}>Disconnect</button>
                        : <button
                            className="px-4 py-2 rounded-lg font-bold text-white text-xs disabled:opacity-50 flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}
                            disabled={isConnecting}
                            onClick={connect}
                        >
                            {isConnecting ? <><Spinner /> Pairing…</> : '🔗 Connect Wallet'}
                        </button>
                    }
                </div>
            </div>

            {/* QR Dialog */}
            {uri && qrUri && (
                <WizardConnectQRDialog
                    show={isConnecting}
                    onClose={() => disconnect()}
                    uri={uri}
                    qrUri={qrUri}
                    title="Connect to MileVault"
                    subtitle="Scan with a WizardConnect-compatible BCH wallet"
                />
            )}

            {/* Error from WizardConnect itself */}
            {error && <p className="text-rose-300 text-xs mb-3">⚠ {error}</p>}

            {/* Fund form — only when connected */}
            {isConnected && (
                <div className="space-y-3">
                    {IS_MAINNET && (
                        <p role="alert" className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-3 text-amber-200 text-xs">
                            ⚠ Mainnet: this sends real BCH. Limit: {MAX_FUND_BCH} BCH per transaction.
                        </p>
                    )}
                    <div className="relative">
                        <input
                            type="number"
                            min="0.0001"
                            max={MAX_FUND_BCH}
                            step="0.001"
                            value={amount}
                            onChange={e => { setAmount(e.target.value); setUiError(''); setTxStatus('idle'); setTxId('') }}
                            placeholder="0.001"
                            className="input-web3 pr-16"
                            disabled={sending}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#10b981' }}>BCH</span>
                    </div>
                    <div className="flex gap-2">
                        {['0.001', '0.002'].map(v => (
                            <button key={v}
                                onClick={() => { setAmount(v); setUiError(''); setTxStatus('idle'); setTxId('') }}
                                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
                            >{v}</button>
                        ))}
                    </div>
                    <button
                        onClick={handleFund}
                        disabled={sending || !amount}
                        className="w-full py-3.5 rounded-xl font-bold text-white gradient-btn-green flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {sending
                            ? <><Spinner /> Waiting for wallet…</>
                            : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> Fund Campaign</>
                        }
                    </button>
                    {uiError && <ErrorBox message={uiError} onClose={() => setUiError('')} />}
                    {txStatus === 'success' && txId && <TxSuccess txId={txId} amount={amount} />}
                </div>
            )}

            {/* Prompt to connect */}
            {!isConnected && !isConnecting && (
                <p className="text-slate-500 text-xs text-center pt-1">
                    Click "Connect Wallet" to pair via QR code and fund this campaign.
                </p>
            )}
        </div>
    )
}

// ── In-app wallet (demo fallback) ────────────────────────────────────────────

function InAppWalletSection({ onRealFund, onWalletConnect, contractAddress }) {
    const {
        wallet, address, balance, loading: contextLoading, error: contextError,
        connect, disconnect, refreshBalance
    } = useWallet()

    const [amount, setAmount] = useState('')
    const [txId, setTxId] = useState('')
    const [uiError, setUiError] = useState('')
    const [sendLoading, setSendLoading] = useState(false)
    const [txStatus, setTxStatus] = useState('idle')
    const [showQr, setShowQr] = useState(false)
    const [wifInput, setWifInput] = useState('')
    const [copied, setCopied] = useState(false)

    const handleConnect = async (isImport = false) => {
        setUiError('')
        try {
            const w = await connect(isImport ? wifInput : null)
            if (onWalletConnect) onWalletConnect(w)
        } catch (e) {
            setUiError(e.message || 'Connection failed')
        }
    }

    const handleDisconnect = () => {
        disconnect()
        setAmount(''); setTxId(''); setTxStatus('idle'); setWifInput(''); setUiError('')
        if (onWalletConnect) onWalletConnect(null)
    }

    const handleFund = async () => {
        setUiError('')
        const parsed = parseFloat(amount)
        if (!parsed || parsed <= 0) { setUiError('Enter a valid BCH amount greater than 0.'); return }
        if (parsed > MAX_FUND_BCH) { setUiError(`Funding is capped at ${MAX_FUND_BCH} BCH per transaction.`); return }
        if (balance !== null && parsed > balance) { setUiError(`Insufficient balance. You have ${balance.toFixed(8)} BCH.`); return }

        setSendLoading(true); setTxStatus('sending'); setTxId('')
        try {
            const hash = await fundProject(wallet, parsed, contractAddress)
            setTxId(hash); setTxStatus('success')
            if (onRealFund) onRealFund(parsed, hash)
            setTimeout(() => refreshBalance(), 2000)
        } catch (e) {
            setTxStatus('error'); setUiError(e.message || 'Transaction failed.')
        } finally {
            setSendLoading(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(address)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
    }

    const demoLabelEl = (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}>
            Demo / Fallback
        </span>
    )

    if (!wallet) {
        return (
            <div className="card-glass rounded-2xl p-6 mb-6" style={{ opacity: 0.75 }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.2)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 12L12 22L21 12L12 2Z" stroke="#64748b" strokeWidth="2" /></svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-slate-400 font-bold text-sm">In-app BCH Wallet</h2>
                            {demoLabelEl}
                        </div>
                        <p className="text-slate-600 text-xs">{BCH_NETWORK === 'mainnet' ? 'Bitcoin Cash Mainnet' : 'Chipnet test network'}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-slate-500 text-xs mb-2 font-semibold uppercase tracking-wider">Import WIF (demo only)</p>
                        <input
                            type="password"
                            placeholder="Enter Wallet WIF..."
                            value={wifInput}
                            onChange={e => setWifInput(e.target.value)}
                            className="input-web3 mb-2 text-xs"
                        />
                        <button onClick={() => handleConnect(true)} disabled={contextLoading || !wifInput}
                            className="w-full py-2 rounded-lg font-bold text-slate-300 text-sm disabled:opacity-50 border border-slate-700">
                            {contextLoading ? <Spinner /> : 'Import Wallet'}
                        </button>
                    </div>
                    <div className="text-center relative"><hr className="border-slate-800" /><span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[#0f1123] text-[10px] text-slate-600 font-bold uppercase">OR</span></div>
                    <button onClick={() => handleConnect(false)} disabled={contextLoading}
                        className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-slate-300 transition-all flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-600 bg-slate-400/5 text-sm">
                        {contextLoading ? <><Spinner /> Generating…</> : 'Generate New Wallet'}
                    </button>
                </div>
                {uiError && <ErrorBox message={uiError} onClose={() => setUiError('')} />}
                {contextError && <ErrorBox message={contextError} onClose={() => { }} />}
            </div>
        )
    }

    return (
        <div className="card-glass rounded-2xl p-6 mb-6" style={{ opacity: 0.8 }}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 12L12 22L21 12L12 2Z" stroke="#10b981" strokeWidth="2" /></svg>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-slate-300 font-bold text-sm">In-app BCH Wallet</h2>
                        {demoLabelEl}
                    </div>
                    <p className="text-slate-500 text-xs">{BCH_NETWORK === 'mainnet' ? 'Bitcoin Cash Mainnet' : 'Chipnet test network'}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                </div>
            </div>

            <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</span>
                    <div className="flex gap-2">
                        <button onClick={() => setShowQr(!showQr)} className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>{showQr ? 'Close QR' : 'Show QR'}</button>
                        <button onClick={handleCopy} className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ color: copied ? '#10b981' : '#34d399', background: 'rgba(16,185,129,0.1)' }}>{copied ? '✓ Copied' : 'Copy'}</button>
                    </div>
                </div>
                <p className="text-slate-400 text-xs font-mono break-all">{address}</p>
                {showQr && (
                    <div className="mt-3 p-3 bg-white rounded-xl flex flex-col items-center gap-2">
                        <QRCodeCanvas value={address} size={140} level="H" includeMargin />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between rounded-xl p-3 mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Balance</p>
                    {contextLoading ? <div className="text-slate-400 text-sm flex gap-1 items-center"><Spinner /> Fetching…</div>
                        : balance !== null ? <p className="text-lg font-bold" style={{ color: '#34d399' }}>{balance.toFixed(8)} <span className="text-sm text-emerald-400">BCH</span></p>
                            : <p className="text-slate-500 text-sm italic">Not Synced</p>}
                </div>
                <button onClick={refreshBalance} disabled={contextLoading} className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg disabled:opacity-40" title="Refresh">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={contextLoading ? 'animate-spin' : ''}><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
            </div>

            {IS_MAINNET && <p role="alert" className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-2 text-amber-200 text-xs mb-3">Mainnet: real BCH. Limit: {MAX_FUND_BCH} BCH.</p>}

            <div className="space-y-2">
                <div className="relative">
                    <input type="number" min="0.0001" max={MAX_FUND_BCH} step="0.001" value={amount}
                        onChange={e => { setAmount(e.target.value); setUiError(''); setTxStatus('idle'); setTxId('') }}
                        placeholder="0.001" className="input-web3 pr-16" disabled={sendLoading} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#10b981' }}>BCH</span>
                </div>
                <div className="flex gap-2">
                    {['0.001', '0.002'].filter(v => Number(v) <= MAX_FUND_BCH).map(v => (
                        <button key={v} onClick={() => { setAmount(v); setUiError(''); setTxStatus('idle'); setTxId('') }}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}>{v}</button>
                    ))}
                </div>
                <button onClick={handleFund} disabled={sendLoading || !amount}
                    className="w-full py-3 rounded-xl font-bold text-slate-300 flex items-center justify-center gap-2 disabled:opacity-60 border border-slate-700 hover:border-emerald-500/50 bg-slate-400/5 text-sm">
                    {sendLoading ? <><Spinner /> Broadcasting…</> : 'Fund (In-app wallet)'}
                </button>
            </div>

            {uiError && <ErrorBox message={uiError} onClose={() => setUiError('')} />}
            {contextError && <ErrorBox message={contextError} onClose={() => { }} />}
            {txStatus === 'success' && txId && <TxSuccess txId={txId} amount={amount} />}

            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={handleDisconnect} className="text-slate-600 hover:text-slate-400 text-xs">Disconnect &amp; remove from browser</button>
            </div>
        </div>
    )
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function WalletPanel({ onRealFund, onWalletConnect, contractAddress = null }) {
    const { state: wizState } = useWizard()

    return (
        <>
            {/* Primary: WizardConnect */}
            <WizardSection onFund={onRealFund} contractAddress={contractAddress} />

            {/* Divider */}
            <div className="text-center relative my-2">
                <hr className="border-slate-800" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[#0f1123] text-[10px] text-slate-600 font-bold uppercase">or use in-app wallet</span>
            </div>

            {/* Fallback: In-app wallet */}
            <InAppWalletSection onRealFund={onRealFund} onWalletConnect={onWalletConnect} contractAddress={contractAddress} />
        </>
    )
}
