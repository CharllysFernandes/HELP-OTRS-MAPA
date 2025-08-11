# Changelog - Help OTRS MAPA

Todas as mudanças importantes do projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.2.0] - 2025-08-11

### ✨ Adicionado

- **🎯 Funcionalidade "Reaproveitar Dados do Formulário"**

  - Interface popup moderna e arrastável para reaproveitamento de dados
  - **🔍 Captura Dinâmica de Campos**: Detecta automaticamente todos os campos com estrutura `<div class="Field">`
  - **🏷️ Categorização Automática**: Organiza campos por tipo baseado no ID e título (Cliente, Contato, Localização, Patrimônio, etc.)
  - **🎯 Detecção Inteligente de Ícones**: Atribui ícones automáticos baseados no tipo de campo
  - Botão flutuante para acesso rápido à funcionalidade
  - Feedback visual ao inserir dados no editor
  - Observador de mudanças em tempo real nos formulários

- **🔧 Suporte Avançado ao CKEditor (Znuny)**

  - Detecção específica de iframes CKEditor (`iframe.cke_wysiwyg_frame`)
  - Sistema de espera para carregamento completo do editor
  - Inserção otimizada de dados com formatação HTML
  - Posicionamento automático do cursor após inserção
  - Disparo de eventos de mudança para compatibilidade total

- **📋 Captura Dinâmica de Formulários**

  - **Suporte Universal**: Funciona com qualquer campo dentro de `<div class="Field">` com atributo `title`
  - **Tipos Suportados**: input, select, textarea de todos os tipos
  - **Categorização Inteligente**: 7 categorias automáticas (Cliente, Contato, Localização, Patrimônio, Organizacional, Geral)
  - **Observador Avançado**: Detecta novos campos adicionados dinamicamente à página
  - **Debounce de Input**: Otimizado para não sobrecarregar com atualizações frequentes

- **🎨 Interface Visual Moderna**
  - Design com gradientes e efeitos blur
  - Animações suaves de entrada e saída
  - Popup redimensionável e posicionável pelo usuário
  - Categorização visual com ícones e cores
  - Scrollbar customizada e responsividade

### 🔧 Melhorado

- Sistema de detecção de editores mais robusto com múltiplos seletores
- Tratamento assíncrono para aguardar carregamento do CKEditor
- Captura de dados expandida para checkbox, radio, select e textarea
- Observador de formulário otimizado com detecção de `div.Field`
- Logs detalhados para debugging da funcionalidade
- Fallback para inserção em caso de erro de acesso ao iframe

## [2.1.0] - 2025-08-11

### ✅ Adicionado

- Sistema de validação automática de tipo de atendimento para filas específicas
- Normalização inteligente de níveis de usuário (Nível 1/2 - Serviços aos usuários de TIC)
- Sistema de alertas personalizados para Técnico Local (exige tipo "Presencial")
- Sistema de alertas personalizados para Técnico Remoto/Nível 1 (exige tipo "Remoto")
- Tooltip informativo no ícone da extensão com instruções
- Sistema de debug avançado com funções de teste
- Mapeamento completo de sinônimos para níveis de usuário
- Sistema de versionamento automatizado

### 🔧 Melhorado

- Sistema de detecção de URL mais robusto com fallback
- ConfigManager com normalização avançada de níveis
- Interface de configuração com alertas visuais aprimorados
- Sistema de comparação de níveis mais preciso
- Logs de debug mais detalhados e informativos

### 🐛 Corrigido

- Erro na comparação de níveis com variações de nome (maiúscula/minúscula)
- Mapeamento de sinônimos agora funciona corretamente em minúsculas
- Problema na detecção de filas "Nível1 - Serviços aos usuários de TIC"
- Validação incorreta quando tipos de atendimento mudavam

### 🔄 Alterado

- Estrutura do ConfigManager para melhor organização
- Método de normalização de níveis mais eficiente
- Sistema de alertas mais responsivo

## [2.0.0] - 2025-07-15

### ✅ Adicionado

- Suporte completo a Manifest V3
- Sistema de configuração multi-OTRS
- Interface de configurações avançadas com gerenciamento de recursos
- Sistema de armazenamento sincronizado via Chrome Storage
- Detecção automática de sistemas OTRS configurados
- Página de opções moderna e responsiva

### ❌ Removido

- Dependência de permissões dinâmicas (não suportadas no Manifest V3)
- Suporte a Manifest V2 (descontinuado)
- Configurações hardcoded no código

### 🔄 Alterado

- Arquitetura completa migrada para Manifest V3
- Sistema de background scripts convertido para Service Workers
- Método de injeção de scripts atualizado

## [1.x.x] - Versões Anteriores

### Funcionalidades Base

- Sistema básico de alertas para filas OTRS
- Detecção de níveis de usuário
- Alertas para abertura de chamados em filas incorretas
- Suporte aos sistemas MAPA, SFB e MT
- Interface básica de configuração

---

## Tipos de Mudanças

- `✅ Adicionado` para novas funcionalidades
- `🔧 Melhorado` para mudanças em funcionalidades existentes
- `🐛 Corrigido` para correção de bugs
- `❌ Removido` para funcionalidades removidas
- `🔄 Alterado` para mudanças que não se encaixam nas outras categorias
- `🔒 Segurança` para vulnerabilidades corrigidas

## Links de Comparação

- [2.1.0]: https://github.com/CharllysFernandes/HELP-OTRS-MAPA/compare/v2.0.0...v2.1.0
- [2.0.0]: https://github.com/CharllysFernandes/HELP-OTRS-MAPA/compare/v1.0.0...v2.0.0
