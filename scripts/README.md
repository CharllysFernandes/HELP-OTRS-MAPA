# Scripts Python - Help OTRS

Este diretório contém os scripts Python para gerenciamento de versões, build e releases da extensão Help OTRS.

## 📁 Estrutura

```
scripts/
├── version_bump.py    # Incremento de versões
├── build.py          # Build e empacotamento
├── release.py        # Releases GitHub
└── README.md         # Esta documentação
```

## 🚀 Scripts Disponíveis

### 1. Version Bump (`version_bump.py`)

Incrementa versões nos arquivos `manifest.json` e `package.json`.

```bash
# Incrementar patch (2.2.0 → 2.2.1)
python scripts/version_bump.py patch

# Incrementar minor (2.2.0 → 2.3.0)
python scripts/version_bump.py minor

# Incrementar major (2.2.0 → 3.0.0)
python scripts/version_bump.py major

# Com atualização automática do CHANGELOG
python scripts/version_bump.py minor --update-changelog
```

### 2. Build (`build.py`)

Cria build completo da extensão com empacotamento ZIP.

```bash
# Build com incremento patch
python scripts/build.py patch

# Build com incremento minor
python scripts/build.py minor

# Build sem limpeza de arquivos antigos
python scripts/build.py --no-cleanup

# Build com informações para GitHub release
python scripts/build.py minor --release-info
```

### 3. Release (`release.py`)

Cria releases automáticos no GitHub com upload de assets.

```bash
# Criar release patch
python scripts/release.py create

# Criar release minor
python scripts/release.py create minor

# Simular release (dry run)
python scripts/release.py create --dry-run

# Listar releases existentes
python scripts/release.py list
```

## ⚙️ Configuração

### Variáveis de Ambiente

Para usar o script de release, configure:

```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "seu_token_github"
$env:GITHUB_REPO_OWNER = "CharllysFernandes"
$env:GITHUB_REPO_NAME = "HELP-OTRS-MAPA"

# Linux/Mac
export GITHUB_TOKEN="seu_token_github"
export GITHUB_REPO_OWNER="CharllysFernandes"
export GITHUB_REPO_NAME="HELP-OTRS-MAPA"
```

### Dependências Python

```bash
# Instalar dependências
pip install requests

# Ou usando o ambiente virtual do projeto
.venv/Scripts/python.exe -m pip install requests
```

## 📦 Integração com npm

Os scripts estão integrados no `package.json`:

```bash
# Version bump
npm run version:patch
npm run version:minor
npm run version:major

# Build
npm run build         # Build patch
npm run build:minor   # Build minor
npm run build:major   # Build major

# Release
npm run release       # Release patch
npm run release:minor # Release minor
npm run release:major # Release major

# Utilidades
npm run release:dry-run  # Simular release
npm run release:list     # Listar releases
```

## 🔄 Workflow Recomendado

### 1. Desenvolvimento Local

```bash
# 1. Fazer alterações no código
# 2. Testar localmente
npm run build:dev

# 3. Criar build de teste
python scripts/build.py patch --no-cleanup

# 4. Testar build final
```

### 2. Release de Produção

```bash
# 1. Simular release
npm run release:dry-run

# 2. Criar release real
npm run release

# 3. Verificar no GitHub
npm run release:list
```

## 🆚 Comparação com Scripts Node.js

| Funcionalidade | Node.js (Legacy) | Python (Novo)                      |
| -------------- | ---------------- | ---------------------------------- |
| Version Bump   | ✅ Básico        | ✅ Completo + CHANGELOG            |
| Build          | ✅ ZIP simples   | ✅ Estrutura dist/ + ZIP otimizado |
| Release        | ❌ Manual        | ✅ GitHub API automático           |
| Cleanup        | ❌               | ✅ Remove builds antigos           |
| Validações     | ⚠️ Básica        | ✅ Completa                        |
| Dry Run        | ❌               | ✅ Simulação                       |
| Assets         | ❌               | ✅ Upload automático               |

## 🐛 Troubleshooting

### Erro de Token GitHub

```
❌ GitHub token não configurado (GITHUB_TOKEN)
```

**Solução**: Configure a variável de ambiente `GITHUB_TOKEN`

### Erro de Dependência

```
❌ ModuleNotFoundError: No module named 'requests'
```

**Solução**:

```bash
pip install requests
# ou
.venv/Scripts/python.exe -m pip install requests
```

### Erro de Permissão no GitHub

```
❌ Erro HTTP 403: Forbidden
```

**Solução**: Verifique se o token tem permissões de escrita no repositório

### Arquivo não encontrado

```
❌ manifest.json não encontrado
```

**Solução**: Execute os scripts a partir da raiz do projeto ou configure `project_root`

## 📋 Logs e Debug

Os scripts geram arquivos de informação:

- `build-info-vX.X.X.json` - Informações detalhadas do build
- `github-release-vX.X.X.json` - Dados do release para GitHub
- `help-otrs-vX.X.X.zip` - Pacote da extensão

## 🔧 Personalização

### Modificar Arquivos Incluídos no Build

Edite a função `get_files_to_include()` em `build.py`:

```python
def get_files_to_include(self) -> List[Path]:
    # Adicionar seus arquivos personalizados aqui
    custom_files = ['meu-arquivo.txt']
    # ...
```

### Modificar Template de Release

Edite a função `create_github_release_info()` em `build.py`:

```python
def create_github_release_info(self, build_result: Dict[str, any]) -> Dict[str, any]:
    release_body = f"""
    ## Meu Template Personalizado
    Versão {version}
    """
    # ...
```

## 📚 Referências

- [GitHub API - Releases](https://docs.github.com/en/rest/releases/releases)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)
- [Chrome Extension Manifest](https://developer.chrome.com/docs/extensions/mv3/manifest/)
