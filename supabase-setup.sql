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
ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

-- 4. Dar permisos explícitos (Requerido por cambios de seguridad de Supabase 2026)
-- Esto permite que la API (supabase-js) pueda acceder a la tabla y función
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keepalive TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keepalive TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keepalive TO service_role;
GRANT EXECUTE ON FUNCTION public.ping TO anon;
GRANT EXECUTE ON FUNCTION public.ping TO authenticated;
GRANT EXECUTE ON FUNCTION public.ping TO service_role;

-- 5. Políticas de RLS
-- Borrar política si existe para evitar errores al re-ejecutar
DROP POLICY IF EXISTS "Permitir acceso anónimo para mantenimiento" ON keepalive;

-- Política simple para permitir que cualquiera con la anon key pueda insertar y seleccionar
CREATE POLICY "Permitir acceso anónimo para mantenimiento" 
ON keepalive FOR ALL 
USING (true) 
WITH CHECK (true);
