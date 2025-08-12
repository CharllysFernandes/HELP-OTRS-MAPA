/**
 * ClassificationValidator - Validador de Janela de Classificação
 * 
 * Detecta quando o usuário está na janela de classificação do OTRS
 * e exibe alertas sobre o tipo de atendimento para conscientização.
 * 
 * @author Help OTRS Team
 * @version 1.0.0
 */

(function(global) {
    'use strict';

    class ClassificationValidator {
        constructor() {
            this.initialized = false;
            this.alertInstance = null;
            this.observerActive = false;
            this.currentPageType = null;
            
            // Cache para melhorar performance
            this.elementCache = new Map();
            this.lastCheck = 0;
            this.checkThrottle = 1000; // 1 segundo
        }

        /**
         * Inicializar o validador
         * @param {Object} alertSystem - Instância do AlertSystem
         */
        init(alertSystem) {
            try {
                if (this.initialized) {
                    console.log('Help OTRS: ClassificationValidator já inicializado');
                    return;
                }

                if (!alertSystem) {
                    throw new Error('AlertSystem é obrigatório');
                }

                this.alertInstance = alertSystem;
                
                // Aguardar DOM estar pronto
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.setup());
                } else {
                    this.setup();
                }
                
                this.initialized = true;
                console.log('Help OTRS: ClassificationValidator inicializado com sucesso');

            } catch (error) {
                console.error('Help OTRS: Erro ao inicializar ClassificationValidator:', error);
            }
        }

        /**
         * Configurar o validador após DOM estar pronto
         */
        setup() {
            try {
                // Detectar tipo de página atual
                this.detectPageType();
                
                // Se estamos na janela de classificação, ativar monitoramento
                if (this.isClassificationWindow()) {
                    console.log('Help OTRS: Janela de classificação detectada');
                    this.activateClassificationMode();
                } else {
                    console.log('Help OTRS: Não é janela de classificação, validador inativo');
                }

            } catch (error) {
                console.error('Help OTRS: Erro no setup ClassificationValidator:', error);
            }
        }

        /**
         * Detectar o tipo de página atual
         */
        detectPageType() {
            try {
                // Verificar se é popup
                const isPopup = document.body?.classList.contains('Popup') || 
                               document.body?.classList.contains('RealPopup') ||
                               window.name?.includes('OTRSPopup');

                // Verificar se é janela de classificação baseado em múltiplos indicadores
                const isClassification = this.checkClassificationIndicators();

                this.currentPageType = {
                    isPopup: isPopup,
                    isClassification: isClassification,
                    url: window.location.href,
                    title: document.title || '',
                    action: this.extractActionFromURL() || this.extractActionFromForm()
                };

                console.log('Help OTRS: Tipo de página detectado:', this.currentPageType);

            } catch (error) {
                console.error('Help OTRS: Erro ao detectar tipo de página:', error);
                this.currentPageType = { isPopup: false, isClassification: false };
            }
        }

        /**
         * Verificar indicadores de janela de classificação
         * @returns {boolean}
         */
        checkClassificationIndicators() {
            try {
                // Lista de indicadores que sugerem janela de classificação
                const indicators = [
                    // URL e ação
                    () => window.location.href.includes('Action=AgentTicketNote'),
                    () => window.location.href.includes('Action=AgentTicketClassification'),
                    () => window.location.href.includes('Action=AgentTicketClose'),
                    () => window.location.href.includes('Action=AgentTicketService'),
                    
                    // Título da página
                    () => document.title?.toLowerCase().includes('classificação') ||
                          document.title?.toLowerCase().includes('classification'),
                    () => document.title?.toLowerCase().includes('nota') ||
                          document.title?.toLowerCase().includes('note'),
                    () => document.title?.toLowerCase().includes('serviço') ||
                          document.title?.toLowerCase().includes('service'),
                    
                    // Elementos específicos da página
                    () => !!document.querySelector('#TypeID, select[name="TypeID"]'),
                    () => !!document.querySelector('#ServiceID, select[name="ServiceID"]'),
                    () => !!document.querySelector('#DynamicField_PRITipoAtendimento'),
                    () => !!document.querySelector('#DynamicField_localidade'),
                    () => !!document.querySelector('h1:contains("Adicionar nota"), h1:contains("Classificar")'),
                    
                    // Headers específicos
                    () => !!document.querySelector('h1[title*="Chamado"], h1[title*="Ticket"]'),
                    () => !!document.querySelector('.Header h1:contains("Adicionar")'),
                    
                    // Formulários
                    () => !!document.querySelector('form[name="compose"], form#Compose'),
                    () => !!document.querySelector('form[action*="AgentTicket"]'),
                    
                    // Widgets específicos
                    () => !!document.querySelector('.WidgetSimple .Header h2:contains("Configurações de Chamado")'),
                    () => !!document.querySelector('.WidgetSimple .Header h2:contains("Ticket Configuration")'),
                    
                    // Campos obrigatórios típicos de classificação
                    () => {
                        const mandatoryFields = document.querySelectorAll('.Mandatory label');
                        const fieldTexts = Array.from(mandatoryFields).map(label => 
                            label.textContent?.toLowerCase() || ''
                        );
                        return fieldTexts.some(text => 
                            text.includes('tipo') || 
                            text.includes('serviço') || 
                            text.includes('service') ||
                            text.includes('localidade') ||
                            text.includes('atendimento')
                        );
                    }
                ];

                // Contar quantos indicadores são verdadeiros
                const positiveIndicators = indicators.filter(indicator => {
                    try {
                        return indicator();
                    } catch (e) {
                        return false;
                    }
                });

                const threshold = 3; // Mínimo de indicadores para considerar como janela de classificação
                const isClassification = positiveIndicators.length >= threshold;

                console.log(`Help OTRS: ${positiveIndicators.length}/${indicators.length} indicadores de classificação encontrados`);
                
                return isClassification;

            } catch (error) {
                console.error('Help OTRS: Erro ao verificar indicadores de classificação:', error);
                return false;
            }
        }

        /**
         * Extrair ação da URL
         * @returns {string|null}
         */
        extractActionFromURL() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('Action');
            } catch (error) {
                return null;
            }
        }

        /**
         * Extrair ação do formulário
         * @returns {string|null}
         */
        extractActionFromForm() {
            try {
                const actionInput = document.querySelector('input[name="Action"]');
                return actionInput?.value || null;
            } catch (error) {
                return null;
            }
        }

        /**
         * Verificar se estamos na janela de classificação
         * @returns {boolean}
         */
        isClassificationWindow() {
            return this.currentPageType?.isClassification === true;
        }

        /**
         * Ativar modo de classificação - monitoramento e alertas
         */
        activateClassificationMode() {
            try {
                console.log('Help OTRS: Ativando modo de classificação');
                
                // Exibir alerta inicial de conscientização
                this.showInitialAwarenessAlert();
                
                // Configurar monitoramento de mudanças no tipo de atendimento
                this.setupServiceTypeMonitoring();
                
                // Configurar observador de mudanças na página
                this.setupPageObserver();

                console.log('Help OTRS: Modo de classificação ativado com sucesso');

            } catch (error) {
                console.error('Help OTRS: Erro ao ativar modo de classificação:', error);
            }
        }

        /**
         * Exibir alerta inicial de conscientização
         */
        showInitialAwarenessAlert() {
            try {
                if (!this.alertInstance) return;

                const alertId = 'classification-awareness-alert';
                const title = '📋 Atenção - Tipo de Atendimento';
                const message = 'Você está na janela de classificação. Certifique-se de selecionar o tipo de atendimento correto antes de prosseguir.';

                // Remover alerta anterior se existir
                this.alertInstance.remove(alertId);

                // Criar novo alerta
                this.alertInstance.showInfo(alertId, title, message, {
                    autoRemove: 0, // Não remover automaticamente
                    aboveButton: true
                });

                console.log('Help OTRS: Alerta de conscientização exibido');

            } catch (error) {
                console.error('Help OTRS: Erro ao exibir alerta inicial:', error);
            }
        }

        /**
         * Configurar monitoramento do campo tipo de atendimento
         */
        setupServiceTypeMonitoring() {
            try {
                // Encontrar campo de tipo de atendimento
                const serviceTypeField = this.findServiceTypeField();
                
                if (!serviceTypeField) {
                    console.log('Help OTRS: Campo de tipo de atendimento não encontrado');
                    return;
                }

                console.log('Help OTRS: Campo de tipo de atendimento encontrado:', serviceTypeField.id || serviceTypeField.name);

                // Monitorar mudanças no campo
                const handleServiceTypeChange = this.debounce(() => {
                    this.handleServiceTypeChange(serviceTypeField);
                }, 300);

                // Event listeners
                serviceTypeField.addEventListener('change', handleServiceTypeChange);
                serviceTypeField.addEventListener('input', handleServiceTypeChange);

                // Para campos com InputField_Container (OTRS modernizado)
                const container = serviceTypeField.closest('.InputField_Container');
                if (container) {
                    container.addEventListener('click', () => {
                        setTimeout(handleServiceTypeChange, 500); // Aguardar seleção
                    });
                }

                // Monitoramento inicial
                setTimeout(() => {
                    this.handleServiceTypeChange(serviceTypeField);
                }, 1000);

            } catch (error) {
                console.error('Help OTRS: Erro ao configurar monitoramento:', error);
            }
        }

        /**
         * Encontrar campo de tipo de atendimento
         * @returns {HTMLElement|null}
         */
        findServiceTypeField() {
            const selectors = [
                '#DynamicField_PRITipoAtendimento',
                'select[name*="TipoAtendimento"]',
                'select[name*="ServiceType"]',
                'select[name*="Type"]',
                'input[name*="TipoAtendimento"]',
                'input[name*="ServiceType"]',
                '#TypeID' // Campo tipo do OTRS padrão
            ];

            for (const selector of selectors) {
                try {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log(`Help OTRS: Campo encontrado com seletor: ${selector}`);
                        return element;
                    }
                } catch (e) {
                    console.warn(`Help OTRS: Seletor inválido: ${selector}`);
                }
            }

            return null;
        }

        /**
         * Lidar com mudança no tipo de atendimento
         * @param {HTMLElement} field 
         */
        handleServiceTypeChange(field) {
            try {
                if (!field || !this.alertInstance) return;

                const currentValue = this.extractFieldValue(field);
                
                if (!currentValue || currentValue === '-' || currentValue === '') {
                    console.log('Help OTRS: Tipo de atendimento não selecionado');
                    this.showServiceTypeAlert('warning', 'Tipo de atendimento não selecionado. Por favor, selecione o tipo apropriado.');
                    return;
                }

                console.log('Help OTRS: Tipo de atendimento selecionado:', currentValue);
                
                // Normalizar valor
                const normalizedValue = this.normalizeServiceType(currentValue);
                
                // Exibir informações sobre o tipo selecionado
                this.showServiceTypeInfo(normalizedValue, currentValue);
                
                // Validações futuras podem ser adicionadas aqui
                this.performFutureValidations(normalizedValue, currentValue);

            } catch (error) {
                console.error('Help OTRS: Erro ao processar mudança de tipo:', error);
            }
        }

        /**
         * Extrair valor do campo de formulário
         * @param {HTMLElement} field 
         * @returns {string|null}
         */
        extractFieldValue(field) {
            try {
                if (!field) return null;

                // Para elementos select
                if (field.tagName === 'SELECT') {
                    const value = field.value;
                    if (value && value !== '-' && value !== '') {
                        return value;
                    }
                    // Tentar pegar texto da opção selecionada
                    const selectedOption = field.options[field.selectedIndex];
                    return selectedOption?.textContent?.trim() || null;
                }

                // Para elementos input
                if (field.tagName === 'INPUT') {
                    return field.value?.trim() || null;
                }

                return null;

            } catch (error) {
                console.error('Help OTRS: Erro ao extrair valor do campo:', error);
                return null;
            }
        }

        /**
         * Normalizar tipo de atendimento para valores padronizados
         * @param {string} value 
         * @returns {string}
         */
        normalizeServiceType(value) {
            if (!value || typeof value !== 'string') return 'Indefinido';

            const normalized = value.toLowerCase().trim();

            // Mapeamentos conhecidos
            if (normalized === 'r' || normalized.includes('remoto') || normalized.includes('remote')) {
                return 'Remoto';
            }
            
            if (normalized === 'p' || normalized.includes('presencial') || normalized.includes('local') || normalized.includes('onsite')) {
                return 'Presencial';
            }

            // Retornar valor original se não conseguir normalizar
            return value.trim();
        }

        /**
         * Exibir informações sobre o tipo de atendimento selecionado
         * @param {string} normalizedValue 
         * @param {string} originalValue 
         */
        showServiceTypeInfo(normalizedValue, originalValue) {
            try {
                const alertId = 'service-type-info-alert';
                let message = '';
                let alertType = 'info';

                switch (normalizedValue) {
                    case 'Remoto':
                        message = 'Tipo de atendimento REMOTO selecionado. O técnico irá resolver a solicitação à distância via acesso remoto ou telefone.';
                        alertType = 'info';
                        break;
                        
                    case 'Presencial':
                        message = 'Tipo de atendimento PRESENCIAL selecionado. O técnico se deslocará fisicamente até o local para atender a solicitação.';
                        alertType = 'warning';
                        break;
                        
                    default:
                        message = `Tipo de atendimento "${normalizedValue}" selecionado. Verifique se está correto para o tipo de solicitação.`;
                        alertType = 'info';
                }

                // Exibir alerta
                this.showServiceTypeAlert(alertType, message, alertId);

            } catch (error) {
                console.error('Help OTRS: Erro ao exibir informações do tipo:', error);
            }
        }

        /**
         * Exibir alerta relacionado ao tipo de atendimento
         * @param {string} type 
         * @param {string} message 
         * @param {string} alertId 
         */
        showServiceTypeAlert(type, message, alertId = 'service-type-general-alert') {
            try {
                if (!this.alertInstance) return;

                const title = '🔧 Tipo de Atendimento';

                // Remover alerta anterior
                this.alertInstance.remove(alertId);

                // Exibir novo alerta
                this.alertInstance.show(alertId, type, title, message, {
                    autoRemove: type === 'success' ? 5000 : 0,
                    aboveButton: true
                });

            } catch (error) {
                console.error('Help OTRS: Erro ao exibir alerta de tipo:', error);
            }
        }

        /**
         * Validações futuras que podem ser implementadas
         * @param {string} normalizedValue 
         * @param {string} originalValue 
         */
        performFutureValidations(normalizedValue, originalValue) {
            // Placeholder para futuras validações como:
            // - Verificar se o tipo de serviço é compatível com a fila selecionada
            // - Validar se o tipo de atendimento está de acordo com a localidade
            // - Sugerir filas baseadas no tipo de atendimento
            
            console.log('Help OTRS: Preparado para futuras validações -', {
                normalized: normalizedValue,
                original: originalValue
            });

            // Exemplo de validação futura (comentado para implementação posterior):
            /*
            if (normalizedValue === 'Presencial') {
                this.validatePresencialRequirements();
            }
            
            if (normalizedValue === 'Remoto') {
                this.validateRemoteRequirements();
            }
            */
        }

        /**
         * Configurar observador de mudanças na página
         */
        setupPageObserver() {
            try {
                if (this.observerActive) return;

                const observer = new MutationObserver(this.debounce((mutations) => {
                    this.handlePageChanges(mutations);
                }, 500));

                // Observar mudanças no formulário
                const form = document.querySelector('form[name="compose"], form#Compose, .Content');
                if (form) {
                    observer.observe(form, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class', 'style', 'value']
                    });
                    
                    this.observerActive = true;
                    this.pageObserver = observer;
                    console.log('Help OTRS: Observador de página configurado');
                }

            } catch (error) {
                console.error('Help OTRS: Erro ao configurar observador:', error);
            }
        }

        /**
         * Lidar com mudanças na página
         * @param {MutationRecord[]} mutations 
         */
        handlePageChanges(mutations) {
            try {
                let needsRecheck = false;

                mutations.forEach(mutation => {
                    // Verificar se novos campos foram adicionados
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        const hasNewFields = Array.from(mutation.addedNodes).some(node => {
                            return node.nodeType === 1 && (
                                node.matches?.('select, input') ||
                                node.querySelector?.('select, input')
                            );
                        });
                        
                        if (hasNewFields) {
                            needsRecheck = true;
                        }
                    }

                    // Verificar mudanças de atributos em campos importantes
                    if (mutation.type === 'attributes' && mutation.target.matches?.('select, input')) {
                        needsRecheck = true;
                    }
                });

                // Throttle para evitar execuções excessivas
                if (needsRecheck) {
                    const now = Date.now();
                    if (now - this.lastCheck > this.checkThrottle) {
                        this.lastCheck = now;
                        setTimeout(() => {
                            this.recheckClassificationElements();
                        }, 200);
                    }
                }

            } catch (error) {
                console.error('Help OTRS: Erro ao processar mudanças da página:', error);
            }
        }

        /**
         * Reverificar elementos de classificação
         */
        recheckClassificationElements() {
            try {
                console.log('Help OTRS: Reverificando elementos de classificação');
                
                // Limpar cache
                this.elementCache.clear();
                
                // Verificar se novos campos de tipo de atendimento apareceram
                const serviceTypeField = this.findServiceTypeField();
                if (serviceTypeField && !serviceTypeField.hasAttribute('data-helpotrs-monitored')) {
                    serviceTypeField.setAttribute('data-helpotrs-monitored', 'true');
                    this.setupServiceTypeMonitoring();
                    console.log('Help OTRS: Novo campo de tipo monitorado');
                }

            } catch (error) {
                console.error('Help OTRS: Erro ao reverificar elementos:', error);
            }
        }

        /**
         * Função debounce para limitar execuções
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
         * Limpar recursos e observers
         */
        dispose() {
            try {
                if (this.pageObserver) {
                    this.pageObserver.disconnect();
                    this.pageObserver = null;
                }
                
                this.observerActive = false;
                this.elementCache.clear();
                
                // Remover alertas relacionados
                if (this.alertInstance) {
                    this.alertInstance.remove('classification-awareness-alert');
                    this.alertInstance.remove('service-type-info-alert');
                    this.alertInstance.remove('service-type-general-alert');
                }

                console.log('Help OTRS: ClassificationValidator disposed');

            } catch (error) {
                console.error('Help OTRS: Erro ao fazer dispose:', error);
            }
        }

        /**
         * Obter estatísticas do validador
         * @returns {Object}
         */
        getStats() {
            return {
                initialized: this.initialized,
                currentPageType: this.currentPageType,
                observerActive: this.observerActive,
                cacheSize: this.elementCache.size,
                lastCheck: new Date(this.lastCheck).toISOString()
            };
        }
    }

    // Disponibilizar globalmente
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.ClassificationValidator = ClassificationValidator;

})(window);
