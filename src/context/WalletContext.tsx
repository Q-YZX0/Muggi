'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { WalletProvider as ManagedWalletProvider } from '@/lib/walletProvider'

interface WalletContextType {
    username: string | null // NEW: Expose username for API calls
    address: string | null
    isConnected: boolean
    isConnecting: boolean
    connect: () => Promise<void>
    disconnect: () => void
    refreshWallet: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Essential: Load saved session from localStorage
        ManagedWalletProvider.init();

        // Only check internal wallet state
        checkConnection()

        // Listen for internal storage changes (login/logout in other tabs or components)
        const handleStorage = () => checkConnection()
        window.addEventListener('storage', handleStorage)

        // Custom event for immediate updates within same window
        window.addEventListener('wallet-updated', handleStorage)

        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('wallet-updated', handleStorage)
        }
    }, [])

    const checkConnection = async () => {
        // Strictly check managed wallet
        if (ManagedWalletProvider.isLoggedIn()) {
            const wallet = ManagedWalletProvider.getWallet();
            console.log("[WalletContext] Logged in as:", wallet?.username);
            if (wallet) {
                setAddress(wallet.address);
                setUsername(wallet.username);
                setIsConnected(true);
                return;
            }
        } else {
            console.log("[WalletContext] No session found");
        }

        setAddress(null);
        setUsername(null);
        setIsConnected(false);
    }

    const connect = async () => {
        router.push('/login');
    }

    const disconnect = () => {
        setAddress(null)
        setUsername(null)
        setIsConnected(false)
        if (ManagedWalletProvider.isLoggedIn()) {
            ManagedWalletProvider.logout();
        }
    }

    const refreshWallet = async () => {
        await checkConnection();
    }

    return (
        <WalletContext.Provider value={{ username, address, isConnected, isConnecting, connect, disconnect, refreshWallet }}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWallet() {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}
