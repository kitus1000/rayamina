-- MODIFICACIÓN DE EQUIPOS
-- Agregar columna uso_operativo para filtrar la flotilla
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ops_equipment' AND column_name = 'uso_operativo') THEN
        ALTER TABLE ops_equipment ADD COLUMN uso_operativo TEXT CHECK (uso_operativo IN ('PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL', 'NO_OPERATIVO', 'OTROS'));
    END IF;
END $$;

-- TABLA MAESTRA DE PRODUCTOS / CONCEPTOS
CREATE TABLE IF NOT EXISTS cat_productos_mina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL, -- 'PERFORACION', 'FLETE', 'SERVICIOS_OBRA_CIVIL'
    subcategoria TEXT NOT NULL, -- 'Desarrollo', 'Produccion', 'Carga', 'Obra Civil', etc.
    nombre TEXT NOT NULL,
    unidad_medida_default TEXT NOT NULL, -- 'M3', 'ML', 'TON', 'VIAJE', 'PZA', 'HR', 'TURNO'
    modo_captura TEXT DEFAULT 'DIRECTO', -- 'DIRECTO', 'CALCULADO'
    formula_cobro TEXT, -- 'l * w * h' (opcional, meramente informativo o para futuro parsing)
    requiere_maquina BOOLEAN DEFAULT FALSE,
    tipos_equipo_permitidos TEXT[], -- Array de strings: ['JUMBO', 'JACKLEG']
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLA DE VARIABLES DE CAPTURA (Dinámicas)
CREATE TABLE IF NOT EXISTS cat_producto_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID REFERENCES cat_productos_mina(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- 'Largo', 'Ancho', 'Tipo de Roca'
    clave TEXT NOT NULL, -- 'l', 'w', 'tipo_roca'
    tipo_input TEXT NOT NULL, -- 'NUMBER', 'TEXT', 'SELECT', 'BOOLEAN'
    opciones TEXT[], -- Para selects: ['8ft', '10ft', '12ft']
    unidad TEXT, -- 'm', 'ft', 'mm', 'pzas'
    orden INTEGER DEFAULT 0,
    requerido BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE cat_productos_mina ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_producto_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON cat_productos_mina FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON cat_productos_mina FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON cat_productos_mina FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON cat_productos_mina FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON cat_producto_variables FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON cat_producto_variables FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON cat_producto_variables FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON cat_producto_variables FOR DELETE USING (true);

-- SEED DATA (DATOS SEMILLA)

DO $$
DECLARE
    v_prod_id UUID;
BEGIN
    -- 1. PERFORACION - Barrenación Frente (Desarrollo)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Desarrollo', 'Barrenación de Frente', 'M', TRUE, ARRAY['JUMBO', 'JACKLEG'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Metros Perforados', 'metros', 'NUMBER', 'm', 1),
    (v_prod_id, 'Barrenos', 'barrenos', 'NUMBER', 'pzas', 2),
    (v_prod_id, 'Longitud', 'longitud', 'SELECT', 'ft', 3), -- Opciones se pueden manejar en UI o Array aqui
    (v_prod_id, 'Diámetro', 'diametro', 'SELECT', 'mm', 4),
    (v_prod_id, 'Tipo de Roca', 'tipo_roca', 'SELECT', NULL, 5);
    
    -- Actualizar opciones de longitud y diametro
    UPDATE cat_producto_variables SET opciones = ARRAY['8', '10', '12', '14', '16'] WHERE producto_id = v_prod_id AND clave = 'longitud';
    UPDATE cat_producto_variables SET opciones = ARRAY['32', '35', '38', '45', '51'] WHERE producto_id = v_prod_id AND clave = 'diametro';


    -- 2. PERFORACION - Producción (Longhole/Simba)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('PERFORACION', 'Produccion', 'Barrenación Longhole (Abanicos)', 'M', TRUE, ARRAY['SIMBA', 'LONGHOLE'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Metros Perforados', 'metros', 'NUMBER', 'm', 1),
    (v_prod_id, 'Angulo/Inclinación', 'angulo', 'NUMBER', '°', 2),
    (v_prod_id, 'Azimut', 'azimut', 'NUMBER', '°', 3);


    -- 3. FLETE - Acarreo Mineral
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, requiere_maquina, tipos_equipo_permitidos)
    VALUES ('FLETE', 'Carga', 'Acarreo de Mineral', 'TON', TRUE, ARRAY['SCOOP', 'CAMION'])
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Toneladas', 'toneladas', 'NUMBER', 'ton', 1),
    (v_prod_id, 'Viajes', 'viajes', 'NUMBER', 'viajes', 2),
    (v_prod_id, 'Origen', 'origen', 'TEXT', NULL, 3),
    (v_prod_id, 'Destino', 'destino', 'TEXT', NULL, 4);


    -- 4. SERVICIOS - Tubería (Directo con variables extra)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, requiere_maquina)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Servicios', 'Instalación Tubería de Agua', 'ML', 'DIRECTO', FALSE)
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Diámetro', 'diametro', 'SELECT', 'pulg', 1),
    (v_prod_id, 'Tipo Material', 'material', 'SELECT', NULL, 2);
    
    UPDATE cat_producto_variables SET opciones = ARRAY['2', '4', '6', '8'] WHERE producto_id = v_prod_id AND clave = 'diametro';
    UPDATE cat_producto_variables SET opciones = ARRAY['PVC', 'HDPE', 'Acero'] WHERE producto_id = v_prod_id AND clave = 'material';


    -- 5. OBRA CIVIL - Losa Concreto (Calculado)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, formula_cobro, requiere_maquina)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Obra Civil', 'Losa de Concreto', 'M3', 'CALCULADO', 'l * w * h', FALSE)
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Largo', 'l', 'NUMBER', 'm', 1),
    (v_prod_id, 'Ancho', 'w', 'NUMBER', 'm', 2),
    (v_prod_id, 'Espesor', 'h', 'NUMBER', 'm', 3);

    -- 6. OBRA CIVIL - Muro de Block (Calculado M2)
    INSERT INTO cat_productos_mina (categoria, subcategoria, nombre, unidad_medida_default, modo_captura, formula_cobro, requiere_maquina)
    VALUES ('SERVICIOS_OBRA_CIVIL', 'Obra Civil', 'Muro de Block', 'M2', 'CALCULADO', 'l * h', FALSE)
    RETURNING id INTO v_prod_id;

    INSERT INTO cat_producto_variables (producto_id, label, clave, tipo_input, unidad, orden) VALUES
    (v_prod_id, 'Largo', 'l', 'NUMBER', 'm', 1),
    (v_prod_id, 'Alto', 'h', 'NUMBER', 'm', 2);

END $$;
