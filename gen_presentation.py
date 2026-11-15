
html = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RAYA MINA - Presentacion Ejecutiva 2025</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,sans-serif;background:#0a0f1a;color:#e2e8f0;line-height:1.6}
.slide{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:60px 80px;position:relative;overflow:hidden}
.slide-alt{background:linear-gradient(135deg,#0f172a 0%,#1a2540 100%)}
.accent{color:#f59e0b}
.badge{display:inline-block;background:#f59e0b22;border:1px solid #f59e0b55;color:#f59e0b;padding:5px 16px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.15em}
h1{font-size:clamp(2.5rem,6vw,5rem);font-weight:900;line-height:1.05;margin-bottom:24px}
h2{font-size:clamp(1.8rem,3.5vw,3rem);font-weight:800;margin-bottom:20px}
h3{font-size:1.2rem;font-weight:700;color:#f59e0b;margin-bottom:10px}
p.lead{color:#94a3b8;font-size:1.05rem;max-width:800px;margin-bottom:16px}
.grid{display:grid;gap:20px}
.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.card{background:#1e293b66;border:1px solid #334155;border-radius:16px;padding:24px;transition:.2s}
.card:hover{border-color:#f59e0b33;transform:translateY(-2px)}
.kpi{text-align:center}
.kpi .num{font-size:2.8rem;font-weight:900;color:#f59e0b;line-height:1}
.kpi .lbl{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-top:6px}
.tag{display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:5px 12px;font-size:.82rem;margin:3px;color:#cbd5e1}
.hero-grad{background:linear-gradient(135deg,#fff 30%,#f59e0b 70%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cover-glow{position:absolute;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -10%,#f59e0b1a,transparent);pointer-events:none}
.side-glow{position:absolute;top:-100px;right:-200px;width:700px;height:700px;background:radial-gradient(circle,#f59e0b09,transparent 70%);border-radius:50%;pointer-events:none}
.line{height:3px;width:60px;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:2px;margin:16px 0 28px}
.sl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#475569;margin-bottom:6px}
ul.fl{list-style:none}
ul.fl li{padding:7px 0;border-bottom:1px solid #1e293b;color:#94a3b8;font-size:.92rem}
ul.fl li:last-child{border:none}
ul.fl li::before{content:"→ ";color:#f59e0b;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th{background:#1e293b;color:#64748b;text-transform:uppercase;font-size:.72rem;letter-spacing:.1em;padding:10px 14px;text-align:left}
td{padding:10px 14px;border-bottom:1px solid #1e293b33;color:#cbd5e1}
tr:hover td{background:#1e293b44}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:30px;padding:8px 16px;font-size:.82rem;margin:4px;font-weight:600}
.pa{background:#f59e0b11;border:1px solid #f59e0b44;color:#f59e0b}
.pb{background:#3b82f611;border:1px solid #3b82f644;color:#60a5fa}
.pc{background:#10b98111;border:1px solid #10b98144;color:#34d399}
.pd{background:#8b5cf611;border:1px solid #8b5cf644;color:#c084fc}
.hr{border:none;border-top:1px solid #1e293b;margin:32px 0}
@media print{.slide{page-break-after:always;min-height:auto}}
</style>
</head>
<body>

<!-- 1. PORTADA -->
<div class="slide" style="align-items:center;text-align:center;background:linear-gradient(160deg,#080d18 0%,#0f172a 60%,#0a1628 100%)">
<div class="cover-glow"></div>
<div class="side-glow"></div>
<div class="badge" style="margin-bottom:36px">&#9889; Presentacion Ejecutiva &nbsp;|&nbsp; 2025</div>
<h1 class="hero-grad" style="font-size:clamp(4rem,10vw,8rem);letter-spacing:-.04em;margin-bottom:8px">RAYA MINA</h1>
<p style="font-size:1.4rem;color:#475569;letter-spacing:.1em;margin-bottom:40px">SISTEMA INTEGRAL DE OPERACIONES MINERAS</p>
<div style="height:2px;width:160px;background:linear-gradient(90deg,#f59e0b,#ef4444);margin:0 auto 48px;border-radius:2px"></div>
<div class="grid g4" style="max-width:720px;margin:0 auto 56px">
<div class="kpi"><div class="num">2</div><div class="lbl">Plataformas</div></div>
<div class="kpi"><div class="num">12+</div><div class="lbl">Modulos</div></div>
<div class="kpi"><div class="num" style="font-size:2rem">Real</div><div class="lbl">Tiempo Real</div></div>
<div class="kpi"><div class="num">100%</div><div class="lbl">Digital</div></div>
</div>
<div>
<span class="pill pa">&#9654; App Web Ejecutiva</span>
<span class="pill pc">&#9654; App Android Campo</span>
<span class="pill pb">&#9654; Sincronizacion Nube</span>
<span class="pill pd">&#9654; Nomina Automatica</span>
</div>
<div style="margin-top:64px;color:#1e293b;font-size:.85rem">Desarrollado por <span style="color:#f59e0b;font-weight:700">Sistemas Kitus</span> &nbsp;|&nbsp; Confidencial &nbsp;|&nbsp; 2025</div>
</div>

<!-- 2. QUIEN LO CREO -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Acerca del Creador</div>
<div class="line"></div>
<h2>Quien Creo <span class="accent">RAYA MINA</span></h2>
<p class="lead">Un sistema nacido de la necesidad real de digitalizar por completo las operaciones mineras, eliminando el papel, los Excel manuales y los errores de transcripcion.</p>
<div class="grid g2" style="margin-top:40px;max-width:960px">
<div class="card" style="border-color:#f59e0b33">
<div style="font-size:2.2rem;margin-bottom:14px">&#128187;</div>
<h3>Sistemas Kitus</h3>
<p style="color:#94a3b8;font-size:.95rem">Empresa mexicana de desarrollo de software especializada en soluciones para la industria minera y de construccion. Expertos en sistemas de control operativo, nomina electronica y analisis de datos en tiempo real.</p>
<div style="margin-top:16px">
<span class="tag">Next.js 14</span><span class="tag">TypeScript</span><span class="tag">Supabase</span>
<span class="tag">PostgreSQL</span><span class="tag">Android</span><span class="tag">Recharts</span>
</div>
</div>
<div class="card">
<div style="font-size:2.2rem;margin-bottom:14px">&#9935;</div>
<h3>El Proyecto</h3>
<p style="color:#94a3b8;font-size:.95rem">RAYA MINA es el resultado de meses de trabajo co-diseñado con jefes de mina y supervisores reales. Cada funcionalidad resuelve un problema operativo especifico que se vivia en el dia a dia de las operaciones.</p>
<ul class="fl" style="margin-top:16px">
<li>Co-disenado con operadores reales</li>
<li>Iterado en campo para garantizar usabilidad</li>
<li>Arquitectura escalable multi-empresa</li>
<li>Seguridad de nivel empresarial (RLS + JWT)</li>
</ul>
</div>
</div>
<hr class="hr">
<div class="grid g4" style="max-width:900px">
<div class="kpi card"><div class="num">2025</div><div class="lbl">Lanzamiento</div></div>
<div class="kpi card"><div class="num" style="font-size:1.6rem">Cloud</div><div class="lbl">Infraestructura</div></div>
<div class="kpi card"><div class="num" style="font-size:1.6rem">MX</div><div class="lbl">Hecho en Mexico</div></div>
<div class="kpi card"><div class="num">24/7</div><div class="lbl">Disponibilidad</div></div>
</div>
</div>

<!-- 3. QUE ES / INTRODUCCION -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Introduccion</div>
<div class="line"></div>
<h2>&#9889; Que es <span class="accent">RAYA MINA</span></h2>
<p class="lead" style="font-size:1.15rem">Un ecosistema digital completo que conecta la operacion de campo con la administracion central, en tiempo real. Reemplaza hojas de calculo, formatos en papel y procesos manuales que generan errores, retrasos y perdidas economicas.</p>
<div class="grid g3" style="margin-top:40px">
<div class="card" style="border-color:#f59e0b44">
<div style="font-size:2rem;margin-bottom:12px">&#127760;</div>
<h3>App Web (Dashboard)</h3>
<p style="color:#94a3b8;font-size:.9rem">Panel ejecutivo accesible desde cualquier navegador moderno. Gestion completa de catalogos, personal, operaciones, reportes y nomina con interfaz oscura y moderna.</p>
</div>
<div class="card" style="border-color:#10b98144">
<div style="font-size:2rem;margin-bottom:12px">&#128241;</div>
<h3>App Android (Campo)</h3>
<p style="color:#94a3b8;font-size:.9rem">Aplicacion movil para supervisores y operadores en campo. Reportes diarios de asistencia y produccion directamente desde el telefono, sin papel.</p>
</div>
<div class="card" style="border-color:#3b82f644">
<div style="font-size:2rem;margin-bottom:12px">&#9729;</div>
<h3>Nube Centralizada</h3>
<p style="color:#94a3b8;font-size:.9rem">Todo sincronizado en tiempo real. Los datos capturados en campo aparecen al instante en el dashboard ejecutivo. Cero latencia, cero duplicacion.</p>
</div>
</div>
<div style="margin-top:36px;padding:20px 28px;background:#f59e0b0d;border:1px solid #f59e0b33;border-radius:14px;max-width:800px">
<strong style="color:#f59e0b;font-size:1.05rem">&#128161; Propuesta de Valor:</strong>
<span style="color:#94a3b8;margin-left:12px">Del pase de lista en campo al calculo de nomina con destajos, todo en un solo sistema integrado. Sin papel, sin Excel manual, sin errores de transcripcion.</span>
</div>
</div>

<!-- 4. COMO FUNCIONA -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Arquitectura</div>
<div class="line"></div>
<h2>Como <span class="accent">Funciona</span> el Sistema</h2>
<div class="grid g4" style="margin-top:40px">
<div class="card" style="text-align:center;border-color:#f59e0b44">
<div style="font-size:2.5rem;margin-bottom:12px">&#128241;</div>
<h3 style="font-size:.95rem">1. CAMPO</h3>
<p style="color:#94a3b8;font-size:.85rem">Supervisor registra asistencia y produccion desde Android en la mina, sin conexion si es necesario.</p>
</div>
<div class="card" style="text-align:center;border-color:#3b82f644">
<div style="font-size:2.5rem;margin-bottom:12px">&#9729;</div>
<h3 style="font-size:.95rem">2. SINCRONIZACION</h3>
<p style="color:#94a3b8;font-size:.85rem">Los datos viajan de forma segura y cifrada a la base de datos central en la nube (Supabase).</p>
</div>
<div class="card" style="text-align:center;border-color:#10b98144">
<div style="font-size:2.5rem;margin-bottom:12px">&#128202;</div>
<h3 style="font-size:.95rem">3. ANALISIS</h3>
<p style="color:#94a3b8;font-size:.85rem">Jefes y administracion visualizan KPIs, graficas y pueden aprobar o solicitar correccion de reportes.</p>
</div>
<div class="card" style="text-align:center;border-color:#8b5cf644">
<div style="font-size:2.5rem;margin-bottom:12px">&#128200;</div>
<h3 style="font-size:.95rem">4. NOMINA</h3>
<p style="color:#94a3b8;font-size:.85rem">El sistema calcula automaticamente sueldos fijos y destajos. Exportacion a Excel profesional con un click.</p>
</div>
</div>
<hr class="hr">
<div class="grid g2" style="max-width:960px">
<div>
<h3 style="color:#64748b;font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px">Stack Tecnologico</h3>
<div>
<span class="tag">Next.js 14 (React)</span><span class="tag">TypeScript</span><span class="tag">Supabase + PostgreSQL</span>
<span class="tag">Framer Motion</span><span class="tag">Recharts</span><span class="tag">xlsx-js-style</span>
<span class="tag">Android Nativo</span><span class="tag">Row Level Security</span><span class="tag">JWT Auth</span>
</div>
</div>
<div>
<h3 style="color:#64748b;font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px">Seguridad</h3>
<div>
<span class="tag">SSL/TLS Cifrado</span><span class="tag">RLS PostgreSQL</span><span class="tag">Tokens JWT</span>
<span class="tag">Magic Link Admin</span><span class="tag">Control de Rutas</span><span class="tag">Permisos Granulares</span>
</div>
</div>
</div>
</div>

<!-- 5. USUARIOS Y ROLES -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Gestion de Usuarios</div>
<div class="line"></div>
<h2>Usuarios y <span class="accent">Roles del Sistema</span></h2>
<p class="lead">RAYA MINA implementa un sistema de control de acceso por roles jerarquicos. Cada usuario ve y puede hacer unicamente lo que le corresponde a su funcion.</p>
<div class="grid g2" style="margin-top:36px;max-width:1000px">
<div class="card" style="border-color:#f59e0b44">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
<div style="background:#f59e0b22;padding:12px;border-radius:12px;font-size:1.5rem">&#128081;</div>
<h3 style="color:#f59e0b;margin:0;font-size:1.1rem">Super Admin</h3>
</div>
<ul class="fl">
<li>Acceso total a todos los modulos</li>
<li>Gestion de usuarios y permisos del sistema</li>
<li>Configuracion de parametros globales</li>
<li>Login seguro por Magic Link (Supabase Auth)</li>
<li>Control de visiones por usuario</li>
</ul>
</div>
<div class="card" style="border-color:#8b5cf644">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
<div style="background:#8b5cf622;padding:12px;border-radius:12px;font-size:1.5rem">&#128737;</div>
<h3 style="color:#c084fc;margin:0;font-size:1.1rem">Jefe de Mina</h3>
</div>
<ul class="fl">
<li>Acceso a reportes de su unidad</li>
<li>Aprobacion o rechazo de reportes diarios</li>
<li>Visualizacion de KPIs de produccion</li>
<li>Login con contrasena manual</li>
<li>Vistas restringidas a su mina asignada</li>
</ul>
</div>
<div class="card" style="border-color:#0ea5e944">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
<div style="background:#0ea5e922;padding:12px;border-radius:12px;font-size:1.5rem">&#128274;</div>
<h3 style="color:#38bdf8;margin:0;font-size:1.1rem">Supervisor</h3>
</div>
<ul class="fl">
<li>Registro de asistencia diaria de su cuadrilla</li>
<li>Captura de produccion por frente y turno</li>
<li>Envio de reportes para revision del jefe</li>
<li>Gestion de su cuadrilla de trabajo</li>
<li>Acceso via app Android en campo</li>
</ul>
</div>
<div class="card" style="border-color:#10b98144">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
<div style="background:#10b98122;padding:12px;border-radius:12px;font-size:1.5rem">&#128100;</div>
<h3 style="color:#34d399;margin:0;font-size:1.1rem">Rol Lectura</h3>
</div>
<ul class="fl">
<li>Consulta de reportes y estadisticas</li>
<li>Sin capacidad de edicion ni creacion</li>
<li>Sin acceso a nomina ni configuracion</li>
<li>Ideal para auditoria y alta gerencia</li>
<li>Vista de operaciones en tiempo real</li>
</ul>
</div>
</div>
</div>

<!-- 6. VISIONES / PERMISOS -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Control de Acceso</div>
<div class="line"></div>
<h2>Visiones: <span class="accent">Permisos Dinamicos</span></h2>
<p class="lead">El Super Admin controla visualmente que modulos puede ver cada usuario del sistema, sin necesidad de programar ni tocar codigo.</p>
<div class="grid g2" style="margin-top:36px;max-width:960px">
<div>
<div class="card" style="margin-bottom:20px">
<h3>&#128295; Como Funciona</h3>
<ul class="fl">
<li>El Admin selecciona al usuario a configurar</li>
<li>Activa o desactiva cada vision con un toggle</li>
<li>Los cambios aplican de forma inmediata</li>
<li>El menu lateral se adapta automaticamente</li>
<li>Accesos por URL directa tambien bloqueados</li>
<li>Front-end y back-end protegidos</li>
</ul>
</div>
<div class="card" style="background:#16a34a0d;border-color:#16a34a44">
<h3 style="color:#4ade80">&#128737; Ventaja de Seguridad</h3>
<p style="color:#94a3b8;font-size:.9rem">Cada usuario accede SOLO a lo que necesita. Sin configurar servidores ni perfiles complejos. Toda la logica de permisos se gestiona desde la interfaz grafica.</p>
</div>
</div>
<div>
<h3 style="color:#64748b;font-size:.85rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:16px">Modulos Configurables por Usuario</h3>
<div>
<span class="tag">&#128202; Dashboard</span>
<span class="tag">&#128218; Catalogos</span>
<span class="tag">&#128119; Empleados</span>
<span class="tag">&#128197; Reportes Diarios</span>
<span class="tag">&#128336; Semana en Curso</span>
<span class="tag">&#128176; Pre-Nomina</span>
<span class="tag">&#128295; Configuracion</span>
<span class="tag">&#128101; Usuarios</span>
<span class="tag">&#128737; Visiones</span>
<span class="tag">&#128172; Chat</span>
<span class="tag">&#128100; Perfil</span>
</div>
<div class="card kpi" style="margin-top:24px">
<div class="num">11+</div>
<div class="lbl">Vistas Configurables Independientemente</div>
</div>
</div>
</div>
</div>

<!-- 7. DASHBOARD -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Centro de Comando</div>
<div class="line"></div>
<h2>Dashboard <span class="accent">Ejecutivo en Tiempo Real</span></h2>
<p class="lead">El corazon del sistema. KPIs de production, graficas interactivas, feed en vivo y ranking de operadores. Todo actualizado automaticamente sin recargar la pagina.</p>
<div class="grid g4" style="margin-top:32px">
<div class="card kpi"><div class="num" style="font-size:1.8rem">&#128200;</div><div class="lbl" style="margin-top:8px">Produccion Semanal</div></div>
<div class="card kpi"><div class="num" style="font-size:1.8rem">&#128336;</div><div class="lbl" style="margin-top:8px">Eficiencia Global</div></div>
<div class="card kpi"><div class="num" style="font-size:1.8rem">&#9888;</div><div class="lbl" style="margin-top:8px">Alertas Activas</div></div>
<div class="card kpi"><div class="num" style="font-size:1.8rem">&#128101;</div><div class="lbl" style="margin-top:8px">Personal Total</div></div>
</div>
<div class="grid g2" style="margin-top:24px;max-width:1000px">
<div class="card">
<h3>Filtros por Categoria de Operacion</h3>
<ul class="fl">
<li><strong style="color:#e2e8f0">General</strong> — vision global de toda la operacion</li>
<li><strong style="color:#e2e8f0">Perforacion</strong> — metros Jumbo, Jackleg, frentes listos</li>
<li><strong style="color:#e2e8f0">Obra Civil</strong> — avance, anclajes, concreto lanzado</li>
<li><strong style="color:#e2e8f0">Flete / Acarreo</strong> — toneladas, viajes, tiempo de ciclo</li>
</ul>
</div>
<div class="card">
<h3>Graficos y Visualizaciones</h3>
<ul class="fl">
<li>Barras: Produccion diaria vs Meta (ultimos 7 dias)</li>
<li>Dona: Distribucion por estado de reportes</li>
<li>Feed en vivo: Avances por producto y mina</li>
<li>Ranking Top 5 operadores de la semana</li>
</ul>
</div>
</div>
<div style="margin-top:20px">
<span class="pill pa">Exportar PDF Gerencial</span>
<span class="pill pb">Datos en Tiempo Real</span>
<span class="pill pc">Animaciones Fluidas</span>
<span class="pill pd">Responsive (Movil/PC)</span>
</div>
</div>

<!-- 8. CATALOGOS -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Catalogos Maestros</div>
<div class="line"></div>
<h2>Administracion de <span class="accent">Catalogos del Sistema</span></h2>
<p class="lead">Los datos fundamentales del sistema se gestionan de forma centralizada. Alta, edicion y desactivacion con interfaz visual. Ningun registro se elimina permanentemente.</p>
<div class="grid g2" style="margin-top:32px;max-width:1100px">
<div>
<h3 style="color:#64748b;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px">Organizacion y Estructura</h3>
<table>
<thead><tr><th>Catalogo</th><th>Descripcion</th></tr></thead>
<tbody>
<tr><td>&#127970; Empresas</td><td>Razones sociales y contratistas</td></tr>
<tr><td>&#127968; Unidades Mineras</td><td>Centros de costo (ej. Charcas, San Martin)</td></tr>
<tr><td>&#9935; Minas</td><td>Yacimientos dentro de cada unidad</td></tr>
<tr><td>&#128205; Ubicaciones / Frentes</td><td>Frentes de trabajo, rampas, accesos</td></tr>
<tr><td>&#128101; Puestos y Roles</td><td>Estructura organizacional + splits de pago</td></tr>
<tr><td>&#128336; Turnos Operativos</td><td>1RA, 2DA, 3RA turno y estado activo</td></tr>
<tr><td>&#128119; Cuadrillas</td><td>Equipos de trabajo y asignacion de personal</td></tr>
<tr><td>&#128197; Tipos de Asistencia</td><td>Incidencias, faltas y justificaciones</td></tr>
</tbody>
</table>
</div>
<div>
<h3 style="color:#64748b;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px">Operacion y Finanzas</h3>
<table>
<thead><tr><th>Catalogo</th><th>Descripcion</th></tr></thead>
<tbody>
<tr><td>&#128665; Flota de Equipos</td><td>Jumbos, Scoops, Jacklegs, Vehiculos auxiliares</td></tr>
<tr><td>&#128270; Conceptos de Mina</td><td>Estandares de barenacion, fletes, servicios</td></tr>
<tr><td>&#128176; Conceptos de Nomina</td><td>Tarifas, mapeo de actividades y bonificaciones</td></tr>
</tbody>
</table>
<br>
<h3 style="color:#64748b;font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px">Funcionalidades de cada Catalogo</h3>
<div>
<span class="tag">&#10003; Alta de registros</span>
<span class="tag">&#10003; Edicion inline</span>
<span class="tag">&#10003; Desactivacion (no borrado)</span>
<span class="tag">&#10003; Integridad historica</span>
<span class="tag">&#10003; Validacion en tiempo real</span>
<span class="tag">&#10003; Interfaz con cards/tablas</span>
</div>
</div>
</div>
</div>

<!-- 9. EMPLEADOS -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Gestion de Personal</div>
<div class="line"></div>
<h2>Directorio de <span class="accent">Empleados</span></h2>
<p class="lead">Control completo del personal operativo. Cada empleado tiene un expediente digital con su puesto, jerarquia, unidad, cuadrilla y rol operativo de campo.</p>
<div class="grid g2" style="margin-top:32px;max-width:1000px">
<div class="card">
<h3>&#128193; Informacion del Empleado</h3>
<ul class="fl">
<li>Nombre completo y codigo unico de empleado</li>
<li>Puesto oficial con tipo de personal (Operativo/Staff)</li>
<li>Unidad minera y mina especifica asignada</li>
<li>Estado: Activo / Inactivo (Baja)</li>
<li>Cuadrilla actual con historial de cambios</li>
<li>Sueldo diario base para nomina</li>
</ul>
</div>
<div class="card">
<h3>&#128737; Jerarquia de Mando</h3>
<ul class="fl">
<li>Jefe de Mina — badge purpura en directorio</li>
<li>Supervisor de Cuadrilla — badge amarillo</li>
<li>Jefe de Area — badge azul</li>
<li>Validacion: si es mando, requiere unidad asignada</li>
<li>Bloqueo de BD ante violaciones de jerarquia</li>
</ul>
</div>
<div class="card">
<h3>&#128296; Formulario Inteligente</h3>
<ul class="fl">
<li>Minas se filtran segun la unidad elegida</li>
<li>Roles disponibles filtrados por matriz Puesto-Rol</li>
<li>Validacion de campos obligatorios en vivo</li>
<li>Detecion de codigos de empleado duplicados</li>
</ul>
</div>
<div class="card">
<h3>&#128119; Gestion de Cuadrillas</h3>
<ul class="fl">
<li>Asignacion y cambio de cuadrilla desde el perfil</li>
<li>Historial con fecha de inicio y fecha de baja</li>
<li>Membresia activa visible en la tabla principal</li>
<li>Al cambiar, cierra asignacion anterior automaticamente</li>
</ul>
</div>
</div>
</div>

<!-- 10. OPERACION -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Operacion Diaria</div>
<div class="line"></div>
<h2>Reportes Diarios de <span class="accent">Operacion</span></h2>
<p class="lead">El modulo central de captura de campo. Los supervisores registran asistencias, produccion por frente y participacion del personal desde su dispositivo Android o PC.</p>
<div class="grid g3" style="margin-top:32px">
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#128197;</div>
<h3>Pase de Lista Diario</h3>
<ul class="fl">
<li>Asistencia por empleado y turno</li>
<li>Tipos: Asistencia, Falta, Incapacidad, Vacaciones, Suspension</li>
<li>Captura por fecha y mina especifica</li>
<li>Registro del personal que opera ese dia</li>
</ul>
</div>
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#9935;</div>
<h3>Produccion de Campo</h3>
<ul class="fl">
<li>Productos por frente/ubicacion especifica</li>
<li>Cantidad producida con unidad de medida</li>
<li>Participacion por operador (porcentajes)</li>
<li>Multiples items por reporte</li>
</ul>
</div>
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#128200;</div>
<h3>Flujo de Aprobacion</h3>
<ul class="fl">
<li>BORRADOR → captura inicial en campo</li>
<li>EN REVISION → enviado al jefe de mina</li>
<li>CORRECCION SOLICITADA → devuelto al super.</li>
<li>APROBADO → listo para cierre de semana</li>
</ul>
</div>
</div>
<div class="grid g2" style="margin-top:24px;max-width:1000px">
<div class="card" style="background:#10b9810d;border-color:#10b98144">
<h3 style="color:#34d399">&#128337; Semana en Curso</h3>
<p style="color:#94a3b8;font-size:.9rem">Agrupa reportes aprobados en una semana operativa. El sistema valida el rango de dias configurado. Permite ver historico de semanas anteriores y liberar reportes si es necesario.</p>
</div>
<div class="card" style="background:#3b82f60d;border-color:#3b82f644">
<h3 style="color:#60a5fa">&#128196; Historico de Reportes</h3>
<p style="color:#94a3b8;font-size:.9rem">Consulta de todos los reportes pasados con filtros por status. Separacion clara entre reportes libres y los ya empaquetados en una semana operativa.</p>
</div>
</div>
</div>

<!-- 11. NOMINA -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Pre-Nomina Operativa</div>
<div class="line"></div>
<h2>Calculo Automatico de <span class="accent">Nomina</span></h2>
<p class="lead">El sistema calcula automaticamente sueldos fijos y destajos para cada empleado operativo, directamente de los reportes de la semana. Cero calculos manuales en Excel.</p>
<div class="grid g3" style="margin-top:32px">
<div class="card kpi">
<div class="num" style="color:#3b82f6;font-size:1.6rem">&#128176;</div>
<div class="lbl" style="margin-top:10px">Sueldo Fijo</div>
<p style="font-size:.82rem;color:#64748b;margin-top:8px">Dias asistidos x sueldo diario base del empleado</p>
</div>
<div class="card kpi">
<div class="num" style="color:#f59e0b;font-size:1.6rem">&#128200;</div>
<div class="lbl" style="margin-top:10px">Destajos</div>
<p style="font-size:.82rem;color:#64748b;margin-top:8px">Produccion x tarifa x porcentaje de participacion</p>
</div>
<div class="card kpi">
<div class="num" style="color:#10b981;font-size:1.6rem">&#9989;</div>
<div class="lbl" style="margin-top:10px">Gran Total</div>
<p style="font-size:.82rem;color:#64748b;margin-top:8px">Suma consolidada ordenada de mayor a menor pago</p>
</div>
</div>
<div class="grid g2" style="margin-top:24px;max-width:1000px">
<div class="card">
<h3>&#128290; Logica de Calculo</h3>
<ul class="fl">
<li>Lee reportes aprobados de la semana seleccionada</li>
<li>Cruza asistencias con sueldo diario del empleado</li>
<li>Multiplica produccion por tarifa del producto</li>
<li>Aplica porcentaje de participacion individual</li>
<li>Filtra solo personal de tipo OPERATIVO</li>
<li>Resolucion de conflictos de asistencia por prioridad</li>
</ul>
</div>
<div class="card">
<h3>&#128196; Exportacion Profesional Excel</h3>
<ul class="fl">
<li>Columnas dinamicas de asistencia dia a dia (A/F/V/I/S)</li>
<li>Colores en celdas: verde=asistio, rojo=falta</li>
<li>Formato moneda profesional en todas las cifras</li>
<li>Gran Total destacado en verde por empleado</li>
<li>Desglose de destajos por concepto de mina</li>
<li>Nombre de archivo automatico por semana</li>
</ul>
</div>
</div>
</div>

<!-- 12. CONFIGURACION -->
<div class="slide slide-alt">
<div class="side-glow"></div>
<div class="sl">Administracion del Sistema</div>
<div class="line"></div>
<h2>Configuracion y <span class="accent">Parametros Globales</span></h2>
<div class="grid g3" style="margin-top:40px">
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#128197;</div>
<h3>Calendario Operativo</h3>
<ul class="fl">
<li>Define el dia de inicio de semana operativa</li>
<li>Configura rango minimo/maximo de dias para cierre</li>
<li>Diagnostico en tiempo real de semana actual</li>
<li>Numero de semana del ano automatico</li>
</ul>
</div>
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#128737;</div>
<h3>Gestion de Usuarios</h3>
<ul class="fl">
<li>Alta de usuarios del sistema</li>
<li>Asignacion de rol (Super Admin, Jefe, Supervisor, Lectura)</li>
<li>Login por contrasena o Magic Link</li>
<li>Solo usuarios creados por Admin pueden acceder</li>
</ul>
</div>
<div class="card">
<div style="font-size:1.8rem;margin-bottom:12px">&#128295;</div>
<h3>Visiones por Usuario</h3>
<ul class="fl">
<li>Activa o desactiva modulos por cada usuario</li>
<li>Cambios instantaneos sin reiniciar</li>
<li>Menu lateral se adapta automaticamente</li>
<li>Proteccion de rutas en front-end y back-end</li>
</ul>
</div>
</div>
<hr class="hr">
<div class="grid g4">
<div class="kpi card"><div class="num" style="font-size:1.5rem">RLS</div><div class="lbl">Row Level Security</div></div>
<div class="kpi card"><div class="num" style="font-size:1.5rem">JWT</div><div class="lbl">Tokens Seguros</div></div>
<div class="kpi card"><div class="num" style="font-size:1.5rem">SSL</div><div class="lbl">Conexion Cifrada</div></div>
<div class="kpi card"><div class="num" style="font-size:1.5rem">&#128203;</div><div class="lbl">Historial Completo</div></div>
</div>
</div>

<!-- 13. MAPA DEL SISTEMA -->
<div class="slide" style="background:linear-gradient(135deg,#0a0f1a,#0f172a)">
<div class="side-glow"></div>
<div class="sl">Mapa del Sistema</div>
<div class="line"></div>
<h2>Todos los <span class="accent">Modulos en un Vistazo</span></h2>
<div class="grid g2" style="margin-top:32px">
<div>
<div class="card" style="margin-bottom:16px">
<h3>&#128202; Dashboard Principal</h3>
<p style="color:#94a3b8;font-size:.88rem">Centro de Comando &bull; KPIs por categoria operativa &bull; Graficas de barras y dona &bull; Ranking operadores &bull; Feed de actividad en vivo &bull; Exportar PDF</p>
</div>
<div class="card" style="margin-bottom:16px">
<h3>&#128218; Catalogos Maestros (11 secciones)</h3>
<p style="color:#94a3b8;font-size:.88rem">Empresas &bull; Unidades &bull; Minas &bull; Ubicaciones &bull; Puestos &bull; Roles &bull; Turnos &bull; Cuadrillas &bull; Equipos &bull; Productos &bull; Asistencias</p>
</div>
<div class="card" style="margin-bottom:16px">
<h3>&#128119; Empleados</h3>
<p style="color:#94a3b8;font-size:.88rem">Directorio completo &bull; Alta y edicion &bull; Mandos y jerarquias &bull; Cuadrillas con historial &bull; Matriz Puesto-Rol &bull; Codigos unicos</p>
</div>
<div class="card">
<h3>&#9935; Operacion</h3>
<p style="color:#94a3b8;font-size:.88rem">Reportes Diarios &bull; Pase de Lista &bull; Produccion por frente &bull; Flujo de Aprobacion &bull; Semana en Curso &bull; Historico</p>
</div>
</div>
<div>
<div class="card" style="margin-bottom:16px">
<h3>&#128176; Pre-Nomina Operativa</h3>
<p style="color:#94a3b8;font-size:.88rem">Calculo automatico &bull; Sueldos fijos &bull; Destajos por producto &bull; Exportacion Excel profesional &bull; Tarifas configurables &bull; Gran Total</p>
</div>
<div class="card" style="margin-bottom:16px">
<h3>&#128295; Configuracion del Sistema</h3>
<p style="color:#94a3b8;font-size:.88rem">Calendario operativo &bull; Reglas de cierre de semana &bull; Gestion de usuarios &bull; Visiones dinamicas &bull; Seguridad avanzada</p>
</div>
<div class="card" style="margin-bottom:16px">
<h3>&#128241; App Android (Campo)</h3>
<p style="color:#94a3b8;font-size:.88rem">Pase de lista movil &bull; Captura de produccion en campo &bull; Envio de reportes &bull; Sincronizacion en tiempo real con la nube</p>
</div>
<div class="card">
<h3>&#128172; Chat / Mensajeria y Perfil</h3>
<p style="color:#94a3b8;font-size:.88rem">Canal de comunicacion interno entre usuarios del sistema &bull; Coordinacion de operaciones &bull; Perfil y configuracion personal</p>
</div>
</div>
</div>
</div>

<!-- 14. CIERRE / CTA -->
<div class="slide" style="align-items:center;text-align:center;background:linear-gradient(160deg,#080d18 0%,#0f172a 60%,#0a1628 100%)">
<div class="cover-glow"></div>
<div class="side-glow"></div>
<div class="badge" style="margin-bottom:36px">&#9889; Disponible Ahora</div>
<h2 style="font-size:clamp(2rem,5vw,3.8rem);max-width:800px;margin:0 auto 24px">Digitaliza tu Mina con <span class="accent">RAYA MINA</span></h2>
<div style="height:2px;width:100px;background:linear-gradient(90deg,#f59e0b,#ef4444);margin:0 auto 36px;border-radius:2px"></div>
<p style="font-size:1.1rem;max-width:650px;margin:0 auto 48px;color:#64748b">Del pase de lista en campo hasta el calculo de nomina con destajos. Web + Android. Tiempo real. Sin papel. Sin Excel manual. Sin errores.</p>
<div class="grid g3" style="max-width:750px;margin:0 auto 56px">
<div class="kpi card"><div class="num">&#9989;</div><div class="lbl" style="margin-top:8px">Lista para Produccion</div></div>
<div class="kpi card"><div class="num">&#128241;</div><div class="lbl" style="margin-top:8px">Web + Android</div></div>
<div class="kpi card"><div class="num">&#9729;</div><div class="lbl" style="margin-top:8px">Cloud 24/7</div></div>
</div>
<div style="margin-top:20px">
<div style="color:#334155;font-size:.85rem;margin-bottom:10px">Desarrollado con orgullo por</div>
<div style="font-size:2rem;font-weight:900;letter-spacing:.05em;color:#f59e0b">SISTEMAS KITUS</div>
<div style="color:#334155;font-size:.85rem;margin-top:12px">Innovacion Tecnologica para la Industria Minera &nbsp;&bull;&nbsp; Mexico &nbsp;&bull;&nbsp; 2025</div>
</div>
</div>

</body>
</html>"""

with open(r'C:\\Users\\Kitus100\\Desktop\\RAYA MINA\\raya-mina\\presentacion_rayamina.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Presentacion generada exitosamente!")
print("Archivo: presentacion_rayamina.html")
