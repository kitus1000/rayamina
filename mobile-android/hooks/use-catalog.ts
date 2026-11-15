import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Hook universal para extraer cualquier catálogo de la Base de Datos
export function useCatalog<T>(tableName: string, select = '*') {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCatalog = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from(tableName)
                .select(select);

            if (error) throw error;

            setData(data as T[]);
        } catch (err: any) {
            console.error(`Error fetching ${tableName}:`, err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCatalog();
    }, [tableName, select]);

    return { data, loading, error, refresh: fetchCatalog };
}
