const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rhjjvqdxwvoiorkipagf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoamp2cWR4d3ZvaW9ya2lwYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTk1MTYsImV4cCI6MjA4NjY3NTUxNn0.ZX00U_jZDyJgh9MIK9AEH4h4JJ1ziDXkT4mfcS5PyCI');

async function diagnose() {
    // 1. Get a recent closed week
    const { data: semanas } = await supabase.from('ops_semanas').select('*').order('created_at', { ascending: false }).limit(1);
    if (!semanas || semanas.length === 0) {
        console.log("No weeks found");
        return;
    }
    const semana = semanas[0];
    console.log(`Diagnosing Week: ${semana.nombre} (${semana.id})`);

    // 2. Get reports for this week
    const { data: reportes } = await supabase.from('ops_daily_reports').select('id, fecha').eq('semana_id', semana.id);
    const reportIds = reportes.map(r => r.id);
    const reportMap = new Map(reportes.map(r => [r.id, r.fecha]));
    console.log(`Reports in week: ${reportes.length}`);

    // 3. Get all attendance records for these reports
    const { data: asistencias } = await supabase
        .from('ops_daily_attendance')
        .select(`
            empleado_id, 
            report_id,
            cat_asistencias(codigo, nombre),
            rh_employees(first_name, last_name, cat_puestos(tipo_personal))
        `)
        .in('report_id', reportIds);

    console.log(`Attendance records found: ${asistencias.length}`);

    const baseDaysRef = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

    asistencias.forEach(att => {
        const fecha = reportMap.get(att.report_id);
        const dateObj = new Date(fecha + 'T12:00:00');
        const dayIndex = dateObj.getDay();
        const dayName = baseDaysRef[dayIndex];
        const status = att.cat_asistencias?.codigo;
        const empName = `${att.rh_employees?.first_name} ${att.rh_employees?.last_name}`;
        const tipo = att.rh_employees?.cat_puestos?.tipo_personal;

        if (status === 'FALTA') {
            console.log(`[FALTA FOUND] Emp: ${empName} (${tipo}) | Fecha: ${fecha} | Day: ${dayName}`);
        } else if (empName.includes("Brian")) {
            console.log(`[Brian] Fecha: ${fecha} | Day: ${dayName} | Status: ${status}`);
        }
    });
}

diagnose();
