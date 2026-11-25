/**
 * BlazeInfoBanner.jsx
 * Slim top banner for EMBER2026 / BLAZE submission context.
 * Shows links, donation address with copy, and project context.
 */

import React, { useState } from 'react'

const PRESENTATION_URL = import.meta.env.VITE_PRESENTATION_URL || '#'
const CASHTOKENS_ADDRESS = import.meta.env.VITE_CASHTOKENS_ADDRESS || ''

export default function BlazeInfoBanner() {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        if (!CASHTOKENS_ADDRESS) return
        navigator.clipboard.writeText(CASHTOKENS_ADDRESS).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    const shortAddr = CASHTOKENS_ADDRESS
        ? CASHTOKENS_ADDRESS.replace('bitcoincash:', 'q') .slice(0, 10) + '…' + CASHTOKENS_ADDRESS.slice(-6)
        : ''

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
                <Sep />
                <BannerLink href="https://github.com/jeevansridharan/bch1" label="📦 Old repo (Milestara)" />
            </div>

            {/* Donation address */}
            {CASHTOKENS_ADDRESS && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8' }}>EMBER2026 donate:</span>
                    <span style={{
                        fontFamily: 'monospace', color: '#34d399', fontSize: '0.69rem',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                        borderRadius: '5px', padding: '1px 6px',
                    }}>{shortAddr}</span>
                    <button
                        onClick={handleCopy}
                        title={CASHTOKENS_ADDRESS}
                        style={{
                            background: copied ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: '5px', cursor: 'pointer',
                            color: copied ? '#34d399' : '#10b981',
                            fontSize: '0.65rem', fontWeight: 700,
                            padding: '1px 7px', transition: 'all 0.2s',
                        }}
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
            )}

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
