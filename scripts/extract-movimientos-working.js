const fs = require('fs');
const path = require('path');

/**
 * Script final que funciona para extraer movimientos
 * Basado en el patrón que sí funciona
 */

function extractMovimientosWorking(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('ascii');
    
    const movimientos = [];
    
    // Buscar todas las colecciones de movimientos
    const movimientosMatches = content.match(/movimientos"[^"]*"/g);
    
    if (!movimientosMatches) {
      return [];
    }
    
    console.log(`    📋 Encontradas ${movimientosMatches.length} colecciones de movimientos`);
    
    movimientosMatches.forEach((match, collectionIndex) => {
      // Extraer el ID de la colección
      const collectionId = match.substring(12, match.length - 1);
      
      // Buscar la sección de esta colección
      const startIndex = content.indexOf(match);
      const nextMatch = movimientosMatches[collectionIndex + 1];
      
      let endIndex;
      if (nextMatch) {
        endIndex = content.indexOf(nextMatch);
      } else {
        // Buscar el siguiente patrón de colección
        const nextClientes = content.indexOf('clientes"', startIndex);
        const nextEnvios = content.indexOf('envios"', startIndex);
        const nextVentas = content.indexOf('ventas"', startIndex);
        
        const nextIndices = [nextClientes, nextEnvios, nextVentas]
          .filter(i => i > -1)
          .sort((a, b) => a - b);
        
        endIndex = nextIndices.length > 0 ? nextIndices[0] : content.length;
      }
      
      const collectionSection = content.substring(startIndex, endIndex);
      
      // Extraer movimientos individuales de esta colección
      const movimientosInCollection = extractMovimientosFromSectionWorking(collectionSection, collectionId);
      movimientos.push(...movimientosInCollection);
    });
    
    return movimientos;
    
  } catch (error) {
    console.log(`    ❌ Error parseando archivo: ${error.message}`);
    return [];
  }
}

function extractMovimientosFromSectionWorking(section, collectionId) {
  const movimientos = [];
  
  // Buscar todos los movimientos individuales por productoId
  // Usar el patrón que funciona: productoId[^a-zA-Z]*([a-zA-Z0-9]+)
  const productoIdPattern = /productoId[^a-zA-Z]*([a-zA-Z0-9]+)/gi;
  let productoIdMatch;
  let movimientoIndex = 0;
  
  while ((productoIdMatch = productoIdPattern.exec(section)) !== null) {
    const productoId = productoIdMatch[1].trim();
    
    // Crear movimiento básico
    const movimiento = {
      collectionId,
      movimientoIndex: movimientoIndex++,
      id: `${collectionId}-${movimientoIndex}`,
      productoId
    };
    
    // Buscar campos adicionales en el contexto cercano
    const startPos = Math.max(0, productoIdMatch.index - 500);
    const endPos = Math.min(section.length, productoIdMatch.index + 2000);
    const contextSection = section.substring(startPos, endPos);
    
    // Extraer campos del contexto con patrones que funcionan
    const fields = [
      { field: 'tipo', pattern: /tipo[^a-zA-Z]*([a-zA-Z]+)/i },
      { field: 'cantidad', pattern: /cantidad[^a-zA-Z]*([0-9]+)/i },
      { field: 'usuario', pattern: /usuario[^a-zA-Z]*([a-zA-Z0-9@\.]+)/i },
      { field: 'fecha', pattern: /fecha[^a-zA-Z]*([0-9TZ\-:\.]+)/i },
      { field: 'motivo', pattern: /motivo[^a-zA-Z]*([a-zA-Z0-9\s]+)/i },
      { field: 'observaciones', pattern: /observaciones[^a-zA-Z]*([a-zA-Z0-9\s]+)/i },
      { field: 'referencia', pattern: /referencia[^a-zA-Z]*([a-zA-Z0-9\s]+)/i },
      { field: 'referenciaId', pattern: /referenciaId[^a-zA-Z]*([a-zA-Z0-9]+)/i },
      { field: 'origen', pattern: /origen[^a-zA-Z]*([a-zA-Z0-9\s]+)/i },
      { field: 'modoAjuste', pattern: /modoAjuste[^a-zA-Z]*([a-zA-Z0-9\s]+)/i },
      { field: 'stockAntes', pattern: /stockAntes[^a-zA-Z]*([0-9]+)/i },
      { field: 'stockDelta', pattern: /stockDelta[^a-zA-Z]*([0-9\-]+)/i },
      { field: 'stockDespues', pattern: /stockDespues[^a-zA-Z]*([0-9]+)/i },
      { field: 'productoNombre', pattern: /productoNombre[^a-zA-Z]*([a-zA-Z0-9\sX\.]+)/i },
      { field: 'fechaCreacion', pattern: /fechaCreacion[^a-zA-Z]*([0-9TZ\-:\.]+)/i },
      { field: 'fechaActualizacion', pattern: /fechaActualizacion[^a-zA-Z]*([0-9TZ\-:\.]+)/i }
    ];
    
    fields.forEach(({ field, pattern }) => {
      const fieldMatch = contextSection.match(pattern);
      if (fieldMatch) {
        let value = fieldMatch[1].trim();
        
        // Limpiar el valor de manera más robusta
        value = value.replace(/[^\w\s\-\.\/\(\)@]/g, '');
        value = value.replace(/\s+/g, ' ').trim();
        
        // Convertir números si es posible
        if (!isNaN(value) && value !== '') {
          value = Number(value);
        }
        
        if (value !== '') {
          movimiento[field] = value;
        }
      }
    });
    
    // Solo agregar si tiene al menos un campo válido además del ID
    if (Object.keys(movimiento).length > 2) {
      movimientos.push(movimiento);
    }
  }
  
  return movimientos;
}

