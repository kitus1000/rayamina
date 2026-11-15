import { Redirect } from 'expo-router';

export default function Index() {
    // Aquí podemos comprobar si existe una sesión en Supabase después,
    // por ahora enviamos directamente al login para probar la UI.
    return <Redirect href="/login" />;
}
