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
         * Sanitizar conteúdo HTML para prevenir XSS
         * @param {string} html - Conteúdo HTML
         * @returns {string} HTML sanitizado
         */
        sanitizeHtml(html) {
            if (!html) return '';
            
            // Criar elemento temporário para sanitização
            const temp = document.createElement('div');
            temp.textContent = html;
            
            // Permitir apenas algumas tags seguras
            const allowedTags = ['strong', 'b', 'em', 'i', 'br', 'span'];
            let sanitized = temp.innerHTML;
            
            // Permitir tags específicas (implementação básica)
            allowedTags.forEach(tag => {
                const regex = new RegExp(`&lt;(/?${tag}(?:\\s[^&gt;]*)?)&gt;`, 'gi');
                sanitized = sanitized.replace(regex, '<$1>');
            });
            
            return sanitized;
        }

        /**
         * Obter estilos CSS para os alertas
         * @returns {string}
         */
        getAlertStyles() {
            return `
                .help-otrs-alert {
                    position: relative;
                    padding: 10px 16px;
                    margin: 5px 0;
                    border: 1px solid transparent;
                    border-radius: 4px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.3;
                    z-index: 1000;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    min-height: 20px;
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
                    top: 8px;
                    right: 12px;
                    background: none;
                    border: none;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    opacity: 0.7;
                    line-height: 1;
                }

                .help-otrs-alert-close:hover {
                    opacity: 1;
                }

                .help-otrs-alert-title {
                    font-weight: bold;
                    margin-right: 8px;
                    flex-shrink: 0;
                }

                .help-otrs-alert-message {
                    margin: 0;
                    flex: 1;
                }

                .help-otrs-alert .help-otrs-alert-message strong {
                    font-weight: 600;
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
         * Criar elemento de alerta com sanitização
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
                
                let html = '';
                if (title) {
                    html += `<div class="help-otrs-alert-title">${this.sanitizeHtml(title)}</div>`;
                }
                html += `<div class="help-otrs-alert-message">${this.sanitizeHtml(message)}</div>`;
                
                if (closeable) {
                    html += `<button class="help-otrs-alert-close" type="button" data-alert-id="${id}">&times;</button>`;
                }
                
                alert.innerHTML = html;
                
                // Adicionar event listener seguro para o botão close
                if (closeable) {
                    const closeBtn = alert.querySelector('.help-otrs-alert-close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => this.remove(id));
                    }
                }
                
                return alert;
            } catch (error) {
                console.error('Help OTRS: Erro ao criar elemento de alerta:', error);
                throw new Error(`Falha ao criar alerta: ${error.message}`);
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
                        alert.remove();
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
         * Mostrar aviso de fila
         * @param {string} id 
         * @param {string} message 
         * @param {string} queue 
         * @param {string} userProfile 
         */
        showQueueWarning(id, message, queue, userProfile) {
            const title = '⚠️ Aviso de Fila';
            const fullMessage = `${message}<br><br><strong>Fila:</strong> ${queue}<br><strong>Perfil:</strong> ${userProfile}`;
            this.showWarning(id, title, fullMessage);
        }

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
         * Mostrar alerta de perfil e fila do usuário
         * @param {string} userProfile 
         * @param {string} queue 
         */
        showUserProfileAlert(userProfile, queue) {
            const id = 'user-profile-alert';
            const message = `Seu perfil é <strong>${userProfile}</strong> e você está abrindo chamado para a fila <strong>${queue}</strong>.`;
            this.showInfo(id, '', message, { aboveButton: true });
        }

        /**
         * Mostrar alerta de tipo de atendimento e fila
         * @param {string} selectedQueue 
         * @param {string} currentServiceType 
         * @param {string} correctServiceType 
         */
        showServiceTypeQueueAlert(selectedQueue, currentServiceType, correctServiceType) {
            const id = 'service-type-queue-alert';
            const message = `A fila selecionada é <strong>${selectedQueue}</strong> e o tipo de atendimento está marcado como <strong>${currentServiceType}</strong>. O correto deveria ser <strong>${correctServiceType}</strong>.`;
            this.showWarning(id, '⚠️ Verificação de Tipo de Atendimento', message, { aboveButton: true });
        }

        /**
         * Validar e exibir alertas de perfil e tipo de atendimento
         * @param {Object} configManager 
         * @param {Object} queueValidator 
         */
        validateAndShowAlerts(configManager, queueValidator) {
            const userProfile = configManager.getUserProfile();
            const currentQueue = queueValidator.getCurrentQueue();
            
            if (userProfile && currentQueue) {
                // Mostrar alerta de perfil e fila
                this.showUserProfileAlert(userProfile, currentQueue);
                
                // Determinar tipo de atendimento correto baseado na fila
                const isRemoteQueue = queueValidator.isRemoteTechnicianQueue();
                const isLocalQueue = queueValidator.isLocalTechnicianQueue();
                
                let correctServiceType = '';
                let currentServiceType = this.detectCurrentServiceType();
                
                if (isRemoteQueue) {
                    correctServiceType = 'Remoto';
                } else if (isLocalQueue) {
                    correctServiceType = 'Presencial';
                } else {
                    // Determinar baseado no nome da fila
                    if (currentQueue.toLowerCase().includes('remoto') || currentQueue.toLowerCase().includes('nível 1')) {
                        correctServiceType = 'Remoto';
                    } else {
                        correctServiceType = 'Presencial';
                    }
                }
                
                // Mostrar alerta de tipo de atendimento se necessário
                if (currentServiceType && correctServiceType && currentServiceType !== correctServiceType) {
                    this.showServiceTypeQueueAlert(currentQueue, currentServiceType, correctServiceType);
                }
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
                // Campos dinâmicos comuns
                'input[id*="DynamicField"][id*="Tipo"]:checked',
                'select[id*="DynamicField"][id*="Tipo"] option:selected'
            ];
            
            // Usar querySelectorAll uma vez e filtrar
            const allElements = document.querySelectorAll(serviceSelectors.join(', '));
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
