'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function SearchBar() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initial query from URL or empty
    const [query, setQuery] = useState(searchParams.get('q') || '')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Trim query
        const q = query.trim()
        if (q) {
            router.push(`/?q=${encodeURIComponent(q)}`)
        } else {
            router.push('/')
        }
    }

    // Sync input if URL changes externally (e.g. back button)
    useEffect(() => {
        setQuery(searchParams.get('q') || '')
    }, [searchParams])

    return (
        <form onSubmit={handleSearch} className="w-full max-w-sm">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search movies, series..."
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <svg className="w-4 h-4 absolute left-3 top-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </form>
    )
}
