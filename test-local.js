import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

// 1. Cargar variables de entorno (solo para desarrollo local)
dotenv.config();

// 2. Obtener proyectos (soporta uno solo o una lista en JSON)
const getProjects = () => {
  const projectsJson = process.env.SUPABASE_PROJECTS;
  
  if (projectsJson) {
    try {
      const parsed = JSON.parse(projectsJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('❌ Error: SUPABASE_PROJECTS no es un JSON válido');
      process.exit(1);
    }
  }

  const singleUrl = process.env.SUPABASE_URL;
  const singleKey = process.env.SUPABASE_ANON_KEY;

  if (singleUrl && singleKey) {
    return [{ url: singleUrl, key: singleKey, name: 'Proyecto Individual' }];
  }

  return [];
};

const projects = getProjects();

// 3. Validación de proyectos (early exit)
if (projects.length === 0) {
  console.error('❌ Error: No se encontraron proyectos. Configura SUPABASE_URL/SUPABASE_ANON_KEY o SUPABASE_PROJECTS (JSON)');
  process.exit(1);
}

// 4. Función de prueba para un proyecto
async function testProject(project) {
  const { url, key, name } = project;
  const projectName = name || url;
  
  console.log(`\n🔄 Probando proyecto: ${projectName}`);
  const supabase = createClient(url, key, {
    realtime: {
      transport: ws,
    },
  });
  
  try {
    // Probar la conexión básica
    console.log('🚀 Intentando conexión básica a Supabase...');
    const { data: healthData, error: healthError } = await supabase.from('keepalive').select('id').limit(1);
    
    if (healthError) {
      console.warn(`⚠️  Aviso: Error al consultar la tabla keepalive (${healthError.message})`);
      console.log('💡 Sugerencia: Asegúrate de ejecutar el SQL en supabase-setup.sql en este proyecto.');
    } else {
      console.log('✅ Conexión a tabla keepalive exitosa.');
    }

    // Probar RPC si existe
    console.log('🚀 Intentando RPC ping()...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('ping');
    
    if (rpcError) {
      console.warn(`⚠️  Aviso: Error al llamar RPC ping() (${rpcError.message})`);
      console.log('💡 Sugerencia: Asegúrate de ejecutar el SQL en supabase-setup.sql en este proyecto.');
    } else {
      console.log(`✅ RPC ping() exitoso: ${rpcData}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error crítico en la prueba: ${error.message || error}`);
    return false;
  }
}

// 5. Función principal
async function testAll() {
  console.log('🚀 INICIANDO PRUEBA DE TODOS LOS PROYECTOS');
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  
  let allOk = true;
  for (const project of projects) {
    const ok = await testProject(project);
    if (!ok) allOk = false;
  }

  if (allOk) {
    console.log('\n🎯 Prueba local finalizada con éxito para todos los proyectos.');
    process.exit(0);
  } else {
    console.error('\n❌ Hubo errores en algunos proyectos.');
    process.exit(1);
  }
}

// Ejecutar
testAll();
