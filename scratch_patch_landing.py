import re

with open(r'c:\Users\Welcome\OneDrive\Desktop\min\bch1\src\pages\LandingPage.jsx', 'rb') as f:
    content = f.read().decode('utf-8')

changes = []

# 1. Add useWizard/WizardConnectQRDialog imports
old1 = "import { BCH_NETWORK, IS_MAINNET, MAX_FUND_BCH } from '../config/network'"
new1 = old1 + "\nimport { useWizard } from '../contexts/WizardContext'\nimport { WizardConnectQRDialog } from '@wizardconnect/react'"
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes.append('imports')

# 2. BCH CHIPNET -> BCH MAINNET badge
if '>BCH CHIPNET<' in content:
    content = content.replace('>BCH CHIPNET<', '>BCH \u00b7 MAINNET<', 1)
    changes.append('badge')

# 3. LIVE ON CHIPNET TESTNET -> LIVE ON BCH MAINNET
if 'LIVE ON CHIPNET TESTNET' in content:
    content = content.replace('LIVE ON CHIPNET TESTNET', 'LIVE ON BCH MAINNET', 1)
    changes.append('hero-badge')

# 4. Insert NavbarWalletBtn function definition before Navbar function
navbar_fn_marker = '// \u2500\u2500 Navbar \u2500'
if navbar_fn_marker in content:
    navbar_wallet_btn = '''// \u2500\u2500 Navbar wallet button \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function NavbarWalletBtn() {
    const { state, walletName, walletAddress, connect, disconnect, uri, qrUri } = useWizard()
    const isConnected = state === 'connected'
    const isConnecting = state === 'connecting' || state === 'reconnecting'

    function shortenAddr(addr) {
        if (!addr) return ''
        const clean = addr.replace('bitcoincash:', '')
        return 'q' + clean.slice(0, 5) + '\u2026' + clean.slice(-4)
    }

    return (
        <>
            {uri && qrUri && (
                <WizardConnectQRDialog
                    show={isConnecting}
                    onClose={() => disconnect()}
                    uri={uri}
                    qrUri={qrUri}
                    title="Connect to MileVault"
                    subtitle="Scan with a WizardConnect BCH wallet"
                />
            )}
            {isConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                        \ud83d\udd17 {walletName || 'Wallet'} \u00b7 {shortenAddr(walletAddress)}
                    </span>
                    <button
                        onClick={disconnect}
                        style={{ fontSize: '0.75rem', color: '#64748b', background: 'none', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}
                    >Disconnect</button>
                </div>
            ) : (
                <button
                    onClick={connect}
                    disabled={isConnecting}
                    style={{
                        padding: '8px 18px', borderRadius: '10px', border: '1.5px solid rgba(16,185,129,0.4)',
                        background: 'rgba(16,185,129,0.08)', color: '#34d399', fontWeight: 700, fontSize: '0.825rem',
                        cursor: isConnecting ? 'wait' : 'pointer', transition: 'all 0.2s',
                    }}
                >
                    {isConnecting ? 'Pairing\u2026' : '\ud83d\udd17 Connect Wallet'}
                </button>
            )}
        </>
    )
}

'''
    content = content.replace(navbar_fn_marker, navbar_wallet_btn + navbar_fn_marker, 1)
    changes.append('NavbarWalletBtn')

# 5. Add NavbarWalletBtn in the navbar right-side actions (before GitHub link comment)
old_github_comment = '                    {/* GitHub Link */}'
new_before_github = '                    {/* Connect Wallet */}\n                    <NavbarWalletBtn />\n\n                    {/* GitHub Link */}'
if old_github_comment in content:
    content = content.replace(old_github_comment, new_before_github, 1)
    changes.append('navbar-btn-inserted')

with open(r'c:\Users\Welcome\OneDrive\Desktop\min\bch1\src\pages\LandingPage.jsx', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Changes:', changes)
