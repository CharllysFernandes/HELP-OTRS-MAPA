/**
 * FormDataReuser - Reaproveitamento de Dados do Formulário
 * Versão otimizada com cache DOM, benchmarks e tratamento de erros
 * 
 * Responsável por capturar, armazenar e reutilizar dados de 
 * formulários OTRS entre diferentes páginas e tickets.
 * 
 * @author Help OTRS Team
 * @version 2.3.0
 */

(function(global) {
    'use strict';

    class FormDataReuser {
        constructor(configManager, alertSystem) {
            this.configManager = configManager;
            this.alertSystem = alertSystem;
            this.popup = null;
            this.isVisible = false;
            this.formData = {};
            this.targetEditor = null;
            this.observerActive = false;
            this.domCache = new Map();
            this.performanceMetrics = new Map();
            this.isEnabled = true;
            this.mutationObserver = null;
            this.debounceTimer = null;
            this.editorCache = new Map();
            
            this.validateDependencies();
        }

        /**
         * Validar dependências obrigatórias
         * @throws {Error} Se dependências não estiverem disponíveis
         */
        validateDependencies() {
            if (!this.configManager) {
                throw new Error('ConfigManager é obrigatório para FormDataReuser');
            }
            if (!this.alertSystem) {
                console.warn('AlertSystem não fornecido - alertas não serão exibidos');
            }
        }

        /**
         * Cache DOM inteligente com timeout
         * @param {string} selector - Seletor CSS
         * @param {number} timeout - Timeout do cache em ms (padrão: 3000)
         * @returns {HTMLElement|null} Elemento encontrado ou null
         */
        getCachedElement(selector, timeout = 3000) {
            try {
                const cacheKey = `dom_${selector}`;
                
                // Verificar cache existente
                if (this.domCache.has(cacheKey)) {
                    const cached = this.domCache.get(cacheKey);
                    if (Date.now() - cached.timestamp < timeout) {
                        // Validar se elemento ainda está no DOM
                        if (cached.element && document.contains(cached.element)) {
                            return cached.element;
                        }
                    }
                    // Cache expirado ou elemento removido
                    this.domCache.delete(cacheKey);
                }
                
                // Buscar elemento
                const element = document.querySelector(selector);
                
                // Armazenar no cache
                this.domCache.set(cacheKey, {
                    element,
                    timestamp: Date.now(),
                    selector
                });
                
                return element;
            } catch (error) {
                this.log('error', `Erro ao obter elemento ${selector}`, error);
                return null;
            }
        }

        /**
         * Cache múltiplos elementos DOM
         * @param {string} selector - Seletor CSS
         * @param {number} timeout - Timeout do cache em ms (padrão: 3000)
         * @returns {NodeList} Lista de elementos
         */
        getCachedElements(selector, timeout = 3000) {
            try {
                const cacheKey = `elements_${selector}`;
                
                // Verificar cache existente
                if (this.domCache.has(cacheKey)) {
                    const cached = this.domCache.get(cacheKey);
                    if (Date.now() - cached.timestamp < timeout) {
                        // Validar se pelo menos um elemento ainda está no DOM
                        if (cached.elements.length > 0 && document.contains(cached.elements[0])) {
                            return cached.elements;
                        }
                    }
                    this.domCache.delete(cacheKey);
                }
                
                // Buscar elementos
                const elements = document.querySelectorAll(selector);
                
                // Armazenar no cache
                this.domCache.set(cacheKey, {
                    elements,
                    timestamp: Date.now(),
                    selector
                });
                
                return elements;
            } catch (error) {
                this.log('error', `Erro ao obter elementos ${selector}`, error);
                return [];
            }
        }

        /**
         * Limpar cache DOM seletivamente
         * @param {string} pattern - Padrão regex opcional para limpeza seletiva
         */
        clearDOMCache(pattern = null) {
            try {
                if (!pattern) {
                    const size = this.domCache.size;
                    this.domCache.clear();
                    this.log('info', `Cache DOM limpo completamente - ${size} entradas removidas`);
                    return;
                }
                
                const regex = new RegExp(pattern);
                let removed = 0;
                for (const key of this.domCache.keys()) {
                    if (regex.test(key)) {
                        this.domCache.delete(key);
                        removed++;
                    }
                }
                this.log('info', `Cache DOM limpo seletivamente - ${removed} entradas removidas`);
            } catch (error) {
                this.log('error', 'Erro ao limpar cache DOM', error);
            }
        }

        /**
         * Sistema de benchmark para medir performance
         * @param {string} name - Nome da operação
         * @param {Function} operation - Função a ser executada
         * @returns {*} Resultado da operação
         */
        async benchmark(name, operation) {
            if (!this.isEnabled) {
                return await operation();
            }
            
            const startTime = performance.now();
            const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
            
            try {
                const result = await operation();
                
                const endTime = performance.now();
                const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                const duration = endTime - startTime;
                const memoryDelta = endMemory - startMemory;
                
                this.performanceMetrics.set(name, {
                    duration,
                    memoryDelta,
                    timestamp: new Date().toISOString(),
                    success: true
                });
                
                this.log('info', `Benchmark ${name}: ${duration.toFixed(2)}ms, Memória: ${(memoryDelta / 1024).toFixed(2)}KB`);
                
                return result;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.performanceMetrics.set(name, {
                    duration,
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error.message
                });
                
                this.log('error', `Benchmark ${name} falhou após ${duration.toFixed(2)}ms`, error);
                throw error;
            }
        }

        /**
         * Obter métricas de performance
         * @returns {Object} Métricas coletadas
         */
        getPerformanceMetrics() {
            const metrics = {};
            for (const [name, data] of this.performanceMetrics.entries()) {
                metrics[name] = data;
            }
            return metrics;
        }

        /**
         * Log estruturado para debug
         * @param {string} level - Nível do log (info, warn, error)
         * @param {string} message - Mensagem
         * @param {Object} data - Dados adicionais
         */
        log(level, message, data = null) {
            if (!this.isEnabled && level !== 'error') return;

            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] Help OTRS FormDataReuser: ${message}`;
            
            try {
                switch (level.toLowerCase()) {
                    case 'error':
                        console.error(logMessage, data);
                        break;
                    case 'warn':
                        console.warn(logMessage, data);
                        break;
                    case 'info':
                    default:
                        console.log(logMessage, data);
                        break;
                }
            } catch (error) {
                try {
                    console.log(`FormDataReuser Log Error: ${error.message}`);
                } catch (e) {
                    // Silenciar se console totalmente indisponível
                }
            }
        }

        /**
         * Mapear campos do formulário OTRS para rótulos amigáveis
         * @returns {Object} Mapeamentos de campos
         */
        getFieldMappings() {
            return this.benchmark('getFieldMappings', async () => {
                try {
                    // Capturar dinamicamente todos os campos Field
                    const dynamicMappings = await this.captureDynamicFields();
                    
                    // Mapeamentos estáticos (para compatibilidade com versões antigas)
                    const staticMappings = {
                        // Campos de cliente
                        'CustomerUser': { label: '👤 Usuário Cliente', category: 'cliente' },
                        'CustomerID': { label: '🏢 ID do Cliente', category: 'cliente' },
                        
                        // Campos de contato
                        'DynamicField_PRIRamal': { label: '📞 Ramal/Contato', category: 'contato' },
                        'DynamicField_PRITelefone': { label: '📱 Telefone', category: 'contato' },
                        'DynamicField_PRIEmail': { label: '📧 E-mail', category: 'contato' },
                        
                        // Campos de localização
                        'DynamicField_PRILocalidade': { label: '📍 Localidade', category: 'localizacao' },
                        'DynamicField_PRISala': { label: '🏠 Sala', category: 'localizacao' },
                        'DynamicField_PRIAndar': { label: '🏢 Andar', category: 'localizacao' },
                        'DynamicField_PRIPredio': { label: '🏛️ Prédio', category: 'localizacao' },
                        
                        // Campos de patrimônio
                        'DynamicField_PRIPatrimonio': { label: '💼 Patrimônio', category: 'patrimonio' },
                        'DynamicField_PRIEquipamento': { label: '💻 Equipamento', category: 'patrimonio' },
                        'DynamicField_PRISerial': { label: '🔢 Número Serial', category: 'patrimonio' },
                        
                        // Campos adicionais
                        'DynamicField_PRISetor': { label: '🏛️ Setor', category: 'organizacional' },
                        'DynamicField_PRIDepartamento': { label: '🏢 Departamento', category: 'organizacional' },
                        'DynamicField_PRIObservacoes': { label: '📝 Observações', category: 'adicional' }
                    };

                    // Mesclar mapeamentos dinâmicos com estáticos (dinâmicos têm prioridade)
                    const result = { ...staticMappings, ...dynamicMappings };
                    this.log('info', `Mapeamentos de campos obtidos: ${Object.keys(result).length} campos`);
                    return result;
                } catch (error) {
                    this.log('error', 'Erro ao obter mapeamentos de campos', error);
                    // Fallback para mapeamentos estáticos básicos
                    return {
                        'CustomerUser': { label: '👤 Usuário Cliente', category: 'cliente' },
                        'CustomerID': { label: '🏢 ID do Cliente', category: 'cliente' }
                    };
                }
            });
        }

        /**
         * Capturar campos dinamicamente da estrutura <div class="Field">
         * @returns {Object} Mapeamentos dinâmicos
         */
        captureDynamicFields() {
            return this.benchmark('captureDynamicFields', async () => {
                try {
                    const dynamicMappings = {};
                    
                    // Usar cache para buscar todos os divs com class="Field"
                    const fieldDivs = this.getCachedElements('div.Field');
                    
                    if (fieldDivs.length === 0) {
                        this.log('warn', 'Nenhum div.Field encontrado no DOM');
                        return dynamicMappings;
                    }
                    
                    let processed = 0;
                    let successful = 0;
                    
                    fieldDivs.forEach((fieldDiv) => {
                        processed++;
                        try {
                            // Procurar input, select, ou textarea dentro do Field
                            const input = fieldDiv.querySelector('input, select, textarea');
                            
                            if (input && input.id && input.title) {
                                const fieldId = input.id;
                                const fieldTitle = input.title.trim();
                                
                                // Determinar categoria baseada no nome do campo
                                const category = this.categorizeField(fieldId, fieldTitle);
                                
                                // Determinar ícone baseado no tipo de campo
                                const icon = this.getFieldIcon(fieldId, fieldTitle, input.type);
                                
                                dynamicMappings[fieldId] = {
                                    label: `${icon} ${fieldTitle}`,
                                    category: category
                                };
                                
                                successful++;
                                this.log('info', `Campo dinâmico capturado: ${fieldId} (${category})`);
                            }
                        } catch (error) {
                            this.log('error', `Erro ao processar campo dinâmico: ${error.message}`);
                        }
                    });

                    this.log('info', `Campos dinâmicos processados: ${successful}/${processed} com sucesso`);
                    return dynamicMappings;
                } catch (error) {
                    this.log('error', 'Erro na captura de campos dinâmicos', error);
                    return {};
                }
            });
        }

        /**
         * Categorizar campo baseado no ID e título
         * @param {string} fieldId 
         * @param {string} fieldTitle 
         * @returns {string}
         */
        categorizeField(fieldId, fieldTitle) {
            try {
                const id = fieldId.toLowerCase();
                const title = fieldTitle.toLowerCase();
                
                // Regras de categorização com fallback
                const categoryRules = [
                    {
                        category: 'cliente',
                        keywords: ['customer', 'cliente', 'usuário']
                    },
                    {
                        category: 'contato', 
                        keywords: ['ramal', 'telefone', 'email', 'contato']
                    },
                    {
                        category: 'localizacao',
                        keywords: ['sala', 'local', 'andar', 'predio', 'endereco', 'prédio', 'endereço']
                    },
                    {
                        category: 'patrimonio',
                        keywords: ['patrimonio', 'equipamento', 'serial', 'tag', 'patrimônio']
                    },
                    {
                        category: 'organizacional',
                        keywords: ['setor', 'departamento', 'orgao', 'unidade', 'órgão']
                    }
                ];
                
                for (const rule of categoryRules) {
                    if (rule.keywords.some(keyword => id.includes(keyword) || title.includes(keyword))) {
                        return rule.category;
                    }
                }
                
                return 'geral';
            } catch (error) {
                this.log('error', 'Erro na categorização de campo', error);
                return 'geral';
            }
        }

        /**
         * Obter ícone baseado no tipo de campo
         * @param {string} fieldId 
         * @param {string} fieldTitle 
         * @param {string} inputType 
         * @returns {string}
         */
        getFieldIcon(fieldId, fieldTitle, inputType) {
            try {
                const id = fieldId.toLowerCase();
                const title = fieldTitle.toLowerCase();
                
                // Mapeamento de ícones com fallback
                const iconRules = [
                    { keywords: ['customer', 'cliente', 'usuário'], icon: '👤' },
                    { keywords: ['ramal'], icon: '📞' },
                    { keywords: ['telefone'], icon: '📱' },
                    { keywords: ['email'], icon: '📧' },
                    { keywords: ['sala'], icon: '🏠' },
                    { keywords: ['local'], icon: '📍' },
                    { keywords: ['andar'], icon: '🏢' },
                    { keywords: ['predio', 'prédio'], icon: '🏛️' },
                    { keywords: ['patrimonio', 'patrimônio'], icon: '💼' },
                    { keywords: ['equipamento'], icon: '💻' },
                    { keywords: ['serial'], icon: '🔢' },
                    { keywords: ['setor'], icon: '🏛️' },
                    { keywords: ['departamento'], icon: '🏢' },
                    { keywords: ['observ', 'descri'], icon: '📝' }
                ];
                
                // Verificar regras por palavra-chave
                for (const rule of iconRules) {
                    if (rule.keywords.some(keyword => id.includes(keyword) || title.includes(keyword))) {
                        return rule.icon;
                    }
                }
                
                // Verificar por tipo de input
                const typeIcons = {
                    'email': '📧',
                    'date': '📅',
                    'time': '⏰',
                    'url': '🔗',
                    'number': '🔢'
                };
                
                return typeIcons[inputType] || '📄';
            } catch (error) {
                this.log('error', 'Erro ao obter ícone do campo', error);
                return '📄';
            }
        }

        /**
         * Aguardar o carregamento completo do CKEditor
         * @param {HTMLElement} editor 
         * @param {number} maxAttempts 
         * @returns {Promise<HTMLElement>}
         */
        async waitForEditorReady(editor, maxAttempts = 10) {
            return this.benchmark('waitForEditorReady', async () => {
                try {
                    if (!editor || editor.tagName !== 'IFRAME') {
                        this.log('warn', 'Editor não é um IFRAME, retornando diretamente');
                        return editor;
                    }

                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        try {
                            const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                            if (iframeDoc && iframeDoc.body && iframeDoc.readyState === 'complete') {
                                // Verificar se o body está realmente editável
                                if (iframeDoc.body.contentEditable !== 'false') {
                                    this.log('info', `CKEditor pronto após ${attempt + 1} tentativas`);
                                    return editor;
                                }
                            }
                        } catch (e) {
                            this.log('warn', `Tentativa ${attempt + 1} falhou - aguardando...`, { error: e.message });
                        }
                        
                        // Aguardar 500ms antes da próxima tentativa
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    this.log('warn', `Timeout aguardando CKEditor ficar pronto após ${maxAttempts} tentativas`);
                    return editor; // Retornar mesmo que não esteja totalmente pronto
                } catch (error) {
                    this.log('error', 'Erro ao aguardar CKEditor ficar pronto', error);
                    return editor;
                }
            });
        }

        /**
         * Capturar dados preenchidos nos formulários
         * @returns {boolean} True se dados foram capturados
         */
        captureFormData() {
            return this.benchmark('captureFormData', async () => {
                try {
                    const mappings = await this.getFieldMappings();
                    const capturedData = {};
                    
                    if (!mappings || Object.keys(mappings).length === 0) {
                        this.log('warn', 'Nenhum mapeamento de campo disponível');
                        return false;
                    }
                    
                    let processed = 0;
                    let successful = 0;
                    
                    for (const fieldId of Object.keys(mappings)) {
                        processed++;
                        try {
                            const field = this.getCachedElement(`#${fieldId}`);
                            const mapping = mappings[fieldId];
                            
                            let value = null;

                            if (field) {
                                // Capturar valor baseado no tipo de campo
                                if (field.type === 'select-one' || field.tagName === 'SELECT') {
                                    const selectedOption = field.selectedOptions[0];
                                    if (selectedOption && selectedOption.value && selectedOption.value !== '') {
                                        value = selectedOption.textContent.trim();
                                    }
                                } else if (field.type === 'checkbox') {
                                    if (field.checked) {
                                        value = field.value || 'Sim';
                                    }
                                } else if (field.type === 'radio') {
                                    if (field.checked) {
                                        value = field.value;
                                    }
                                } else if (field.tagName === 'TEXTAREA') {
                                    value = field.value.trim();
                                } else {
                                    // Input text, email, number, date, etc.
                                    value = field.value.trim();
                                }
                                
                                // Verificar também campos de pesquisa (Search fields)
                                if (!value || value === '') {
                                    const searchField = this.getCachedElement(`#${fieldId}_Search`);
                                    if (searchField && searchField.nextElementSibling) {
                                        const displayValue = searchField.nextElementSibling.textContent?.trim();
                                        if (displayValue && displayValue !== '' && !displayValue.includes('Selecione')) {
                                            value = displayValue;
                                        }
                                    }
                                }
                            }

                            // Adicionar aos dados capturados se tiver valor válido
                            if (value && value.length > 0 && value !== '0' && value !== 'null') {
                                capturedData[fieldId] = {
                                    label: mapping.label,
                                    value: value,
                                    category: mapping.category
                                };
                                successful++;
                            }
                        } catch (error) {
                            this.log('error', `Erro ao capturar campo ${fieldId}`, error);
                        }
                    }

                    this.formData = capturedData;
                    this.log('info', `Captura de dados concluída: ${successful}/${processed} campos processados`);
                    return successful > 0;
                } catch (error) {
                    this.log('error', 'Erro na captura de dados do formulário', error);
                    return false;
                }
            });
        }

        /**
         * Encontrar editor de texto (iframe ou textarea) com cache
         * @returns {HTMLElement|null}
         */
        findTextEditor() {
            return this.benchmark('findTextEditor', async () => {
                try {
                    const cacheKey = 'textEditor';
                    
                    // Verificar cache de editor (cache mais longo para editores)
                    if (this.editorCache.has(cacheKey)) {
                        const cached = this.editorCache.get(cacheKey);
                        if (Date.now() - cached.timestamp < 5000) { // 5 segundos para editores
                            if (cached.editor && document.contains(cached.editor)) {
                                this.log('info', 'Editor recuperado do cache');
                                return cached.editor;
                            }
                        }
                        this.editorCache.delete(cacheKey);
                    }
                    
                    // Lista de seletores priorizando CKEditor
                    const editorSelectors = [
                        // CKEditor iframes (Znuny/OTRS)
                        'iframe.cke_wysiwyg_frame',
                        'iframe[title*="Editor"]',
                        'iframe[title*="RichText"]', 
                        'iframe[class*="cke"]',
                        // Outros iframes de editores
                        'iframe[id*="RTE"]',
                        'iframe[name*="RTE"]',
                        'iframe[src*="ckeditor"]',
                        // Textareas como fallback
                        'textarea[id*="RTE"]',
                        'textarea[name*="Body"]',
                        'textarea[id*="Body"]',
                        'textarea.RichText'
                    ];

                    for (const selector of editorSelectors) {
                        const editor = this.getCachedElement(selector);
                        if (editor) {
                            // Armazenar no cache de editores
                            this.editorCache.set(cacheKey, {
                                editor,
                                timestamp: Date.now(),
                                selector
                            });
                            
                            this.log('info', `Editor encontrado: ${selector}`);
                            return editor;
                        }
                    }

                    this.log('warn', 'Nenhum editor de texto encontrado');
                    return null;
                } catch (error) {
                    this.log('error', 'Erro ao encontrar editor de texto', error);
                    return null;
                }
            });
        }

        /**
         * Inserir texto no editor com tratamento robusto de erros
         * @param {string} text 
         * @returns {Promise<boolean>}
         */
        async insertTextInEditor(text) {
            return this.benchmark('insertTextInEditor', async () => {
                try {
                    if (!text || typeof text !== 'string') {
                        this.log('warn', 'Texto inválido para inserção');
                        return false;
                    }
                    
                    const editor = await this.findTextEditor();
                    if (!editor) {
                        this.log('warn', 'Editor não encontrado para inserção');
                        return false;
                    }

                    if (editor.tagName === 'IFRAME') {
                        // CKEditor ou similar
                        const readyEditor = await this.waitForEditorReady(editor);
                        
                        try {
                            const iframeDoc = readyEditor.contentDocument || readyEditor.contentWindow.document;
                            
                            if (iframeDoc && iframeDoc.body) {
                                // Inserir no final do conteúdo existente
                                const currentContent = iframeDoc.body.innerHTML;
                                const newContent = currentContent + (currentContent ? '<br><br>' : '') + 
                                                 text.replace(/\n/g, '<br>');
                                iframeDoc.body.innerHTML = newContent;
                                
                                // Disparar evento de mudança se possível
                                try {
                                    const changeEvent = new Event('input', { bubbles: true });
                                    iframeDoc.body.dispatchEvent(changeEvent);
                                } catch (e) {
                                    this.log('warn', 'Não foi possível disparar evento de mudança no CKEditor');
                                }
                                
                                this.log('info', 'Texto inserido no CKEditor com sucesso');
                                return true;
                            }
                        } catch (crossOriginError) {
                            this.log('error', 'Erro de cross-origin ao acessar CKEditor', crossOriginError);
                            return false;
                        }
                    } else if (editor.tagName === 'TEXTAREA') {
                        // Textarea simples
                        const currentValue = editor.value || '';
                        const newValue = currentValue + (currentValue ? '\n\n' : '') + text;
                        editor.value = newValue;
                        
                        // Disparar eventos para notificar mudança
                        editor.dispatchEvent(new Event('input', { bubbles: true }));
                        editor.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        this.log('info', 'Texto inserido no textarea com sucesso');
                        return true;
                    }
                    
                    this.log('warn', 'Tipo de editor não suportado');
                    return false;
                } catch (error) {
                    this.log('error', 'Erro ao inserir texto no editor', error);
                    return false;
                }
            });
        }

        /**
         * Gerar resumo formatado dos dados
         * @param {Array} selectedFields 
         * @returns {string}
         */
        generateDataSummary(selectedFields) {
            return this.benchmark('generateDataSummary', async () => {
                try {
                    if (!selectedFields || selectedFields.length === 0) {
                        this.log('warn', 'Nenhum campo selecionado para resumo');
                        return '';
                    }

                    const categories = {
                        cliente: { title: '👤 DADOS DO CLIENTE', fields: [] },
                        contato: { title: '📞 CONTATO', fields: [] },
                        localizacao: { title: '📍 LOCALIZAÇÃO', fields: [] },
                        patrimonio: { title: '💼 PATRIMÔNIO', fields: [] },
                        organizacional: { title: '🏢 ORGANIZACIONAL', fields: [] },
                        geral: { title: '📄 INFORMAÇÕES GERAIS', fields: [] }
                    };

                    let processedFields = 0;
                    
                    // Agrupar campos por categoria
                    selectedFields.forEach(fieldId => {
                        try {
                            const fieldData = this.formData[fieldId];
                            if (fieldData) {
                                const category = fieldData.category || 'geral';
                                if (categories[category]) {
                                    categories[category].fields.push({
                                        label: fieldData.label.replace(/^[^\s]+ /, ''), // Remover emoji do label
                                        value: fieldData.value
                                    });
                                    processedFields++;
                                }
                            }
                        } catch (error) {
                            this.log('error', `Erro ao processar campo ${fieldId} para resumo`, error);
                        }
                    });

                    // Gerar texto formatado
                    let summary = '';
                    let categoriesWithContent = 0;
                    
                    Object.values(categories).forEach(category => {
                        if (category.fields.length > 0) {
                            categoriesWithContent++;
                            if (summary) summary += '\n\n';
                            summary += category.title + '\n';
                            summary += '─'.repeat(category.title.length) + '\n';
                            
                            category.fields.forEach(field => {
                                summary += `• ${field.label}: ${field.value}\n`;
                            });
                        }
                    });
                    
                    this.log('info', `Resumo gerado: ${processedFields} campos em ${categoriesWithContent} categorias`);
                    return summary;
                } catch (error) {
                    this.log('error', 'Erro ao gerar resumo de dados', error);
                    return '';
                }
            });
        }

        /**
         * Obter dados organizados por categoria
         * @returns {Object}
         */
        getOrganizedData() {
            return this.benchmark('getOrganizedData', async () => {
                try {
                    const categories = {
                        cliente: { title: '👤 Cliente', fields: [] },
                        contato: { title: '📞 Contato', fields: [] },
                        localizacao: { title: '📍 Localização', fields: [] },
                        patrimonio: { title: '💼 Patrimônio', fields: [] },
                        organizacional: { title: '🏢 Organizacional', fields: [] },
                        geral: { title: '📄 Geral', fields: [] }
                    };

                    let totalFields = 0;
                    
                    Object.keys(this.formData).forEach(fieldId => {
                        try {
                            const fieldData = this.formData[fieldId];
                            const category = fieldData.category || 'geral';
                            
                            if (categories[category]) {
                                categories[category].fields.push({
                                    id: fieldId,
                                    label: fieldData.label,
                                    value: fieldData.value
                                });
                                totalFields++;
                            }
                        } catch (error) {
                            this.log('error', `Erro ao organizar campo ${fieldId}`, error);
                        }
                    });
                    
                    this.log('info', `Dados organizados: ${totalFields} campos em ${Object.keys(categories).length} categorias`);
                    return categories;
                } catch (error) {
                    this.log('error', 'Erro ao organizar dados por categoria', error);
                    return {
                        geral: { title: '📄 Geral', fields: [] }
                    };
                }
            });
        }

        /**
         * Debounced form observation - evita execuções excessivas
         * @param {number} delay - Delay em ms (padrão: 500)
         */
        debouncedFormObservation(delay = 500) {
            try {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                
                this.debounceTimer = setTimeout(async () => {
                    await this.captureFormData();
                }, delay);
                
                this.log('info', `Observação de formulário agendada com debounce de ${delay}ms`);
            } catch (error) {
                this.log('error', 'Erro no debounced form observation', error);
            }
        }

        /**
         * Inicializar funcionalidade com tratamento robusto
         */
        init() {
            return this.benchmark('init', async () => {
                try {
                    if (!this.configManager?.isFeatureEnabled('formDataReuser')) {
                        this.log('info', 'Funcionalidade de reaproveitamento de dados desabilitada');
                        this.isEnabled = false;
                        return;
                    }

                    this.log('info', 'Inicializando reaproveitamento de dados do formulário');
                    console.log('Help OTRS FormDataReuser: Iniciando inicialização...');
                    
                    await Promise.all([
                        this.setupEventListeners(),
                        this.initFormObserver(),
                        this.createFloatingButton() // Adicionar botão flutuante
                    ]);
                    
                    console.log('Help OTRS FormDataReuser: Todas as promessas resolvidas');
                    
                    // Captura inicial de dados
                    await this.captureFormData();
                    
                    this.log('info', 'Funcionalidade de reaproveitamento de dados inicializada com sucesso');
                } catch (error) {
                    this.log('error', 'Erro na inicialização do FormDataReuser', error);
                    this.isEnabled = false;
                }
            });
        }

        /**
         * Configurar event listeners otimizados
         */
        setupEventListeners() {
            return this.benchmark('setupEventListeners', async () => {
                try {
                    // Observar mudanças em formulários principais
                    const forms = this.getCachedElements('form');
                    let listenersAdded = 0;
                    
                    forms.forEach(form => {
                        try {
                            // Listener para mudanças em qualquer input do formulário
                            form.addEventListener('change', () => {
                                this.debouncedFormObservation(300);
                            });
                            
                            form.addEventListener('input', () => {
                                this.debouncedFormObservation(800); // Delay maior para input
                            });
                            
                            listenersAdded++;
                        } catch (error) {
                            this.log('error', 'Erro ao adicionar listener ao formulário', error);
                        }
                    });
                    
                    this.log('info', `Event listeners configurados em ${listenersAdded} formulários`);
                } catch (error) {
                    this.log('error', 'Erro ao configurar event listeners', error);
                }
            });
        }

        /**
         * Inicializar observador de formulários otimizado
         */
        initFormObserver() {
            return this.benchmark('initFormObserver', async () => {
                try {
                    if (this.mutationObserver) {
                        this.mutationObserver.disconnect();
                    }
                    
                    let observationCount = 0;
                    const maxObservations = 50; // Limite de observações para evitar loops
                    
                    // Observar mudanças no DOM relacionadas a formulários
                    this.mutationObserver = new MutationObserver((mutations) => {
                        // Verificar limite de observações
                        if (++observationCount > maxObservations) {
                            this.log('warn', `MutationObserver desabilitado após ${maxObservations} observações para evitar loop infinito`);
                            this.mutationObserver.disconnect();
                            return;
                        }
                        
                        let shouldUpdate = false;
                        
                        mutations.forEach(mutation => {
                            // Verificar se houve mudanças relevantes - mais específico
                            if (mutation.type === 'childList') {
                                const hasRelevantChanges = Array.from(mutation.addedNodes).some(node => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        // Apenas formulários e campos de entrada relevantes
                                        return node.matches?.('form, input[type="text"], input[type="email"], select, textarea') || 
                                               node.querySelector?.('form, input[type="text"], input[type="email"], select, textarea');
                                    }
                                    return false;
                                });
                                if (hasRelevantChanges) shouldUpdate = true;
                            } else if (mutation.type === 'attributes') {
                                // Apenas atributos value, selected, checked em elementos de formulário
                                const target = mutation.target;
                                if (target.matches?.('input, select, textarea') && 
                                    ['value', 'selected', 'checked'].includes(mutation.attributeName)) {
                                    shouldUpdate = true;
                                }
                            }
                        });
                        
                        if (shouldUpdate) {
                            this.debouncedFormObservation(2000); // Delay maior para reduzir frequência
                        }
                    });
                    
                    // Observar apenas containers de formulários específicos
                    const formContainers = document.querySelectorAll('form, .Content, #FormContainer');
                    let observersSetup = 0;
                    
                    if (formContainers.length > 0) {
                        formContainers.forEach(container => {
                            if (container && observersSetup < 3) { // Máximo 3 containers
                                this.mutationObserver.observe(container, {
                                    childList: true,
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ['value', 'selected', 'checked']
                                });
                                observersSetup++;
                            }
                        });
                        
                        this.observerActive = true;
                        this.log('info', `MutationObserver configurado em ${observersSetup} containers`);
                    } else {
                        // Fallback para document.body apenas se necessário
                        this.mutationObserver.observe(document.body, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['value', 'selected', 'checked']
                        });
                        
                        this.observerActive = true;
                        this.log('info', 'MutationObserver configurado no document.body (fallback)');
                    }
                } catch (error) {
                    this.log('error', 'Erro ao inicializar observador de formulários', error);
                }
            });
        }

        /**
         * Limpar recursos com dispose completo
         */
        destroy() {
            return this.benchmark('destroy', async () => {
                try {
                    // Limpar popup
                    if (this.popup) {
                        this.popup.remove();
                        this.popup = null;
                    }
                    
                    // Limpar debounce timer
                    if (this.debounceTimer) {
                        clearTimeout(this.debounceTimer);
                        this.debounceTimer = null;
                    }
                    
                    // Desconectar MutationObserver
                    if (this.mutationObserver) {
                        this.mutationObserver.disconnect();
                        this.mutationObserver = null;
                    }
                    
                    // Limpar caches
                    this.clearDOMCache();
                    this.editorCache.clear();
                    this.performanceMetrics.clear();
                    
                    // Reset de estado
                    this.isVisible = false;
                    this.observerActive = false;
                    this.targetEditor = null;
                    this.formData = {};
                    this.isEnabled = false;
                    
                    this.log('info', 'FormDataReuser destruído e recursos liberados');
                } catch (error) {
                    this.log('error', 'Erro durante destruição do FormDataReuser', error);
                }
            });
        }

        /**
         * Obter estatísticas dos dados capturados com métricas avançadas
         * @returns {Object}
         */
        getStats() {
            return this.benchmark('getStats', async () => {
                try {
                    const totalFields = Object.keys(this.formData).length;
                    const categories = await this.getOrganizedData();
                    const categoriesWithData = Object.values(categories).filter(cat => cat.fields.length > 0);
                    
                    const stats = {
                        enabled: this.isEnabled,
                        timestamp: new Date().toISOString(),
                        totalFields,
                        totalCategories: categoriesWithData.length,
                        hasData: totalFields > 0,
                        observerActive: this.observerActive,
                        cacheSize: {
                            dom: this.domCache.size,
                            editor: this.editorCache.size,
                            metrics: this.performanceMetrics.size
                        },
                        categories: Object.keys(categories).map(key => ({
                            name: categories[key].title,
                            count: categories[key].fields.length
                        })),
                        performance: this.getPerformanceMetrics()
                    };
                    
                    this.log('info', 'Estatísticas coletadas', { totalFields, totalCategories: categoriesWithData.length });
                    return stats;
                } catch (error) {
                    this.log('error', 'Erro ao obter estatísticas', error);
                    return {
                        enabled: this.isEnabled,
                        timestamp: new Date().toISOString(),
                        error: error.message
                    };
                }
            });
        }

        /**
         * Método de debug para diagnóstico
         * @returns {Object} Informações de debug
         */
        getDebugInfo() {
            try {
                return {
                    isEnabled: this.isEnabled,
                    isVisible: this.isVisible,
                    observerActive: this.observerActive,
                    formDataCount: Object.keys(this.formData).length,
                    caches: {
                        domCacheSize: this.domCache.size,
                        editorCacheSize: this.editorCache.size,
                        metricsCount: this.performanceMetrics.size
                    },
                    hasPopup: !!this.popup,
                    hasTargetEditor: !!this.targetEditor,
                    hasMutationObserver: !!this.mutationObserver,
                    hasDebounceTimer: !!this.debounceTimer,
                    configManagerAvailable: !!this.configManager,
                    alertSystemAvailable: !!this.alertSystem,
                    lastMetrics: this.getPerformanceMetrics()
                };
            } catch (error) {
                this.log('error', 'Erro ao obter informações de debug', error);
                return { error: error.message };
            }
        }

        /**
         * Método para reprocessar dados (útil para debug e testes)
         * @returns {Promise<boolean>} True se reprocessamento foi bem-sucedido
         */
        async reprocessData() {
            return this.benchmark('reprocessData', async () => {
                try {
                    this.log('info', 'Iniciando reprocessamento de dados');
                    
                    // Limpar caches para forçar nova busca
                    this.clearDOMCache();
                    this.editorCache.clear();
                    
                    // Recapturar dados
                    const success = await this.captureFormData();
                    
                    this.log('info', `Reprocessamento concluído: ${success ? 'sucesso' : 'falha'}`);
                    return success;
                } catch (error) {
                    this.log('error', 'Erro durante reprocessamento de dados', error);
                    return false;
                }
            });
        }

        /**
         * Verificar saúde do sistema
         * @returns {Object} Status de saúde
         */
        async healthCheck() {
            return this.benchmark('healthCheck', async () => {
                try {
                    const health = {
                        status: 'healthy',
                        timestamp: new Date().toISOString(),
                        checks: {}
                    };
                    
                    // Verificar dependências
                    health.checks.configManager = !!this.configManager;
                    health.checks.alertSystem = !!this.alertSystem;
                    
                    // Verificar funcionalidade básica
                    health.checks.domAccess = !!document.querySelector;
                    health.checks.cacheWorking = this.domCache instanceof Map;
                    
                    // Verificar se pode encontrar campos
                    const fieldDivs = this.getCachedElements('div.Field');
                    health.checks.fieldsDetected = fieldDivs.length > 0;
                    
                    // Verificar se pode encontrar editores
                    const editor = await this.findTextEditor();
                    health.checks.editorDetected = !!editor;
                    
                    // Verificar observer
                    health.checks.observerActive = this.observerActive;
                    
                    // Determinar status geral
                    const failedChecks = Object.values(health.checks).filter(check => !check).length;
                    if (failedChecks > 2) {
                        health.status = 'unhealthy';
                    } else if (failedChecks > 0) {
                        health.status = 'degraded';
                    }
                    
                    this.log('info', `Health check concluído: ${health.status}`, health.checks);
                    return health;
                } catch (error) {
                    this.log('error', 'Erro durante health check', error);
                    return {
                        status: 'error',
                        timestamp: new Date().toISOString(),
                        error: error.message
                    };
                }
            });
        }

        /**
         * Criar botão flutuante para ativar funcionalidade
         * @returns {HTMLElement} Elemento do botão criado
         */
        createFloatingButton() {
            return this.benchmark('createFloatingButton', async () => {
                try {
                    console.log('Help OTRS FormDataReuser: Iniciando criação do botão flutuante...');
                    
                    // Remover botão existente se houver
                    const existingBtn = document.getElementById('helpOtrsReuseBtn');
                    if (existingBtn) {
                        existingBtn.remove();
                    }

                    const button = document.createElement('button');
                    button.id = 'helpOtrsReuseBtn';
                    button.innerHTML = '📋';
                    button.title = 'Reaproveitar dados do formulário';
                    button.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 56px;
                        height: 56px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        z-index: 9999;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        backdrop-filter: blur(10px);
                    `;

                    // Efeitos hover
                    button.addEventListener('mouseenter', () => {
                        button.style.transform = 'scale(1.1)';
                        button.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
                    });

                    button.addEventListener('mouseleave', () => {
                        button.style.transform = 'scale(1)';
                        button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                    });

                    // Evento de clique
                    button.addEventListener('click', async () => {
                        try {
                            // Efeito de click
                            button.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                                button.style.transform = 'scale(1)';
                            }, 150);

                            // Mostrar popup de reuso
                            await this.showReusePopup();
                        } catch (error) {
                            this.log('error', 'Erro ao clicar no botão de reuso', error);
                            
                            // Fallback: mostrar alerta simples
                            if (this.alertSystem) {
                                this.alertSystem.showInfo(
                                    'form-reuse-unavailable',
                                    '📋 Reuso de Dados',
                                    'Funcionalidade temporariamente indisponível. Verifique se há dados preenchidos nos formulários.',
                                    { autoRemove: 5000 }
                                );
                            }
                        }
                    });

                    document.body.appendChild(button);
                    this.log('info', 'Botão flutuante de reuso criado com sucesso');
                    
                    // Debug: Verificar se o botão foi realmente adicionado
                    console.log('Help OTRS FormDataReuser: Botão flutuante criado:', {
                        id: button.id,
                        elemento: button,
                        parentNode: button.parentNode,
                        style: button.style.cssText
                    });
                    
                    return button;
                } catch (error) {
                    this.log('error', 'Erro ao criar botão flutuante', error);
                    return null;
                }
            });
        }

        /**
         * Mostrar popup de reuso de dados com interface completa
         */
        showReusePopup() {
            return this.benchmark('showReusePopup', async () => {
                try {
                    // Capturar dados atuais do formulário
                    const hasData = await this.captureFormData();
                    
                    if (!hasData || Object.keys(this.formData).length === 0) {
                        if (this.alertSystem) {
                            this.alertSystem.showInfo(
                                'no-form-data',
                                '📋 Nenhum Dado Encontrado',
                                'Preencha alguns campos no formulário primeiro para poder reutilizar os dados.',
                                { autoRemove: 5000 }
                            );
                        }
                        return;
                    }

                    // Verificar se já existe popup
                    if (this.popup) {
                        this.hidePopup();
                        return;
                    }

                    // Encontrar editor de texto
                    this.targetEditor = await this.findTextEditor();
                    if (!this.targetEditor) {
                        if (this.alertSystem) {
                            this.alertSystem.showWarning(
                                'no-editor-found',
                                '❌ Editor Não Encontrado',
                                'Não foi possível encontrar um editor de texto na página.',
                                { autoRemove: 5000 }
                            );
                        }
                        return;
                    }

                    // Criar e mostrar popup
                    await this.createReusePopup();
                    this.populatePopup();
                    this.showPopup();

                    this.log('info', `Popup de reuso exibido com ${Object.keys(this.formData).length} itens`);
                } catch (error) {
                    this.log('error', 'Erro ao mostrar popup de reuso', error);
                    
                    if (this.alertSystem) {
                        this.alertSystem.showError(
                            'reuse-popup-error',
                            '❌ Erro no Reuso',
                            'Erro interno ao processar dados do formulário.',
                            { autoRemove: 5000 }
                        );
                    }
                }
            });
        }

        /**
         * Criar popup de reuso com interface completa
         */
        createReusePopup() {
            return this.benchmark('createReusePopup', async () => {
                try {
                    // Remover popup existente
                    if (this.popup) {
                        this.popup.remove();
                    }

                    const popup = document.createElement('div');
                    popup.id = 'helpOtrsFormReusePopup';
                    popup.innerHTML = `
                        <div class="reuse-popup-header">
                            <div class="reuse-popup-title">
                                <span class="reuse-popup-icon">📋</span>
                                <span>Reaproveitar Dados do Formulário</span>
                            </div>
                            <button class="reuse-popup-close" type="button" title="Fechar">&times;</button>
                        </div>
                        <div class="reuse-popup-content">
                            <div class="reuse-popup-description">
                                <p>Clique nos dados abaixo para inserir no editor de texto:</p>
                            </div>
                            <div class="reuse-popup-categories" id="reusePopupCategories">
                                <!-- Categorias serão inseridas aqui -->
                            </div>
                            <div class="reuse-popup-actions">
                                <button class="reuse-action-btn reuse-btn-insert-all" type="button">
                                    <span>📝</span> Inserir Todos
                                </button>
                                <button class="reuse-action-btn reuse-btn-clear" type="button">
                                    <span>🗑️</span> Limpar Dados
                                </button>
                            </div>
                        </div>
                    `;

                    // Aplicar estilos
                    popup.style.cssText = `
                        position: fixed;
                        top: 50%;
                        right: 20px;
                        transform: translateY(-50%);
                        width: 320px;
                        max-height: 80vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 15px;
                        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
                        z-index: 10000;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        color: white;
                        opacity: 0;
                        transform: translateY(-50%) translateX(100px);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        backdrop-filter: blur(15px);
                        overflow: hidden;
                    `;

                    this.popup = popup;
                    document.body.appendChild(popup);

                    // Adicionar estilos internos
                    this.addReusePopupStyles();

                    // Configurar event listeners
                    this.setupPopupEventListeners();

                    // Tornar arrastável
                    this.makePopupDraggable();

                    return popup;
                } catch (error) {
                    this.log('error', 'Erro ao criar popup de reuso', error);
                    throw error;
                }
            });
        }

        /**
         * Adicionar estilos CSS para o popup
         */
        addReusePopupStyles() {
            const existingStyle = document.getElementById('helpOtrsReusePopupStyles');
            if (existingStyle) return;

            const style = document.createElement('style');
            style.id = 'helpOtrsReusePopupStyles';
            style.textContent = `
                #helpOtrsFormReusePopup .reuse-popup-header {
                    padding: 20px;
                    background: rgba(255,255,255,0.15);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }

                #helpOtrsFormReusePopup .reuse-popup-title {
                    display: flex;
                    align-items: center;
                    font-weight: 600;
                    font-size: 16px;
                }

                #helpOtrsFormReusePopup .reuse-popup-icon {
                    font-size: 20px;
                    margin-right: 10px;
                }

                #helpOtrsFormReusePopup .reuse-popup-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                #helpOtrsFormReusePopup .reuse-popup-close:hover {
                    background: rgba(255,255,255,0.2);
                    transform: rotate(90deg);
                }

                #helpOtrsFormReusePopup .reuse-popup-content {
                    padding: 20px;
                    max-height: 60vh;
                    overflow-y: auto;
                }

                #helpOtrsFormReusePopup .reuse-popup-description {
                    margin-bottom: 20px;
                    font-size: 14px;
                    opacity: 0.9;
                }

                #helpOtrsFormReusePopup .reuse-popup-description p {
                    margin: 0;
                }

                #helpOtrsFormReusePopup .reuse-category {
                    margin-bottom: 20px;
                }

                #helpOtrsFormReusePopup .reuse-category-title {
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    opacity: 0.8;
                    margin-bottom: 12px;
                    padding-bottom: 6px;
                    border-bottom: 1px solid rgba(255,255,255,0.3);
                    letter-spacing: 0.5px;
                }

                #helpOtrsFormReusePopup .reuse-data-item {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 10px;
                    padding: 12px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                    word-wrap: break-word;
                    position: relative;
                    overflow: hidden;
                }

                #helpOtrsFormReusePopup .reuse-data-item:hover {
                    background: rgba(255,255,255,0.2);
                    transform: translateX(-3px);
                    box-shadow: 3px 3px 12px rgba(0,0,0,0.2);
                }

                #helpOtrsFormReusePopup .reuse-data-item:active {
                    transform: translateX(-1px) scale(0.98);
                }

                #helpOtrsFormReusePopup .reuse-data-item.inserted {
                    background: linear-gradient(45deg, #4CAF50, #8BC34A) !important;
                    color: white !important;
                    animation: insertedPulse 0.6s ease-in-out;
                }

                #helpOtrsFormReusePopup .reuse-insertion-feedback {
                    position: absolute;
                    top: 50%;
                    right: 10px;
                    transform: translateY(-50%);
                    background: rgba(76, 175, 80, 0.9);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 10;
                }

                @keyframes insertedPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }

                #helpOtrsFormReusePopup .reuse-data-label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 6px;
                    color: rgba(255,255,255,0.95);
                }

                #helpOtrsFormReusePopup .reuse-data-value {
                    opacity: 0.85;
                    font-size: 12px;
                    line-height: 1.4;
                    word-break: break-word;
                }

                #helpOtrsFormReusePopup .reuse-popup-actions {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.2);
                    display: flex;
                    gap: 10px;
                }

                #helpOtrsFormReusePopup .reuse-action-btn {
                    flex: 1;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                #helpOtrsFormReusePopup .reuse-action-btn:hover {
                    background: rgba(255,255,255,0.25);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                #helpOtrsFormReusePopup .reuse-btn-clear:hover {
                    background: rgba(255,100,100,0.3);
                    border-color: rgba(255,150,150,0.5);
                }

                #helpOtrsFormReusePopup .reuse-popup-content::-webkit-scrollbar {
                    width: 6px;
                }

                #helpOtrsFormReusePopup .reuse-popup-content::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                }

                #helpOtrsFormReusePopup .reuse-popup-content::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.4);
                    border-radius: 3px;
                }

                #helpOtrsFormReusePopup .reuse-insertion-feedback {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(40, 167, 69, 0.95);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    z-index: 1000;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                @keyframes reuseItemInserted {
                    0% { transform: scale(1); background: rgba(255,255,255,0.1); }
                    50% { transform: scale(0.95); background: rgba(40,167,69,0.3); }
                    100% { transform: scale(1); background: rgba(255,255,255,0.1); }
                }

                #helpOtrsFormReusePopup .reuse-data-item.inserted {
                    animation: reuseItemInserted 0.6s ease-in-out;
                }
            `;
            
            document.head.appendChild(style);
        }

        /**
         * Configurar event listeners do popup
         */
        setupPopupEventListeners() {
            try {
                // Botão fechar
                const closeBtn = this.popup.querySelector('.reuse-popup-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.hidePopup());
                }

                // Botão inserir todos
                const insertAllBtn = this.popup.querySelector('.reuse-btn-insert-all');
                if (insertAllBtn) {
                    insertAllBtn.addEventListener('click', () => this.insertAllData());
                }

                // Botão limpar dados
                const clearBtn = this.popup.querySelector('.reuse-btn-clear');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => this.clearFormData());
                }

                // Fechar ao clicar fora do popup
                document.addEventListener('click', (event) => {
                    if (this.popup && !this.popup.contains(event.target) && event.target.id !== 'helpOtrsReuseBtn') {
                        this.hidePopup();
                    }
                });

                this.log('info', 'Event listeners do popup configurados');
            } catch (error) {
                this.log('error', 'Erro ao configurar event listeners do popup', error);
            }
        }

        /**
         * Tornar popup arrastável
         */
        makePopupDraggable() {
            try {
                let isDragging = false;
                let startX, startY, startLeft, startTop;
                
                const header = this.popup.querySelector('.reuse-popup-header');
                if (!header) return;
                
                header.style.cursor = 'move';
                
                header.addEventListener('mousedown', (e) => {
                    if (e.target.classList.contains('reuse-popup-close')) return;
                    
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startLeft = this.popup.offsetLeft;
                    startTop = this.popup.offsetTop;
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
                
                const onMouseMove = (e) => {
                    if (!isDragging) return;
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    this.popup.style.left = (startLeft + deltaX) + 'px';
                    this.popup.style.top = (startTop + deltaY) + 'px';
                    this.popup.style.right = 'auto';
                    this.popup.style.transform = 'none';
                };
                
                const onMouseUp = () => {
                    isDragging = false;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                this.log('info', 'Popup configurado como arrastável');
            } catch (error) {
                this.log('error', 'Erro ao configurar popup arrastável', error);
            }
        }

        /**
         * Popular popup com dados capturados
         */
        populatePopup() {
            try {
                const categoriesContainer = this.popup.querySelector('#reusePopupCategories');
                if (!categoriesContainer) return;

                categoriesContainer.innerHTML = '';

                // Agrupar dados por categoria
                const categories = {};
                Object.keys(this.formData).forEach(fieldId => {
                    const data = this.formData[fieldId];
                    if (!categories[data.category]) {
                        categories[data.category] = [];
                    }
                    categories[data.category].push({ fieldId, ...data });
                });

                // Mapear nomes das categorias
                const categoryNames = {
                    'cliente': '👤 Cliente',
                    'contato': '📞 Contato', 
                    'localizacao': '📍 Localização',
                    'patrimonio': '💼 Patrimônio',
                    'organizacional': '🏛️ Organização',
                    'adicional': '📝 Adicional',
                    'geral': '📄 Geral'
                };

                // Criar elementos para cada categoria
                Object.keys(categories).forEach(categoryKey => {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'reuse-category';

                    const categoryTitle = document.createElement('div');
                    categoryTitle.className = 'reuse-category-title';
                    categoryTitle.textContent = categoryNames[categoryKey] || categoryKey.toUpperCase();
                    categoryDiv.appendChild(categoryTitle);

                    categories[categoryKey].forEach(item => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'reuse-data-item';
                        itemDiv.setAttribute('data-field-id', item.fieldId);
                        itemDiv.innerHTML = `
                            <div class="reuse-data-label">${item.label}</div>
                            <div class="reuse-data-value">${item.value}</div>
                        `;
                        
                        itemDiv.addEventListener('click', async () => {
                            await this.insertDataIntoEditor(item);
                            this.showInsertionFeedback(itemDiv, item.label);
                        });

                        categoryDiv.appendChild(itemDiv);
                    });

                    categoriesContainer.appendChild(categoryDiv);
                });

                if (Object.keys(categories).length === 0) {
                    categoriesContainer.innerHTML = '<p style="opacity: 0.7; font-size: 13px; text-align: center; padding: 30px;">Nenhum dado encontrado nos formulários</p>';
                }

                this.log('info', `Popup populado com ${Object.keys(this.formData).length} itens`);
            } catch (error) {
                this.log('error', 'Erro ao popular popup', error);
            }
        }

        /**
         * Mostrar popup com animação
         */
        showPopup() {
            if (!this.popup) return;

            setTimeout(() => {
                this.popup.style.opacity = '1';
                this.popup.style.transform = 'translateY(-50%) translateX(0)';
            }, 100);

            this.isVisible = true;
            this.log('info', 'Popup exibido com sucesso');
        }

        /**
         * Esconder popup com animação
         */
        hidePopup() {
            if (!this.popup) return;

            this.popup.style.opacity = '0';
            this.popup.style.transform = 'translateY(-50%) translateX(100px)';
            
            setTimeout(() => {
                if (this.popup) {
                    this.popup.remove();
                    this.popup = null;
                }
            }, 300);

            this.isVisible = false;
            this.log('info', 'Popup ocultado');
        }

        /**
         * Inserir dados no editor de texto
         */
        insertDataIntoEditor(item) {
            return this.benchmark('insertDataIntoEditor', async () => {
                try {
                    if (!this.targetEditor) {
                        this.targetEditor = await this.findTextEditor();
                        if (!this.targetEditor) {
                            throw new Error('Editor de texto não encontrado');
                        }
                    }

                    const textToInsert = `<strong>${item.label}:</strong> ${item.value}<br>`;

                    // Inserir no CKEditor (iframe)
                    if (this.targetEditor.tagName === 'IFRAME') {
                        await this.insertIntoCKEditor(textToInsert);
                    } 
                    // Inserir em textarea
                    else if (this.targetEditor.tagName === 'TEXTAREA') {
                        this.insertIntoTextarea(textToInsert);
                    }
                    // Inserir em div contenteditable
                    else if (this.targetEditor.contentEditable === 'true') {
                        this.insertIntoContentEditable(textToInsert);
                    }
                    else {
                        throw new Error('Tipo de editor não suportado');
                    }

                    this.log('info', `Dados inseridos no editor: ${item.label}`);
                    return true;
                } catch (error) {
                    this.log('error', 'Erro ao inserir dados no editor', error);
                    
                    if (this.alertSystem) {
                        this.alertSystem.showError(
                            'insert-error',
                            '❌ Erro na Inserção',
                            `Não foi possível inserir "${item.label}" no editor.`,
                            { autoRemove: 3000 }
                        );
                    }
                    return false;
                }
            });
        }

        /**
         * Inserir no CKEditor (iframe)
         */
        insertIntoCKEditor(html) {
            try {
                const iframeDoc = this.targetEditor.contentDocument || this.targetEditor.contentWindow.document;
                const body = iframeDoc.body;

                if (!body) {
                    throw new Error('Corpo do CKEditor não encontrado');
                }

                // Inserir no final do conteúdo
                const div = iframeDoc.createElement('div');
                div.innerHTML = html;
                body.appendChild(div);

                // Focar no editor
                if (this.targetEditor.contentWindow) {
                    this.targetEditor.contentWindow.focus();
                }

                this.log('info', 'Dados inseridos no CKEditor');
            } catch (error) {
                this.log('error', 'Erro ao inserir no CKEditor', error);
                throw error;
            }
        }

        /**
         * Inserir em textarea
         */
        insertIntoTextarea(text) {
            try {
                const plainText = text.replace(/<[^>]*>/g, ''); // Remover HTML
                const currentValue = this.targetEditor.value;
                this.targetEditor.value = currentValue + (currentValue ? '\n' : '') + plainText;
                
                // Focar e posicionar cursor no final
                this.targetEditor.focus();
                this.targetEditor.setSelectionRange(this.targetEditor.value.length, this.targetEditor.value.length);

                this.log('info', 'Dados inseridos na textarea');
            } catch (error) {
                this.log('error', 'Erro ao inserir na textarea', error);
                throw error;
            }
        }

        /**
         * Inserir em elemento contenteditable
         */
        insertIntoContentEditable(html) {
            try {
                const div = document.createElement('div');
                div.innerHTML = html;
                this.targetEditor.appendChild(div);
                
                // Focar no editor
                this.targetEditor.focus();

                this.log('info', 'Dados inseridos no elemento contenteditable');
            } catch (error) {
                this.log('error', 'Erro ao inserir no contenteditable', error);
                throw error;
            }
        }

        /**
         * Inserir todos os dados de uma vez
         */
        insertAllData() {
            return this.benchmark('insertAllData', async () => {
                try {
                    const items = Object.keys(this.formData).map(fieldId => ({
                        fieldId,
                        ...this.formData[fieldId]
                    }));

                    let successCount = 0;
                    for (const item of items) {
                        const success = await this.insertDataIntoEditor(item);
                        if (success) {
                            successCount++;
                            
                            // Adicionar animação visual
                            const itemElement = this.popup.querySelector(`[data-field-id="${item.fieldId}"]`);
                            if (itemElement) {
                                itemElement.classList.add('inserted');
                                setTimeout(() => itemElement.classList.remove('inserted'), 600);
                            }
                            
                            // Pequena pausa entre inserções
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    }

                    if (this.alertSystem) {
                        this.alertSystem.showSuccess(
                            'all-data-inserted',
                            '✅ Dados Inseridos',
                            `${successCount} de ${items.length} itens inseridos com sucesso.`,
                            { autoRemove: 4000 }
                        );
                    }

                    this.log('info', `Todos os dados inseridos: ${successCount}/${items.length}`);
                } catch (error) {
                    this.log('error', 'Erro ao inserir todos os dados', error);
                    
                    if (this.alertSystem) {
                        this.alertSystem.showError(
                            'insert-all-error',
                            '❌ Erro na Inserção',
                            'Erro ao inserir dados em lote.',
                            { autoRemove: 3000 }
                        );
                    }
                }
            });
        }

        /**
         * Limpar dados do formulário
         */
        clearFormData() {
            try {
                this.formData = {};
                this.populatePopup();
                
                if (this.alertSystem) {
                    this.alertSystem.showInfo(
                        'data-cleared',
                        '🗑️ Dados Limpos',
                        'Cache de dados do formulário foi limpo.',
                        { autoRemove: 2000 }
                    );
                }

                this.log('info', 'Dados do formulário limpos');
            } catch (error) {
                this.log('error', 'Erro ao limpar dados', error);
            }
        }

        /**
         * Mostrar feedback visual de inserção
         */
        showInsertionFeedback(element, label) {
            try {
                // Adicionar classe de animação
                element.classList.add('inserted');
                setTimeout(() => element.classList.remove('inserted'), 600);

                // Feedback temporário
                const feedback = document.createElement('div');
                feedback.className = 'reuse-insertion-feedback';
                feedback.textContent = `✅ ${label}`;
                element.appendChild(feedback);

                // Animar feedback
                setTimeout(() => {
                    feedback.style.opacity = '1';
                }, 50);

                setTimeout(() => {
                    feedback.style.opacity = '0';
                    setTimeout(() => feedback.remove(), 200);
                }, 1500);

                this.log('info', `Feedback de inserção exibido para: ${label}`);
            } catch (error) {
                this.log('error', 'Erro ao mostrar feedback', error);
            }
        }

        /**
         * Encontrar editor de texto na página
         */
        findTextEditor() {
            return this.benchmark('findTextEditor', async () => {
                try {
                    // Tentar CKEditor primeiro (mais comum no OTRS)
                    const ckeditorFrame = document.querySelector('iframe[title*="editor"], iframe[id*="cke"], iframe.cke_wysiwyg_frame');
                    if (ckeditorFrame) {
                        this.log('info', 'CKEditor encontrado');
                        return ckeditorFrame;
                    }

                    // Tentar textarea
                    const textarea = document.querySelector('textarea[name*="Body"], textarea[id*="Body"], textarea[name*="compose"]');
                    if (textarea) {
                        this.log('info', 'Textarea encontrada');
                        return textarea;
                    }

                    // Tentar elemento contenteditable
                    const contentEditable = document.querySelector('[contenteditable="true"]');
                    if (contentEditable) {
                        this.log('info', 'Elemento contenteditable encontrado');
                        return contentEditable;
                    }

                    this.log('warn', 'Nenhum editor de texto encontrado');
                    return null;
                } catch (error) {
                    this.log('error', 'Erro ao procurar editor de texto', error);
                    return null;
                }
            });
        }
    }

    // Exportar classe para uso global
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.FormDataReuser = FormDataReuser;

})(window);
