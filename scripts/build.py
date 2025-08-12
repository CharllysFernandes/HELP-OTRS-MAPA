#!/usr/bin/env python3
"""
Script de build da extensão Help OTRS
Incrementa versão e cria pacote ZIP pronto para distribuição

Autor: Charllys Fernandes
Data: 2025-08-12
"""

import json
import os
import sys
import shutil
import zipfile
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional

from version_bump import VersionBumper


class ExtensionBuilder:
    """Classe responsável pelo build e empacotamento da extensão"""
    
    def __init__(self, project_root: str = None):
        """
        Inicializa o ExtensionBuilder
        
        Args:
            project_root: Caminho raiz do projeto
        """
        if project_root is None:
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
            
        self.dist_dir = self.project_root / "dist"
        self.manifest_path = self.project_root / "manifest.json"
        
        # Inicializar VersionBumper
        self.version_bumper = VersionBumper(self.project_root)
        
    def get_current_version(self) -> str:
        """
        Obtém versão atual do manifest.json
        
        Returns:
            String da versão atual
        """
        try:
            manifest = self.version_bumper.load_json_file(self.manifest_path)
            return manifest.get('version', '0.0.0')
        except Exception:
            return '0.0.0'
    
    def get_files_to_include(self) -> List[Path]:
        """
        Retorna lista de arquivos para incluir no pacote
        
        Returns:
            Lista de Path objects dos arquivos
        """
        # Lista base de arquivos necessários
        base_files = [
            'manifest.json',
            'README.md',
            'CHANGELOG.md'
        ]
        
        # Arquivos da estrutura src/
        src_patterns = [
            'src/**/*.js',
            'src/**/*.html', 
            'src/**/*.css',
            'src/**/*.png',
            'src/**/*.jpg',
            'src/**/*.gif'
        ]
        
        # Arquivos da raiz (legacy)
        root_files = [
            'background.js',
            'script.js', 
            'options.html',
            'options.js',
            'options.css',
            'logo.png'
        ]
        
        files_to_include = []
        
        # Adicionar arquivos base
        for file_name in base_files:
            file_path = self.project_root / file_name
            if file_path.exists():
                files_to_include.append(file_path)
        
        # Adicionar arquivos src/ usando glob
        for pattern in src_patterns:
            files_to_include.extend(self.project_root.glob(pattern))
        
        # Adicionar arquivos da raiz (compatibilidade)
        for file_name in root_files:
            file_path = self.project_root / file_name
            if file_path.exists() and file_path not in files_to_include:
                files_to_include.append(file_path)
        
        # Remover duplicatas e arquivos de teste
        unique_files = []
        for file_path in files_to_include:
            if file_path not in unique_files and not self._is_test_file(file_path):
                unique_files.append(file_path)
        
        return sorted(unique_files)
    
    def _is_test_file(self, file_path: Path) -> bool:
        """
        Verifica se o arquivo é um arquivo de teste
        
        Args:
            file_path: Caminho do arquivo
            
        Returns:
            True se for arquivo de teste
        """
        test_indicators = [
            'test-', 'test_', '.test.', '_test.',
            'spec-', 'spec_', '.spec.', '_spec.',
            '/test/', '/tests/', '/spec/', '/specs/'
        ]
        
        file_str = str(file_path).lower()
        return any(indicator in file_str for indicator in test_indicators)
    
    def create_dist_structure(self, files: List[Path]) -> Dict[str, any]:
        """
        Cria estrutura de distribuição copiando arquivos
        
        Args:
            files: Lista de arquivos para copiar
            
        Returns:
            Dicionário com informações dos arquivos
        """
        print("📂 Criando estrutura de distribuição...")
        
        # Limpar e criar diretório dist
        if self.dist_dir.exists():
            shutil.rmtree(self.dist_dir)
        self.dist_dir.mkdir(parents=True, exist_ok=True)
        
        file_info = []
        total_size = 0
        
        for file_path in files:
            # Calcular caminho relativo
            relative_path = file_path.relative_to(self.project_root)
            dest_path = self.dist_dir / relative_path
            
            # Criar diretórios necessários
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Copiar arquivo
            shutil.copy2(file_path, dest_path)
            
            # Coletar informações
            file_stats = file_path.stat()
            size_kb = file_stats.st_size / 1024
            total_size += file_stats.st_size
            
            file_info.append({
                'name': str(relative_path),
                'size': file_stats.st_size,
                'size_kb': round(size_kb, 2),
                'modified': datetime.fromtimestamp(file_stats.st_mtime).isoformat()
            })
            
            print(f"   📄 {relative_path} ({size_kb:.2f} KB)")
        
        print(f"📊 Total: {len(files)} arquivos ({total_size/1024:.2f} KB)")
        
        return {
            'files': file_info,
            'total_files': len(files),
            'total_size': total_size,
            'total_size_kb': round(total_size / 1024, 2),
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        }
    
    def create_zip_package(self, version: str, file_info: Dict[str, any]) -> Tuple[Path, Dict[str, any]]:
        """
        Cria pacote ZIP da extensão
        
        Args:
            version: Versão da extensão
            file_info: Informações dos arquivos
            
        Returns:
            Tupla (caminho_zip, informações_zip)
        """
        print("🗜️ Criando arquivo ZIP...")
        
        zip_name = f"help-otrs-v{version}.zip"
        zip_path = self.project_root / zip_name
        
        # Remover ZIP existente
        if zip_path.exists():
            zip_path.unlink()
        
        # Criar ZIP
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            # Adicionar todos os arquivos do dist
            for file_path in self.dist_dir.rglob('*'):
                if file_path.is_file():
                    # Caminho relativo dentro do ZIP
                    arc_path = file_path.relative_to(self.dist_dir)
                    zf.write(file_path, arc_path)
        
        # Obter informações do ZIP
        zip_stats = zip_path.stat()
        zip_info = {
            'name': zip_name,
            'path': str(zip_path),
            'size': zip_stats.st_size,
            'size_kb': round(zip_stats.st_size / 1024, 2),
            'size_mb': round(zip_stats.st_size / (1024 * 1024), 2),
            'compression_ratio': round((1 - zip_stats.st_size / file_info['total_size']) * 100, 1),
            'created': datetime.fromtimestamp(zip_stats.st_ctime).isoformat()
        }
        
        print(f"✅ Pacote criado: {zip_name}")
        print(f"📊 Tamanho: {zip_info['size_kb']} KB ({zip_info['size_mb']} MB)")
        print(f"📐 Compressão: {zip_info['compression_ratio']}%")
        
        return zip_path, zip_info
    
    def generate_build_info(self, version: str, version_type: str, file_info: Dict[str, any], 
                          zip_info: Dict[str, any]) -> Dict[str, any]:
        """
        Gera arquivo com informações do build
        
        Args:
            version: Versão da extensão
            version_type: Tipo de incremento
            file_info: Informações dos arquivos
            zip_info: Informações do ZIP
            
        Returns:
            Dicionário com informações do build
        """
        print("📋 Gerando informações de build...")
        
        build_info = {
            'version': version,
            'version_type': version_type,
            'build_date': datetime.now().isoformat(),
            'build_timestamp': int(datetime.now().timestamp()),
            'platform': sys.platform,
            'python_version': sys.version,
            'project_root': str(self.project_root),
            'files': file_info,
            'zip': zip_info,
            'manifest_info': self._get_manifest_info()
        }
        
        # Salvar arquivo de build
        build_info_path = self.project_root / f"build-info-v{version}.json"
        with open(build_info_path, 'w', encoding='utf-8') as f:
            json.dump(build_info, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"📋 Informações salvas: build-info-v{version}.json")
        
        return build_info
    
    def _get_manifest_info(self) -> Dict[str, any]:
        """
        Extrai informações do manifest.json
        
        Returns:
            Dicionário com informações do manifest
        """
        try:
            manifest = self.version_bumper.load_json_file(self.manifest_path)
            return {
                'name': manifest.get('name', 'Unknown'),
                'version': manifest.get('version', '0.0.0'),
                'manifest_version': manifest.get('manifest_version', 2),
                'description': manifest.get('description', ''),
                'permissions': manifest.get('permissions', []),
                'content_scripts': len(manifest.get('content_scripts', [])),
                'background': bool(manifest.get('background'))
            }
        except Exception as e:
            return {'error': str(e)}
    
    def cleanup_old_builds(self, keep_recent: int = 5):
        """
        Remove builds antigos, mantendo apenas os mais recentes
        
        Args:
            keep_recent: Número de builds recentes para manter
        """
        print(f"🧹 Limpando builds antigos (mantendo {keep_recent} recentes)...")
        
        # Encontrar arquivos de build
        zip_files = list(self.project_root.glob("help-otrs-v*.zip"))
        info_files = list(self.project_root.glob("build-info-v*.json"))
        
        # Ordenar por data de modificação (mais recente primeiro)
        zip_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        info_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        # Remover arquivos antigos
        for files_list, file_type in [(zip_files, "ZIP"), (info_files, "info")]:
            if len(files_list) > keep_recent:
                old_files = files_list[keep_recent:]
                for old_file in old_files:
                    old_file.unlink()
                    print(f"   🗑️ Removido: {old_file.name}")
    
    def build_extension(self, version_type: str = 'patch', auto_cleanup: bool = True) -> Dict[str, any]:
        """
        Executa build completo da extensão
        
        Args:
            version_type: Tipo de incremento de versão
            auto_cleanup: Se deve limpar builds antigos automaticamente
            
        Returns:
            Dicionário com resultados do build
        """
        print("🚀 Iniciando build da extensão Help OTRS")
        print("━" * 60)
        
        try:
            # Etapa 1: Incrementar versão
            print("📈 Etapa 1: Incrementando versão...")
            version_result = self.version_bumper.bump_version(version_type)
            new_version = version_result['version']
            
            print("━" * 60)
            
            # Etapa 2: Preparar arquivos
            print("📋 Etapa 2: Preparando arquivos para distribuição...")
            files_to_include = self.get_files_to_include()
            
            if not files_to_include:
                raise ValueError("Nenhum arquivo encontrado para incluir no build")
            
            print("━" * 60)
            
            # Etapa 3: Criar estrutura dist
            print("📂 Etapa 3: Criando estrutura de distribuição...")
            file_info = self.create_dist_structure(files_to_include)
            
            print("━" * 60)
            
            # Etapa 4: Criar pacote ZIP
            print("📦 Etapa 4: Criando pacote ZIP...")
            zip_path, zip_info = self.create_zip_package(new_version, file_info)
            
            print("━" * 60)
            
            # Etapa 5: Gerar informações de build
            print("📋 Etapa 5: Gerando informações de build...")
            build_info = self.generate_build_info(new_version, version_type, file_info, zip_info)
            
            print("━" * 60)
            
            # Etapa 6: Limpeza (opcional)
            if auto_cleanup:
                self.cleanup_old_builds()
                print("━" * 60)
            
            # Resumo final
            print("🎉 BUILD CONCLUÍDO COM SUCESSO!")
            print("━" * 60)
            print(f"📦 Pacote criado: {zip_info['name']}")
            print(f"🔖 Versão: {new_version}")
            print(f"📅 Data: {version_result['date']}")
            print(f"🏷️ Tipo: {version_type.upper()}")
            print(f"📝 Descrição: {version_result['description']}")
            print(f"📊 Arquivos: {file_info['total_files']} ({file_info['total_size_kb']:.2f} KB)")
            print(f"🗜️ ZIP: {zip_info['size_kb']} KB (compressão: {zip_info['compression_ratio']}%)")
            
            print('\n📋 Próximos passos:')
            print('1. Teste a extensão carregando a pasta dist/ no Chrome')
            print('2. Verifique o CHANGELOG.md e atualize se necessário')
            print('3. Commit e push para o repositório')
            print(f'4. Crie uma tag: git tag v{new_version}')
            print('5. Publique na Chrome Web Store se necessário')
            
            return {
                'success': True,
                'version': new_version,
                'version_info': version_result,
                'zip_file': str(zip_path),
                'zip_info': zip_info,
                'file_info': file_info,
                'build_info': build_info
            }
            
        except Exception as error:
            print(f"❌ Erro durante o build: {error}")
            return {
                'success': False,
                'error': str(error)
            }
    
    def create_github_release_info(self, build_result: Dict[str, any]) -> Dict[str, any]:
        """
        Cria informações para release no GitHub
        
        Args:
            build_result: Resultado do build
            
        Returns:
            Dicionário com informações para o release
        """
        if not build_result['success']:
            raise ValueError("Build não foi bem-sucedido")
        
        version = build_result['version']
        version_info = build_result['version_info']
        zip_info = build_result['zip_info']
        file_info = build_result['file_info']
        
        # Preparar conteúdo do release
        release_body = f"""
## 🚀 Help OTRS v{version}

{version_info['description']} - Versão {version_info['type']}

### 📦 Arquivos do Release

- **help-otrs-v{version}.zip** ({zip_info['size_kb']} KB)
  - Extensão completa pronta para instalação
  - {file_info['total_files']} arquivos incluídos
  - Compressão: {zip_info['compression_ratio']}%

### 📥 Como Instalar

1. Baixe o arquivo `help-otrs-v{version}.zip`
2. Extraia o conteúdo em uma pasta
3. Abra Chrome → Extensões → Modo do desenvolvedor
4. Clique em "Carregar extensão descompactada"
5. Selecione a pasta extraída

### 🔧 Alterações

{version_info.get('changelog_entry', 'Ver CHANGELOG.md para detalhes')}

### 📊 Estatísticas

- **Versão anterior**: {version_info.get('previous_version', 'N/A')}
- **Arquivos**: {file_info['total_files']} 
- **Tamanho total**: {file_info['total_size_kb']:.2f} KB
- **Tamanho comprimido**: {zip_info['size_kb']} KB
- **Data de build**: {version_info['date']}

---
*Build automático gerado em {version_info['datetime']}*
"""

        return {
            'tag_name': f"v{version}",
            'name': f"Help OTRS v{version}",
            'body': release_body.strip(),
            'draft': False,
            'prerelease': version_info['type'] == 'major',
            'assets': [
                {
                    'name': zip_info['name'],
                    'path': zip_info['path'],
                    'content_type': 'application/zip'
                }
            ]
        }


