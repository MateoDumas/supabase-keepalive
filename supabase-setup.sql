-- 1. Crear tabla keepalive (Estrategia Principal)
CREATE TABLE IF NOT EXISTS keepalive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message TEXT
);

-- 2. Crear función RPC ping (Estrategia Fallback 1)
CREATE OR REPLACE FUNCTION ping()
RETURNS TEXT AS $$
BEGIN
  RETURN 'pong';
END;
$$ LANGUAGE plpgsql;

-- 3. Habilitar RLS (Seguridad)
-- Por defecto la tabla es accesible con la anon key si no se definen políticas estrictas, 
-- pero para este bot de mantenimiento usualmente se usa el cliente de Supabase con la anon key.
-- Si tienes RLS activado, asegúrate de tener una política que permita el acceso.
ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

-- Política simple para permitir que cualquiera con la anon key pueda insertar y seleccionar
CREATE POLICY "Permitir acceso anónimo para mantenimiento" 
ON keepalive FOR ALL 
USING (true) 
WITH CHECK (true);
