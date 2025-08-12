#!/usr/bin/env python3
"""
Script para incrementar versão da extensão Help OTRS
Atualiza manifest.json e package.json automaticamente

Autor: Charllys Fernandes
Data: 2025-08-12
"""

import json
import os
import sys
import argparse
from datetime import datetime
from pathlib import Path


class VersionBumper:
    """Classe responsável pelo gerenciamento de versões da extensão"""
    
    def __init__(self, project_root: str = None):
        """
        Inicializa o VersionBumper
        
        Args:
            project_root: Caminho raiz do projeto (padrão: diretório pai do script)
        """
        if project_root is None:
            # Assumir que o script está em scripts/ e o projeto está um nível acima
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
            
        self.manifest_path = self.project_root / "manifest.json"
        self.package_path = self.project_root / "package.json"
        self.changelog_path = self.project_root / "CHANGELOG.md"
        
    def get_current_date(self) -> str:
        """Retorna a data atual no formato ISO (YYYY-MM-DD)"""
        return datetime.now().strftime("%Y-%m-%d")
    
    def get_current_datetime(self) -> str:
        """Retorna data e hora atual formatada"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def validate_files(self) -> tuple[bool, list[str]]:
        """
        Valida se os arquivos necessários existem
        
        Returns:
            Tupla (sucesso, lista_de_erros)
        """
        errors = []
        
        if not self.manifest_path.exists():
            errors.append(f"manifest.json não encontrado: {self.manifest_path}")
            
        if not self.package_path.exists():
            errors.append(f"package.json não encontrado: {self.package_path}")
            
        return len(errors) == 0, errors
    
    def load_json_file(self, file_path: Path) -> dict:
        """
        Carrega arquivo JSON
        
        Args:
            file_path: Caminho para o arquivo JSON
            
        Returns:
            Dicionário com dados do arquivo
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Erro ao decodificar JSON {file_path}: {e}")
    
    def save_json_file(self, file_path: Path, data: dict, indent: int = 4):
        """
        Salva arquivo JSON
        
        Args:
            file_path: Caminho para o arquivo
            data: Dados para salvar
            indent: Indentação (manifest=4, package=2)
        """
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=indent, ensure_ascii=False)
        except Exception as e:
            raise IOError(f"Erro ao salvar {file_path}: {e}")
    
    def parse_version(self, version_str: str) -> tuple[int, int, int]:
        """
        Converte string de versão em tupla de inteiros
        
        Args:
            version_str: String da versão (ex: "2.1.0")
            
        Returns:
            Tupla (major, minor, patch)
        """
        try:
            parts = version_str.split('.')
            if len(parts) != 3:
                raise ValueError("Versão deve ter 3 partes (major.minor.patch)")
            
            return tuple(int(part) for part in parts)
        except ValueError as e:
            raise ValueError(f"Formato de versão inválido '{version_str}': {e}")
    
    def calculate_new_version(self, current: tuple[int, int, int], bump_type: str) -> tuple[int, int, int]:
        """
        Calcula nova versão baseada no tipo de incremento
        
        Args:
            current: Versão atual (major, minor, patch)
            bump_type: Tipo de incremento ('major', 'minor', 'patch')
            
        Returns:
            Nova versão (major, minor, patch)
        """
        major, minor, patch = current
        
        if bump_type == 'major':
            return (major + 1, 0, 0)
        elif bump_type == 'minor':
            return (major, minor + 1, 0)
        elif bump_type == 'patch':
            return (major, minor, patch + 1)
        else:
            raise ValueError(f"Tipo de bump inválido: {bump_type}")
    
    def get_version_description(self, bump_type: str) -> str:
        """
        Retorna descrição da versão baseada no tipo
        
        Args:
            bump_type: Tipo de incremento
            
        Returns:
            Descrição da versão
        """
        descriptions = {
            'major': 'Atualização Principal',
            'minor': 'Novas Funcionalidades', 
            'patch': 'Correções e Melhorias'
        }
        return descriptions.get(bump_type, 'Atualização')
    
    def bump_version(self, bump_type: str = 'patch') -> dict:
        """
        Incrementa versão nos arquivos manifest.json e package.json
        
        Args:
            bump_type: Tipo de incremento ('major', 'minor', 'patch')
            
        Returns:
            Dicionário com informações da versão
        """
        print(f"🚀 Incrementando versão: {bump_type.upper()}")
        print("━" * 50)
        
        # Validar arquivos
        valid, errors = self.validate_files()
        if not valid:
            for error in errors:
                print(f"❌ {error}")
            raise FileNotFoundError("Arquivos necessários não encontrados")
        
        # Carregar arquivos
        manifest = self.load_json_file(self.manifest_path)
        package = self.load_json_file(self.package_path)
        
        # Extrair e validar versão atual
        current_version_str = manifest.get('version')
        if not current_version_str:
            raise ValueError("Campo 'version' não encontrado em manifest.json")
            
        current_version = self.parse_version(current_version_str)
        print(f"📋 Versão atual: {current_version_str}")
        
        # Calcular nova versão
        new_version = self.calculate_new_version(current_version, bump_type)
        new_version_str = '.'.join(map(str, new_version))
        version_description = self.get_version_description(bump_type)
        
        print(f"📈 Nova versão: {new_version_str}")
        print(f"📝 Descrição: {version_description}")
        
        # Atualizar manifest.json
        manifest['version'] = new_version_str
        manifest['version_name'] = f"{new_version_str} - {version_description}"
        
        # Atualizar package.json
        package['version'] = new_version_str
        
        # Salvar arquivos
        self.save_json_file(self.manifest_path, manifest, indent=4)
        self.save_json_file(self.package_path, package, indent=2)
        
        print("━" * 50)
        print("✅ Arquivos atualizados:")
        print(f"   📄 manifest.json → {new_version_str}")
        print(f"   📄 package.json → {new_version_str}")
        
        # Preparar entrada do changelog
        changelog_entry = f"""
## [{new_version_str}] - {self.get_current_date()}

### 🔧 Alterado
- Versão incrementada automaticamente ({bump_type})
- {version_description}

### 📋 Notas de Desenvolvimento
- Build automático executado
- Versão atualizada via script Python
"""

        print("━" * 50)
        print("💡 Lembre-se de atualizar o CHANGELOG.md com:")
        print(changelog_entry)
        
        return {
            'version': new_version_str,
            'previous_version': current_version_str,
            'type': bump_type,
            'description': version_description,
            'date': self.get_current_date(),
            'datetime': self.get_current_datetime(),
            'changelog_entry': changelog_entry
        }
    
    def update_changelog(self, version_info: dict) -> bool:
        """
        Atualiza automaticamente o CHANGELOG.md
        
        Args:
            version_info: Informações da versão do bump_version()
            
        Returns:
            True se sucesso, False se arquivo não existe
        """
        if not self.changelog_path.exists():
            print(f"⚠️ CHANGELOG.md não encontrado: {self.changelog_path}")
            return False
        
        try:
            # Ler conteúdo atual
            with open(self.changelog_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Encontrar onde inserir nova entrada
            # Procurar pela primeira linha que começa com "## ["
            lines = content.split('\n')
            insert_index = None
            
            for i, line in enumerate(lines):
                if line.startswith('## [') and 'Unreleased' not in line:
                    insert_index = i
                    break
            
            if insert_index is None:
                # Se não encontrar, inserir após o título
                for i, line in enumerate(lines):
                    if line.startswith('# ') or line.startswith('## Changelog'):
                        insert_index = i + 2
                        break
            
            if insert_index is None:
                insert_index = 0
            
            # Inserir nova entrada
            new_entry_lines = version_info['changelog_entry'].strip().split('\n')
            lines[insert_index:insert_index] = new_entry_lines + ['']
            
            # Salvar arquivo atualizado
            with open(self.changelog_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            print(f"✅ CHANGELOG.md atualizado automaticamente")
            return True
            
        except Exception as e:
            print(f"❌ Erro ao atualizar CHANGELOG.md: {e}")
            return False


def show_help():
    """Exibe ajuda do script"""
    help_text = """
🔧 Help OTRS - Sistema de Versionamento Python
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Uso: python version_bump.py [tipo]

Tipos disponíveis:
  patch   Incrementa o último dígito (2.1.0 → 2.1.1) [padrão]
  minor   Incrementa o dígito do meio (2.1.0 → 2.2.0)
  major   Incrementa o primeiro dígito (2.1.0 → 3.0.0)

Exemplos:
  python version_bump.py         # Incrementa patch
  python version_bump.py patch   # Incrementa patch
  python version_bump.py minor   # Incrementa minor
  python version_bump.py major   # Incrementa major

Opções:
  --update-changelog    Atualiza CHANGELOG.md automaticamente
  --help, -h           Mostra esta ajuda

Arquivos atualizados:
  • manifest.json (version e version_name)
  • package.json (version)
  • CHANGELOG.md (opcional, com --update-changelog)
"""
    print(help_text)


def main():
    """Função principal do script"""
    parser = argparse.ArgumentParser(
        description='Incrementa versão da extensão Help OTRS',
        add_help=False  # Usar help customizado
    )
    
    parser.add_argument(
        'type',
        nargs='?',
        default='patch',
        choices=['patch', 'minor', 'major'],
        help='Tipo de incremento de versão'
    )
    
    parser.add_argument(
        '--update-changelog',
        action='store_true',
        help='Atualiza CHANGELOG.md automaticamente'
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
        # Inicializar bumper
        bumper = VersionBumper()
        
        # Executar bump
        result = bumper.bump_version(args.type)
        
        # Atualizar changelog se solicitado
        if args.update_changelog:
            bumper.update_changelog(result)
        
        print("━" * 50)
        print("🎉 Versionamento concluído com sucesso!")
        print(f"📦 Nova versão: {result['version']}")
        return 0
        
    except Exception as error:
        print(f"❌ Erro durante versionamento: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