def show_help():
    """Exibe ajuda do script"""
    help_text = """
📦 Help OTRS - Sistema de Build Python
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uso: python build.py [tipo]

Tipos de build:
  patch   Incrementa versão patch e faz build (2.1.0 → 2.1.1) [padrão]
  minor   Incrementa versão minor e faz build (2.1.0 → 2.2.0)  
  major   Incrementa versão major e faz build (2.1.0 → 3.0.0)

Exemplos:
  python build.py         # Build com incremento patch
  python build.py patch   # Build com incremento patch
  python build.py minor   # Build com incremento minor
  python build.py major   # Build com incremento major

Opções:
  --no-cleanup           Não remove builds antigos
  --keep-builds N        Mantém N builds recentes (padrão: 5)
  --release-info         Gera informações para GitHub release
  --help, -h            Mostra esta ajuda

O build executa:
  1. Incrementa a versão nos arquivos
  2. Cria estrutura de distribuição (dist/)
  3. Cria pacote ZIP para distribuição
  4. Gera informações de build
  5. Remove builds antigos (opcional)

Arquivos incluídos no pacote:
  • Toda estrutura src/ (JS, HTML, CSS, imagens)
  • manifest.json, README.md, CHANGELOG.md
  • Arquivos legacy da raiz (compatibilidade)
"""
    print(help_text)


