const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { bumpVersion } = require('./version-bump');

/**
 * Script de build da extensão Help OTRS
 * Incrementa versão e cria pacote ZIP pronto para distribuição
 */

function createZipPackage(version) {
    return new Promise((resolve, reject) => {
        const zipName = `help-otrs-v${version}.zip`;
        
        // Lista de arquivos para incluir no pacote
        const filesToInclude = [
            'manifest.json',
            'background.js',
            'script.js', 
            'options.html',
            'options.js',
            'options.css',
            'logo.png',
            'readme.txt',
            'CHANGELOG.md'
        ];
        
        // Verificar se todos os arquivos existem
        const missingFiles = filesToInclude.filter(file => !fs.existsSync(file));
        if (missingFiles.length > 0) {
            console.log('⚠️  Arquivos não encontrados:', missingFiles.join(', '));
        }
        
        const existingFiles = filesToInclude.filter(file => fs.existsSync(file));
        console.log(`📦 Incluindo ${existingFiles.length} arquivos no pacote:`);
        existingFiles.forEach(file => {
            const stats = fs.statSync(file);
            const size = (stats.size / 1024).toFixed(2);
            console.log(`   📄 ${file} (${size} KB)`);
        });
        
        // Comando para criar ZIP (multiplataforma)
        const isWindows = process.platform === 'win32';
        let zipCommand;
        
        if (isWindows) {
            // Para Windows - usar PowerShell
            const files = existingFiles.map(f => `"${f}"`).join(', ');
            zipCommand = `powershell -Command "Compress-Archive -Path ${files} -DestinationPath '${zipName}' -Force"`;
        } else {
            // Para Linux/Mac - usar zip
            const files = existingFiles.join(' ');
            zipCommand = `zip -r "${zipName}" ${files}`;
        }
        
        console.log('━'.repeat(50));
        console.log('🗜️  Criando arquivo ZIP...');
        
        exec(zipCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erro ao criar ZIP:', error.message);
                reject(error);
                return;
            }
            
            // Verificar se o arquivo foi criado e obter tamanho
            if (fs.existsSync(zipName)) {
                const stats = fs.statSync(zipName);
                const sizeKB = (stats.size / 1024).toFixed(2);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                console.log('✅ Pacote criado com sucesso!');
                console.log(`📦 Arquivo: ${zipName}`);
                console.log(`📊 Tamanho: ${sizeKB} KB (${sizeMB} MB)`);
                resolve(zipName);
            } else {
                reject(new Error('Arquivo ZIP não foi criado'));
            }
        });
    });
}

function generateBuildInfo(version, versionType) {
    const buildInfo = {
        version: version,
        versionType: versionType,
        buildDate: new Date().toISOString(),
        buildTimestamp: Date.now(),
        files: [],
        platform: process.platform,
        nodeVersion: process.version
    };
    
    // Adicionar informações dos arquivos
    const coreFiles = ['manifest.json', 'background.js', 'script.js', 'options.html', 'options.js'];
    coreFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            buildInfo.files.push({
                name: file,
                size: stats.size,
                modified: stats.mtime.toISOString()
            });
        }
    });
    
    fs.writeFileSync(`build-info-v${version}.json`, JSON.stringify(buildInfo, null, 2));
    console.log(`📋 Informações de build salvas: build-info-v${version}.json`);
    
    return buildInfo;
}

async function buildExtension(versionType = 'patch') {
    console.log('🚀 Iniciando build da extensão Help OTRS');
    console.log('━'.repeat(60));
    
    try {
        // 1. Incrementar versão
        console.log('📈 Etapa 1: Incrementando versão...');
        const versionResult = bumpVersion(versionType);
        const newVersion = versionResult.version;
        
        console.log('━'.repeat(60));
        
        // 2. Gerar informações de build
        console.log('📋 Etapa 2: Gerando informações de build...');
        const buildInfo = generateBuildInfo(newVersion, versionType);
        
        console.log('━'.repeat(60));
        
        // 3. Criar pacote ZIP
        console.log('📦 Etapa 3: Criando pacote de distribuição...');
        const zipFile = await createZipPackage(newVersion);
        
        console.log('━'.repeat(60));
        console.log('🎉 BUILD CONCLUÍDO COM SUCESSO!');
        console.log('━'.repeat(60));
        console.log(`📦 Pacote criado: ${zipFile}`);
        console.log(`🔖 Versão: ${newVersion}`);
        console.log(`📅 Data: ${versionResult.date}`);
        console.log(`🏷️  Tipo: ${versionType.toUpperCase()}`);
        console.log(`📝 Descrição: ${versionResult.description}`);
        
        console.log('\n📋 Próximos passos:');
        console.log('1. Teste a extensão carregando o pacote no Chrome');
        console.log('2. Atualize o CHANGELOG.md com as mudanças');
        console.log('3. Commit e push para o repositório');
        console.log(`4. Crie uma tag: git tag v${newVersion}`);
        console.log('5. Publique na Chrome Web Store se necessário');
        
        return {
            version: newVersion,
            zipFile: zipFile,
            buildInfo: buildInfo
        };
        
    } catch (error) {
        console.error('❌ Erro durante o build:', error.message);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
📦 Help OTRS - Sistema de Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uso: node build.js [tipo]

Tipos de build:
  patch   Incrementa versão patch e faz build (2.1.0 → 2.1.1) [padrão]
  minor   Incrementa versão minor e faz build (2.1.0 → 2.2.0)
  major   Incrementa versão major e faz build (2.1.0 → 3.0.0)

Exemplos:
  node build.js         # Build com incremento patch
  node build.js patch   # Build com incremento patch
  node build.js minor   # Build com incremento minor
  node build.js major   # Build com incremento major

O build executa:
  1. Incrementa a versão nos arquivos
  2. Gera informações de build
  3. Cria pacote ZIP para distribuição

Arquivos incluídos no pacote:
  • manifest.json, background.js, script.js
  • options.html, options.js, options.css
  • logo.png, readme.txt, CHANGELOG.md
    `);
}

// Executar se chamado diretamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const versionType = args[0];
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    if (versionType && !['patch', 'minor', 'major'].includes(versionType)) {
        console.error(`❌ Tipo inválido: ${versionType}`);
        console.log('💡 Use: patch, minor, major ou --help');
        process.exit(1);
    }
    
    buildExtension(versionType);
}

module.exports = { buildExtension, createZipPackage, generateBuildInfo };
