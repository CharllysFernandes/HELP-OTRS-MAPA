# Help OTRS - MAPA

![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Ferramenta de alerta configurável para sistemas OTRS (MAPA, SFB, MT, etc). Extensão Chrome que auxilia técnicos de suporte com validações automáticas e alertas inteligentes.

## 🚀 Funcionalidades

### ✅ Sistema de Alertas Inteligentes

- **Validação de Filas**: Alerta quando usuário abre chamado em fila incorreta
- **Tipo de Atendimento**: Validação automática baseada na fila selecionada
  - **Técnico Local**: Exige tipo "Presencial"
  - **Técnico Remoto/Nível 1**: Exige tipo "Remoto"
- **Normalização de Níveis**: Reconhece variações como "Nível1 - Serviços aos usuários de TIC"
- **Alertas de Classificação**: Notificações na janela de classificação sobre tipo de atendimento

### 🎯 Validação de Janela de Classificação

- **Detecção Automática**: Identifica janelas de classificação/nota do OTRS
- **Alertas de Conscientização**: Notifica usuário sobre seleção do tipo de atendimento
- **Monitoramento em Tempo Real**: Observa mudanças nos campos críticos
- **Informações Contextual**: Explica diferenças entre atendimento Presencial e Remoto

### 📋 Reaproveitamento de Dados

- **Campos Prioritários**: Suporte especial para ServiceID e Localidade
- **Estratégias Múltiplas**: 5 métodos de captura para campos complexos
- **Interface InputField_Container**: Suporte completo para OTRS modernizado

### ⚙️ Configuração Flexível

- **Multi-OTRS**: Suporte a múltiplos sistemas OTRS
- **Controle de Recursos**: Habilitar/desabilitar funcionalidades específicas
- **Interface Moderna**: Página de configurações com feedback visual
- **Auto-Sync**: Sincronização automática entre abas

### 🔧 Sistema de Debug

- Funções de teste integradas via `helpOtrsDebug`
- Logs detalhados para desenvolvimento
- Informações de versão acessíveis

## 📦 Instalação

### Método 1: Chrome Web Store

_Em breve disponível_

### Método 2: Instalação Manual

1. Baixe a versão mais recente dos [Releases](https://github.com/CharllysFernandes/HELP-OTRS-MAPA/releases)
2. Descompacte o arquivo ZIP
3. Acesse `chrome://extensions/` no Chrome
4. Ative o "Modo do desenvolvedor"
5. Clique em "Carregar sem compactação"
6. Selecione a pasta descompactada

### Método 3: Build Local

```bash
# Clone o repositório
git clone https://github.com/CharllysFernandes/HELP-OTRS-MAPA.git
cd HELP-OTRS-MAPA

# Execute o build
node build.js

# Carregue o arquivo help-otrs-v*.zip no Chrome
```

## ⚙️ Configuração

1. **Primeira Configuração**:

   - Clique no ícone da extensão na barra de ferramentas
   - Configure ao menos um sistema OTRS
   - Defina seu perfil de usuário

2. **Adicionar Sistema OTRS**:

   - Nome: Ex: "MAPA Produção"
   - URL Base: Ex: "https://sistemas.mapa.gov.br/otrs/"
   - Perfil: Ex: "Nível 1", "Técnico Local", etc.

3. **Recursos Disponíveis**:
   - ✅ Alertas de Fila Habilitados
   - ✅ Alertas de Tipo de Atendimento
   - ✅ Alertas de Classificação de Serviço
   - ✅ Validação de Fila no Zoom

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
help-otrs-mapa/
├── manifest.json          # Configuração da extensão
├── background.js          # Service worker
├── script.js             # Content script principal
├── options.html          # Interface de configurações
├── options.js           # Lógica das configurações
├── options.css          # Estilos da interface
├── logo.png            # Ícone da extensão
├── CHANGELOG.md        # Histórico de versões
├── package.json        # Configurações NPM
├── version-bump.js     # Script de versionamento
└── build.js           # Script de build
```

### Scripts Disponíveis

````bash
### Scripts Disponíveis

```bash
# Sistema Python (Recomendado)
# Incrementar versão
npm run version:patch    # python scripts/version_bump.py patch
npm run version:minor    # python scripts/version_bump.py minor
npm run version:major    # python scripts/version_bump.py major

# Build completo
npm run build           # python scripts/build.py patch
npm run build:minor     # python scripts/build.py minor
npm run build:major     # python scripts/build.py major

# Release automático GitHub
npm run release         # python scripts/release.py create
npm run release:minor   # python scripts/release.py create minor
npm run release:major   # python scripts/release.py create major

# Utilidades
npm run release:dry-run # Simular release
npm run release:list    # Listar releases

# Sistema Legacy Node.js
npm run version:patch:legacy    # node src/utils/version-bump.js patch
npm run build:legacy           # node src/utils/build.js patch
npm run build:webpack          # webpack --mode production
````

### Sistema Python vs Node.js

| Funcionalidade       | Node.js (Legacy) | Python (Novo)                   |
| -------------------- | ---------------- | ------------------------------- |
| ✅ Version Bump      | Básico           | Completo + CHANGELOG automático |
| ✅ Build ZIP         | Simples          | Otimizado com estrutura dist/   |
| ❌/✅ GitHub Release | Manual           | Automático via API              |
| ❌/✅ Cleanup        | -                | Remove builds antigos           |
| ❌/✅ Dry Run        | -                | Simulação de operações          |
| ⚠️/✅ Validações     | Básicas          | Completas com relatórios        |

**Recomendação**: Use o sistema Python para desenvolvimento moderno.

````

### Configuração de Release GitHub

Para usar o sistema de releases automáticos:

```bash
# Windows PowerShell
$env:GITHUB_TOKEN = "seu_token_github_aqui"

# Linux/Mac
export GITHUB_TOKEN="seu_token_github_aqui"

# Testar configuração
python scripts/release.py list
````

**Obtenção do Token GitHub:**

1. Acesse: Settings → Developer settings → Personal access tokens
2. Gere token com permissões: `repo`, `write:packages`
3. Configure a variável de ambiente

### Funções de Debug

Abra o console do navegador e use:

```javascript
// Verificar versão
helpOtrsDebug.getVersion();

// Testar detecção de URL
helpOtrsDebug.testCurrentUrl();

// Testar normalização de níveis
helpOtrsDebug.testLevelNormalization("Nível1 - Serviços aos usuários de TIC");

// Testar validações de tipo de atendimento
helpOtrsDebug.testAllServiceTypeValidation();

// Forçar reinicialização
helpOtrsDebug.reinitialize();
```

## 📋 Sistemas Testados

- ✅ MAPA (Ministério da Agricultura)
- ✅ SFB (Serviço Florestal Brasileiro)

## 🔄 Versionamento

Este projeto usa [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR**: Mudanças incompatíveis
- **MINOR**: Novas funcionalidades compatíveis
- **PATCH**: Correções de bugs

## 📝 Changelog

Veja [CHANGELOG.md](CHANGELOG.md) para histórico completo de versões.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 👥 Autores

- **João Felipe Lima** - Desenvolvimento inicial
- **Charllys Fernandes** - Desenvolvimento e manutenção

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 Issues: [GitHub Issues](https://github.com/CharllysFernandes/HELP-OTRS-MAPA/issues)
- 📚 Documentação: [Wiki do Projeto](https://github.com/CharllysFernandes/HELP-OTRS-MAPA/wiki)

---

**Feito com ❤️ para a comunidade OTRS brasileira**
