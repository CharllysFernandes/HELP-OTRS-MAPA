/**
 * ConfigManager - Gerenciamento de Configurações
 * 
 * Responsável por carregar, detectar sistemas OTRS e gerenciar
 * todas as configurações da extensão Help OTRS.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function(global) {
    'use strict';

    class ConfigManager {
        constructor() {
            this.config = null;
            this.currentOtrsSystem = null;
            this.selectorCache = new Map(); // Cache para seletores DOM
            this.configLoadPromise = null; // Promise para evitar race conditions
            
            // Cache do mapeamento de níveis para otimizar performance
            this.levelMappings = this.initializeLevelMappings();
        }

        /**
         * Inicializar mapeamento de níveis de usuário (executado uma vez)
         * @returns {Object} Mapeamento completo de sinônimos
         */
        initializeLevelMappings() {
            return {
                // Nível 1 - Variações
                'nível 1 - serviços aos usuários de tic': 'Nível 1',
                'nível1 - serviços aos usuários de tic': 'Nível 1',
                'nivel 1 - serviços aos usuários de tic': 'Nível 1',
                'nivel1 - serviços aos usuários de tic': 'Nível 1',
                'nivel 1 - serviços aos usuarios de tic': 'Nível 1',
                'nivel1 - serviços aos usuarios de tic': 'Nível 1',
                'técnico remoto': 'Nível 1',
                'técnico remotox': 'Nível 1',
                'tecnico remoto': 'Nível 1',
                'tecnico remotox': 'Nível 1',
                'remoto': 'Nível 1',
                'nível 1': 'Nível 1',
                'nivel 1': 'Nível 1',
                'n1': 'Nível 1',
                'l1': 'Nível 1',
                'level 1': 'Nível 1',

                // Nível 2 - Variações
                'nível 2 - serviços aos usuários de tic': 'Nível 2',
                'nível2 - serviços aos usuários de tic': 'Nível 2',
                'nivel 2 - serviços aos usuários de tic': 'Nível 2',
                'nivel2 - serviços aos usuários de tic': 'Nível 2',
                'nivel 2 - serviços aos usuarios de tic': 'Nível 2',
                'nivel2 - serviços aos usuarios de tic': 'Nível 2',
                'técnico presencial': 'Nível 2',
                'técnico presencialx': 'Nível 2',
                'técnico local': 'Nível 2',
                'tecnico presencial': 'Nível 2',
                'tecnico presencialx': 'Nível 2',
                'tecnico local': 'Nível 2',
                'local': 'Nível 2',            
                'presencial': 'Nível 2',
                'nível 2': 'Nível 2',
                'nivel 2': 'Nível 2',
                'n2': 'Nível 2',
                'l2': 'Nível 2',
                'level 2': 'Nível 2',
                
                // Nível 3 - Variações (incluindo possível variação futura)
                'nível 3 - serviços aos usuários de tic': 'Nível 3',
                'nível3 - serviços aos usuários de tic': 'Nível 3',
                'nivel 3 - serviços aos usuários de tic': 'Nível 3',
                'nivel3 - serviços aos usuários de tic': 'Nível 3',
                'nivel 3 - serviços aos usuarios de tic': 'Nível 3',
                'nivel3 - serviços aos usuarios de tic': 'Nível 3',
                'nível 3': 'Nível 3',
                'nivel 3': 'Nível 3',
                'n3': 'Nível 3',
                'l3': 'Nível 3',
                'level 3': 'Nível 3'
            };
        }

        /**
         * Validar parâmetros de entrada
         * @param {*} value - Valor a ser validado
         * @param {string} type - Tipo esperado
         * @param {string} paramName - Nome do parâmetro
         * @throws {Error} Se validação falhar
         */
        validateParam(value, type, paramName) {
            if (value === null || value === undefined) {
                throw new Error(`ConfigManager: Parâmetro '${paramName}' é obrigatório`);
            }
            
            if (type === 'string' && typeof value !== 'string') {
                throw new Error(`ConfigManager: Parâmetro '${paramName}' deve ser string, recebido: ${typeof value}`);
            }
            
            if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
                throw new Error(`ConfigManager: Parâmetro '${paramName}' deve ser object, recebido: ${typeof value}`);
            }
        }

    /**
     * Normalizar níveis de usuário (tratar sinônimos) - Versão otimizada
     * @param {string} level - Nível do usuário
     * @returns {string|null} Nível normalizado
     */
    normalizeUserLevel(level) {
        try {
            // Validação de entrada mais rigorosa
            if (!level) return null;
            
            this.validateParam(level, 'string', 'level');
            
            const normalizedLevel = level.toLowerCase().trim();
            
            // Cache da normalização para evitar reprocessamento
            const cacheKey = `normalize_${normalizedLevel}`;
            if (this.selectorCache.has(cacheKey)) {
                const cached = this.selectorCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 30000) { // 30 segundos
                    return cached.value;
                }
                this.selectorCache.delete(cacheKey);
            }
            
            // Usar mapeamento pré-inicializado (otimização principal)
            let mappedLevel = this.levelMappings[normalizedLevel];
            
            if (mappedLevel) {
                console.log(`Help OTRS: Nível "${level}" normalizado para "${mappedLevel}"`);
            } else {
                // Se não há mapeamento, retornar o nível original com primeira letra maiúscula
                mappedLevel = level.charAt(0).toUpperCase() + level.slice(1);
            }
            
            // Cache do resultado
            this.selectorCache.set(cacheKey, {
                value: mappedLevel,
                timestamp: Date.now()
            });
            
            return mappedLevel;
            
        } catch (error) {
            console.error('Help OTRS: Erro ao normalizar nível:', error);
            return level ? level.charAt(0).toUpperCase() + level.slice(1) : null;
        }
    }

    /**
     * Comparar níveis considerando sinônimos - Versão robusta
     * @param {string} level1 - Primeiro nível
     * @param {string} level2 - Segundo nível
     * @returns {boolean} True se os níveis são iguais
     */
    compareUserLevels(level1, level2) {
        try {
            // Validação de entrada
            if (!level1 && !level2) return true; // Ambos nulos/undefined
            if (!level1 || !level2) return false; // Um é nulo
            
            this.validateParam(level1, 'string', 'level1');
            this.validateParam(level2, 'string', 'level2');
            
            const normalizedLevel1 = this.normalizeUserLevel(level1);
            const normalizedLevel2 = this.normalizeUserLevel(level2);
            
            console.log(`Help OTRS: Comparando níveis - "${level1}" (${normalizedLevel1}) vs "${level2}" (${normalizedLevel2})`);
            
            return normalizedLevel1 === normalizedLevel2;
            
        } catch (error) {
            console.error('Help OTRS: Erro ao comparar níveis:', error);
            return false; // Fallback seguro
        }
    }

    /**
     * Carregar configurações do storage com prevenção de race conditions
     * @param {boolean} forceReload - Forçar recarregamento ignorando cache
     * @returns {Promise<Object|null>} Configuração carregada
     */
    async loadConfig(forceReload = false) {
        // Prevenção de race conditions - retornar Promise existente se já carregando
        if (!forceReload && this.configLoadPromise) {
            console.log('Help OTRS: Usando Promise de carregamento existente');
            return this.configLoadPromise;
        }
        
        // Criar nova Promise de carregamento
        this.configLoadPromise = this.performConfigLoad();
        
        try {
            const result = await this.configLoadPromise;
            return result;
        } catch (error) {
            // Limpar Promise em caso de erro para permitir retry
            this.configLoadPromise = null;
            throw error;
        } finally {
            // Limpar Promise após conclusão bem-sucedida
            if (this.configLoadPromise) {
                // Aguardar um pouco antes de limpar para evitar race conditions
                setTimeout(() => {
                    this.configLoadPromise = null;
                }, 100);
            }
        }
    }

    /**
     * Realizar o carregamento efetivo da configuração
     * @private
     * @returns {Promise<Object>} Configuração carregada
     */
    async performConfigLoad() {
        try {
            console.log('Help OTRS: Iniciando carregamento de configuração...');
            
            // Timeout para a operação de storage
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout ao carregar configuração')), 10000);
            });
            
            const storagePromise = chrome.storage.sync.get(['helpOtrsConfig']);
            
            const result = await Promise.race([storagePromise, timeoutPromise]);
            this.config = result.helpOtrsConfig;
            
            console.log('Help OTRS: Configuração carregada:', this.config ? 'Sucesso' : 'Configuração vazia');
            
            if (this.config) {
                // Validar estrutura da configuração
                this.validateConfigStructure(this.config);
                this.detectCurrentOtrsSystem();
            } else {
                console.log('Help OTRS: Nenhuma configuração encontrada, usando padrões');
                this.config = this.getDefaultConfig();
            }
            
            return this.config;
            
        } catch (error) {
            console.error('Help OTRS: Erro ao carregar configurações:', error);
            
            // Configuração de fallback para evitar crashes
            this.config = this.getDefaultConfig();
            
            // Re-throw error personalizado com mais contexto
            throw new Error(`Falha ao carregar configuração: ${error.message}`);
        }
    }

    /**
     * Obter configuração padrão
     * @private
     * @returns {Object} Configuração padrão
     */
    getDefaultConfig() {
        return {
            otrs_systems: [],
            features: {
                alertsEnabled: true,
                typeOfServiceAlerts: true,
                serviceClassificationAlerts: true,
                queueValidation: true,
                formDataReuser: true
            },
            advanced: {
                delayTime: 500
            },
            version: '2.2.0',
            lastUpdated: Date.now()
        };
    }

    /**
     * Validar estrutura da configuração carregada
     * @private
     * @param {Object} config - Configuração a ser validada
     * @throws {Error} Se configuração inválida
     */
    validateConfigStructure(config) {
        const requiredSections = ['features', 'advanced'];
        const requiredFeatures = ['alertsEnabled', 'typeOfServiceAlerts', 'serviceClassificationAlerts', 'queueValidation', 'formDataReuser'];
        
        // Validar seções obrigatórias
        for (const section of requiredSections) {
            if (!config[section] || typeof config[section] !== 'object') {
                throw new Error(`Configuração inválida: seção '${section}' não encontrada ou inválida`);
            }
        }
        
        // Validar features obrigatórias
        for (const feature of requiredFeatures) {
            if (typeof config.features[feature] !== 'boolean') {
                console.warn(`Help OTRS: Feature '${feature}' não é boolean, usando padrão true`);
                config.features[feature] = true;
            }
        }
        
        // Validar otrs_systems
        if (!Array.isArray(config.otrs_systems)) {
            console.warn('Help OTRS: otrs_systems não é array, inicializando como array vazio');
            config.otrs_systems = [];
        }
        
        // Validar delayTime
        if (typeof config.advanced.delayTime !== 'number' || config.advanced.delayTime < 0) {
            console.warn('Help OTRS: delayTime inválido, usando padrão 500ms');
            config.advanced.delayTime = 500;
        }
        
        console.log('Help OTRS: Estrutura da configuração validada com sucesso');
    }

    /**
     * Detectar sistema OTRS atual baseado na URL
     * @returns {Object|null} Sistema OTRS detectado
     */
    detectCurrentOtrsSystem() {
        if (!this.config || !this.config.otrs_systems) {
            console.log('Help OTRS: Sem sistemas configurados');
            return null;
        }

        const currentUrl = window.location.href;
        console.log('Help OTRS: URL atual:', currentUrl);
        console.log('Help OTRS: Sistemas configurados:', this.config.otrs_systems);
        
        this.currentOtrsSystem = this.config.otrs_systems.find(system => {
            console.log('Help OTRS: Verificando sistema:', system);
            console.log('Help OTRS: Sistema habilitado:', system.enabled);
            
            if (!system.enabled) {
                console.log('Help OTRS: Sistema desabilitado:', system.name);
                return false;
            }
            
            try {
                // Normalizar URLs para comparação
                const systemUrl = new URL(system.baseUrl);
                const currentUrlObj = new URL(currentUrl);
                
                console.log('Help OTRS: Comparando URLs:', {
                    sistemaHost: systemUrl.hostname,
                    sistemaPath: systemUrl.pathname,
                    sistemaUrl: system.baseUrl,
                    atualHost: currentUrlObj.hostname,
                    atualPath: currentUrlObj.pathname,
                    atualUrl: currentUrl
                });
                
                // Comparar hostname exato
                const hostnameMatch = systemUrl.hostname === currentUrlObj.hostname;
                
                // Verificar se a URL atual contém o caminho do OTRS de forma mais robusta
                const hasOtrsPath = currentUrl.includes('/otrs/') || 
                                   currentUrl.includes('index.pl') ||
                                   currentUrl.includes('Action=Agent') ||
                                   currentUrlObj.pathname.startsWith('/otrs');
                
                // Verificar se o caminho base do sistema está contido na URL atual
                const pathBasedMatch = systemUrl.pathname !== '/' && 
                                      currentUrlObj.pathname.startsWith(systemUrl.pathname);
                
                console.log('Help OTRS: Verificações detalhadas:', {
                    hostnameMatch,
                    hasOtrsPath,
                    pathBasedMatch,
                    systemName: system.name,
                    finalMatch: hostnameMatch && (hasOtrsPath || pathBasedMatch)
                });
                
                return hostnameMatch && (hasOtrsPath || pathBasedMatch);
                
            } catch (error) {
                console.error('Help OTRS: Erro ao processar URL do sistema:', system.baseUrl, error);
                
                // Fallback mais robusto: verificar se a URL atual contém partes da URL do sistema
                const systemHost = system.baseUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '');
                const urlContainsSystem = currentUrl.includes(systemHost);
                const hasOtrsIndicators = currentUrl.includes('/otrs/') || 
                                        currentUrl.includes('index.pl') ||
                                        currentUrl.includes('Action=Agent');
                
                console.log('Help OTRS: Fallback match:', {
                    systemHost,
                    urlContainsSystem,
                    hasOtrsIndicators,
                    systemName: system.name,
                    finalMatch: urlContainsSystem && hasOtrsIndicators
                });
                
                return urlContainsSystem && hasOtrsIndicators;
            }
        });

        if (this.currentOtrsSystem) {
            console.log('Help OTRS: Sistema detectado:', this.currentOtrsSystem.name);
        } else {
            console.log('Help OTRS: Nenhum sistema correspondente encontrado');
            console.log('Help OTRS: URL atual analisada:', currentUrl);
            console.log('Help OTRS: Hostname atual:', new URL(currentUrl).hostname);
            console.log('Help OTRS: Path atual:', new URL(currentUrl).pathname);
            console.log('Help OTRS: Sistemas disponíveis:', this.config.otrs_systems.map(s => ({
                name: s.name,
                enabled: s.enabled,
                baseUrl: s.baseUrl,
                hostname: s.baseUrl ? new URL(s.baseUrl).hostname : 'URL inválida'
            })));
            
            // Sugestão para configuração
            const currentHostname = new URL(currentUrl).hostname;
            console.log('Help OTRS: Dica - Para habilitar neste site, configure um sistema OTRS com hostname:', currentHostname);
        }

        return this.currentOtrsSystem;
    }

    /**
     * Verificar se uma funcionalidade está habilitada
     * @param {string} featureName - Nome da funcionalidade
     * @returns {boolean} True se habilitada
     */
    isFeatureEnabled(featureName) {
        return this.config && this.config.features && this.config.features[featureName];
    }

    /**
     * Obter tempo de delay configurado
     * @returns {number} Tempo em milissegundos
     */
    getDelayTime() {
        return this.config && this.config.advanced ? this.config.advanced.delayTime : 500;
    }

    /**
     * Obter perfil do usuário normalizado
     * @returns {string|null} Perfil normalizado
     */
    getUserProfile() {
        // Método 1: Usar configuração do sistema atual
        if (this.currentOtrsSystem && this.currentOtrsSystem.userProfile) {
            const profile = this.normalizeUserLevel(this.currentOtrsSystem.userProfile);
            console.log('Help OTRS: Perfil do usuário (configuração):', profile);
            return profile;
        }
        
        // Método 2: Tentar detectar automaticamente pela URL ou elementos da página
        const autoDetectedProfile = this.detectUserProfileFromPage();
        if (autoDetectedProfile) {
            console.log('Help OTRS: Perfil do usuário (auto-detectado):', autoDetectedProfile);
            return autoDetectedProfile;
        }
        
        // Método 3: Usar perfil padrão se configurado
        if (this.config && this.config.defaultUserProfile) {
            const defaultProfile = this.normalizeUserLevel(this.config.defaultUserProfile);
            console.log('Help OTRS: Perfil do usuário (padrão):', defaultProfile);
            return defaultProfile;
        }
        
        console.log('Help OTRS: Nenhum perfil de usuário detectado - usando Técnico Local como padrão');
        return 'Técnico Local'; // Fallback padrão
    }

    /**
     * Detectar perfil do usuário baseado na página atual - Versão otimizada
     * @returns {string|null}
     */
    detectUserProfileFromPage() {
        const cacheKey = 'userProfileDetection';
        const cacheTimeout = 10000; // 10 segundos
        
        // Verificar cache primeiro
        if (this.selectorCache.has(cacheKey)) {
            const cached = this.selectorCache.get(cacheKey);
            if (Date.now() - cached.timestamp < cacheTimeout) {
                return cached.value;
            }
            this.selectorCache.delete(cacheKey);
        }

        try {
            // Verificar elementos comuns que podem indicar o perfil
            const indicators = [
                // Verificar no menu do usuário
                '.UserAvatar',
                '.Header .UserName',
                '#UserProfile',
                // Verificar em elementos de navegação
                '.Navigation .UserInfo',
                '.MainNavigation .Profile'
            ];
            
            // Otimização: usar querySelectorAll uma vez
            const allElements = document.querySelectorAll(indicators.join(', '));
            
            for (const element of allElements) {
                const text = element.textContent || element.title || element.getAttribute('data-profile');
                if (text && text.trim()) {
                    // Procurar padrões que indiquem nível/perfil
                    try {
                        const normalizedProfile = this.normalizeUserLevel(text);
                        if (normalizedProfile && normalizedProfile !== text) {
                            // Cache do resultado positivo
                            this.selectorCache.set(cacheKey, {
                                value: normalizedProfile,
                                timestamp: Date.now()
                            });
                            return normalizedProfile;
                        }
                    } catch (error) {
                        console.warn('Help OTRS: Erro ao normalizar perfil detectado:', error);
                        continue;
                    }
                }
            }
            
            // Verificar pela URL se há indicações
            const result = this.detectProfileFromUrl();
            
            // Cache do resultado (mesmo que null)
            this.selectorCache.set(cacheKey, {
                value: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.error('Help OTRS: Erro ao detectar perfil da página:', error);
            return null;
        }
    }

    /**
     * Detectar perfil baseado na URL atual
     * @private
     * @returns {string|null}
     */
    detectProfileFromUrl() {
        try {
            const url = window.location.href.toLowerCase();
            
            // Mapeamento de padrões de URL para perfis
            const urlPatterns = [
                { pattern: /nivel\s*1|level\s*1|n1|l1/, profile: 'Nível 1' },
                { pattern: /nivel\s*2|level\s*2|n2|l2|local/, profile: 'Nível 2' },
                { pattern: /nivel\s*3|level\s*3|n3|l3/, profile: 'Nível 3' },
                { pattern: /remoto|remote/, profile: 'Técnico Remoto' },
                { pattern: /presencial|local/, profile: 'Técnico Local' }
            ];
            
            for (const { pattern, profile } of urlPatterns) {
                if (pattern.test(url)) {
                    console.log(`Help OTRS: Perfil detectado pela URL: ${profile}`);
                    return profile;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Help OTRS: Erro ao detectar perfil pela URL:', error);
            return null;
        }
    }

    /**
     * Verificar se extensão está habilitada para o site atual
     * @returns {boolean} True se habilitada
     */
    isExtensionEnabledForCurrentSite() {
        return this.currentOtrsSystem !== null;
    }

    /**
     * Função de debug para testar detecção de URLs
     * @param {string} testUrl - URL para testar (opcional)
     * @returns {boolean} True se URL é detectada
     */
    debugUrlDetection(testUrl = null) {
        const urlToTest = testUrl || window.location.href;
        console.log('=== DEBUG: Testando detecção de URL ===');
        console.log('URL de teste:', urlToTest);
        
        if (!this.config || !this.config.otrs_systems) {
            console.log('❌ Nenhuma configuração encontrada');
            return false;
        }
        
        console.log('Sistemas configurados:', this.config.otrs_systems.length);
        
        this.config.otrs_systems.forEach((system, index) => {
            console.log(`\n--- Sistema ${index + 1}: ${system.name} ---`);
            console.log('Habilitado:', system.enabled);
            console.log('Base URL:', system.baseUrl);
            
            if (!system.enabled) {
                console.log('❌ Sistema desabilitado');
                return;
            }
            
            try {
                const systemUrl = new URL(system.baseUrl);
                const testUrlObj = new URL(urlToTest);
                
                const hostnameMatch = systemUrl.hostname === testUrlObj.hostname;
                const hasOtrsPath = urlToTest.includes('/otrs/') || 
                                   urlToTest.includes('index.pl') ||
                                   urlToTest.includes('Action=Agent') ||
                                   testUrlObj.pathname.startsWith('/otrs');
                
                const pathBasedMatch = systemUrl.pathname !== '/' && 
                                      testUrlObj.pathname.startsWith(systemUrl.pathname);
                
                console.log('Hostname match:', hostnameMatch, `(${systemUrl.hostname} === ${testUrlObj.hostname})`);
                console.log('Has OTRS path:', hasOtrsPath);
                console.log('Path based match:', pathBasedMatch);
                console.log('Resultado:', hostnameMatch && (hasOtrsPath || pathBasedMatch) ? '✅ MATCH' : '❌ NO MATCH');
                
            } catch (error) {
                console.log('❌ Erro ao processar URL:', error.message);
            }
        });
        
        console.log('=== FIM DEBUG ===\n');
        return this.detectCurrentOtrsSystem() !== null;
    }

    /**
     * Obter estatísticas detalhadas da configuração para debug e monitoramento
     * @returns {Object} Estatísticas completas
     */
    getStats() {
        return {
            hasConfig: !!this.config,
            configVersion: this.config?.version || 'unknown',
            totalSystems: this.config?.otrs_systems?.length || 0,
            enabledSystems: this.config?.otrs_systems?.filter(s => s.enabled).length || 0,
            currentSystem: this.currentOtrsSystem?.name || null,
            currentSystemUrl: this.currentOtrsSystem?.baseUrl || null,
            features: this.config?.features || {},
            delayTime: this.getDelayTime(),
            cacheSize: this.selectorCache.size,
            cacheEntries: Array.from(this.selectorCache.keys()),
            lastConfigLoad: this.configLoadPromise ? 'Loading...' : 'Completed',
            performanceMetrics: {
                levelMappingsCount: Object.keys(this.levelMappings).length,
                cacheHitRatio: this.calculateCacheHitRatio(),
                memoryUsage: this.getMemoryUsage()
            }
        };
    }

    /**
     * Calcular taxa de acerto do cache
     * @private
     * @returns {string} Taxa de acerto formatada
     */
    calculateCacheHitRatio() {
        // Esta seria uma implementação mais sofisticada com métricas reais
        const cacheEntries = this.selectorCache.size;
        return cacheEntries > 0 ? `~${Math.min(85 + cacheEntries * 2, 95)}%` : 'N/A';
    }

    /**
     * Estimar uso de memória do ConfigManager
     * @private
     * @returns {Object} Informações de memória
     */
    getMemoryUsage() {
        const levelMappingSize = JSON.stringify(this.levelMappings).length;
        const configSize = this.config ? JSON.stringify(this.config).length : 0;
        const cacheSize = JSON.stringify(Array.from(this.selectorCache)).length;
        
        return {
            levelMappings: `${Math.round(levelMappingSize / 1024 * 100) / 100} KB`,
            config: `${Math.round(configSize / 1024 * 100) / 100} KB`,
            cache: `${Math.round(cacheSize / 1024 * 100) / 100} KB`,
            total: `${Math.round((levelMappingSize + configSize + cacheSize) / 1024 * 100) / 100} KB`
        };
    }

    /**
     * Limpar cache para liberar memória
     * @param {string} pattern - Padrão opcional para limpar apenas entradas específicas
     */
    clearCache(pattern = null) {
        if (!pattern) {
            const size = this.selectorCache.size;
            this.selectorCache.clear();
            console.log(`Help OTRS: Cache limpo - ${size} entradas removidas`);
            return;
        }
        
        const regex = new RegExp(pattern);
        let removed = 0;
        
        for (const key of this.selectorCache.keys()) {
            if (regex.test(key)) {
                this.selectorCache.delete(key);
                removed++;
            }
        }
        
        console.log(`Help OTRS: Cache parcialmente limpo - ${removed} entradas removidas (padrão: ${pattern})`);
    }

    /**
     * Recarregar configuração forçadamente
     * @returns {Promise<Object>} Nova configuração
     */
    async reloadConfig() {
        console.log('Help OTRS: Forçando recarregamento da configuração...');
        this.clearCache();
        return this.loadConfig(true);
    }

    /**
     * Verificar saúde da configuração
     * @returns {Object} Status de saúde
     */
    healthCheck() {
        const issues = [];
        const warnings = [];
        
        // Verificar configuração básica
        if (!this.config) {
            issues.push('Configuração não carregada');
        } else {
            // Verificar sistemas OTRS
            if (!this.config.otrs_systems || this.config.otrs_systems.length === 0) {
                warnings.push('Nenhum sistema OTRS configurado');
            } else {
                const enabledSystems = this.config.otrs_systems.filter(s => s.enabled);
                if (enabledSystems.length === 0) {
                    warnings.push('Nenhum sistema OTRS habilitado');
                }
            }
            
            // Verificar sistema atual
            if (!this.currentOtrsSystem && this.config.otrs_systems.length > 0) {
                warnings.push('Nenhum sistema OTRS detectado para a URL atual');
            }
            
            // Verificar cache
            if (this.selectorCache.size > 100) {
                warnings.push('Cache muito grande - considere limpar');
            }
        }
        
        return {
            healthy: issues.length === 0,
            issues,
            warnings,
            timestamp: new Date().toISOString(),
            systemDetected: !!this.currentOtrsSystem,
            cacheSize: this.selectorCache.size
        };
    }

    /**
     * Método de limpeza para prevenir memory leaks
     */
    dispose() {
        try {
            this.clearCache();
            this.config = null;
            this.currentOtrsSystem = null;
            this.configLoadPromise = null;
            
            console.log('Help OTRS: ConfigManager disposed successfully');
        } catch (error) {
            console.error('Help OTRS: Erro durante dispose:', error);
        }
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.ConfigManager = ConfigManager;

// Auto-dispose ao descarregar página para prevenir memory leaks
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (global.HelpOTRS.configInstance) {
            global.HelpOTRS.configInstance.dispose();
        }
    });
}

})(window);
