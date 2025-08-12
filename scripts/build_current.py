#!/usr/bin/env python3
"""
Script para criar release da versão atual sem incrementar versão
Usado para criar primeiro release oficial v1.0.1

Autor: Charllys Fernandes
Data: 2025-08-12
"""

import json
import sys
from pathlib import Path
from build import ExtensionBuilder


def create_current_version_build():
    """Cria build da versão atual sem incrementar"""
    
    print("🚀 Criando build da versão atual (sem incremento)")
    print("━" * 60)
    
    try:
        # Inicializar builder
        builder = ExtensionBuilder()
        
        # Obter versão atual
        current_version = builder.get_current_version()
        print(f"📦 Versão atual: {current_version}")
        
        # Preparar arquivos
        print("📋 Preparando arquivos para distribuição...")
        files_to_include = builder.get_files_to_include()
        
        if not files_to_include:
            raise ValueError("Nenhum arquivo encontrado para incluir no build")
        
        print("━" * 60)
        
        # Criar estrutura dist
        print("📂 Criando estrutura de distribuição...")
        file_info = builder.create_dist_structure(files_to_include)
        
        print("━" * 60)
        
        # Criar pacote ZIP
        print("📦 Criando pacote ZIP...")
        zip_path, zip_info = builder.create_zip_package(current_version, file_info)
        
        print("━" * 60)
        
        # Gerar informações de build (sem version_type pois não houve incremento)
        print("📋 Gerando informações de build...")
        build_info = {
            'version': current_version,
            'version_type': 'current',
            'build_date': builder.version_bumper.get_current_datetime(),
            'build_timestamp': int(builder.version_bumper.get_current_datetime().timestamp()) if hasattr(builder.version_bumper.get_current_datetime(), 'timestamp') else 0,
            'platform': sys.platform,
            'python_version': sys.version,
            'project_root': str(builder.project_root),
            'files': file_info,
            'zip': zip_info,
            'manifest_info': builder._get_manifest_info()
        }
        
        # Salvar arquivo de build
        build_info_path = builder.project_root / f"build-info-v{current_version}.json"
        with open(build_info_path, 'w', encoding='utf-8') as f:
            json.dump(build_info, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"📋 Informações salvas: build-info-v{current_version}.json")
        
        # Criar informações de release
        print("📋 Gerando informações para GitHub release...")
        
        # Mock version_result para compatibilidade
        version_result = {
            'version': current_version,
            'previous_version': current_version,
            'type': 'release',
            'description': 'Primeira Release Oficial',
            'date': builder.version_bumper.get_current_date(),
            'datetime': builder.version_bumper.get_current_datetime(),
            'changelog_entry': f"""
## [{current_version}] - {builder.version_bumper.get_current_date()}

### 🚀 Primeira Release Oficial

Esta é a primeira versão estável da extensão Help OTRS - MAPA, marcando o início do versionamento semântico oficial.

### ✨ Funcionalidades Principais

- Sistema de validação de filas e tipos de atendimento
- Alertas de classificação em tempo real
- Reaproveitamento de dados de formulários
- Sistema modular de configuração
- Build automático com Python

### 📊 Compatibilidade
- Chrome Extensions Manifest V3
- MAPA, SFB, MT e outros sistemas OTRS
"""
        }
        
        # Simular build_result para create_github_release_info
        build_result = {
            'success': True,
            'version': current_version,
            'version_info': version_result,
            'zip_file': str(zip_path),
            'zip_info': zip_info,
            'file_info': file_info,
            'build_info': build_info
        }
        
        release_info = builder.create_github_release_info(build_result)
        release_file = f"github-release-v{current_version}.json"
        
        with open(release_file, 'w', encoding='utf-8') as f:
            json.dump(release_info, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Release info salvo: {release_file}")
        
        print("━" * 60)
        print("🎉 BUILD DA VERSÃO ATUAL CONCLUÍDO!")
        print("━" * 60)
        print(f"📦 Pacote criado: {zip_info['name']}")
        print(f"🔖 Versão: {current_version}")
        print(f"📊 Arquivos: {file_info['total_files']} ({file_info['total_size_kb']:.2f} KB)")
        print(f"🗜️ ZIP: {zip_info['size_kb']} KB (compressão: {zip_info['compression_ratio']}%)")
        
        print('\n📋 Próximos passos:')
        print('1. Teste a extensão carregando a pasta dist/ no Chrome')
        print('2. Commit e push para o repositório')
        print(f'3. Crie uma tag: git tag v{current_version}')
        print('4. Crie o release no GitHub usando o arquivo JSON gerado')
        
        return True
        
    except Exception as error:
        print(f"❌ Erro durante o build: {error}")
        return False


if __name__ == "__main__":
    success = create_current_version_build()
    sys.exit(0 if success else 1)
