/**
 * WizardContext.jsx
 *
 * App-wide WizardConnect session. Provides:
 *   - state, manager, walletName, walletAddress (derived from pubkey)
 *   - connect(), disconnect()
 *
 * WizardConnect derives xpubs via HD-wallet protocol. Once wallet_ready fires,
 * we derive the compressed pubkey at child=0 (receive), index=0 and convert
 * it to a mainnet P2PKH cashaddr.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWizardConnect } from '@wizardconnect/react'
import {
    hash160,
    encodeCashAddress,
    CashAddressNetworkPrefix,
    CashAddressType,
} from '@bitauth/libauth'

const WizardCtx = createContext(null)

function pubkeyToP2PKHAddress(pubkeyBytes) {
    try {
        const pkh = hash160(pubkeyBytes)
        const result = encodeCashAddress({
            prefix: CashAddressNetworkPrefix.mainnet,
            type: CashAddressType.p2pkh,
            payload: pkh,
        })
        if (typeof result === 'string') return result
        return null
    } catch {
        return null
    }
}

export function WizardProvider({ children }) {
    const wizard = useWizardConnect({
        dappName: 'MileVault',
        persistSession: true,
    })

    const [walletAddress, setWalletAddress] = useState(null)

    // Derive address from pubkey when manager is ready
    useEffect(() => {
        if (wizard.state !== 'connected' || !wizard.manager) {
            setWalletAddress(null)
            return
        }
        // Try to get pubkey at receive path, index 0
        const deriveAddr = () => {
            try {
                const pubkeyBytes = wizard.manager.getPubkey(0, 0n)
                if (pubkeyBytes) {
                    const addr = pubkeyToP2PKHAddress(pubkeyBytes)
                    setWalletAddress(addr)
                }
            } catch (e) {
                console.warn('[WizardContext] getPubkey failed:', e.message)
            }
        }

        // wallet_ready may already have fired (reconnect), try immediately
        deriveAddr()

        // Also listen for future wallet_ready events
        const handler = () => deriveAddr()
        wizard.manager.on('walletready', handler)
        return () => wizard.manager.off('walletready', handler)
    }, [wizard.state, wizard.manager])

    const value = {
        state: wizard.state,
        manager: wizard.manager,
        walletName: wizard.walletName,
        walletAddress,
        uri: wizard.uri,
        qrUri: wizard.qrUri,
        connect: wizard.connect,
        disconnect: wizard.disconnect,
        error: wizard.error,
    }

    return <WizardCtx.Provider value={value}>{children}</WizardCtx.Provider>
}

export function useWizard() {
    return useContext(WizardCtx)
}