def main():
    """Função principal do script"""
    parser = argparse.ArgumentParser(
        description='Build da extensão Help OTRS',
        add_help=False
    )
    
    parser.add_argument(
        'type',
        nargs='?',
        default='patch',
        choices=['patch', 'minor', 'major'],
        help='Tipo de incremento de versão'
    )
    
    parser.add_argument(
        '--no-cleanup',
        action='store_true',
        help='Não remove builds antigos'
    )
    
    parser.add_argument(
        '--keep-builds',
        type=int,
        default=5,
        help='Número de builds recentes para manter'
    )
    
    parser.add_argument(
        '--release-info',
        action='store_true',
        help='Gera arquivo com informações para GitHub release'
    )
    
    parser.add_argument(
        '--help', '-h',
        action='store_true',
        help='Mostra ajuda'
    )
    
    args = parser.parse_args()
    
    if args.help:
        show_help()
        return 0
    
    try:
        # Inicializar builder
        builder = ExtensionBuilder()
        
        # Executar build
        result = builder.build_extension(
            version_type=args.type,
            auto_cleanup=not args.no_cleanup
        )
        
        if not result['success']:
            print(f"❌ Build falhou: {result['error']}")
            return 1
        
        # Gerar informações de release se solicitado
        if args.release_info:
            print("━" * 60)
            print("📋 Gerando informações para GitHub release...")
            
            release_info = builder.create_github_release_info(result)
            release_file = f"github-release-v{result['version']}.json"
            
            with open(release_file, 'w', encoding='utf-8') as f:
                json.dump(release_info, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Release info salvo: {release_file}")
        
        print("━" * 60)
        print("🎉 Build concluído com sucesso!")
        print(f"📦 Versão: {result['version']}")
        return 0
        
    except Exception as error:
        print(f"❌ Erro durante o build: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
