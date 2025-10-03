const fs = require('fs');
const path = require('path');

function debugCollection() {
  try {
    const filePath = path.join(__dirname, '../public/bucket/2025-08-23T12_41_23_81573_all_namespaces_all_kinds_output-0');
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('ascii');
    
    console.log('=== DEBUGGING COLECCIÓN DE MOVIMIENTOS ===');
    
    // Encontrar la primera colección de movimientos
    const firstMovimientosIndex = content.indexOf('movimientos"');
    if (firstMovimientosIndex === -1) {
      console.log('❌ No se encontró ninguna colección de movimientos');
      return;
    }
    
    // Extraer el ID de la colección
    const idStart = firstMovimientosIndex + 12;
    const nextQuote = content.indexOf('"', idStart);
    const collectionId = content.substring(idStart, nextQuote);
    
    console.log(`📋 ID de la primera colección: ${collectionId}`);
    
    // Encontrar la sección completa de esta colección
    const nextMovimientosIndex = content.indexOf('movimientos"', nextQuote + 1);
    const nextClientesIndex = content.indexOf('clientes"', nextQuote + 1);
    const nextEnviosIndex = content.indexOf('envios"', nextQuote + 1);
    const nextVentasIndex = content.indexOf('ventas"', nextQuote + 1);
    
    const nextIndices = [nextMovimientosIndex, nextClientesIndex, nextEnviosIndex, nextVentasIndex]
      .filter(i => i > -1)
      .sort((a, b) => a - b);
    
    const endIndex = nextIndices.length > 0 ? nextIndices[0] : content.length;
    const collectionSection = content.substring(firstMovimientosIndex, endIndex);
    
    console.log(`📏 Tamaño de la sección: ${collectionSection.length} caracteres`);
    
    // Buscar patrones específicos en la colección
    console.log('\n=== PATRONES ENCONTRADOS ===');
    
    // Buscar productoId
    const productoIdMatches = collectionSection.match(/productoId\s*\*\s*([^z\n]+)/gi);
    console.log(`🔍 productoId encontrados: ${productoIdMatches ? productoIdMatches.length : 0}`);
    if (productoIdMatches) {
      productoIdMatches.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Buscar tipo
    const tipoMatches = collectionSection.match(/tipo\s*\*\s*([^z\n]+)/gi);
    console.log(`🔍 tipo encontrados: ${tipoMatches ? tipoMatches.length : 0}`);
    if (tipoMatches) {
      tipoMatches.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Buscar cantidad
    const cantidadMatches = collectionSection.match(/cantidad\s*\*\s*([^z\n]+)/gi);
    console.log(`🔍 cantidad encontrados: ${cantidadMatches ? cantidadMatches.length : 0}`);
    if (cantidadMatches) {
      cantidadMatches.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Buscar usuario
    const usuarioMatches = collectionSection.match(/usuario\s*\*\s*([^z\n]+)/gi);
    console.log(`🔍 usuario encontrados: ${usuarioMatches ? usuarioMatches.length : 0}`);
    if (usuarioMatches) {
      usuarioMatches.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match}`);
      });
    }
    
    // Mostrar una porción de la sección para análisis
    console.log('\n=== PRIMEROS 1000 CARACTERES DE LA COLECCIÓN ===');
    console.log(collectionSection.substring(0, 1000));
    
    console.log('\n=== ÚLTIMOS 500 CARACTERES DE LA COLECCIÓN ===');
    console.log(collectionSection.substring(collectionSection.length - 500));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugCollection();
}

module.exports = { debugCollection };
