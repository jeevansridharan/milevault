/**
 * BlazeInfoBanner.jsx
 * Slim top banner for EMBER2026 / BLAZE submission context.
 * Shows links, token-aware donation address with copy, and project context.
 */

import React, { useState, useEffect } from 'react'

const PRESENTATION_URL = import.meta.env.VITE_PRESENTATION_URL || '#'
const EMBER_ADDRESS = (import.meta.env.VITE_EMBER_ADDRESS || '').trim()

export default function BlazeInfoBanner() {
    const [copied, setCopied] = useState(false)
    const [showFull, setShowFull] = useState(false)

    const lower = EMBER_ADDRESS.toLowerCase()
    const isValid = Boolean(lower && (lower.startsWith('bitcoincash:z') || lower.startsWith('z')))

    useEffect(() => {
        if (!isValid) {
            console.error('Invalid CashTokens address: VITE_EMBER_ADDRESS must start with "bitcoincash:z" or "z". Received:', EMBER_ADDRESS || '(empty)')
        }
    }, [isValid])

    const handleCopy = () => {
        if (!isValid || !EMBER_ADDRESS) return
        navigator.clipboard.writeText(EMBER_ADDRESS).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const clean = EMBER_ADDRESS.replace(/^bitcoincash:/i, '')
    const shortAddr = clean.length > 18
        ? `${clean.slice(0, 10)}…${clean.slice(-6)}`
        : clean

    const displayedAddress = showFull ? EMBER_ADDRESS : shortAddr

    return (
        <div style={{
            width: '100%',
            background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 100%)',
            borderBottom: '1px solid rgba(16,185,129,0.25)',
            padding: '7px 16px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px 18px',
            fontSize: '0.72rem',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            zIndex: 50,
            position: 'relative',
        }}>
            {/* Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <BannerLink href={PRESENTATION_URL} label="🎞 Presentation" />
                <Sep />
                <BannerLink href="https://github.com/jeevansridharan/milevault" label="⬡ Repo" />
            </div>

            {/* Donation address */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#94a3b8' }}>EMBER2026 donate:</span>
                {isValid ? (
                    <>
                        <span
                            onClick={() => setShowFull(prev => !prev)}
                            onMouseEnter={() => setShowFull(true)}
                            onMouseLeave={() => setShowFull(false)}
                            title={EMBER_ADDRESS}
                            style={{
                                fontFamily: 'monospace',
                                color: '#34d399',
                                fontSize: '0.69rem',
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: '5px',
                                padding: '1px 6px',
                                cursor: 'pointer',
                                wordBreak: 'break-all',
                                transition: 'all 0.15s ease',
                                userSelect: 'all',
                            }}
                        >
                            {displayedAddress}
                        </span>
                        <button
                            onClick={handleCopy}
                            title={EMBER_ADDRESS}
                            style={{
                                background: copied ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.3)',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                color: copied ? '#34d399' : '#10b981',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 7px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </>
                ) : (
                    <span
                        style={{
                            fontFamily: 'monospace',
                            color: '#f87171',
                            fontSize: '0.69rem',
                            fontWeight: 600,
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.35)',
                            borderRadius: '5px',
                            padding: '1px 6px',
                        }}
                    >
                        Invalid CashTokens address
                    </span>
                )}
            </div>

            {/* Context text */}
            <span style={{ color: '#64748b', marginLeft: 'auto', fontStyle: 'italic', flexShrink: 0 }}>
                Pre-existing project (Milestara), upgraded for BLAZE: mainnet + on-chain verification.
            </span>
        </div>
    )
}

function BannerLink({ href, label }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                color: '#34d399',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.72rem',
                transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#6ee7b7'}
            onMouseLeave={e => e.currentTarget.style.color = '#34d399'}
        >
            {label}
        </a>
    )
}

function Sep() {
    return <span style={{ color: 'rgba(100,116,139,0.5)', userSelect: 'none' }}>·</span>
}
