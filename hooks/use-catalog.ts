
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useCatalog<T>(tableName: string, select = '*') {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCatalog = async () => {
        setLoading(true)
        setError(null)

        try {
            // Simple select without order to ensure maximum compatibility
            const { data, error } = await supabase
                .from(tableName)
                .select(select)

            if (error) throw error

            setData(data as T[])
        } catch (err: any) {
            console.error(`Error fetching ${tableName}:`, err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCatalog()
    }, [])

    return { data, loading, error, refresh: fetchCatalog }
}
