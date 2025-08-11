/**
 * FormDataReuser - Reaproveitamento de Dados do Formulário
 * 
 * Responsável por capturar, armazenar e reutilizar dados de 
 * formulários OTRS entre diferentes páginas e tickets.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
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
    }

    /**
     * Mapear campos do formulário OTRS para rótulos amigáveis
     * @returns {Object} Mapeamentos de campos
     */
    getFieldMappings() {
        // Capturar dinamicamente todos os campos Field
        const dynamicMappings = this.captureDynamicFields();
        
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
        return { ...staticMappings, ...dynamicMappings };
    }

    /**
     * Capturar campos dinamicamente da estrutura <div class="Field">
     * @returns {Object} Mapeamentos dinâmicos
     */
    captureDynamicFields() {
        const dynamicMappings = {};
        
        // Procurar todos os divs com class="Field"
        const fieldDivs = document.querySelectorAll('div.Field');
        
        fieldDivs.forEach((fieldDiv) => {
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
                
                console.log(`Help OTRS: Campo dinâmico capturado - ${fieldId}: ${fieldTitle} (${category})`);
            }
        });

        console.log(`Help OTRS: ${Object.keys(dynamicMappings).length} campos dinâmicos capturados`);
        return dynamicMappings;
    }

    /**
     * Categorizar campo baseado no ID e título
     * @param {string} fieldId 
     * @param {string} fieldTitle 
     * @returns {string}
     */
    categorizeField(fieldId, fieldTitle) {
        const id = fieldId.toLowerCase();
        const title = fieldTitle.toLowerCase();
        
        // Regras de categorização
        if (id.includes('customer') || title.includes('cliente') || title.includes('usuário')) {
            return 'cliente';
        }
        
        if (id.includes('ramal') || id.includes('telefone') || id.includes('email') || id.includes('contato') ||
            title.includes('ramal') || title.includes('telefone') || title.includes('email') || title.includes('contato')) {
            return 'contato';
        }
        
        if (id.includes('sala') || id.includes('local') || id.includes('andar') || id.includes('predio') || id.includes('endereco') ||
            title.includes('sala') || title.includes('local') || title.includes('andar') || title.includes('prédio') || title.includes('endereço')) {
            return 'localizacao';
        }
        
        if (id.includes('patrimonio') || id.includes('equipamento') || id.includes('serial') || id.includes('tag') ||
            title.includes('patrimônio') || title.includes('equipamento') || title.includes('serial') || title.includes('tag')) {
            return 'patrimonio';
        }
        
        if (id.includes('setor') || id.includes('departamento') || id.includes('orgao') || id.includes('unidade') ||
            title.includes('setor') || title.includes('departamento') || title.includes('órgão') || title.includes('unidade')) {
            return 'organizacional';
        }
        
        // Categoria padrão
        return 'geral';
    }

    /**
     * Obter ícone baseado no tipo de campo
     * @param {string} fieldId 
     * @param {string} fieldTitle 
     * @param {string} inputType 
     * @returns {string}
     */
    getFieldIcon(fieldId, fieldTitle, inputType) {
        const id = fieldId.toLowerCase();
        const title = fieldTitle.toLowerCase();
        
        // Ícones específicos por tipo de campo
        if (id.includes('customer') || title.includes('cliente') || title.includes('usuário')) {
            return '👤';
        }
        
        if (id.includes('ramal') || title.includes('ramal')) {
            return '📞';
        }
        
        if (id.includes('telefone') || title.includes('telefone')) {
            return '📱';
        }
        
        if (id.includes('email') || title.includes('email') || inputType === 'email') {
            return '📧';
        }
        
        if (id.includes('sala') || title.includes('sala')) {
            return '🏠';
        }
        
        if (id.includes('local') || title.includes('local')) {
            return '📍';
        }
        
        if (id.includes('andar') || title.includes('andar')) {
            return '🏢';
        }
        
        if (id.includes('predio') || title.includes('prédio')) {
            return '🏛️';
        }
        
        if (id.includes('patrimonio') || title.includes('patrimônio')) {
            return '💼';
        }
        
        if (id.includes('equipamento') || title.includes('equipamento')) {
            return '💻';
        }
        
        if (id.includes('serial') || title.includes('serial')) {
            return '🔢';
        }
        
        if (id.includes('setor') || title.includes('setor')) {
            return '🏛️';
        }
        
        if (id.includes('departamento') || title.includes('departamento')) {
            return '🏢';
        }
        
        if (id.includes('observ') || title.includes('observ') || id.includes('descri') || title.includes('descri')) {
            return '📝';
        }
        
        if (inputType === 'date') {
            return '📅';
        }
        
        if (inputType === 'time') {
            return '⏰';
        }
        
        if (inputType === 'url') {
            return '🔗';
        }
        
        if (inputType === 'number') {
            return '🔢';
        }
        
        // Ícone padrão
        return '📄';
    }

    /**
     * Aguardar o carregamento completo do CKEditor
     * @param {HTMLElement} editor 
     * @param {number} maxAttempts 
     * @returns {Promise<HTMLElement>}
     */
    async waitForEditorReady(editor, maxAttempts = 10) {
        if (!editor || editor.tagName !== 'IFRAME') {
            return editor;
        }

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                if (iframeDoc && iframeDoc.body && iframeDoc.readyState === 'complete') {
                    // Verificar se o body está realmente editável
                    if (iframeDoc.body.contentEditable !== 'false') {
                        console.log('Help OTRS: CKEditor pronto após', attempt + 1, 'tentativas');
                        return editor;
                    }
                }
            } catch (e) {
                console.log('Help OTRS: Tentativa', attempt + 1, 'falhou, aguardando...');
            }
            
            // Aguardar 500ms antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('Help OTRS: Timeout aguardando CKEditor ficar pronto');
        return editor; // Retornar mesmo que não esteja totalmente pronto
    }

    /**
     * Capturar dados preenchidos nos formulários
     * @returns {boolean} True se dados foram capturados
     */
    captureFormData() {
        const mappings = this.getFieldMappings();
        const capturedData = {};

        Object.keys(mappings).forEach(fieldId => {
            const field = document.getElementById(fieldId);
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
                    const searchField = document.getElementById(fieldId + '_Search');
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
            }
        });

        this.formData = capturedData;
        console.log('Help OTRS: Dados do formulário capturados:', this.formData);
        return Object.keys(capturedData).length > 0;
    }

    /**
     * Encontrar editor de texto (iframe ou textarea)
     * @returns {HTMLElement|null}
     */
    findTextEditor() {
        // Tentar diferentes seletores para o editor, priorizando CKEditor
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
            const editor = document.querySelector(selector);
            if (editor) {
                console.log('Help OTRS: Editor encontrado:', selector, editor);
                return editor;
            }
        }

        console.log('Help OTRS: Nenhum editor de texto encontrado');
        return null;
    }

    /**
     * Inserir texto no editor
     * @param {string} text 
     * @returns {Promise<boolean>}
     */
    async insertTextInEditor(text) {
        const editor = this.findTextEditor();
        if (!editor) {
            console.log('Help OTRS: Editor não encontrado para inserção');
            return false;
        }

        try {
            if (editor.tagName === 'IFRAME') {
                // CKEditor ou similar
                const readyEditor = await this.waitForEditorReady(editor);
                const iframeDoc = readyEditor.contentDocument || readyEditor.contentWindow.document;
                
                if (iframeDoc && iframeDoc.body) {
                    // Inserir no final do conteúdo existente
                    const currentContent = iframeDoc.body.innerHTML;
                    const newContent = currentContent + (currentContent ? '<br><br>' : '') + 
                                     text.replace(/\n/g, '<br>');
                    iframeDoc.body.innerHTML = newContent;
                    
                    console.log('Help OTRS: Texto inserido no CKEditor');
                    return true;
                }
            } else if (editor.tagName === 'TEXTAREA') {
                // Textarea simples
                const currentValue = editor.value;
                const newValue = currentValue + (currentValue ? '\n\n' : '') + text;
                editor.value = newValue;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                
                console.log('Help OTRS: Texto inserido no textarea');
                return true;
            }
        } catch (error) {
            console.error('Help OTRS: Erro ao inserir texto no editor:', error);
        }

        return false;
    }

    /**
     * Gerar resumo formatado dos dados
     * @param {Array} selectedFields 
     * @returns {string}
     */
    generateDataSummary(selectedFields) {
        if (!selectedFields || selectedFields.length === 0) {
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

        // Agrupar campos por categoria
        selectedFields.forEach(fieldId => {
            const fieldData = this.formData[fieldId];
            if (fieldData) {
                const category = fieldData.category || 'geral';
                if (categories[category]) {
                    categories[category].fields.push({
                        label: fieldData.label.replace(/^[^\s]+ /, ''), // Remover emoji do label
                        value: fieldData.value
                    });
                }
            }
        });

        // Gerar texto formatado
        let summary = '';
        Object.values(categories).forEach(category => {
            if (category.fields.length > 0) {
                if (summary) summary += '\n\n';
                summary += category.title + '\n';
                summary += '─'.repeat(category.title.length) + '\n';
                
                category.fields.forEach(field => {
                    summary += `• ${field.label}: ${field.value}\n`;
                });
            }
        });

        return summary;
    }

    /**
     * Obter dados organizados por categoria
     * @returns {Object}
     */
    getOrganizedData() {
        const categories = {
            cliente: { title: '👤 Cliente', fields: [] },
            contato: { title: '📞 Contato', fields: [] },
            localizacao: { title: '📍 Localização', fields: [] },
            patrimonio: { title: '💼 Patrimônio', fields: [] },
            organizacional: { title: '🏢 Organizacional', fields: [] },
            geral: { title: '📄 Geral', fields: [] }
        };

        Object.keys(this.formData).forEach(fieldId => {
            const fieldData = this.formData[fieldId];
            const category = fieldData.category || 'geral';
            
            if (categories[category]) {
                categories[category].fields.push({
                    id: fieldId,
                    label: fieldData.label,
                    value: fieldData.value
                });
            }
        });

        return categories;
    }

    /**
     * Inicializar funcionalidade
     */
    init() {
        if (!this.configManager.isFeatureEnabled('formDataReuser')) {
            console.log('Help OTRS: Funcionalidade de reaproveitamento de dados desabilitada');
            return;
        }

        console.log('Help OTRS: Inicializando reaproveitamento de dados do formulário');
        
        this.setupEventListeners();
        this.initFormObserver();
        
        console.log('Help OTRS: Funcionalidade de reaproveitamento de dados inicializada');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // TODO: Implementar quando UI components estiverem disponíveis
    }

    /**
     * Inicializar observador de formulários
     */
    initFormObserver() {
        // TODO: Implementar observador de mudanças no DOM
    }

    /**
     * Limpar recursos
     */
    destroy() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        
        this.isVisible = false;
        this.observerActive = false;
    }

    /**
     * Obter estatísticas dos dados capturados
     * @returns {Object}
     */
    getStats() {
        const totalFields = Object.keys(this.formData).length;
        const categories = this.getOrganizedData();
        const categoriesWithData = Object.values(categories).filter(cat => cat.fields.length > 0);
        
        return {
            totalFields,
            totalCategories: categoriesWithData.length,
            hasData: totalFields > 0,
            categories: Object.keys(categories).map(key => ({
                name: categories[key].title,
                count: categories[key].fields.length
            }))
        };
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.FormDataReuser = FormDataReuser;

})(window);
