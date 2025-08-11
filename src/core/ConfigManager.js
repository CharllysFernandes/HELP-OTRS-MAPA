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
    }

    /**
     * Normalizar níveis de usuário (tratar sinônimos)
     * @param {string} level - Nível do usuário
     * @returns {string|null} Nível normalizado
     */
    normalizeUserLevel(level) {
        if (!level) return null;
        
        const normalizedLevel = level.toLowerCase().trim();
        
        // Mapeamento de sinônimos (todas as chaves devem estar em minúsculas)
        const levelMappings = {
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
        
        // Verificar se existe um mapeamento para o nível
        const mappedLevel = levelMappings[normalizedLevel];
        if (mappedLevel) {
            console.log(`Help OTRS: Nível "${level}" normalizado para "${mappedLevel}"`);
            return mappedLevel;
        }
        
        // Se não há mapeamento, retornar o nível original com primeira letra maiúscula
        return level.charAt(0).toUpperCase() + level.slice(1);
    }

    /**
     * Comparar níveis considerando sinônimos
     * @param {string} level1 - Primeiro nível
     * @param {string} level2 - Segundo nível
     * @returns {boolean} True se os níveis são iguais
     */
    compareUserLevels(level1, level2) {
        const normalizedLevel1 = this.normalizeUserLevel(level1);
        const normalizedLevel2 = this.normalizeUserLevel(level2);
        
        console.log(`Help OTRS: Comparando níveis - "${level1}" (${normalizedLevel1}) vs "${level2}" (${normalizedLevel2})`);
        
        return normalizedLevel1 === normalizedLevel2;
    }

    /**
     * Carregar configurações do storage
     * @returns {Promise<Object|null>} Configuração carregada
     */
    async loadConfig() {
        try {
            console.log('Help OTRS: Iniciando carregamento de configuração...');
            const result = await chrome.storage.sync.get(['helpOtrsConfig']);
            this.config = result.helpOtrsConfig;
            
            console.log('Help OTRS: Configuração carregada:', this.config);
            
            if (this.config) {
                this.detectCurrentOtrsSystem();
            } else {
                console.log('Help OTRS: Nenhuma configuração encontrada, usando padrões');
                // Configuração padrão para evitar erros
                this.config = {
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
                    }
                };
            }
            
            return this.config;
        } catch (error) {
            console.error('Help OTRS: Erro ao carregar configurações:', error);
            // Configuração de fallback para evitar crashes
            this.config = {
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
                }
            };
            return this.config;
        }
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
     * Detectar perfil do usuário baseado na página atual
     * @returns {string|null}
     */
    detectUserProfileFromPage() {
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
        
        for (const selector of indicators) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent || element.title || element.getAttribute('data-profile');
                if (text) {
                    // Procurar padrões que indiquem nível/perfil
                    const normalizedProfile = this.normalizeUserLevel(text);
                    if (normalizedProfile) {
                        return normalizedProfile;
                    }
                }
            }
        }
        
        // Verificar pela URL se há indicações
        const url = window.location.href;
        if (url.includes('nivel1') || url.includes('level1')) {
            return 'Nível 1';
        }
        if (url.includes('local')) {
            return 'Técnico Local';
        }
        if (url.includes('remoto') || url.includes('remote')) {
            return 'Técnico Remoto';
        }
        
        return null;
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
     * Obter estatísticas da configuração para debug
     * @returns {Object} Estatísticas
     */
    getStats() {
        return {
            hasConfig: !!this.config,
            totalSystems: this.config?.otrs_systems?.length || 0,
            enabledSystems: this.config?.otrs_systems?.filter(s => s.enabled).length || 0,
            currentSystem: this.currentOtrsSystem?.name || null,
            features: this.config?.features || {},
            delayTime: this.getDelayTime()
        };
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.ConfigManager = ConfigManager;

})(window);
