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

// 4. Estrategias de Ping (Función que crea las estrategias para un cliente específico)
const getStrategies = (supabase) => [
  {
    name: 'Estrategia 1: SELECT keepalive',
    execute: async () => {
      const { data, error } = await supabase
        .from('keepalive')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return { success: true, message: 'SELECT ejecutado correctamente' };
    }
  },
  {
    name: 'Estrategia 2: Función RPC ping()',
    execute: async () => {
      const { data, error } = await supabase.rpc('ping');
      
      if (error) throw error;
      return { success: true, message: `RPC ping() respondió: ${data}` };
    }
  },
  {
    name: 'Estrategia 3: INSERT keepalive',
    execute: async () => {
      const { data, error } = await supabase
        .from('keepalive')
        .insert([{ message: `Ping automático - ${new Date().toISOString()}` }])
        .select();
      
      if (error) throw error;
      return { success: true, message: 'INSERT ejecutado correctamente (Escritura generada)' };
    }
  }
];

// 5. Función principal para un solo proyecto
async function pingSingleProject(project) {
  const { url, key, name } = project;
  const projectName = name || url;
  
  console.log(`\n🔄 Iniciando Keep-Alive para: ${projectName}`);
  const supabase = createClient(url, key, {
    realtime: {
      transport: ws,
    },
  });
  const strategies = getStrategies(supabase);
  
  let success = false;

  for (const strategy of strategies) {
    try {
      console.log(`🚀 Intentando ${strategy.name}...`);
      const result = await strategy.execute();
      
      if (result.success) {
        console.log(`✅ Éxito: ${result.message}`);
        success = true;
        break;
      }
    } catch (error) {
      console.log(`⚠️ ${strategy.name} falló.`);
      console.log(`   Detalle: ${error.message || error}`);
    }
  }

  return success;
}

// 6. Función principal que orquestra todo
async function main() {
  console.log('🚀 INICIANDO BOT SUPABASE KEEP-ALIVE');
  console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
  console.log(`📂 Proyectos detectados: ${projects.length}`);

  let allSuccess = true;
  const results = [];

  for (const project of projects) {
    const success = await pingSingleProject(project);
    results.push({ project: project.name || project.url, success });
    if (!success) allSuccess = false;
  }

  console.log('\n--- RESUMEN FINAL ---');
  results.forEach(res => {
    console.log(`${res.success ? '✅' : '❌'} ${res.project}`);
  });

  if (allSuccess) {
    console.log('\n🎯 Todos los proyectos están activos y refrescados.');
    process.exit(0);
  } else {
    console.error('\n❌ Error: Uno o más proyectos han fallado.');
    process.exit(1);
  }
}

// Ejecutar
main();
