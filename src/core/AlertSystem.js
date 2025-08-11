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
         */
        injectStyles() {
            const styleId = 'help-otrs-alert-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = this.alertStyles;
                document.head.appendChild(style);
            }
        }

        /**
         * Criar elemento de alerta
         * @param {string} id 
         * @param {string} type 
         * @param {string} title 
         * @param {string} message 
         * @param {boolean} closeable 
         * @returns {HTMLElement}
         */
        createAlertElement(id, type, title, message, closeable = true) {
            const alert = document.createElement('div');
            alert.id = id;
            alert.className = `help-otrs-alert help-otrs-alert-${type}`;
            
            let html = '';
            if (title) {
                html += `<div class="help-otrs-alert-title">${title}</div>`;
            }
            html += `<div class="help-otrs-alert-message">${message}</div>`;
            
            if (closeable) {
                html += `<button class="help-otrs-alert-close" onclick="this.parentElement.remove()">&times;</button>`;
            }
            
            alert.innerHTML = html;
            return alert;
        }

        /**
         * Encontrar container apropriado para inserir alerta
         * @returns {HTMLElement}
         */
        findAlertContainer() {
            // Priorizar inserção acima do botão de submit
            const submitButton = document.querySelector('#submitRichText, button.Primary.CallForAction, .Field.SpacingTop button');
            if (submitButton) {
                const fieldContainer = submitButton.closest('.Field, .SpacingTop');
                if (fieldContainer) {
                    console.log('Help OTRS: Container específico encontrado (acima do botão)');
                    return fieldContainer.parentElement; // Inserir antes do campo do botão
                }
            }

            // Tentar outros containers do OTRS
            const selectors = [
                '.Content',
                '.WidgetSimple .Content',
                '.MainBox',
                '#MainBox',
                'form[name="compose"]',
                'body'
            ];

            for (const selector of selectors) {
                const container = document.querySelector(selector);
                if (container) {
                    return container;
                }
            }

            return document.body;
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
         * Exibir alerta genérico
         * @param {string} id 
         * @param {string} type 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        show(id, type, title, message, options = {}) {
            this.injectStyles();
            
            // Remover alerta existente com mesmo ID
            this.remove(id);
            
            const alert = this.createAlertElement(id, type, title, message, options.closeable !== false);
            
            // Tentar inserir acima do botão primeiro
            if (options.aboveButton !== false && this.insertAlertAboveButton(alert)) {
                // Sucesso - inserido acima do botão
            } else {
                // Fallback para container padrão
                const container = options.container || this.findAlertContainer();
                container.insertBefore(alert, container.firstChild);
            }
            
            // Armazenar referência
            this.alerts.set(id, alert);
            
            console.log(`Help OTRS Alert [${type}]: ${title} - ${message}`);
            
            // Auto-remover se especificado
            if (options.autoRemove) {
                setTimeout(() => this.remove(id), options.autoRemove);
            }
        }

        /**
         * Remover alerta
         * @param {string} id 
         */
        remove(id) {
            const alert = this.alerts.get(id);
            if (alert && alert.parentElement) {
                alert.remove();
                this.alerts.delete(id);
                console.log(`Help OTRS: Alert ${id} removido`);
            }
        }

        /**
         * Verificar se alerta existe
         * @param {string} id 
         * @returns {boolean}
         */
        exists(id) {
            return this.alerts.has(id) && this.alerts.get(id).parentElement;
        }

        // Métodos específicos para diferentes tipos de alerta

        /**
         * Exibir alerta de erro
         * @param {string} id 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        showError(id, title, message, options = {}) {
            this.show(id, 'error', title, message, options);
        }

        /**
         * Exibir alerta de aviso
         * @param {string} id 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        showWarning(id, title, message, options = {}) {
            this.show(id, 'warning', title, message, options);
        }

        /**
         * Exibir alerta informativo
         * @param {string} id 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        showInfo(id, title, message, options = {}) {
            this.show(id, 'info', title, message, options);
        }

        /**
         * Exibir alerta de sucesso
         * @param {string} id 
         * @param {string} title 
         * @param {string} message 
         * @param {object} options 
         */
        showSuccess(id, title, message, options = {}) {
            this.show(id, 'success', title, message, options);
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
         * Detectar tipo de atendimento atual selecionado
         * @returns {string|null}
         */
        detectCurrentServiceType() {
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
            
            for (const selector of serviceSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const value = element.value || element.textContent;
                    if (value && value.trim()) {
                        // Normalizar valores
                        if (value.toLowerCase().includes('remoto') || value.toLowerCase().includes('distancia')) {
                            return 'Remoto';
                        }
                        if (value.toLowerCase().includes('presencial') || value.toLowerCase().includes('local')) {
                            return 'Presencial';
                        }
                        return value.trim();
                    }
                }
            }
            
            return null;
        }

        /**
         * Limpar todos os alertas
         */
        clearAll() {
            this.alerts.forEach((alert, id) => {
                this.remove(id);
            });
        }

        /**
         * Obter estatísticas dos alertas
         * @returns {object}
         */
        getStats() {
            return {
                totalAlerts: this.alerts.size,
                activeAlerts: Array.from(this.alerts.keys()).filter(id => this.exists(id)),
                alertTypes: Array.from(this.alerts.values()).map(alert => 
                    alert.className.match(/help-otrs-alert-(\w+)/)?.[1] || 'unknown'
                )
            };
        }
    }

    // Disponibilizar globalmente
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.AlertSystem = AlertSystem;

})(window);
