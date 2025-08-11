const fs = require('fs');
const path = require('path');

/**
 * Script para incrementar versão da extensão Help OTRS
 * Atualiza manifest.json e package.json automaticamente
 */

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function bumpVersion(type = 'patch') {
    console.log(`🚀 Incrementando versão: ${type.toUpperCase()}`);
    console.log('━'.repeat(50));
    
    // Caminhos dos arquivos
    const manifestPath = path.join(__dirname, 'manifest.json');
    const packagePath = path.join(__dirname, 'package.json');
    const changelogPath = path.join(__dirname, 'CHANGELOG.md');
    
    // Ler arquivos
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Extrair versão atual
    const [major, minor, patch] = manifest.version.split('.').map(Number);
    console.log(`📋 Versão atual: ${manifest.version}`);
    
    // Calcular nova versão
    let newVersion;
    let versionDescription;
    
    switch(type) {
        case 'major':
            newVersion = `${major + 1}.0.0`;
            versionDescription = 'Atualização Principal';
            break;
        case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            versionDescription = 'Novas Funcionalidades';
            break;
        case 'patch':
        default:
            newVersion = `${major}.${minor}.${patch + 1}`;
            versionDescription = 'Correções e Melhorias';
            break;
    }
    
    console.log(`📈 Nova versão: ${newVersion}`);
    console.log(`📝 Descrição: ${versionDescription}`);
    
    // Atualizar manifest.json
    manifest.version = newVersion;
    manifest.version_name = `${newVersion} - ${versionDescription}`;
    
    // Atualizar package.json
    packageJson.version = newVersion;
    
    // Salvar arquivos
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    console.log('━'.repeat(50));
    console.log('✅ Arquivos atualizados:');
    console.log(`   📄 manifest.json → ${newVersion}`);
    console.log(`   📄 package.json → ${newVersion}`);
    
    // Preparar entrada do changelog
    const changelogEntry = `
## [${newVersion}] - ${getCurrentDate()}

### 🔧 Alterado
- Versão incrementada automaticamente (${type})
- ${versionDescription}

### 📋 Notas de Desenvolvimento
- Build automático executado
- Versão atualizada via script
`;

    // Sugerir atualização do changelog
    console.log('━'.repeat(50));
    console.log('💡 Lembre-se de atualizar o CHANGELOG.md com:');
    console.log(changelogEntry);
    
    return {
        version: newVersion,
        type,
        description: versionDescription,
        date: getCurrentDate()
    };
}

function showHelp() {
    console.log(`
🔧 Help OTRS - Sistema de Versionamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uso: node version-bump.js [tipo]

Tipos disponíveis:
  patch   Incrementa o último dígito (2.1.0 → 2.1.1) [padrão]
  minor   Incrementa o dígito do meio (2.1.0 → 2.2.0)
  major   Incrementa o primeiro dígito (2.1.0 → 3.0.0)

Exemplos:
  node version-bump.js         # Incrementa patch
  node version-bump.js patch   # Incrementa patch
  node version-bump.js minor   # Incrementa minor
  node version-bump.js major   # Incrementa major

Arquivos atualizados:
  • manifest.json (version e version_name)
  • package.json (version)
    `);
}

// Executar se chamado diretamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const type = args[0];
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    if (type && !['patch', 'minor', 'major'].includes(type)) {
        console.error(`❌ Tipo inválido: ${type}`);
        console.log('💡 Use: patch, minor, major ou --help');
        process.exit(1);
    }
    
    try {
        const result = bumpVersion(type);
        console.log('━'.repeat(50));
        console.log('🎉 Versionamento concluído com sucesso!');
        console.log(`📦 Nova versão: ${result.version}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro durante versionamento:', error.message);
        process.exit(1);
    }
}

module.exports = { bumpVersion, getCurrentDate };
