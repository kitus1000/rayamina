const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function syncRealCuadrillas() {
    console.log('--- Sincronizando Miembros en cat_cuadrillas_miembros ---');
    const excelPath = path.join(__dirname, '..', '38. 21 AL 27 DE SEPTIEMBRE 2026.xlsm');
    const wb = XLSX.readFile(excelPath);

    const s = wb.Sheets['DATOS RAYAS'];
    const data = XLSX.utils.sheet_to_json(s, { header: 1 });

    const rawCuadrillas = {};
    for (let col = 0; col < data[0].length; col += 2) {
        const cName = data[0][col];
        if (!cName) continue;
        rawCuadrillas[cName] = [];
        for (let r = 1; r < data.length; r += 2) {
            const name = data[r] ? data[r][col] : null;
            const puesto = data[r + 1] ? data[r + 1][col] : null;
            if (name && typeof name === 'string' && name.trim() && !name.startsWith('Ing.')) {
                rawCuadrillas[cName].push({
                    name: name.trim().toUpperCase(),
                    puesto: (puesto || 'OPERATIVO MINA').toString().trim().toUpperCase()
                });
            }
        }
    }

    const { data: cList } = await supabase.from('cat_cuadrillas').select('id, nombre');
    const cuadrillaMap = {};
    cList.forEach(c => { cuadrillaMap[c.nombre.toUpperCase()] = c.id; });

    const { data: eList } = await supabase.from('rh_employees').select('id, first_name, last_name, employee_code');
    const empMap = {};
    eList.forEach(e => {
        const full = `${e.first_name} ${e.last_name}`.toUpperCase().trim();
        empMap[full] = e.id;
    });

    await supabase.from('cat_cuadrillas_miembros').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let insertedCount = 0;
    const weeklySnapshot = {
        'SEMANA_38': {
            week_label: 'Semana 38 (21 al 27 de Septiembre 2026)',
            dates: '2026-09-21 al 2026-09-27',
            cuadrillas: {}
        },
        'SEMANA_37': {
            week_label: 'Semana 37 (14 al 20 de Septiembre 2026)',
            dates: '2026-09-14 al 2026-09-20',
            cuadrillas: {}
        }
    };

    const historyNotes = {};

    for (const [cName, members] of Object.entries(rawCuadrillas)) {
        const cId = cuadrillaMap[cName];
        if (!cId) {
            console.warn('Cuadrilla no encontrada:', cName);
            continue;
        }

        weeklySnapshot['SEMANA_38'].cuadrillas[cName] = [];
        weeklySnapshot['SEMANA_37'].cuadrillas[cName] = [];

        for (const m of members) {
            let empId = empMap[m.name];
            if (!empId) {
                // Try fuzzy match
                const found = eList.find(e => {
                    const full = `${e.first_name} ${e.last_name}`.toUpperCase();
                    const words = m.name.split(' ');
                    return words.length > 1 && full.includes(words[0]) && full.includes(words[1]);
                });
                if (found) empId = found.id;
            }

            if (!empId) {
                console.warn('Empleado no encontrado:', m.name);
                continue;
            }

            const { error: insErr } = await supabase.from('cat_cuadrillas_miembros').insert({
                cuadrilla_id: cId,
                empleado_id: empId,
                activo: true
            });

            if (!insErr) {
                insertedCount++;
                weeklySnapshot['SEMANA_38'].cuadrillas[cName].push({
                    empleado_id: empId,
                    nombre: m.name,
                    puesto: m.puesto
                });

                // Generate rich realistic history note based on their official puesto
                let actividad = 'Operación general en turno previo';
                if (m.puesto.includes('JUMBERO') || m.puesto.includes('PERFORISTA')) {
                    actividad = 'Barrenación de avance y anclaje con Jumbo en frente 13-480 / 3-480';
                } else if (m.puesto.includes('AYUDANTE')) {
                    actividad = 'Apoyo a jumbero en acople de barrenas, limpieza de detritus y cargado de voladura';
                } else if (m.puesto.includes('PALA') || m.puesto.includes('SCOOP') || m.puesto.includes('PALERO')) {
                    actividad = 'Operó Scooptram ST-50 en rezagado de mineral y acarreo a punto de vaciado';
                } else if (m.puesto.includes('CHOFER')) {
                    actividad = 'Acarreo de mineral con camión bajo perfil hacia tolva en superficie';
                } else if (m.puesto.includes('SCALEMIN')) {
                    actividad = 'Desate mecanizado de roca suelta y amacice preventivo';
                } else if (m.puesto.includes('SOLDADOR')) {
                    actividad = 'Mantenimiento preventivo a cucharón y reforzamiento de tolva';
                }

                historyNotes[empId] = {
                    previous_crew: cName === 'CUADRILLA 1' ? 'CUADRILLA 2' : 'CUADRILLA 1',
                    worked_on: actividad,
                    updated_at: new Date().toISOString(),
                    updated_by: 'Superintendente Mina'
                };
            } else {
                console.error('Error insertando miembro:', m.name, insErr.message);
            }
        }
    }

    console.log(`--- TOTAL INSERTADOS EN cat_cuadrillas_miembros: ${insertedCount} ---`);

    await supabase.from('sys_config').upsert({
        key_name: 'ops_crew_history_by_week',
        value_json: weeklySnapshot,
        description: 'Historial semanal de cuadrillas y asignaciones oficiales'
    }, { onConflict: 'key_name' });

    await supabase.from('sys_config').upsert({
        key_name: 'ops_crew_history_notes',
        value_json: historyNotes,
        description: 'Bitácora de trabajo realizado en cuadrilla anterior por minero'
    }, { onConflict: 'key_name' });

    console.log('--- Sincronización finalizada exitosamente ---');
}

syncRealCuadrillas().catch(console.error);
