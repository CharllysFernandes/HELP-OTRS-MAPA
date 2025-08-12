/**
 * AlertSystem - Sistema de Alertas
 * 
 * Responsável por criar, gerenciar e exibir alertas na interface
 * do usuário para diferentes tipos de validações.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function(global) {
    'use strict';

    class AlertSystem {
        constructor() {
            this.alerts = new Map();
            this.alertStyles = this.getAlertStyles();
            this.validTypes = ['error', 'warning', 'info', 'success'];
            this.selectorCache = new Map(); // Cache para seletores DOM
        }

        /**
         * Validar parâmetros obrigatórios
         * @param {string} id - ID do alerta
         * @param {string} type - Tipo do alerta
         * @param {string} message - Mensagem do alerta
         * @throws {Error} Se parâmetros inválidos
         */
        validateParams(id, type, message) {
            if (!id || typeof id !== 'string') {
                throw new Error('AlertSystem: ID é obrigatório e deve ser string');
            }
            if (!type || !this.validTypes.includes(type)) {
                throw new Error(`AlertSystem: Tipo deve ser um de: ${this.validTypes.join(', ')}`);
            }
            if (!message || typeof message !== 'string') {
                throw new Error('AlertSystem: Mensagem é obrigatória e deve ser string');
            }
        }

        /**
         * Obter estilos CSS para os alertas
         * @returns {string}
         */
        getAlertStyles() {
            return `
                .help-otrs-alert {
                    position: relative;
                    padding: 8px 12px;
                    margin: 3px 0;
                    border: 1px solid transparent;
                    border-radius: 4px;
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    line-height: 0.5;
                    z-index: 1000;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    display: inline-flex;
                    align-items: center;
                    max-width: fit-content;
                    width: auto;
                    min-height: auto;
                }

                .help-otrs-alert-error {
                    color: #721c24;
                    background-color: #f8d7da;
                    border-color: #f5c6cb;
                    border-left: 4px solid #dc3545;
                }

                .help-otrs-alert-warning {
                    color: #856404;
                    background-color: #fff3cd;
                    border-color: #ffeaa7;
                    border-left: 4px solid #ffc107;
                }

                .help-otrs-alert-info {
                    color: #0c5460;
                    background-color: #d1ecf1;
                    border-color: #bee5eb;
                    border-left: 4px solid #17a2b8;
                }

                .help-otrs-alert-success {
                    color: #155724;
                    background-color: #d4edda;
                    border-color: #c3e6cb;
                    border-left: 4px solid #28a745;
                }

                .help-otrs-alert-close {
                    position: absolute;
                    right: 8px;
                    background: none;
                    border: none;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    opacity: 0.7;
                    line-height: 1;
                    padding: 0;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .help-otrs-alert-close:hover {
                    opacity: 1;
                }

                .help-otrs-alert-title {
                    font-weight: bold;
                    margin-right: 6px;
                    flex-shrink: 0;
                }

                .help-otrs-alert-message {
                    margin: -2px;
                    flex: 1;
                    padding-right: 20px;
                    word-wrap: break-word;
                }

                .help-otrs-alert .help-otrs-alert-message strong {
                    font-weight: 600;
                }

                .help-otrs-queue-alert-container {
                    display: inline-block;
                    width: auto;
                }
            `;
        }

        /**
         * Injetar estilos CSS na página
         * @throws {Error} Se não conseguir injetar estilos
         */
        injectStyles() {
            const styleId = 'help-otrs-alert-styles';
            if (!document.getElementById(styleId)) {
                try {
                    if (!document.head) {
                        throw new Error('document.head não está disponível');
                    }
                    
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = this.alertStyles;
                    document.head.appendChild(style);
                    console.log('Help OTRS: Estilos de alerta injetados com sucesso');
                } catch (error) {
                    console.error('Help OTRS: Erro ao injetar estilos:', error);
                    throw new Error(`Falha ao injetar estilos CSS: ${error.message}`);
                }
            }
        }

        /**
         * Criar elemento de alerta usando JavaScript puro (sem HTML)
         * @param {string} id 
         * @param {string} type 
         * @param {string} title 
         * @param {string} message 
         * @param {boolean} closeable 
         * @returns {HTMLElement}
         */
        createAlertElement(id, type, title, message, closeable = true) {
            try {
                const alert = document.createElement('div');
                alert.id = id;
                alert.className = `help-otrs-alert help-otrs-alert-${type}`;
                
                // Criar elemento de título se fornecido
                if (title) {
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'help-otrs-alert-title';
                    titleDiv.textContent = title; // Seguro contra XSS
                    alert.appendChild(titleDiv);
                }
                
                // Criar elemento de mensagem
                const messageDiv = document.createElement('div');
                messageDiv.className = 'help-otrs-alert-message';
                messageDiv.textContent = message; // Seguro contra XSS
                alert.appendChild(messageDiv);
                
                // Criar botão de fechar se necessário
                if (closeable) {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'help-otrs-alert-close';
                    closeBtn.type = 'button';
                    closeBtn.textContent = '×';
                    closeBtn.setAttribute('data-alert-id', id);
                    
                    // Event listener seguro
                    closeBtn.addEventListener('click', () => this.remove(id));
                    alert.appendChild(closeBtn);
                }
                
                return alert;
            } catch (error) {
                console.error('Help OTRS: Erro ao criar elemento de alerta:', error);
                throw new Error(`Falha ao criar alerta: ${error.message}`);
            }
        }

        /**
         * Criar elemento de alerta com formatação avançada usando DOM puro
         * @param {string} id 
         * @param {string} type 
         * @param {string} title 
         * @param {Object} messageData - Objeto com texto e partes destacadas
         * @param {boolean} closeable 
         * @returns {HTMLElement}
         */
        createFormattedAlertElement(id, type, title, messageData, closeable = true) {
            try {
                const alert = document.createElement('div');
                alert.id = id;
                alert.className = `help-otrs-alert help-otrs-alert-${type}`;
                
                // Criar elemento de título se fornecido
                if (title) {
                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'help-otrs-alert-title';
                    titleDiv.textContent = title;
                    alert.appendChild(titleDiv);
                }
                
                // Criar elemento de mensagem com formatação
                const messageDiv = document.createElement('div');
                messageDiv.className = 'help-otrs-alert-message';
                
                if (typeof messageData === 'string') {
                    messageDiv.textContent = messageData;
                } else if (messageData.parts) {
                    // Suporte para partes formatadas
                    messageData.parts.forEach(part => {
                        if (part.type === 'text') {
                            const textNode = document.createTextNode(part.content);
                            messageDiv.appendChild(textNode);
                        } else if (part.type === 'strong') {
                            const strong = document.createElement('strong');
                            strong.textContent = part.content;
                            messageDiv.appendChild(strong);
                        } else if (part.type === 'break') {
                            messageDiv.appendChild(document.createElement('br'));
                        }
                    });
                } else {
                    messageDiv.textContent = messageData.text || '';
                }
                
                alert.appendChild(messageDiv);
                
                // Criar botão de fechar se necessário
                if (closeable) {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'help-otrs-alert-close';
                    closeBtn.type = 'button';
                    closeBtn.textContent = '×';
                    closeBtn.setAttribute('data-alert-id', id);
                    
                    closeBtn.addEventListener('click', () => this.remove(id));
                    alert.appendChild(closeBtn);
                }
                
                return alert;
            } catch (error) {
                console.error('Help OTRS: Erro ao criar elemento formatado:', error);
                throw new Error(`Falha ao criar alerta formatado: ${error.message}`);
            }
        }

        /**
         * Encontrar container apropriado para inserir alerta com cache
         * @returns {HTMLElement}
         */
        findAlertContainer() {
            // Verificar cache primeiro
            const cacheKey = 'alertContainer';
            if (this.selectorCache.has(cacheKey)) {
                const cached = this.selectorCache.get(cacheKey);
                if (document.contains(cached)) {
                    return cached;
                }
                // Container removido, limpar cache
                this.selectorCache.delete(cacheKey);
            }

            let container = null;

            // Priorizar inserção acima do botão de submit
            const submitButton = document.querySelector('#submitRichText, button.Primary.CallForAction, .Field.SpacingTop button');
            if (submitButton) {
                const fieldContainer = submitButton.closest('.Field, .SpacingTop');
                if (fieldContainer && fieldContainer.parentElement) {
                    container = fieldContainer.parentElement;
                    console.log('Help OTRS: Container específico encontrado (acima do botão)');
                }
            }

            // Fallback para outros containers do OTRS
            if (!container) {
                const selectors = [
                    '.Content',
                    '.WidgetSimple .Content',
                    '.MainBox',
                    '#MainBox',
                    'form[name="compose"]',
                    'body'
                ];

                for (const selector of selectors) {
                    container = document.querySelector(selector);
                    if (container) break;
                }
            }

            // Cache do resultado
            if (container && container !== document.body) {
                this.selectorCache.set(cacheKey, container);
            }

            return container || document.body;
        }

        /**
         * Inserir alerta acima do botão específico
         * @param {HTMLElement} alert 
         * @param {HTMLElement} targetButton 
         */
        insertAlertAboveButton(alert, targetButton = null) {
            const button = targetButton || document.querySelector('#submitRichText, button.Primary.CallForAction');
            
            if (button) {
                const fieldContainer = button.closest('.Field, .SpacingTop');
                if (fieldContainer) {
                    // Inserir diretamente antes do campo do botão
                    fieldContainer.parentElement.insertBefore(alert, fieldContainer);
                    console.log('Help OTRS: Alert inserido acima do botão');
                    return true;
                }
            }
            
            return false;
        }

        /**
         * Encontrar e inserir alerta ao lado do campo de fila
         * @param {HTMLElement} alert 
         * @returns {boolean}
         */
        insertAlertBesideQueueField(alert) {
            try {
                // Procurar pelo campo de fila específico
                const queueSelect = document.querySelector('#Dest, select[name="Dest"]');
                if (!queueSelect) {
                    console.log('Help OTRS: Campo de fila não encontrado');
                    return false;
                }
                
                // Encontrar o container do campo (.Field)
                const fieldContainer = queueSelect.closest('.Field');
                if (!fieldContainer) {
                    console.log('Help OTRS: Container do campo de fila não encontrado');
                    return false;
                }
                
                // Criar container para o alerta ao lado do campo
                let alertSideContainer = fieldContainer.querySelector('.help-otrs-queue-alert-container');
                
                if (!alertSideContainer) {
                    alertSideContainer = document.createElement('div');
                    alertSideContainer.className = 'help-otrs-queue-alert-container';
                    alertSideContainer.style.cssText = `
                        position: relative;
                        display: inline-block;
                        width: auto;
                    `;
                    
                    // Inserir logo após o campo, mas antes das mensagens de erro
                    const errorDiv = fieldContainer.querySelector('#DestError, #DestServerError');
                    if (errorDiv) {
                        fieldContainer.insertBefore(alertSideContainer, errorDiv);
                    } else {
                        fieldContainer.appendChild(alertSideContainer);
                    }
                }
                
                // Limpar container e inserir novo alerta
                alertSideContainer.innerHTML = '';
                alertSideContainer.appendChild(alert);
                
                console.log('Help OTRS: Alert inserido ao lado do campo de fila');
                return true;
                
            } catch (error) {
                console.error('Help OTRS: Erro ao inserir alert ao lado da fila:', error);
                return false;
            }
        }

        /**
         * Exibir alerta genérico com validações e tratamento de erros
         * @param {string} id 
         * @param {string} type 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        show(id, type, title, message, options = {}) {
            try {
                // Validar parâmetros
                this.validateParams(id, type, message);
                
                // Injetar estilos
                this.injectStyles();
                
                // Remover alerta existente com mesmo ID
                this.remove(id);
                
                // Criar elemento do alerta
                const alert = this.createAlertElement(id, type, title, message, options.closeable !== false);
                
                // Inserir no DOM
                let inserted = false;
                if (options.aboveButton !== false) {
                    inserted = this.insertAlertAboveButton(alert);
                }
                
                if (!inserted) {
                    const container = options.container || this.findAlertContainer();
                    if (container) {
                        container.insertBefore(alert, container.firstChild);
                        inserted = true;
                    }
                }
                
                if (!inserted) {
                    throw new Error('Não foi possível inserir alerta no DOM');
                }
                
                // Armazenar referência
                this.alerts.set(id, alert);
                
                // Configurar auto-remoção com timeout padrão
                const autoRemoveTime = options.autoRemove || (type === 'success' ? 5000 : 0);
                if (autoRemoveTime > 0) {
                    setTimeout(() => this.remove(id), autoRemoveTime);
                }
                
                // Adicionar observer para detectar remoção manual
                this.observeAlertRemoval(id, alert);
                
                console.log(`Help OTRS Alert [${type}]: ${title} - ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
                
            } catch (error) {
                console.error('Help OTRS: Erro ao exibir alerta:', error);
                // Fallback: tentar mostrar alerta básico
                this.showFallbackAlert(error.message);
            }
        }

        /**
         * Observar remoção manual de alertas para cleanup
         * @param {string} id 
         * @param {HTMLElement} alert 
         */
        observeAlertRemoval(id, alert) {
            if (!alert.parentElement) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node === alert) {
                            this.alerts.delete(id);
                            observer.disconnect();
                            console.log(`Help OTRS: Alert ${id} removido externamente - cleanup realizado`);
                        }
                    });
                });
            });

            observer.observe(alert.parentElement, { childList: true });
            
            // Store observer reference for cleanup
            alert._observer = observer;
        }

        /**
         * Alerta de fallback em caso de erro
         * @param {string} errorMessage 
         */
        showFallbackAlert(errorMessage) {
            try {
                const fallback = document.createElement('div');
                fallback.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #f8d7da;
                    color: #721c24;
                    padding: 10px;
                    border: 1px solid #f5c6cb;
                    border-radius: 4px;
                    z-index: 9999;
                    max-width: 300px;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                `;
                fallback.textContent = `Help OTRS Error: ${errorMessage}`;
                document.body.appendChild(fallback);
                
                setTimeout(() => {
                    if (fallback.parentElement) {
                        fallback.remove();
                    }
                }, 3000);
            } catch (e) {
                console.error('Help OTRS: Falha completa no sistema de alertas:', e);
            }
        }

        /**
         * Remover alerta com cleanup completo
         * @param {string} id 
         */
        remove(id) {
            try {
                const alert = this.alerts.get(id);
                if (alert) {
                    // Cleanup do observer se existir
                    if (alert._observer) {
                        alert._observer.disconnect();
                        delete alert._observer;
                    }
                    
                    // Remover do DOM se ainda estiver presente
                    if (alert.parentElement) {
                        const container = alert.parentElement;
                        alert.remove();
                        
                        // Limpar container específico se vazio e for nosso container
                        if (container.classList.contains('help-otrs-queue-alert-container') && 
                            container.children.length === 0) {
                            container.remove();
                            console.log(`Help OTRS: Container vazio removido para ${id}`);
                        }
                    }
                    
                    // Remover da Map
                    this.alerts.delete(id);
                    console.log(`Help OTRS: Alert ${id} removido com cleanup completo`);
                }
            } catch (error) {
                console.error(`Help OTRS: Erro ao remover alert ${id}:`, error);
                // Force cleanup
                this.alerts.delete(id);
            }
        }

        /**
         * Verificar se alerta existe e está no DOM
         * @param {string} id 
         * @returns {boolean}
         */
        exists(id) {
            const alert = this.alerts.get(id);
            if (alert && alert.parentElement && document.contains(alert)) {
                return true;
            }
            
            // Cleanup se elemento não existe mais no DOM
            if (alert && !document.contains(alert)) {
                this.alerts.delete(id);
                console.log(`Help OTRS: Alert órfão ${id} removido do cache`);
            }
            
            return false;
        }

        // Métodos específicos para diferentes tipos de alerta

        /**
         * Exibir alerta de erro
         * @param {string} id - ID único do alerta
         * @param {string} title - Título do alerta  
         * @param {string} message - Mensagem do alerta
         * @param {object} options - Opções adicionais
         */
        showError(id, title, message, options = {}) {
            this.show(id, 'error', title, message, { ...options, autoRemove: options.autoRemove || 0 });
        }

        /**
         * Exibir alerta de aviso
         * @param {string} id - ID único do alerta
         * @param {string} title - Título do alerta
         * @param {string} message - Mensagem do alerta
         * @param {object} options - Opções adicionais
         */
        showWarning(id, title, message, options = {}) {
            this.show(id, 'warning', title, message, { ...options, autoRemove: options.autoRemove || 0 });
        }

        /**
         * Exibir alerta informativo
         * @param {string} id - ID único do alerta
         * @param {string} title - Título do alerta
         * @param {string} message - Mensagem do alerta
         * @param {object} options - Opções adicionais
         */
        showInfo(id, title, message, options = {}) {
            this.show(id, 'info', title, message, { ...options, autoRemove: options.autoRemove || 8000 });
        }

        /**
         * Exibir alerta de sucesso
         * @param {string} id - ID único do alerta
         * @param {string} title - Título do alerta
         * @param {string} message - Mensagem do alerta
         * @param {object} options - Opções adicionais
         */
        showSuccess(id, title, message, options = {}) {
            this.show(id, 'success', title, message, { ...options, autoRemove: options.autoRemove || 5000 });
        }

        // Métodos específicos para validações (compatibilidade com código existente)

        /**
         * Mostrar alerta de técnico local
         * @param {string} id 
         * @param {string} message 
         */
        showLocalTechnicianAlert(id, message) {
            const title = '👤 Técnico Local';
            this.showInfo(id, title, message);
        }

        /**
         * Mostrar alerta de técnico remoto
         * @param {string} id 
         * @param {string} message 
         */
        showRemoteTechnicianAlert(id, message) {
            const title = '🌐 Técnico Remoto';
            this.showWarning(id, title, message);
        }

        /**
         * Mostrar alerta de tipo de serviço
         * @param {string} id 
         * @param {string} message 
         * @param {string} type 
         */
        showServiceTypeAlert(id, message, type = 'warning') {
            const title = '🔧 Tipo de Serviço';
            this.show(id, type, title, message);
        }

        /**
         * Mostrar alerta de classificação de serviço
         * @param {string} id 
         * @param {string} message 
         */
        showServiceClassificationAlert(id, message) {
            const title = '📋 Classificação de Serviço';
            this.showInfo(id, title, message);
        }

        /**
         * Verificar se uma fila está preenchida e é válida
         * @param {string} queue - Nome/valor da fila
         * @returns {boolean}
         */
        isValidQueue(queue) {
            if (!queue || typeof queue !== 'string') {
                return false;
            }
            
            const trimmedQueue = queue.trim();
            const invalidValues = ['', '-', 'undefined', 'null', '0'];
            
            return !invalidValues.includes(trimmedQueue.toLowerCase());
        }

        /**
         * Mostrar alerta de perfil e fila do usuário ao lado do campo de fila
         * @param {string} userProfile 
         * @param {string} queue 
         */
        showUserProfileAlert(userProfile, queue) {
            // Verificar se a fila está preenchida e é válida
            if (!this.isValidQueue(queue)) {
                console.log('Help OTRS: Fila não preenchida ou inválida, não exibindo alerta de perfil');
                return;
            }
            
            const id = 'user-profile-alert';
            const messageData = {
                parts: [
                    { type: 'text', content: 'Seu perfil é ' },
                    { type: 'strong', content: userProfile },
                    { type: 'text', content: ' e você está abrindo chamado para a fila ' },
                    { type: 'strong', content: queue },
                    { type: 'text', content: '.' }
                ]
            };
            
            // Remover alerta existente
            this.remove(id);
            
            // Injetar estilos e criar elemento formatado
            this.injectStyles();
            const alert = this.createFormattedAlertElement(id, 'info', '', messageData, true);
            
            // Tentar inserir ao lado do campo de fila primeiro
            let inserted = this.insertAlertBesideQueueField(alert);
            
            // Fallback: inserir acima do botão se não conseguir ao lado da fila
            if (!inserted) {
                inserted = this.insertAlertAboveButton(alert);
            }
            
            // Fallback final: container padrão
            if (!inserted) {
                const container = this.findAlertContainer();
                if (container) {
                    container.insertBefore(alert, container.firstChild);
                    inserted = true;
                }
            }
            
            if (inserted) {
                this.alerts.set(id, alert);
                this.observeAlertRemoval(id, alert);
                console.log(`Help OTRS Alert [info]: User Profile - ${userProfile} -> ${queue} (lado da fila)`);
            }
        }

        /**
         * Validar e exibir alertas de perfil e tipo de atendimento
         * @param {Object} configManager 
         * @param {Object} queueValidator 
         */
        validateAndShowAlerts(configManager, queueValidator) {
            const userProfile = configManager.getUserProfile();
            const currentQueue = queueValidator.getCurrentQueue();
            
            // Validar se perfil existe e fila está preenchida e válida
            if (userProfile && userProfile.trim() !== '' && this.isValidQueue(currentQueue)) {
                // Mostrar alerta de perfil e fila
                this.showUserProfileAlert(userProfile, currentQueue);
            } else {
                // Remover alerta se fila não estiver preenchida
                this.remove('user-profile-alert');
                console.log('Help OTRS: Fila não selecionada ou inválida, alerta de perfil removido');
            }
        }

        /**
         * Detectar tipo de atendimento atual selecionado com cache
         * @returns {string|null}
         */
        detectCurrentServiceType() {
            const cacheKey = 'currentServiceType';
            const cacheTimeout = 2000; // 2 segundos
            
            // Verificar cache
            if (this.selectorCache.has(cacheKey)) {
                const cached = this.selectorCache.get(cacheKey);
                if (Date.now() - cached.timestamp < cacheTimeout) {
                    return cached.value;
                }
                this.selectorCache.delete(cacheKey);
            }

            // Procurar por elementos que indiquem tipo de atendimento
            const serviceSelectors = [
                'input[name*="ServiceType"]:checked',
                'select[name*="ServiceType"] option:selected',
                'input[name*="TipoAtendimento"]:checked',
                'select[name*="TipoAtendimento"] option:selected',
                // Campos dinâmicos comuns - corrigido seletores inválidos
                'input[id*="DynamicField"]:checked',
                'select[id*="DynamicField"] option:selected',
                'input[id*="Tipo"]:checked',
                'select[id*="Tipo"] option:selected'
            ];
            
            let allElements = [];
            
            // Executar cada seletor individualmente para evitar erros de sintaxe
            for (const selector of serviceSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    allElements = allElements.concat(Array.from(elements));
                } catch (error) {
                    console.warn(`Help OTRS AlertSystem: Seletor inválido ignorado: ${selector}`, error);
                }
            }
            let result = null;
            
            for (const element of allElements) {
                const value = element.value || element.textContent;
                if (value && value.trim()) {
                    // Normalizar valores
                    const normalizedValue = value.toLowerCase();
                    if (normalizedValue.includes('remoto') || normalizedValue.includes('distancia')) {
                        result = 'Remoto';
                        break;
                    }
                    if (normalizedValue.includes('presencial') || normalizedValue.includes('local')) {
                        result = 'Presencial';
                        break;
                    }
                    if (!result) {
                        result = value.trim();
                    }
                }
            }
            
            // Cache do resultado
            this.selectorCache.set(cacheKey, {
                value: result,
                timestamp: Date.now()
            });
            
            return result;
        }

        /**
         * Debounce function para evitar chamadas múltiplas rápidas
         * @param {Function} func 
         * @param {number} wait 
         * @returns {Function}
         */
        debounce(func, wait = 300) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * Limpar todos os alertas com cleanup completo
         */
        clearAll() {
            try {
                this.alerts.forEach((alert, id) => {
                    this.remove(id);
                });
                
                // Limpar cache de seletores
                this.selectorCache.clear();
                
                console.log('Help OTRS: Todos os alertas foram limpos');
            } catch (error) {
                console.error('Help OTRS: Erro ao limpar alertas:', error);
                // Force cleanup
                this.alerts.clear();
                this.selectorCache.clear();
            }
        }

        /**
         * Obter estatísticas detalhadas dos alertas
         * @returns {object}
         */
        getStats() {
            const activeAlerts = Array.from(this.alerts.keys()).filter(id => this.exists(id));
            const alertTypes = Array.from(this.alerts.values())
                .filter(alert => document.contains(alert))
                .map(alert => alert.className.match(/help-otrs-alert-(\w+)/)?.[1] || 'unknown');

            return {
                totalAlerts: this.alerts.size,
                activeAlerts: activeAlerts.length,
                activeAlertIds: activeAlerts,
                alertTypes: alertTypes,
                typeDistribution: alertTypes.reduce((acc, type) => {
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {}),
                cacheSize: this.selectorCache.size,
                memoryLeaks: this.alerts.size - activeAlerts.length
            };
        }

        /**
         * Método de limpeza para prevenir memory leaks
         * Deve ser chamado quando a página for descarregada
         */
        dispose() {
            try {
                // Limpar todos os alertas
                this.clearAll();
                
                // Limpar observers
                this.alerts.forEach((alert) => {
                    if (alert._observer) {
                        alert._observer.disconnect();
                        delete alert._observer;
                    }
                });
                
                // Limpar referências
                this.alerts.clear();
                this.selectorCache.clear();
                
                console.log('Help OTRS: AlertSystem disposed successfully');
            } catch (error) {
                console.error('Help OTRS: Erro durante dispose:', error);
            }
        }
    }

    // Disponibilizar globalmente
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.AlertSystem = AlertSystem;

    // Auto-dispose ao descarregar página para prevenir memory leaks
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (global.HelpOTRS.alertInstance) {
                global.HelpOTRS.alertInstance.dispose();
            }
        });
    }

})(window);
