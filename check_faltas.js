const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://rhjjvqdxwvoiorkipagf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoamp2cWR4d3ZvaW9ya2lwYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTk1MTYsImV4cCI6MjA4NjY3NTUxNn0.ZX00U_jZDyJgh9MIK9AEH4h4JJ1ziDXkT4mfcS5PyCI');

async function test() {
    const { data: att } = await supabase.from('ops_daily_attendance').select('id, report_id, cat_asistencias(codigo, nombre), empleado_id, ops_daily_reports(fecha)');
    const d = att.filter(a => a.cat_asistencias && a.cat_asistencias.codigo === 'FALTA');
    console.log("Faltas explicitly recorded: ", d.length);

    if (d.length > 0) {
        d.forEach(f => {
            console.log(`Falta - Emp: ${f.empleado_id} - Report: ${f.report_id} - Fecha: ${f.ops_daily_reports?.fecha}`);
        });
    }
}
test();
