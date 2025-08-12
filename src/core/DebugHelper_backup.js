/**
 * DebugHelper - Ferramenta de debug para o Help OTRS - MAPA
 * Versão otimizada com cache DOM, benchmarks e tratamento de erros
 */
(function(global) {
    'use strict';

    class DebugHelper {
        constructor(configManager) {
            this.configManager = configManager;
            this.isEnabled = true;
            this.domCache = new Map();
            this.performanceMetrics = new Map();
            this.validateConfigManager();
        }

        /**
         * Valida se ConfigManager está inicializado
         * @throws {Error} Se ConfigManager não estiver inicializado
         */
        validateConfigManager() {
            if (!this.configManager) {
                throw new Error('ConfigManager é obrigatório para DebugHelper');
            }
        }

        /**
         * Cache DOM inteligente com timeout
         * @param {string} selector - Seletor CSS
         * @param {number} timeout - Timeout do cache em ms (padrão: 5000)
         * @returns {HTMLElement|null} Elemento encontrado ou null
         */
        getCachedElement(selector, timeout = 5000) {
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
        }

        /**
         * Obter elementos DOM frequentemente usados com cache
         * @returns {Object} Objeto com elementos DOM frequentemente usados
         */
        getDOMElements() {
            try {
                return {
                    destSelection: this.getCachedElement("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text"),
                    serviceSelect: this.getCachedElement("#DynamicField_PRITipoAtendimento"),
                    serviceSearch: this.getCachedElement("#DynamicField_PRITipoAtendimento_Search"),
                    inputFieldSelections: document.querySelectorAll('.InputField_Selection .Text')
                };
            } catch (error) {
                this.log('error', 'Erro ao obter elementos DOM', error);
                return {}; // Retorno seguro
            }
        }

        /**
         * Limpar cache DOM seletivamente
         * @param {string} pattern - Padrão regex opcional para limpeza seletiva
         */
        clearDOMCache(pattern = null) {
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
            this.log('info', `Cache DOM limpo seletivamente - ${removed} entradas removidas com padrão: ${pattern}`);
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
         * Configurar interface global de debug com tratamento de erros
         */
        setupGlobalDebugInterface() {
            if (typeof window === 'undefined') return;
            
            const createErrorWrapper = (fn, name) => {
                return (...args) => {
                    try {
                        return fn.apply(this, args);
                    } catch (error) {
                        this.log('error', `Erro em ${name}`, error);
                        return { error: error.message };
                    }
                };
            };
            
            window.helpOtrsDebug = {
                // Métodos de teste com error handling
                testLocal: createErrorWrapper(this.testLocalTechnicianValidation, 'testLocalTechnicianValidation'),
                testRemote: createErrorWrapper(this.testRemoteTechnicianValidation, 'testRemoteTechnicianValidation'),
                testAll: createErrorWrapper(this.testAllServiceTypeValidation, 'testAllServiceTypeValidation'),
                
                // Métodos de força
                forceLocal: createErrorWrapper(this.forceValidateLocalTechnician, 'forceValidateLocalTechnician'),
                forceService: createErrorWrapper(this.forceValidateServiceType, 'forceValidateServiceType'),
                
                // Informações do sistema
                version: createErrorWrapper(this.getVersion, 'getVersion'),
                stats: createErrorWrapper(this.getStats, 'getStats'),
                
                // Debug de elementos
                debugLevel: createErrorWrapper(this.debugCurrentLevel, 'debugCurrentLevel'),
                debugElements: createErrorWrapper(this.debugElements, 'debugElements'),
                
                // Gerenciamento de cache
                clearCache: createErrorWrapper(this.clearDOMCache, 'clearDOMCache'),
                metrics: createErrorWrapper(this.getPerformanceMetrics, 'getPerformanceMetrics'),
                
                // Utilitários
                help: () => {
                    console.log('=== Help OTRS Debug - Comandos Disponíveis ===');
                    console.log('helpOtrsDebug.testLocal() - Testar validação técnico local');
                    console.log('helpOtrsDebug.testRemote() - Testar validação técnico remoto');
                    console.log('helpOtrsDebug.testAll() - Testar todas as validações');
                    console.log('helpOtrsDebug.forceLocal() - Forçar validação técnico local');
                    console.log('helpOtrsDebug.forceService() - Forçar validação tipo atendimento');
                    console.log('helpOtrsDebug.version() - Informações da versão');
                    console.log('helpOtrsDebug.stats() - Estatísticas completas');
                    console.log('helpOtrsDebug.debugLevel() - Debug do nível atual');
                    console.log('helpOtrsDebug.debugElements() - Debug dos elementos DOM');
                    console.log('helpOtrsDebug.clearCache() - Limpar cache DOM');
                    console.log('helpOtrsDebug.metrics() - Métricas de performance');
                }
            };
            
            this.log('info', 'Interface global de debug configurada: window.helpOtrsDebug');
        }

        /**
         * Debug de elementos DOM - Versão otimizada
         */
        debugElements() {
            try {
                console.log('=== DEBUG ELEMENTOS DOM ===');
                
                const elements = this.getDOMElements();
                
                console.log('Elemento de seleção destino:', elements.destSelection);
                console.log('Texto:', elements.destSelection?.textContent);
                
                console.log('Select tipo atendimento:', elements.serviceSelect);
                console.log('Valor:', elements.serviceSelect?.value);
                
                console.log('Campo de pesquisa:', elements.serviceSearch);
                console.log('Próximo elemento:', elements.serviceSearch?.nextElementSibling?.textContent);
                
                console.log('Todos os .InputField_Selection .Text:');
                elements.inputFieldSelections.forEach((el, index) => {
                    console.log(`  ${index}: "${el.textContent}"`);
                });
                
                return {
                    destSelection: elements.destSelection?.textContent,
                    serviceValue: elements.serviceSelect?.value,
                    serviceText: elements.serviceSearch?.nextElementSibling?.textContent,
                    allSelections: Array.from(elements.inputFieldSelections).map(el => el.textContent)
                };
            } catch (error) {
                this.log('error', 'Erro ao debugar elementos', error);
                return { error: error.message };
            }
        }

        /**
         * Debug do nível atual - Versão robusta
         * @returns {string} Nível atual ou 'N/A'
         */
        debugCurrentLevel() {
            try {
                console.log('=== DEBUG NÍVEL ATUAL ===');
                console.log('URL:', window.location.href);
                
                const elements = this.getDOMElements();
                
                console.log('Elemento destSelection:', elements.destSelection);
                console.log('Texto bruto:', elements.destSelection?.textContent);
                console.log('Texto limpo:', elements.destSelection?.textContent?.trim());
                
                console.log('Todos os elementos .InputField_Selection .Text:');
                console.log('Total encontrados:', elements.inputFieldSelections.length);
                elements.inputFieldSelections.forEach((el, index) => {
                    console.log(`Elemento ${index}:`, el.textContent);
                });
                
                return elements.destSelection?.textContent || 'N/A';
            } catch (error) {
                this.log('error', 'Erro ao debugar nível atual', error);
                return 'N/A';
            }
        }

        /**
         * Teste de validação técnico local - Versão otimizada
         * @returns {Object}
         */
        testLocalTechnicianValidation() {
            try {
                console.log('=== TESTE DE VALIDAÇÃO TÉCNICO LOCAL ===');
                console.log('URL atual:', window.location.href);
                
                const isLocalQueue = false; // TODO: isLocalTechnicianQueue()
                const isPresencial = false; // TODO: isTypeOfServicePresencial()
                const alertExists = false; // TODO: isLocalTechnicianAlertAdded()
                
                console.log('Fila é Técnico Local:', isLocalQueue ? '✅ SIM' : '❌ NÃO');
                console.log('Tipo é Presencial:', isPresencial ? '✅ SIM' : '❌ NÃO');
                console.log('Alerta existe:', alertExists ? '✅ SIM' : '❌ NÃO');
                
                const elements = this.getDOMElements();
                console.log('Texto da fila selecionada:', elements.destSelection?.textContent);
                console.log('Valor do select tipo atendimento:', elements.serviceSelect?.value);
                console.log('Campo de pesquisa tipo atendimento:', elements.serviceSearch?.nextElementSibling?.textContent);
                
                console.log('Deveria mostrar alerta:', (isLocalQueue && !isPresencial) ? '✅ SIM' : '❌ NÃO');
                
                return {
                    isLocalQueue,
                    isPresencial,
                    alertExists,
                    shouldShowAlert: isLocalQueue && !isPresencial
                };
            } catch (error) {
                this.log('error', 'Erro ao testar validação técnico local', error);
                return { error: error.message };
            }
        }

        /**
         * Teste de validação técnico remoto - Versão otimizada
         * @returns {Object}
         */
        testRemoteTechnicianValidation() {
            try {
                console.log('=== TESTE DE VALIDAÇÃO TÉCNICO REMOTO/NÍVEL 1 ===');
                console.log('URL atual:', window.location.href);
                
                const isRemoteQueue = false; // TODO: isRemoteTechnicianQueue()
                const isRemoto = false; // TODO: isTypeOfServiceRemoto()
                const alertExists = false; // TODO: isRemoteTechnicianAlertAdded()
                
                console.log('Fila é Técnico Remoto/Nível 1:', isRemoteQueue ? '✅ SIM' : '❌ NÃO');
                console.log('Tipo é Remoto:', isRemoto ? '✅ SIM' : '❌ NÃO');
                console.log('Alerta existe:', alertExists ? '✅ SIM' : '❌ NÃO');
                
                const elements = this.getDOMElements();
                console.log('Texto da fila selecionada:', elements.destSelection?.textContent);
                
                if (elements.destSelection) {
                    const normalizedLevel = this.configManager.normalizeUserLevel(elements.destSelection.textContent.trim());
                    console.log('Nível normalizado:', normalizedLevel);
                }
                
                console.log('Valor do select tipo atendimento:', elements.serviceSelect?.value);
                console.log('Campo de pesquisa tipo atendimento:', elements.serviceSearch?.nextElementSibling?.textContent);
                
                console.log('Deveria mostrar alerta:', (isRemoteQueue && !isRemoto) ? '✅ SIM' : '❌ NÃO');
                
                return {
                    isRemoteQueue,
                    isRemoto,
                    alertExists,
                    shouldShowAlert: isRemoteQueue && !isRemoto
                };
            } catch (error) {
                this.log('error', 'Erro ao testar validação técnico remoto', error);
                return { error: error.message };
            }
        }

        /**
         * Teste completo de validação - Versão otimizada
         * @returns {Object}
         */
        testAllServiceTypeValidation() {
            try {
                console.log('=== TESTE COMPLETO DE VALIDAÇÃO DE TIPO DE ATENDIMENTO ===');
                const localTest = this.testLocalTechnicianValidation();
                const remoteTest = this.testRemoteTechnicianValidation();
                
                return {
                    local: localTest,
                    remote: remoteTest
                };
            } catch (error) {
                this.log('error', 'Erro ao testar todas as validações', error);
                return { error: error.message };
            }
        }

        /**
         * Forçar validação de técnico local
         * @returns {Object}
         */
        forceValidateLocalTechnician() {
            try {
                console.log('🔄 Forçando validação de Técnico Local...');
                // TODO: validateLocalTechnicianServiceType();
                return this.testLocalTechnicianValidation();
            } catch (error) {
                this.log('error', 'Erro ao forçar validação local', error);
                return { error: error.message };
            }
        }

        /**
         * Forçar validação de tipo de serviço
         * @returns {Object}
         */
        forceValidateServiceType() {
            try {
                console.log('🔄 Forçando validação completa de tipo de atendimento...');
                // TODO: validateServiceTypeForQueue();
                return this.testAllServiceTypeValidation();
            } catch (error) {
                this.log('error', 'Erro ao forçar validação de serviço', error);
                return { error: error.message };
            }
        }

        /**
         * Obter informações da versão - Versão robusta
         * @returns {Object}
         */
        getVersion() {
            try {
                const manifest = chrome.runtime.getManifest();
                console.log(`📋 Help OTRS - MAPA v${manifest.version}`);
                console.log(`📅 Build: ${manifest.version_name || 'N/A'}`);
                console.log(`🏷️  Manifest: v${manifest.manifest_version}`);
                console.log(`👥 Autores: ${manifest.author || 'N/A'}`);
                return {
                    version: manifest.version,
                    version_name: manifest.version_name,
                    manifest_version: manifest.manifest_version,
                    author: manifest.author
                };
            } catch (error) {
                this.log('error', 'Erro ao obter versão', error);
                return { error: error.message };
            }
        }

        /**
         * Obter estatísticas de debug - Versão expandida
         * @returns {Object}
         */
        getStats() {
            try {
                return {
                    version: this.getVersion(),
                    config: this.configManager.getStats(),
                    performance: this.getPerformanceMetrics(),
                    url: window.location.href,
                    hostname: window.location.hostname,
                    pathname: window.location.pathname,
                    timestamp: new Date().toISOString(),
                    debugEnabled: this.isEnabled
                };
            } catch (error) {
                this.log('error', 'Erro ao obter estatísticas', error);
                return { error: error.message };
            }
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
            const logMessage = `[${timestamp}] Help OTRS Debug: ${message}`;
            
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
                    console.log(`Debug Log Error: ${error.message}`);
                } catch (e) {
                    // Silenciar se console totalmente indisponível
                }
            }
        }

        /**
         * Método de limpeza para prevenir memory leaks
         */
        dispose() {
            try {
                this.clearDOMCache();
                this.performanceMetrics.clear();
                this.isEnabled = false;
                
                if (window.helpOtrsDebug) {
                    delete window.helpOtrsDebug;
                }
                
                this.log('info', 'DebugHelper disposed successfully');
            } catch (error) {
                console.error('DebugHelper: Erro durante dispose:', error);
            }
        }
    }

    // Disponibilizar globalmente
    global.HelpOTRS = global.HelpOTRS || {};
    global.HelpOTRS.DebugHelper = DebugHelper;

    // Auto-dispose ao descarregar página
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (global.HelpOTRS.debugInstance) {
                global.HelpOTRS.debugInstance.dispose();
            }
        });
    }

})(window);
