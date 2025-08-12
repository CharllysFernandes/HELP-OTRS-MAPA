/**
 * ServiceTypeValidator - Validação de Tipos de Atendimento
 * Versão otimizada com cache DOM, benchmarks e tratamento de erros
 * 
 * Responsável por validar se o tipo de atendimento selecionado
 * é compatível com a fila escolhida.
 * 
 * @author Help OTRS Team
 * @version 2.3.0
 */

(function(global) {
    'use strict';

    class ServiceTypeValidator {
        constructor(configManager, alertSystem) {
            this.configManager = configManager;
            this.alertSystem = alertSystem;
            this.domCache = new Map();
            this.performanceMetrics = new Map();
            this.isEnabled = true;
            this.mutationObserver = null;
            this.debounceTimer = null;
            
            this.alertIds = {
                typeOfService: 'TypeOfServiceAlert',
                localTechnician: 'LocalTechnicianAlert',
                remoteTechnician: 'RemoteTechnicianAlert',
                serviceClassification: 'ServiceClassificationAlert'
            };
            
            this.validateDependencies();
        }

        /**
         * Validar dependências obrigatórias
         * @throws {Error} Se dependências não estiverem disponíveis
         */
        validateDependencies() {
            if (!this.configManager) {
                throw new Error('ConfigManager é obrigatório para ServiceTypeValidator');
            }
            if (!this.alertSystem) {
                console.warn('AlertSystem não fornecido - alertas não serão exibidos');
            }
        }

        /**
         * Cache DOM inteligente com timeout
         * @param {string} selector - Seletor CSS
         * @param {number} timeout - Timeout do cache em ms (padrão: 2000)
         * @returns {HTMLElement|null} Elemento encontrado ou null
         */
        getCachedElement(selector, timeout = 2000) {
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
         * Obter elementos DOM frequentemente usados com cache
         * @returns {Object} Objeto com elementos DOM principais
         */
        getDOMElements() {
            try {
                return {
                    serviceSelect: this.getCachedElement("#DynamicField_PRITipoAtendimento"),
                    serviceSearch: this.getCachedElement("#DynamicField_PRITipoAtendimento_Search"),
                    queueSelect: this.getCachedElement("#Dest"),
                    queueSelection: this.getCachedElement("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text")
                };
            } catch (error) {
                this.log('error', 'Erro ao obter elementos DOM', error);
                return {};
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
         * Log estruturado para debug - Versão melhorada
         * @param {string} level - Nível do log (info, warn, error)
         * @param {string} message - Mensagem
         * @param {Object} data - Dados adicionais
         */
        log(level, message, data = null) {
            if (!this.isEnabled && level !== 'error') return;

            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] Help OTRS ServiceTypeValidator: ${message}`;
            
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
                    console.log(`ServiceTypeValidator Log Error: ${error.message}`);
                } catch (e) {
                    // Silenciar se console totalmente indisponível
                }
            }
        }

        /**
         * Verificar se tipo de atendimento não está vazio
         * @returns {boolean}
         */
        isTypeOfServiceNotEmpty() {
            return this.benchmark('isTypeOfServiceNotEmpty', async () => {
                try {
                    const elements = this.getDOMElements();
                    const element = elements.serviceSearch?.nextElementSibling?.firstChild;
                    
                    if (!element) {
                        this.log('warn', 'Elemento de tipo de atendimento não encontrado');
                        return false;
                    }
                    
                    const textContent = element.textContent?.trim();
                    const result = textContent === "Presencial" || textContent === "Remoto";
                    
                    this.log('info', `Tipo de atendimento atual: ${textContent || 'N/A'}`, { result });
                    return result;
                } catch (error) {
                    this.log('error', 'Erro ao verificar se tipo de atendimento não está vazio', error);
                    return false;
                }
            });
        }

        /**
         * Verificar se tipo de atendimento é Remoto
         * @returns {boolean}
         */
        isTypeOfServiceRemoto() {
            return this.benchmark('isTypeOfServiceRemoto', async () => {
                try {
                    const elements = this.getDOMElements();
                    
                    // Verificar select primeiro
                    if (elements.serviceSelect?.value) {
                        const result = elements.serviceSelect.value === "R";
                        this.log('info', `Tipo de atendimento (select): ${elements.serviceSelect.value}`, { isRemoto: result });
                        return result;
                    }
                    
                    // Verificar campo visível
                    if (elements.serviceSearch?.nextElementSibling) {
                        const selectedText = elements.serviceSearch.nextElementSibling.textContent?.trim();
                        const result = selectedText === "Remoto";
                        this.log('info', `Tipo de atendimento visível: ${selectedText || 'N/A'}`, { isRemoto: result });
                        return result;
                    }
                    
                    this.log('warn', 'Nenhum elemento de tipo de atendimento encontrado');
                    return false;
                } catch (error) {
                    this.log('error', 'Erro ao verificar tipo de atendimento Remoto', error);
                    return false;
                }
            });
        }

        /**
         * Verificar se tipo de atendimento é Presencial
         * @returns {boolean}
         */
        isTypeOfServicePresencial() {
            return this.benchmark('isTypeOfServicePresencial', async () => {
                try {
                    const elements = this.getDOMElements();
                    
                    // Verificar select primeiro
                    if (elements.serviceSelect?.value) {
                        const result = elements.serviceSelect.value === "P";
                        this.log('info', `Tipo de atendimento (select): ${elements.serviceSelect.value}`, { isPresencial: result });
                        return result;
                    }
                    
                    // Verificar campo visível
                    if (elements.serviceSearch?.nextElementSibling) {
                        const selectedText = elements.serviceSearch.nextElementSibling.textContent?.trim();
                        const result = selectedText === "Presencial";
                        this.log('info', `Tipo de atendimento visível: ${selectedText || 'N/A'}`, { isPresencial: result });
                        return result;
                    }
                    
                    this.log('warn', 'Nenhum elemento de tipo de atendimento encontrado');
                    return false;
                } catch (error) {
                    this.log('error', 'Erro ao verificar tipo de atendimento Presencial', error);
                    return false;
                }
            });
        }

        /**
         * Obter tipo de atendimento atual
         * @returns {string|null}
         */
        getCurrentServiceType() {
            return this.benchmark('getCurrentServiceType', async () => {
                try {
                    const elements = this.getDOMElements();
                    
                    // Verificar select primeiro
                    if (elements.serviceSelect?.value) {
                        const value = elements.serviceSelect.value;
                        const result = value === "P" ? "Presencial" : 
                                      value === "R" ? "Remoto" : value;
                        
                        this.log('info', `Tipo de atendimento atual (select): ${result}`);
                        return result;
                    }
                    
                    // Verificar campo visível
                    if (elements.serviceSearch?.nextElementSibling) {
                        const result = elements.serviceSearch.nextElementSibling.textContent?.trim() || null;
                        this.log('info', `Tipo de atendimento atual (visível): ${result}`);
                        return result;
                    }
                    
                    this.log('warn', 'Não foi possível determinar o tipo de atendimento atual');
                    return null;
                } catch (error) {
                    this.log('error', 'Erro ao obter tipo de atendimento atual', error);
                    return null;
                }
            });
        }

        /**
         * Adicionar alerta geral para tipo de atendimento
         */
        addTypeOfServiceAlert() {
            try {
                if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                    this.log('info', 'Alertas de tipo de atendimento desabilitados');
                    return;
                }
                
                if (this.alertSystem?.exists(this.alertIds.typeOfService)) {
                    this.log('info', 'Alerta de tipo de atendimento já existe');
                    return;
                }

                this.alertSystem?.showServiceTypeQueueAlert(
                    'Erro: Tipo de Atendimento',
                    '⚠️ Garanta que o tipo de atendimento seja adequado ao serviço oferecido.',
                    'error',
                    this.alertIds.typeOfService
                );
                
                this.log('info', 'Alerta de tipo de atendimento adicionado');
            } catch (error) {
                this.log('error', 'Erro ao adicionar alerta de tipo de atendimento', error);
            }
        }

        /**
         * Adicionar alerta para técnico local
         */
        addLocalTechnicianAlert() {
            try {
                if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                    this.log('info', 'Alertas de técnico local desabilitados');
                    return;
                }
                
                if (this.alertSystem?.exists(this.alertIds.localTechnician)) {
                    this.log('info', 'Alerta de técnico local já existe');
                    return;
                }

                this.alertSystem?.showServiceTypeQueueAlert(
                    'Erro: Incompatibilidade Fila x Tipo de Atendimento',
                    '⚠️ Para fila de <strong>Técnico Local</strong>, o tipo de atendimento deve ser <strong>Presencial</strong>.',
                    'error',
                    this.alertIds.localTechnician
                );
                
                this.log('info', 'Alerta de técnico local adicionado');
            } catch (error) {
                this.log('error', 'Erro ao adicionar alerta de técnico local', error);
            }
        }

        /**
         * Adicionar alerta para técnico remoto
         */
        addRemoteTechnicianAlert() {
            try {
                if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                    this.log('info', 'Alertas de técnico remoto desabilitados');
                    return;
                }
                
                if (this.alertSystem?.exists(this.alertIds.remoteTechnician)) {
                    this.log('info', 'Alerta de técnico remoto já existe');
                    return;
                }

                this.alertSystem?.showServiceTypeQueueAlert(
                    'Erro: Incompatibilidade Fila x Tipo de Atendimento',
                    '⚠️ Para fila de <strong>Técnico Remoto</strong>, o tipo de atendimento deve ser <strong>Remoto</strong>.',
                    'error',
                    this.alertIds.remoteTechnician
                );
                
                this.log('info', 'Alerta de técnico remoto adicionado');
            } catch (error) {
                this.log('error', 'Erro ao adicionar alerta de técnico remoto', error);
            }
        }

        /**
         * Adicionar alerta para fila presencial com tipo remoto
         */
        addPresentialQueueRemoteTypeAlert() {
            try {
                if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                    this.log('info', 'Alertas de fila presencial desabilitados');
                    return;
                }
                
                if (this.alertSystem?.exists(this.alertIds.remoteTechnician)) {
                    this.log('info', 'Alerta de fila presencial já existe');
                    return;
                }

                this.alertSystem?.showServiceTypeQueueAlert(
                    'Erro: Incompatibilidade Fila x Tipo de Atendimento',
                    '⚠️ A fila selecionada é <strong>presencial</strong>, mas o tipo de atendimento está marcado como <strong>Remoto</strong>. Altere para <strong>Presencial</strong>.',
                    'error',
                    this.alertIds.remoteTechnician
                );
                
                this.log('info', 'Alerta de fila presencial adicionado');
            } catch (error) {
                this.log('error', 'Erro ao adicionar alerta de fila presencial', error);
            }
        }

        /**
         * Adicionar alerta para classificação de serviço
         */
        addServiceClassificationAlert() {
            try {
                if (!this.configManager?.isFeatureEnabled('serviceClassificationAlerts')) {
                    this.log('info', 'Alertas de classificação de serviço desabilitados');
                    return;
                }
                
                if (this.alertSystem?.exists(this.alertIds.serviceClassification)) {
                    this.log('info', 'Alerta de classificação de serviço já existe');
                    return;
                }

                this.alertSystem?.showServiceTypeQueueAlert(
                    'Erro: Classificação de Serviço',
                    '⚠️ Garanta que a classificação do serviço seja adequada ao atendimento.',
                    'error',
                    this.alertIds.serviceClassification
                );
                
                this.log('info', 'Alerta de classificação de serviço adicionado');
            } catch (error) {
                this.log('error', 'Erro ao adicionar alerta de classificação de serviço', error);
            }
        }

        /**
         * Validar técnico local
         */
        validateLocalTechnician() {
            return this.benchmark('validateLocalTechnician', async () => {
                try {
                    if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                        this.log('info', 'Validação de técnico local desabilitada');
                        return;
                    }

                    // TODO: Importar QueueValidator quando estiver disponível
                    // const isLocalQueue = queueValidator.isLocalTechnicianQueue();
                    const isLocalQueue = false; // Placeholder
                    const isPresencial = await this.isTypeOfServicePresencial();
                    const alertExists = this.alertSystem?.exists(this.alertIds.localTechnician) || false;
                    
                    const validationData = {
                        isLocalQueue,
                        isPresencial,
                        alertExists,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.log('info', 'Validação Técnico Local', validationData);
                    
                    if (isLocalQueue && !isPresencial) {
                        // Fila é Técnico Local mas tipo não é Presencial - mostrar alerta
                        if (!alertExists) {
                            this.addLocalTechnicianAlert();
                        }
                    } else if (alertExists) {
                        // Condições não se aplicam mais - remover alerta
                        this.alertSystem?.removeAlert(this.alertIds.localTechnician);
                        this.log('info', 'Alerta de técnico local removido - condições não se aplicam mais');
                    }
                } catch (error) {
                    this.log('error', 'Erro na validação de técnico local', error);
                }
            });
        }

        /**
         * Validar técnico remoto - casos de incompatibilidade entre fila e tipo
         */
        validateRemoteTechnician() {
            return this.benchmark('validateRemoteTechnician', async () => {
                try {
                    if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                        this.log('info', 'Validação de técnico remoto desabilitada');
                        return;
                    }

                    // TODO: Importar QueueValidator quando estiver disponível
                    // const isRemoteQueue = queueValidator.isRemoteTechnicianQueue();
                    
                    // Detecção temporária da fila remota com cache
                    const elements = this.getDOMElements();
                    let isRemoteQueue = false;
                    let queueText = '';
                    
                    if (elements.queueSelect) {
                        const selectedOption = elements.queueSelect.options[elements.queueSelect.selectedIndex];
                        queueText = selectedOption ? selectedOption.text : '';
                        
                        // Verificar se é uma fila de técnico remoto/nível 1
                        const remoteKeywords = ['técnico remoto', 'nível 1', 'nivel 1', 'remoto'];
                        isRemoteQueue = remoteKeywords.some(keyword => 
                            queueText.toLowerCase().includes(keyword)
                        );
                    }
                    
                    const isRemoto = await this.isTypeOfServiceRemoto();
                    const alertExists = this.alertSystem?.exists(this.alertIds.remoteTechnician) || false;
                    
                    const validationData = {
                        isRemoteQueue,
                        isRemoto,
                        alertExists,
                        queueText,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.log('info', 'Validação Técnico Remoto/Nível 1', validationData);
                    
                    // CENÁRIO 1: Fila REMOTA mas tipo PRESENCIAL
                    // CENÁRIO 2: Fila PRESENCIAL mas tipo REMOTO (o caso do usuário anterior)
                    const hasIncompatibility = (isRemoteQueue && !isRemoto) || (!isRemoteQueue && isRemoto);
                    
                    if (hasIncompatibility && !alertExists) {
                        // Determinar mensagem baseada no cenário
                        if (isRemoteQueue && !isRemoto) {
                            // Cenário 1: Fila remota com tipo presencial
                            this.addRemoteTechnicianAlert();
                        } else if (!isRemoteQueue && isRemoto) {
                            // Cenário 2: Fila presencial com tipo remoto
                            this.addPresentialQueueRemoteTypeAlert();
                        }
                    } else if (!hasIncompatibility && alertExists) {
                        // Não há mais incompatibilidade - remover alerta
                        this.alertSystem?.removeAlert(this.alertIds.remoteTechnician);
                        this.log('info', 'Alerta de técnico remoto removido - incompatibilidade resolvida');
                    }
                } catch (error) {
                    this.log('error', 'Erro na validação de técnico remoto', error);
                }
            });
        }

        /**
         * Validar tipo de serviço para fila
         */
        validateServiceTypeForQueue() {
            return this.benchmark('validateServiceTypeForQueue', async () => {
                try {
                    if (!this.configManager?.isFeatureEnabled('typeOfServiceAlerts')) {
                        this.log('info', 'Validações de tipo de serviço desabilitadas');
                        return;
                    }

                    // Validar ambos os casos em paralelo para melhor performance
                    await Promise.all([
                        this.validateLocalTechnician(),
                        this.validateRemoteTechnician()
                    ]);
                    
                    this.log('info', 'Validação de tipo de serviço para fila concluída');
                } catch (error) {
                    this.log('error', 'Erro na validação de tipo de serviço para fila', error);
                }
            });
        }

        /**
         * Validar classificação de serviço
         */
        validateServiceClassification() {
            return this.benchmark('validateServiceClassification', async () => {
                try {
                    if (!this.configManager?.isFeatureEnabled('serviceClassificationAlerts')) {
                        this.log('info', 'Validação de classificação de serviço desabilitada');
                        return;
                    }

                    // TODO: Implementar lógica específica de classificação
                    const needsAlert = false; // Placeholder
                    
                    if (needsAlert) {
                        this.addServiceClassificationAlert();
                    }
                    
                    this.log('info', 'Validação de classificação de serviço concluída');
                } catch (error) {
                    this.log('error', 'Erro na validação de classificação de serviço', error);
                }
            });
        }

        /**
         * Executar todas as validações
         */
        validateAll() {
            return this.benchmark('validateAll', async () => {
                try {
                    if (!this.isEnabled) {
                        this.log('info', 'ServiceTypeValidator desabilitado - pulando validações');
                        return;
                    }

                    await Promise.all([
                        this.validateServiceTypeForQueue(),
                        this.validateServiceClassification()
                    ]);
                    
                    this.log('info', 'Todas as validações concluídas com sucesso');
                } catch (error) {
                    this.log('error', 'Erro durante execução de todas as validações', error);
                }
            });
        }

        /**
         * Debounced validation - evita execuções excessivas
         * @param {number} delay - Delay em ms (padrão: 300)
         */
        debouncedValidation(delay = 300) {
            try {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                
                this.debounceTimer = setTimeout(async () => {
                    await this.validateAll();
                }, delay);
                
                this.log('info', `Validação agendada com debounce de ${delay}ms`);
            } catch (error) {
                this.log('error', 'Erro no debounced validation', error);
            }
        }

        /**
         * Inicializar validador
         */
        init() {
            return this.benchmark('init', async () => {
                try {
                    const featuresEnabled = {
                        typeOfService: this.configManager?.isFeatureEnabled('typeOfServiceAlerts') || false,
                        serviceClassification: this.configManager?.isFeatureEnabled('serviceClassificationAlerts') || false
                    };
                    
                    if (!featuresEnabled.typeOfService && !featuresEnabled.serviceClassification) {
                        this.log('info', 'Todas as validações de tipo de serviço desabilitadas');
                        this.isEnabled = false;
                        return;
                    }

                    this.log('info', 'Inicializando validador de tipos de atendimento', featuresEnabled);
                    await this.setupEventListeners();
                } catch (error) {
                    this.log('error', 'Erro na inicialização do ServiceTypeValidator', error);
                    this.isEnabled = false;
                }
            });
        }

        /**
         * Configurar event listeners otimizados com debouncing
         */
        setupEventListeners() {
            return this.benchmark('setupEventListeners', async () => {
                try {
                    const elements = this.getDOMElements();
                    
                    // Observar mudanças no campo de tipo de atendimento
                    if (elements.serviceSearch) {
                        this.mutationObserver = new MutationObserver(() => {
                            this.debouncedValidation(150);
                        });

                        this.mutationObserver.observe(elements.serviceSearch.parentElement, {
                            childList: true,
                            subtree: true,
                            characterData: true
                        });
                        
                        this.log('info', 'MutationObserver configurado para campo de pesquisa de atendimento');
                    }

                    // Observar mudanças no select oculto
                    if (elements.serviceSelect) {
                        elements.serviceSelect.addEventListener('change', () => {
                            this.debouncedValidation(100);
                        });
                        
                        this.log('info', 'Event listener configurado para select de atendimento');
                    }
                    
                    // Observar mudanças na fila
                    if (elements.queueSelect) {
                        elements.queueSelect.addEventListener('change', () => {
                            this.debouncedValidation(150);
                        });
                        
                        this.log('info', 'Event listener configurado para select de fila');
                    }
                    
                    this.log('info', 'Todos os event listeners configurados com sucesso');
                } catch (error) {
                    this.log('error', 'Erro ao configurar event listeners', error);
                }
            });
        }

        /**
         * Limpar todos os alertas
         */
        clearAllAlerts() {
            return this.benchmark('clearAllAlerts', async () => {
                try {
                    let alertsRemoved = 0;
                    
                    for (const [alertType, alertId] of Object.entries(this.alertIds)) {
                        if (this.alertSystem?.exists(alertId)) {
                            this.alertSystem.removeAlert(alertId);
                            alertsRemoved++;
                        }
                    }
                    
                    this.log('info', `Limpeza de alertas concluída - ${alertsRemoved} alertas removidos`);
                } catch (error) {
                    this.log('error', 'Erro ao limpar alertas', error);
                }
            });
        }

        /**
         * Obter status das validações
         * @returns {Object}
         */
        getValidationStatus() {
            return this.benchmark('getValidationStatus', async () => {
                try {
                    const currentServiceType = await this.getCurrentServiceType();
                    const isPresencial = await this.isTypeOfServicePresencial();
                    const isRemoto = await this.isTypeOfServiceRemoto();
                    
                    const status = {
                        enabled: this.isEnabled,
                        timestamp: new Date().toISOString(),
                        currentServiceType,
                        validation: {
                            isPresencial,
                            isRemoto
                        },
                        alerts: {}
                    };
                    
                    // Status dos alertas
                    for (const [alertType, alertId] of Object.entries(this.alertIds)) {
                        status.alerts[alertType] = this.alertSystem?.exists(alertId) || false;
                    }
                    
                    this.log('info', 'Status de validação obtido', status);
                    return status;
                } catch (error) {
                    this.log('error', 'Erro ao obter status de validação', error);
                    return {
                        enabled: this.isEnabled,
                        timestamp: new Date().toISOString(),
                        error: error.message
                    };
                }
            });
        }

        /**
         * Método de limpeza para liberar recursos
         */
        dispose() {
            return this.benchmark('dispose', async () => {
                try {
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
                    
                    // Limpar alertas
                    await this.clearAllAlerts();
                    
                    // Limpar caches
                    this.clearDOMCache();
                    this.performanceMetrics.clear();
                    
                    // Desabilitar sistema
                    this.isEnabled = false;
                    
                    this.log('info', 'ServiceTypeValidator disposed com sucesso');
                } catch (error) {
                    this.log('error', 'Erro durante dispose do ServiceTypeValidator', error);
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
                    domCacheSize: this.domCache.size,
                    metricsCount: this.performanceMetrics.size,
                    hasObserver: !!this.mutationObserver,
                    hasDebounceTimer: !!this.debounceTimer,
                    alertIds: this.alertIds,
                    configManagerAvailable: !!this.configManager,
                    alertSystemAvailable: !!this.alertSystem,
                    lastMetrics: this.getPerformanceMetrics()
                };
            } catch (error) {
                this.log('error', 'Erro ao obter informações de debug', error);
                return { error: error.message };
            }
        }
    }

    // Disponibilizar globalmente
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.ServiceTypeValidator = ServiceTypeValidator;

})(window);