function extractAllMovimientosWorking() {
  const bucketPath = path.join(__dirname, '../public/bucket');
  const outputPath = path.join(__dirname, '../data');
  
  // Crear directorio de salida si no existe
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  try {
    // Leer todos los archivos de la carpeta bucket
    const files = fs.readdirSync(bucketPath);
    
    console.log(`📁 Encontrados ${files.length} archivos en bucket/`);
    
    const allMovimientos = [];
    const processedFiles = [];
    
    // Procesar solo los primeros 5 archivos para prueba
    const filesToProcess = files
      .filter(filename => filename.includes('all_namespaces_all_kinds_output'))
      .slice(0, 5); // Solo procesar 5 archivos para empezar
    
    console.log(`🚀 Procesando solo ${filesToProcess.length} archivos para prueba inicial`);
    
    filesToProcess.forEach((filename, index) => {
      const filePath = path.join(bucketPath, filename);
      
      console.log(`🔄 Procesando archivo ${index + 1}/${filesToProcess.length}: ${filename}`);
      
      // Mostrar progreso
      const startTime = Date.now();
      
      // Extraer movimientos
      const movimientos = extractMovimientosWorking(filePath);
      
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      if (movimientos.length > 0) {
        allMovimientos.push(...movimientos);
        processedFiles.push({
          filename,
          movimientosCount: movimientos.length,
          processingTime: `${processingTime}s`
        });
        
        console.log(`✅ ${movimientos.length} movimientos extraídos en ${processingTime}s`);
      } else {
        console.log(`⚠️  No se encontraron movimientos en ${processingTime}s`);
      }
    });
    
    // Guardar resultados
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Archivo con todos los movimientos
    const allMovimientosFile = path.join(outputPath, `all-movimientos-working-${timestamp}.json`);
    fs.writeFileSync(allMovimientosFile, JSON.stringify(allMovimientos, null, 2), 'utf8');
    
    // Archivo con resumen por archivo
    const summaryFile = path.join(outputPath, `movimientos-summary-working-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify({
      totalFiles: processedFiles.length,
      totalMovimientos: allMovimientos.length,
      timestamp: new Date().toISOString(),
      files: processedFiles
    }, null, 2), 'utf8');
    
    // Archivo con movimientos únicos
    const uniqueMovimientos = [];
    const seenIds = new Set();
    
    allMovimientos.forEach(movimiento => {
      const uniqueId = `${movimiento.collectionId}-${movimiento.productoId || 'unknown'}`;
      if (!seenIds.has(uniqueId)) {
        seenIds.add(uniqueId);
        uniqueMovimientos.push(movimiento);
      }
    });
    
    const uniqueMovimientosFile = path.join(outputPath, `unique-movimientos-working-${timestamp}.json`);
    fs.writeFileSync(uniqueMovimientosFile, JSON.stringify(uniqueMovimientos, null, 2), 'utf8');
    
    // Archivo con movimientos agrupados por tipo
    const movimientosByType = {};
    allMovimientos.forEach(movimiento => {
      const tipo = movimiento.tipo || 'Sin tipo';
      if (!movimientosByType[tipo]) {
        movimientosByType[tipo] = [];
      }
      movimientosByType[tipo].push(movimiento);
    });
    
    const byTypeFile = path.join(outputPath, `movimientos-by-type-working-${timestamp}.json`);
    fs.writeFileSync(byTypeFile, JSON.stringify(movimientosByType, null, 2), 'utf8');
    
    console.log('\n🎉 Extracción de movimientos completada exitosamente!');
    console.log(`📊 Total de archivos procesados: ${processedFiles.length}`);
    console.log(`📦 Total de movimientos extraídos: ${allMovimientos.length}`);
    console.log(`🔍 Movimientos únicos: ${uniqueMovimientos.length}`);
    
    if (Object.keys(movimientosByType).length > 0) {
      console.log(`📋 Tipos de movimientos encontrados:`);
      Object.entries(movimientosByType).forEach(([tipo, movs]) => {
        console.log(`   - ${tipo}: ${movs.length} movimientos`);
      });
    }
    
    console.log('\n📁 Archivos generados:');
    console.log(`   - ${allMovimientosFile}`);
    console.log(`   - ${summaryFile}`);
    console.log(`   - ${uniqueMovimientosFile}`);
    console.log(`   - ${byTypeFile}`);
    
    // Mostrar algunos ejemplos de movimientos
    if (uniqueMovimientos.length > 0) {
      console.log('\n📋 Ejemplos de movimientos extraídos:');
      uniqueMovimientos.slice(0, 5).forEach((movimiento, index) => {
        console.log(`   ${index + 1}. ${movimiento.tipo || 'Sin tipo'} - Producto: ${movimiento.productoId || 'Sin ID'} - Colección: ${movimiento.collectionId}`);
      });
    }
    
    console.log('\n💡 Para procesar todos los archivos, modifica la línea 177 del script');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  extractAllMovimientosWorking();
}

module.exports = { extractAllMovimientosWorking, extractMovimientosWorking };
