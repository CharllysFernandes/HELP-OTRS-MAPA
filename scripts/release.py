#!/usr/bin/env python3
"""
Script para criar releases automatizados da extensão Help OTRS
Integra com GitHub API para criar releases automáticos

Autor: Charllys Fernandes
Data: 2025-08-12
"""

import json
import os
import sys
import requests
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from build import ExtensionBuilder


class GitHubReleaseManager:
    """Classe responsável por gerenciar releases no GitHub"""
    
    def __init__(self, project_root: str = None, github_token: str = None, 
                 repo_owner: str = None, repo_name: str = None):
        """
        Inicializa o GitHubReleaseManager
        
        Args:
            project_root: Caminho raiz do projeto
            github_token: Token de acesso do GitHub
            repo_owner: Proprietário do repositório
            repo_name: Nome do repositório
        """
        if project_root is None:
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
            
        # Configurações do GitHub
        self.github_token = github_token or os.environ.get('GITHUB_TOKEN')
        self.repo_owner = repo_owner or os.environ.get('GITHUB_REPO_OWNER', 'CharllysFernandes')
        self.repo_name = repo_name or os.environ.get('GITHUB_REPO_NAME', 'HELP-OTRS-MAPA')
        
        # URLs da API
        self.api_base = 'https://api.github.com'
        self.repo_api = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}"
        
        # Headers para requisições
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Help-OTRS-Release-Manager/1.0'
        }
        
        if self.github_token:
            self.headers['Authorization'] = f'Bearer {self.github_token}'
            
        # Inicializar builder
        self.builder = ExtensionBuilder(self.project_root)
        
    def validate_github_config(self) -> Tuple[bool, List[str]]:
        """
        Valida configurações do GitHub
        
        Returns:
            Tupla (válido, lista_de_erros)
        """
        errors = []
        
        if not self.github_token:
            errors.append("GitHub token não configurado (GITHUB_TOKEN)")
            
        if not self.repo_owner:
            errors.append("Proprietário do repositório não configurado")
            
        if not self.repo_name:
            errors.append("Nome do repositório não configurado")
            
        return len(errors) == 0, errors
    
    def test_github_connection(self) -> bool:
        """
        Testa conexão com GitHub API
        
        Returns:
            True se conexão for bem-sucedida
        """
        try:
            response = requests.get(f"{self.repo_api}", headers=self.headers, timeout=10)
            return response.status_code == 200
        except Exception:
            return False
    
    def get_latest_release(self) -> Optional[Dict]:
        """
        Obtém informações do último release
        
        Returns:
            Dicionário com dados do release ou None
        """
        try:
            response = requests.get(f"{self.repo_api}/releases/latest", 
                                  headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None
    
    def get_all_releases(self) -> List[Dict]:
        """
        Obtém lista de todos os releases
        
        Returns:
            Lista de dicionários com dados dos releases
        """
        try:
            response = requests.get(f"{self.repo_api}/releases", 
                                  headers=self.headers, timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception:
            return []
    
    def check_tag_exists(self, tag_name: str) -> bool:
        """
        Verifica se uma tag já existe no repositório
        
        Args:
            tag_name: Nome da tag a verificar
            
        Returns:
            True se a tag existe
        """
        try:
            response = requests.get(f"{self.repo_api}/git/refs/tags/{tag_name}", 
                                  headers=self.headers, timeout=10)
            return response.status_code == 200
        except Exception:
            return False
    
    def create_release(self, release_info: Dict) -> Tuple[bool, Dict]:
        """
        Cria um novo release no GitHub
        
        Args:
            release_info: Informações do release
            
        Returns:
            Tupla (sucesso, dados_do_release)
        """
        try:
            # Verificar se tag já existe
            if self.check_tag_exists(release_info['tag_name']):
                return False, {'error': f"Tag {release_info['tag_name']} já existe"}
            
            # Dados para API
            release_data = {
                'tag_name': release_info['tag_name'],
                'name': release_info['name'],
                'body': release_info['body'],
                'draft': release_info.get('draft', False),
                'prerelease': release_info.get('prerelease', False)
            }
            
            # Criar release
            response = requests.post(f"{self.repo_api}/releases", 
                                   json=release_data, headers=self.headers, timeout=30)
            
            if response.status_code == 201:
                return True, response.json()
            else:
                return False, {
                    'error': f'Erro HTTP {response.status_code}',
                    'message': response.json().get('message', 'Erro desconhecido')
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def upload_release_asset(self, release_id: int, asset_info: Dict) -> Tuple[bool, Dict]:
        """
        Faz upload de um asset para o release
        
        Args:
            release_id: ID do release
            asset_info: Informações do asset
            
        Returns:
            Tupla (sucesso, dados_do_asset)
        """
        try:
            asset_path = Path(asset_info['path'])
            
            if not asset_path.exists():
                return False, {'error': f"Arquivo não encontrado: {asset_path}"}
            
            # URL para upload de assets
            upload_url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/releases/{release_id}/assets"
            
            # Headers específicos para upload
            upload_headers = self.headers.copy()
            upload_headers['Content-Type'] = asset_info.get('content_type', 'application/octet-stream')
            
            # Parâmetros
            params = {'name': asset_info['name']}
            
            # Upload do arquivo
            with open(asset_path, 'rb') as file:
                response = requests.post(upload_url, 
                                       headers=upload_headers,
                                       params=params,
                                       data=file,
                                       timeout=300)  # 5 minutos para upload
            
            if response.status_code == 201:
                return True, response.json()
            else:
                return False, {
                    'error': f'Erro HTTP {response.status_code}',
                    'message': response.json().get('message', 'Erro no upload')
                }
                
        except Exception as e:
            return False, {'error': str(e)}
    
    def create_full_release(self, version_type: str = 'patch', 
                           dry_run: bool = False) -> Dict[str, any]:
        """
        Cria release completo: build + GitHub release + assets
        
        Args:
            version_type: Tipo de incremento de versão
            dry_run: Se True, não cria release real (apenas simula)
            
        Returns:
            Dicionário com resultado da operação
        """
        print("🚀 Iniciando criação de release completo")
        print("━" * 60)
        
        try:
            # Etapa 1: Validar configurações GitHub
            if not dry_run:
                print("🔑 Etapa 1: Validando configurações GitHub...")
                valid, errors = self.validate_github_config()
                if not valid:
                    for error in errors:
                        print(f"❌ {error}")
                    raise ValueError("Configurações GitHub inválidas")
                
                # Testar conexão
                if not self.test_github_connection():
                    raise ValueError("Não foi possível conectar ao GitHub API")
                
                print("✅ Configurações GitHub válidas")
            else:
                print("🧪 Modo DRY RUN - simulando operações...")
            
            print("━" * 60)
            
            # Etapa 2: Executar build
            print("📦 Etapa 2: Executando build da extensão...")
            build_result = self.builder.build_extension(version_type)
            
            if not build_result['success']:
                raise ValueError(f"Build falhou: {build_result['error']}")
            
            print("✅ Build concluído com sucesso")
            print("━" * 60)
            
            # Etapa 3: Preparar informações do release
            print("📋 Etapa 3: Preparando informações do release...")
            release_info = self.builder.create_github_release_info(build_result)
            
            print(f"🏷️ Tag: {release_info['tag_name']}")
            print(f"📦 Nome: {release_info['name']}")
            print(f"📄 Assets: {len(release_info['assets'])}")
            
            if dry_run:
                print("🧪 DRY RUN - Release info preparado (não será criado)")
                return {
                    'success': True,
                    'dry_run': True,
                    'build_result': build_result,
                    'release_info': release_info
                }
            
            print("━" * 60)
            
            # Etapa 4: Criar release no GitHub
            print("🌐 Etapa 4: Criando release no GitHub...")
            release_success, release_data = self.create_release(release_info)
            
            if not release_success:
                raise ValueError(f"Falha ao criar release: {release_data.get('error', 'Erro desconhecido')}")
            
            release_id = release_data['id']
            release_url = release_data['html_url']
            
            print(f"✅ Release criado: {release_url}")
            print("━" * 60)
            
            # Etapa 5: Upload de assets
            print("📎 Etapa 5: Fazendo upload de assets...")
            asset_results = []
            
            for asset_info in release_info['assets']:
                print(f"⬆️ Uploading {asset_info['name']}...")
                
                asset_success, asset_data = self.upload_release_asset(release_id, asset_info)
                
                if asset_success:
                    print(f"✅ Asset enviado: {asset_data['browser_download_url']}")
                    asset_results.append({
                        'name': asset_info['name'],
                        'success': True,
                        'download_url': asset_data['browser_download_url'],
                        'size': asset_data['size']
                    })
                else:
                    print(f"❌ Falha no upload: {asset_data.get('error', 'Erro desconhecido')}")
                    asset_results.append({
                        'name': asset_info['name'],
                        'success': False,
                        'error': asset_data.get('error')
                    })
            
            print("━" * 60)
            
            # Resumo final
            successful_assets = sum(1 for result in asset_results if result['success'])
            
            print("🎉 RELEASE CRIADO COM SUCESSO!")
            print("━" * 60)
            print(f"🌐 URL: {release_url}")
            print(f"🏷️ Tag: {release_info['tag_name']}")
            print(f"📦 Versão: {build_result['version']}")
            print(f"📎 Assets: {successful_assets}/{len(asset_results)} enviados")
            
            if successful_assets < len(asset_results):
                print("⚠️ Alguns assets falharam no upload")
            
            print('\n📋 Próximos passos:')
            print('1. Verificar o release no GitHub')
            print('2. Testar download dos assets')
            print('3. Anunciar o release para usuários')
            print('4. Atualizar documentação se necessário')
            
            return {
                'success': True,
                'dry_run': False,
                'build_result': build_result,
                'release_info': release_info,
                'release_data': release_data,
                'release_url': release_url,
                'asset_results': asset_results
            }
            
        except Exception as error:
            print(f"❌ Erro durante criação do release: {error}")
            return {
                'success': False,
                'error': str(error)
            }
    
    def list_releases(self, limit: int = 10) -> List[Dict]:
        """
        Lista releases existentes
        
        Args:
            limit: Número máximo de releases para listar
            
        Returns:
            Lista de releases
        """
        print(f"📋 Listando últimos {limit} releases...")
        
        releases = self.get_all_releases()
        
        if not releases:
            print("📭 Nenhum release encontrado")
            return []
        
        # Limitar resultados
        releases = releases[:limit]
        
        print(f"📦 Encontrados {len(releases)} releases:")
        print("━" * 60)
        
        for release in releases:
            tag = release['tag_name']
            name = release['name']
            published = release.get('published_at', 'N/A')[:10]  # YYYY-MM-DD
            draft = "🚧 DRAFT" if release.get('draft') else ""
            prerelease = "🧪 PRE" if release.get('prerelease') else ""
            assets = len(release.get('assets', []))
            
            status = f"{draft} {prerelease}".strip()
            print(f"🏷️ {tag} - {name} ({published}) [{assets} assets] {status}")
        
        return releases


def show_help():
    """Exibe ajuda do script"""
    help_text = """
🚀 Help OTRS - Sistema de Release GitHub
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uso: python release.py [comando] [opções]

Comandos:
  create [tipo]    Cria novo release (patch/minor/major) [padrão: patch]
  list [n]         Lista últimos N releases [padrão: 10]
  
Tipos de release:
  patch   Incrementa versão patch (2.1.0 → 2.1.1) [padrão]
  minor   Incrementa versão minor (2.1.0 → 2.2.0)
  major   Incrementa versão major (2.1.0 → 3.0.0)

Exemplos:
  python release.py create         # Release patch
  python release.py create minor   # Release minor
  python release.py list           # Lista releases
  python release.py list 5         # Lista últimos 5

Opções:
  --dry-run         Simula criação de release (não cria real)
  --token TOKEN     Token GitHub (ou use GITHUB_TOKEN env)
  --repo OWNER/REPO Nome do repositório
  --help, -h        Mostra esta ajuda

Variáveis de Ambiente:
  GITHUB_TOKEN        Token de acesso GitHub (obrigatório)
  GITHUB_REPO_OWNER   Proprietário do repo (padrão: CharllysFernandes)
  GITHUB_REPO_NAME    Nome do repo (padrão: HELP-OTRS-MAPA)

O comando create executa:
  1. Valida configurações GitHub
  2. Executa build da extensão
  3. Prepara informações do release
  4. Cria release no GitHub
  5. Faz upload dos assets (ZIP)
"""
    print(help_text)


def main():
    """Função principal do script"""
    parser = argparse.ArgumentParser(
        description='Gerenciador de releases GitHub',
        add_help=False
    )
    
    parser.add_argument(
        'command',
        nargs='?',
        default='create',
        choices=['create', 'list'],
        help='Comando a executar'
    )
    
    parser.add_argument(
        'arg',
        nargs='?',
        help='Argumento do comando (tipo para create, limite para list)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simula operações sem executar realmente'
    )
    
    parser.add_argument(
        '--token',
        help='Token de acesso GitHub'
    )
    
    parser.add_argument(
        '--repo',
        help='Repositório no formato OWNER/REPO'
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
    
    # Configurações do repositório
    repo_owner = None
    repo_name = None
    if args.repo:
        try:
            repo_owner, repo_name = args.repo.split('/')
        except ValueError:
            print("❌ Formato de repositório inválido. Use: OWNER/REPO")
            return 1
    
    try:
        # Inicializar release manager
        manager = GitHubReleaseManager(
            github_token=args.token,
            repo_owner=repo_owner,
            repo_name=repo_name
        )
        
        # Executar comando
        if args.command == 'create':
            version_type = args.arg if args.arg in ['patch', 'minor', 'major'] else 'patch'
            
            result = manager.create_full_release(
                version_type=version_type,
                dry_run=args.dry_run
            )
            
            if not result['success']:
                print(f"❌ Falha ao criar release: {result['error']}")
                return 1
                
        elif args.command == 'list':
            limit = int(args.arg) if args.arg and args.arg.isdigit() else 10
            manager.list_releases(limit)
        
        return 0
        
    except Exception as error:
        print(f"❌ Erro: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
