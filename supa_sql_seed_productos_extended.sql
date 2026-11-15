-- SCRIPT: SEED DATA EXTENDIDO - PRODUCTOS DE MINA
-- Carga 18 ejemplos (6 por categoría) para aprendizaje del usuario.

BEGIN;

-- Limpiar datos previos de prueba para evitar duplicados raros (opcional, pero recomendado para semilla limpia)
-- DELETE FROM cat_productos_mina; -- Descomentar si se quiere limpiar todo primero

DO $$
DECLARE
    v_prod_id UUID;
BEGIN

    -- =================================================================================================
    -- CATEGORÍA: PERFORACIÓN (6 Ejemplos)
    -- =================================================================================================

    -- 1. Barrenación de Frente (Desarrollo) - CLÁSICO
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Desarrollo', 'Barrenación de Frente', 'M', TRUE, ARRAY['JUMBO', 'JACKLEG'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Metros Perforados', 'metros', 'NUMBER', 'm', 1),
    (v_prod_id, 'Barrenos', 'barrenos', 'NUMBER', 'pzas', 2),
    (v_prod_id, 'Longitud Barra', 'longitud', 'SELECT', 'ft', 3),
    (v_prod_id, 'Diámetro Broca', 'diametro', 'SELECT', 'mm', 4);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['8', '10', '12', '14', '16'] WHERE producto_id = v_prod_id AND clave = 'longitud';
    UPDATE cat_producto_variables SET opciones = ARRAY['45', '51', '64'] WHERE producto_id = v_prod_id AND clave = 'diametro';

    -- 2. Barrenación de Banco (Producción) - MASIVO
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Producción', 'Barrenación de Banco (Simba)', 'M', TRUE, ARRAY['SIMBA', 'LONGHOLE'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Metros Totales', 'metros', 'NUMBER', 'm', 1),
    (v_prod_id, 'Anillos Perforados', 'anillos', 'NUMBER', 'pzas', 2),
    (v_prod_id, 'Inclinación Promedio', 'inclinacion', 'NUMBER', 'grados', 3);

    -- 3. Bolteo (Sostenimiento) - SEGURIDAD
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Sostenimiento', 'Instalación de Pernos (Bolting)', 'PZA', TRUE, ARRAY['BOLTER', 'JACKLEG'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Cantidad Pernos', 'cantidad', 'NUMBER', 'pzas', 1),
    (v_prod_id, 'Tipo Perno', 'tipo_perno', 'SELECT', NULL, 2),
    (v_prod_id, 'Largo Perno', 'largo', 'SELECT', 'ft', 3);

    UPDATE cat_producto_variables SET opciones = ARRAY['Split Set', 'Helicoidal', 'Cable'] WHERE producto_id = v_prod_id AND clave = 'tipo_perno';
    UPDATE cat_producto_variables SET opciones = ARRAY['6', '8', '10'] WHERE producto_id = v_prod_id AND clave = 'largo';

    -- 4. Barrenación de Chimenea (Infraestructura)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Infraestructura', 'Barrenación Chimenea (Alimak)', 'M', TRUE, ARRAY['ALIMAK', 'STOPPER'])
    RETURNING id INTO v_prod_id;
    
    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Avance Vertical', 'avance', 'NUMBER', 'm', 1);

    -- 5. Barrenación para Servicios (Obras Menores)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Servicios', 'Barrenación Sincros/Anclas', 'PZA', TRUE, ARRAY['JACKLEG', 'JUMBO'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Cantidad Anclas', 'cantidad', 'NUMBER', 'pzas', 1),
    (v_prod_id, 'Profundidad', 'profundidad', 'NUMBER', 'cm', 2);

    -- 6. Muestreo (Geología)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Exploración', 'Barrenación Diamantina', 'M', TRUE, ARRAY['DIAMANTINA'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Metros Recuperados', 'recuperacion', 'NUMBER', 'm', 1),
    (v_prod_id, 'Calidad Núcleo (RQD)', 'rqd', 'NUMBER', '%', 2);


    -- =================================================================================================
    -- CATEGORÍA: FLETE (6 Ejemplos)
    -- =================================================================================================

    -- 1. Acarreo Mineral (Producción)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Producción', 'Acarreo de Mineral a Planta', 'TON', TRUE, ARRAY['CAMION', 'DUMPER'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Toneladas', 'toneladas', 'NUMBER', 'ton', 1),
    (v_prod_id, 'Num. Viajes', 'viajes', 'NUMBER', '#', 2),
    (v_prod_id, 'Origen (Nivel)', 'origen', 'TEXT', NULL, 3);

    -- 2. Acarreo Estéril (Desarrollo)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Desarrollo', 'Acarreo de Estéril a Tepetatera', 'TON', TRUE, ARRAY['CAMION', 'SCOOP'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Toneladas Estimadas', 'toneladas', 'NUMBER', 'ton', 1),
    (v_prod_id, 'Viajes', 'viajes', 'NUMBER', '#', 2);

    -- 3. Rezaga Interior (Movimiento Local)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Interior Mina', 'Rezaga (Scoop)', 'VIAJE', TRUE, ARRAY['SCOOP'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Cucharas', 'cucharas', 'NUMBER', '#', 1),
    (v_prod_id, 'Distancia Aprox', 'distancia', 'SELECT', 'm', 2);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['<50m', '50-150m', '>150m'] WHERE producto_id = v_prod_id AND clave = 'distancia';

    -- 4. Transporte de Agua (Servicios)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Servicios', 'Viaje de Pipa de Agua', 'VIAJE', TRUE, ARRAY['PIPA', 'CAMION'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Litros', 'litros', 'NUMBER', 'L', 1),
    (v_prod_id, 'Destino', 'destino', 'TEXT', NULL, 2);

    -- 5. Transporte de Explosivos
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Logística', 'Transporte de Explosivos', 'VIAJE', TRUE, ARRAY['CAMIONETA', 'UTILITARIO'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Polvorín Origen', 'origen', 'TEXT', NULL, 1),
    (v_prod_id, 'Frente Destino', 'destino', 'TEXT', NULL, 2);

    -- 6. Retiro de Chatarra
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Limpieza', 'Retiro de Chatarra/Basura', 'VIAJE', TRUE, ARRAY['CAMION', 'PICKUP'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Tipo Material', 'material', 'SELECT', NULL, 1);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['Madera', 'Acero', 'Basura General'] WHERE producto_id = v_prod_id AND clave = 'material';


    -- =================================================================================================
    -- CATEGORÍA: SERVICIOS Y OBRA CIVIL (6 Ejemplos)
    -- =================================================================================================

    -- 1. Instalación Tubería (Servicios)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, tipos_equipo_permitidos)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Instalaciones', 'Instalación Tubería HDPE', 'ML', 'DIRECTO', ARRAY['UTILITARIO'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Diámetro', 'diametro', 'SELECT', 'pulg', 1),
    (v_prod_id, 'Termofusiones', 'uniones', 'NUMBER', '#', 2);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['2', '4', '6', '8', '12'] WHERE producto_id = v_prod_id AND clave = 'diametro';

    -- 2. Lanzado de Concreto (Sostenimiento)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, tipos_equipo_permitidos)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Obra Civil', 'Lanzado de Concreto (Shotcrete)', 'M3', 'CALCULADO', ARRAY['ROBOJET', 'MIXER'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Área Cubierta', 'area', 'NUMBER', 'm2', 1),
    (v_prod_id, 'Espesor Promedio', 'espesor', 'NUMBER', 'cm', 2),
    (v_prod_id, 'Tipo Mezcla', 'mezcla', 'SELECT', NULL, 3);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['Seca', 'Húmeda', 'Fibra'] WHERE producto_id = v_prod_id AND clave = 'mezcla';

    -- 3. Malla Electrosoldada
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Sostenimiento', 'Colocación Malla Electrosoldada', 'M2', 'DIRECTO')
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Rollos Usados', 'rollos', 'NUMBER', '#', 1),
    (v_prod_id, 'Placas Sujeción', 'placas', 'NUMBER', '#', 2);

    -- 4. Instalación Ventilador (Ventilación)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Ventilación', 'Instalación/Movimiento Ventilador', 'PZA', 'DIRECTO')
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Potencia', 'potencia', 'SELECT', 'HP', 1),
    (v_prod_id, 'Ubicación', 'ubicacion', 'TEXT', NULL, 2);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['50 HP', '75 HP', '100 HP', '150 HP'] WHERE producto_id = v_prod_id AND clave = 'potencia';

    -- 5. Construcción de Cuneta (Obra Civil)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, formula_cobro)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Obra Civil', 'Construcción de Cuneta', 'M3', 'CALCULADO', 'l * a * p')
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Longitud', 'l', 'NUMBER', 'm', 1),
    (v_prod_id, 'Ancho Promedio', 'a', 'NUMBER', 'm', 2),
    (v_prod_id, 'Profundidad', 'p', 'NUMBER', 'm', 3);

    -- 6. Bombeo de Agua (Servicios)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Servicios', 'Guardia de Bombeo', 'HRS', 'DIRECTO')
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Horas Operación', 'horas', 'NUMBER', 'hrs', 1),
    (v_prod_id, 'Nivel Agua Inicio', 'nivel_ini', 'NUMBER', '%', 2),
    (v_prod_id, 'Nivel Agua Fin', 'nivel_fin', 'NUMBER', '%', 3);

END $$;

NOTIFY pgrst, 'reload config';

COMMIT;
