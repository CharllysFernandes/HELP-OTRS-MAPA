// Config Manager - Gerencia as configurações da extensão
class ConfigManager {
    constructor() {
        this.config = null;
        this.currentOtrsSystem = null;
    }

    // Função para normalizar níveis de usuário (tratar sinônimos)
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

    // Função para comparar níveis considerando sinônimos
    compareUserLevels(level1, level2) {
        const normalizedLevel1 = this.normalizeUserLevel(level1);
        const normalizedLevel2 = this.normalizeUserLevel(level2);
        
        console.log(`Help OTRS: Comparando níveis - "${level1}" (${normalizedLevel1}) vs "${level2}" (${normalizedLevel2})`);
        
        return normalizedLevel1 === normalizedLevel2;
    }

    async loadConfig() {
        try {
            const result = await chrome.storage.sync.get(['helpOtrsConfig']);
            this.config = result.helpOtrsConfig;
            
            console.log('Help OTRS: Configuração carregada:', this.config);
            
            if (this.config) {
                this.detectCurrentOtrsSystem();
            } else {
                console.log('Help OTRS: Nenhuma configuração encontrada');
            }
            
            return this.config;
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            return null;
        }
    }

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

    isFeatureEnabled(featureName) {
        return this.config && this.config.features && this.config.features[featureName];
    }

    getDelayTime() {
        return this.config && this.config.advanced ? this.config.advanced.delayTime : 500;
    }

    getUserProfile() {
        const rawProfile = this.currentOtrsSystem ? this.currentOtrsSystem.userProfile : null;
        return this.normalizeUserLevel(rawProfile);
    }

    isExtensionEnabledForCurrentSite() {
        return this.currentOtrsSystem !== null;
    }

    // Função de debug para testar detecção de URLs
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
}

// Instância global do gerenciador de configuração
const configManager = new ConfigManager();

// Funções de debug globais para facilitar o teste
window.helpOtrsDebug = {
    testUrlDetection: (url) => configManager.debugUrlDetection(url),
    getCurrentConfig: () => configManager.config,
    getCurrentSystem: () => configManager.currentOtrsSystem,
    forceReload: async () => {
        await configManager.loadConfig();
        console.log('Configuração recarregada:', configManager.config);
        return configManager.currentOtrsSystem;
    },
    testCurrentUrl: () => {
        console.log('=== TESTE MANUAL DA URL ATUAL ===');
        console.log('URL:', window.location.href);
        console.log('Config atual:', configManager.config);
        const result = configManager.debugUrlDetection();
        console.log('Resultado:', result ? '✅ DETECTADO' : '❌ NÃO DETECTADO');
        return result;
    },
    reinitialize: async () => {
        console.log('🔄 Reinicializando extensão...');
        await configManager.loadConfig();
        const result = await init();
        console.log('Resultado da reinicialização:', result ? '✅ SUCESSO' : '❌ FALHOU');
        return result;
    },
    testLevelNormalization: (level) => {
        console.log('=== TESTE DE NORMALIZAÇÃO DE NÍVEIS ===');
        console.log('Nível original:', level);
        const normalized = configManager.normalizeUserLevel(level);
        console.log('Nível normalizado:', normalized);
        return normalized;
    },
    compareLevels: (level1, level2) => {
        console.log('=== TESTE DE COMPARAÇÃO DE NÍVEIS ===');
        console.log('Nível 1:', level1);
        console.log('Nível 2:', level2);
        const result = configManager.compareUserLevels(level1, level2);
        console.log('São iguais?', result ? '✅ SIM' : '❌ NÃO');
        return result;
    },
    debugCurrentLevel: () => {
        console.log('=== DEBUG DO NÍVEL ATUAL ===');
        console.log('URL atual:', window.location.href);
        
        // Teste 1: Elemento de seleção da fila
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        console.log('Elemento .InputField_Selection .Text:', destSelection?.textContent);
        
        // Teste 2: Select oculto
        const destSelect = document.querySelector("#Dest");
        if (destSelect && destSelect.selectedOptions.length > 0) {
            console.log('Select option texto:', destSelect.selectedOptions[0].textContent);
            console.log('Select option valor:', destSelect.selectedOptions[0].value);
        }
        
        // Teste 3: Método original
        const elements = document.querySelectorAll(".InputField_Selection");
        console.log('Elementos .InputField_Selection encontrados:', elements.length);
        elements.forEach((el, index) => {
            console.log(`Elemento ${index}:`, el.textContent);
        });
        
        // Resultado final
        const currentLevel = getCurrentLevel();
        console.log('Nível final capturado:', currentLevel);
        
        return currentLevel;
    },
    testLocalTechnicianValidation: () => {
        console.log('=== TESTE DE VALIDAÇÃO TÉCNICO LOCAL ===');
        console.log('URL atual:', window.location.href);
        
        const isLocalQueue = isLocalTechnicianQueue();
        const isPresencial = isTypeOfServicePresencial();
        const alertExists = isLocalTechnicianAlertAdded();
        
        console.log('Fila é Técnico Local:', isLocalQueue ? '✅ SIM' : '❌ NÃO');
        console.log('Tipo é Presencial:', isPresencial ? '✅ SIM' : '❌ NÃO');
        console.log('Alerta existe:', alertExists ? '✅ SIM' : '❌ NÃO');
        
        // Elementos de debug
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        console.log('Texto da fila selecionada:', destSelection?.textContent);
        
        const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
        console.log('Valor do select tipo atendimento:', serviceSelect?.value);
        
        const serviceSearch = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
        console.log('Campo de pesquisa tipo atendimento:', serviceSearch?.nextElementSibling?.textContent);
        
        console.log('Deveria mostrar alerta:', (isLocalQueue && !isPresencial) ? '✅ SIM' : '❌ NÃO');
        
        return {
            isLocalQueue,
            isPresencial,
            alertExists,
            shouldShowAlert: isLocalQueue && !isPresencial
        };
    },
    testRemoteTechnicianValidation: () => {
        console.log('=== TESTE DE VALIDAÇÃO TÉCNICO REMOTO/NÍVEL 1 ===');
        console.log('URL atual:', window.location.href);
        
        const isRemoteQueue = isRemoteTechnicianQueue();
        const isRemoto = isTypeOfServiceRemoto();
        const alertExists = isRemoteTechnicianAlertAdded();
        
        console.log('Fila é Técnico Remoto/Nível 1:', isRemoteQueue ? '✅ SIM' : '❌ NÃO');
        console.log('Tipo é Remoto:', isRemoto ? '✅ SIM' : '❌ NÃO');
        console.log('Alerta existe:', alertExists ? '✅ SIM' : '❌ NÃO');
        
        // Elementos de debug
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        console.log('Texto da fila selecionada:', destSelection?.textContent);
        if (destSelection) {
            const normalizedLevel = configManager.normalizeUserLevel(destSelection.textContent.trim());
            console.log('Nível normalizado:', normalizedLevel);
        }
        
        const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
        console.log('Valor do select tipo atendimento:', serviceSelect?.value);
        
        const serviceSearch = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
        console.log('Campo de pesquisa tipo atendimento:', serviceSearch?.nextElementSibling?.textContent);
        
        console.log('Deveria mostrar alerta:', (isRemoteQueue && !isRemoto) ? '✅ SIM' : '❌ NÃO');
        
        return {
            isRemoteQueue,
            isRemoto,
            alertExists,
            shouldShowAlert: isRemoteQueue && !isRemoto
        };
    },
    testAllServiceTypeValidation: () => {
        console.log('=== TESTE COMPLETO DE VALIDAÇÃO DE TIPO DE ATENDIMENTO ===');
        const localTest = helpOtrsDebug.testLocalTechnicianValidation();
        const remoteTest = helpOtrsDebug.testRemoteTechnicianValidation();
        
        return {
            local: localTest,
            remote: remoteTest
        };
    },
    forceValidateLocalTechnician: () => {
        console.log('🔄 Forçando validação de Técnico Local...');
        validateLocalTechnicianServiceType();
        return helpOtrsDebug.testLocalTechnicianValidation();
    },
    forceValidateServiceType: () => {
        console.log('🔄 Forçando validação completa de tipo de atendimento...');
        validateServiceTypeForQueue();
        return helpOtrsDebug.testAllServiceTypeValidation();
    },
    getVersion: () => {
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
    }
};

// Funções originais mantidas
"use strict";

function isTicketNotePage() {
    return document.URL.includes("AgentTicketNote");
}

function isTicketCreationPage() {
    return document.URL.includes("AgentTicketPhone");
}

function isRequestRecord() {
    const service = document.querySelector("#ServiceID_Search")?.nextSibling;

    if (!service) {
        return null;
    }

    return service.textContent === "Registro de Requisiçõesx";
}

function isTicketInService() {
    let serviceState;

    const coreElement = document.querySelector("#Core_UI_AutogeneratedID_1");
    if (!coreElement) return false;

    Array.from(coreElement.querySelectorAll("label")).forEach((label) => {
        if (label.textContent === "Estado:") {
            serviceState = label.nextElementSibling?.title;
        }
    });

    return serviceState === "Em Atendimento";
}

function isLevelAlertAdded() {
    return document.querySelector("#QueueAlert") !== null;
}

function removeLevelAlertAdded() {
    document.querySelector("#QueueAlert")?.remove();
}

function serviceRemover() {
    const service = document.querySelector("#ServiceID_Search")?.nextSibling?.children[1]?.firstChild;
    if (service) {
        service.click();
    }
}

function isServiceEmpty() {
    const element = document.querySelector("#ServiceID_Search")?.parentElement;
    return element ? element.children.length == 1 : true;
}

function isTypeOfServiceIsNotEmpty() {
    const element = document.querySelector("#DynamicField_PRITipoAtendimento_Search")?.nextElementSibling?.firstChild;
    if (!element) return false;
    
    console.log(isTypeOfServiceRemoved(), element.textContent);
    return element.textContent === "Presencial" || element.textContent === "Remoto";
}

function addAlertToTypeOfService() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    const span = document.createElement("span");
    span.id = "TypeOfServiceAlert";
    span.textContent = "⚠️ Garanta que o tipo de atendimento seja adequado ao serviço oferecido.";
    span.style.color = "red";
    span.style.fontWeight = "bold";

    const targetElement = document.querySelector(".Row.Row_DynamicField_PRITipoAtendimento")?.children[1];
    if (targetElement) {
        targetElement.appendChild(span);
    }
}

function isTypeOfServiceAlertAdded() {
    return document.querySelector("#TypeOfServiceAlert") !== null;
}

function removeTypeOfServiceAlert() {
    const span = document.querySelector("#TypeOfServiceAlert");
    if (span) {
        span.style.display = "none";
    }
}

function addAlertToLocalTechnician() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    const span = document.createElement("span");
    span.id = "LocalTechnicianAlert";
    span.textContent = "⚠️ Para fila de Técnico Local, o tipo de atendimento deve ser 'Presencial'.";
    span.style.color = "red";
    span.style.fontWeight = "bold";
    span.style.display = "block";
    span.style.marginTop = "5px";

    const targetElement = document.querySelector(".Row.Row_DynamicField_PRITipoAtendimento")?.children[1];
    if (targetElement) {
        targetElement.appendChild(span);
    }
}

function isLocalTechnicianAlertAdded() {
    return document.querySelector("#LocalTechnicianAlert") !== null;
}

function removeLocalTechnicianAlert() {
    const alert = document.querySelector("#LocalTechnicianAlert");
    if (alert) {
        alert.remove();
    }
}

function addAlertToRemoteTechnician() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    const span = document.createElement("span");
    span.id = "RemoteTechnicianAlert";
    span.textContent = "⚠️ Para fila de Técnico Remoto, o tipo de atendimento deve ser 'Remoto'.";
    span.style.color = "red";
    span.style.fontWeight = "bold";
    span.style.display = "block";
    span.style.marginTop = "5px";

    const targetElement = document.querySelector(".Row.Row_DynamicField_PRITipoAtendimento")?.children[1];
    if (targetElement) {
        targetElement.appendChild(span);
    }
}

function isRemoteTechnicianAlertAdded() {
    return document.querySelector("#RemoteTechnicianAlert") !== null;
}

function removeRemoteTechnicianAlert() {
    const alert = document.querySelector("#RemoteTechnicianAlert");
    if (alert) {
        alert.remove();
    }
}

function isRemoteTechnicianQueue() {
    // Verificar se a fila selecionada é "Técnico Remoto" ou variações de Nível 1
    const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
    if (destSelection) {
        const queueText = destSelection.textContent.trim();
        console.log('Help OTRS: Verificando fila para Técnico Remoto/Nível 1:', queueText);
        
        // Normalizar o nível da fila usando o ConfigManager
        const normalizedLevel = configManager.normalizeUserLevel(queueText);
        console.log('Help OTRS: Nível normalizado:', normalizedLevel);
        
        return normalizedLevel === "Nível 1";
    }
    
    // Fallback: verificar no select oculto
    const destSelect = document.querySelector("#Dest");
    if (destSelect && destSelect.selectedOptions.length > 0) {
        const selectedOption = destSelect.selectedOptions[0];
        const queueText = selectedOption.textContent.trim();
        console.log('Help OTRS: Verificando fila (select) para Técnico Remoto/Nível 1:', queueText);
        
        // Normalizar o nível da fila usando o ConfigManager
        const normalizedLevel = configManager.normalizeUserLevel(queueText);
        console.log('Help OTRS: Nível normalizado (select):', normalizedLevel);
        
        return normalizedLevel === "Nível 1";
    }
    
    return false;
}

function isTypeOfServiceRemoto() {
    // Verificar se o tipo de atendimento está definido como "Remoto"
    const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
    if (serviceSelect) {
        const selectedValue = serviceSelect.value;
        console.log('Help OTRS: Tipo de atendimento atual:', selectedValue);
        return selectedValue === "R"; // "R" para Remoto
    }
    
    // Verificar pelo campo de pesquisa visível
    const serviceSearch = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
    if (serviceSearch && serviceSearch.nextElementSibling) {
        const selectedText = serviceSearch.nextElementSibling.textContent?.trim();
        console.log('Help OTRS: Tipo de atendimento visível:', selectedText);
        return selectedText === "Remoto";
    }
    
    return false;
}

function isLocalTechnicianQueue() {
    // Verificar se a fila selecionada é "Técnico Local"
    const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
    if (destSelection) {
        const queueText = destSelection.textContent.trim();
        console.log('Help OTRS: Verificando fila para Técnico Local:', queueText);
        return queueText === "Técnico Local" || queueText === "Tecnico Local";
    }
    
    // Fallback: verificar no select oculto
    const destSelect = document.querySelector("#Dest");
    if (destSelect && destSelect.selectedOptions.length > 0) {
        const selectedOption = destSelect.selectedOptions[0];
        const queueText = selectedOption.textContent.trim();
        console.log('Help OTRS: Verificando fila (select) para Técnico Local:', queueText);
        return queueText.includes("Técnico Local") || queueText.includes("Tecnico Local");
    }
    
    return false;
}

function isTypeOfServicePresencial() {
    // Verificar se o tipo de atendimento está definido como "Presencial"
    const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
    if (serviceSelect) {
        const selectedValue = serviceSelect.value;
        console.log('Help OTRS: Tipo de atendimento atual:', selectedValue);
        return selectedValue === "P"; // "P" para Presencial
    }
    
    // Verificar pelo campo de pesquisa visível
    const serviceSearch = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
    if (serviceSearch && serviceSearch.nextElementSibling) {
        const selectedText = serviceSearch.nextElementSibling.textContent?.trim();
        console.log('Help OTRS: Tipo de atendimento visível:', selectedText);
        return selectedText === "Presencial";
    }
    
    return false;
}

function validateLocalTechnicianServiceType() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    const isLocalQueue = isLocalTechnicianQueue();
    const isPresencial = isTypeOfServicePresencial();
    const alertExists = isLocalTechnicianAlertAdded();
    
    console.log('Help OTRS: Validação Técnico Local:', {
        isLocalQueue,
        isPresencial,
        alertExists
    });
    
    if (isLocalQueue && !isPresencial) {
        // Fila é Técnico Local mas tipo não é Presencial - mostrar alerta
        if (!alertExists) {
            addAlertToLocalTechnician();
        }
    } else if (alertExists) {
        // Condições não se aplicam mais - remover alerta
        removeLocalTechnicianAlert();
    }
}

function validateRemoteTechnicianServiceType() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    const isRemoteQueue = isRemoteTechnicianQueue();
    const isRemoto = isTypeOfServiceRemoto();
    const alertExists = isRemoteTechnicianAlertAdded();
    
    console.log('Help OTRS: Validação Técnico Remoto/Nível 1:', {
        isRemoteQueue,
        isRemoto,
        alertExists
    });
    
    if (isRemoteQueue && !isRemoto) {
        // Fila é Técnico Remoto/Nível 1 mas tipo não é Remoto - mostrar alerta
        if (!alertExists) {
            addAlertToRemoteTechnician();
        }
    } else if (alertExists) {
        // Condições não se aplicam mais - remover alerta
        removeRemoteTechnicianAlert();
    }
}

function validateServiceTypeForQueue() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    // Validar ambos os casos
    validateLocalTechnicianServiceType();
    validateRemoteTechnicianServiceType();
}

function addAlertToServiceClassification() {
    if (!configManager.isFeatureEnabled('serviceClassificationAlerts')) return;

    const span = document.createElement("span");
    span.id = "ServiceClassificationAlert";
    span.textContent = "⚠️ Garanta que a classificação do serviço seja adequada ao atendimento.";
    span.style.color = "red";
    span.style.fontWeight = "bold";

    const br = document.createElement("br");
    const parentElement = document.querySelector("#ServiceIDError")?.parentElement;
    
    if (parentElement) {
        parentElement.appendChild(br);
        parentElement.appendChild(span);
    }
}

function getCurrentLevel() {
    // Primeira tentativa: buscar pelo elemento de seleção da fila
    const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
    if (destSelection) {
        let level = destSelection.textContent.trim();
        console.log('Help OTRS: Nível capturado do destino:', level);
        return configManager.normalizeUserLevel(level);
    }
    
    // Segunda tentativa: buscar no select oculto
    const destSelect = document.querySelector("#Dest");
    if (destSelect && destSelect.selectedOptions.length > 0) {
        const selectedOption = destSelect.selectedOptions[0];
        let level = selectedOption.textContent.trim().replace(/\s+/g, ' ');
        console.log('Help OTRS: Nível capturado do select:', level);
        return configManager.normalizeUserLevel(level);
    }
    
    // Terceira tentativa: método original (fallback)
    const elements = document.querySelectorAll(".InputField_Selection");
    if (elements.length >= 4) {
        let level = elements[3].textContent.split(" -")[0];
        level = level.replace("l", "l ");
        console.log('Help OTRS: Nível capturado pelo método original:', level);
        return configManager.normalizeUserLevel(level);
    }
    
    console.log('Help OTRS: Não foi possível capturar o nível atual');
    return null;
}

function addAlertToQueue(level, currentLevel) {
    if (!configManager.isFeatureEnabled('alertsEnabled')) return;

    const span = document.createElement("span");
    span.id = "QueueAlert";
    span.textContent = `⚠️ Você pertence ao ${level} e está abrindo um chamado para ${currentLevel}.`;
    span.style.color = "red";
    span.style.fontWeight = "bold";

    const parentElement = document.querySelector("#DestServerError")?.parentElement;
    if (parentElement) {
        parentElement.appendChild(span);
    }
}

function isServiceClassificationAlertAdded() {
    return document.querySelector("#ServiceClassificationAlert") !== null;
}

function removeServiceClassificationAlert() {
    document.querySelector("#ServiceClassificationAlert")?.remove();
}

function changeTypeOfService() {
    const select = document.querySelector("#DynamicField_PRITipoAtendimento");

    if (select && !select.dataset.removed) {
        select.value = null;
        select.dataset.removed = true;
    }
}

function isTypeOfServiceRemoved() {
    const element = document.querySelector("#DynamicField_PRITipoAtendimento");
    return element ? !!element.dataset.removed : false;
}

function setMutationObserverToNextStateDiv() {
    const nextStateDiv = document.querySelector("#NewStateID_Search")?.parentElement;
    if (!nextStateDiv) return;

    const config = {
        childList: true,
        subtree: false,
    };

    const callback = function (mutationList, _) {
        for (let mutation of mutationList) {
            if (mutation.type === "childList") {
                if (
                    nextStateDiv.children.length > 1 &&
                    nextStateDiv.children[1].textContent === "Aguardando Validaçãox"
                ) {
                    const span = document.querySelector("#TypeOfServiceAlert");
                    if (!span && configManager.isFeatureEnabled('typeOfServiceAlerts')) {
                        addAlertToTypeOfService();
                        changeTypeOfService();
                    }

                    if (isRequestRecord() && configManager.isFeatureEnabled('serviceClassificationAlerts')) {
                        serviceRemover();
                        addAlertToServiceClassification();
                    }
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(nextStateDiv, config);
}

function setMutationObserverToServiceDiv(level) {
    if (!configManager.isFeatureEnabled('alertsEnabled')) return;

    const ServiceDiv = document.querySelector("#Dest_Search")?.parentElement;
    if (!ServiceDiv) return;

    const userLevel = level;

    const config = {
        childList: true,
        subtree: false,
    };

    const callback = function (mutationList, _) {
        for (let mutation of mutationList) {
            if (mutation.type === "childList") {
                const currentLevel = getCurrentLevel();
                const levelAlertAdded = isLevelAlertAdded();

                console.log('Help OTRS: === DEBUG DETALHADO DE NÍVEIS ===');
                console.log('Help OTRS: Usuário (raw):', userLevel);
                console.log('Help OTRS: Atual (raw):', currentLevel);
                console.log('Help OTRS: Comparação:', configManager.compareUserLevels(userLevel, currentLevel));

                if (!configManager.compareUserLevels(userLevel, currentLevel)) {
                    console.log('Help OTRS: Níveis diferentes detectados - adicionando alerta');
                    if (!levelAlertAdded) {
                        addAlertToQueue(userLevel, currentLevel);
                    } else {
                        removeLevelAlertAdded();
                        addAlertToQueue(userLevel, currentLevel);
                    }
                } else if (configManager.compareUserLevels(userLevel, currentLevel) && levelAlertAdded) {
                    console.log('Help OTRS: Níveis iguais detectados - removendo alerta');
                    try {
                        removeLevelAlertAdded();
                    } catch {}
                }

                // Validar se é fila de Técnico Local e tipo de atendimento
                validateServiceTypeForQueue();
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(ServiceDiv, config);
}

function setMutationObserverToServiceClassification() {
    if (!configManager.isFeatureEnabled('serviceClassificationAlerts')) return;

    const serviceDiv = document.querySelector("#ServiceID_Search")?.parentElement;
    if (!serviceDiv) return;

    const config = {
        childList: true,
        subtree: false,
    };

    const callback = function (mutationList, _) {
        for (let mutation of mutationList) {
            if (mutation.type === "childList") {
                if (
                    isServiceClassificationAlertAdded() &&
                    !isRequestRecord() &&
                    !isServiceEmpty()
                ) {
                    removeServiceClassificationAlert();
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(serviceDiv, config);
}

function setMutationObserverToServiceType() {
    if (!configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

    // Observar mudanças no campo de tipo de atendimento
    const serviceTypeDiv = document.querySelector("#DynamicField_PRITipoAtendimento_Search")?.parentElement;
    if (serviceTypeDiv) {
        const config = {
            childList: true,
            subtree: true,
        };

        const callback = function (mutationList, _) {
            for (let mutation of mutationList) {
                if (mutation.type === "childList") {
                    console.log('Help OTRS: Mudança detectada no tipo de atendimento');
                    validateServiceTypeForQueue();
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(serviceTypeDiv, config);
        console.log('Help OTRS: Observer do tipo de atendimento configurado');
    }

    // Observar mudanças no select oculto do tipo de atendimento
    const serviceTypeSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
    if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', function() {
            console.log('Help OTRS: Select de tipo de atendimento alterado');
            validateServiceTypeForQueue();
        });
        console.log('Help OTRS: Event listener do select de tipo de atendimento configurado');
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Função para buscar e processar o conteúdo como DOM - removida pois não é mais necessária
// O nível do usuário agora vem das configurações

function getCurrentUserLevel() {
    return configManager.getUserProfile();
}

function addDivAlert() {
    if (!configManager.isFeatureEnabled('queueValidation')) return;

    const div = document.querySelector(".MainBox.ARIARoleMain.TicketZoom.UseArticleColors");
    if (!div) return;

    const actionsList = document.querySelector(".Actions")?.querySelectorAll("li");
    if (!actionsList) return;

    const filaItem = Array.from(actionsList).find(li => li.textContent.includes("Fila"));
    if (!filaItem) return;

    const a = document.createElement("a");
    a.href = filaItem.querySelector("a")?.href || '#';
    a.textContent = "Você está atendendo um chamado de outra fila! Clique aqui para alterar a fila.";
    a.style = "background-color: #ffbbb0; padding: 1rem; display: flex; text-align: center; justify-content: center; color: #550000; font-weight: bold; font-size: 15px;";

    div.prepend(a);
}

function isOwner() {
    const username = document.querySelector(".UserAvatar")?.querySelector("span")?.textContent;
    if (!username) return false;

    let ownerName;
    const coreElement = document.querySelector("#Core_UI_AutogeneratedID_1");
    if (!coreElement) return false;

    Array.from(coreElement.querySelectorAll("label")).forEach((label) => {
        if (label.textContent === "Proprietário:") {
            ownerName = label.nextElementSibling?.title?.split(" (")[0];
        }
    });

    return username === ownerName;
}

function isTicketZoomPage() {
    return document.URL.includes("AgentTicketZoom;TicketID");
}

async function isCorrectQueue() {
    if (!configManager.isFeatureEnabled('queueValidation')) return true;

    const userLevel = getCurrentUserLevel();
    if (!userLevel) return true;

    let currentLevel;
    const children = document.querySelector(".TableLike.FixedLabelSmall.Narrow")?.children;
    if (!children) return true;

    Array.from(children).forEach((child, index) => {
        if (child.textContent == "Fila:") {
            const nextChild = children[index + 1];
            if (nextChild) {
                currentLevel = nextChild.title
                    ?.split("::")[1]
                    ?.split(" -")[0]
                    ?.replace("l", "l ");
            }
        }
    });

    // Normalizar o nível da fila antes da comparação
    const normalizedCurrentLevel = configManager.normalizeUserLevel(currentLevel);
    
    console.log('Help OTRS: Validação de fila - Usuário:', userLevel, 'Fila:', normalizedCurrentLevel);
    
    return configManager.compareUserLevels(userLevel, normalizedCurrentLevel);
}

// ========================================
// FUNCIONALIDADE: REAPROVEITAR DADOS DO FORMULÁRIO
// ========================================

// Classe para gerenciar reaproveitamento de dados do formulário
class FormDataReuser {
    constructor() {
        this.popup = null;
        this.isVisible = false;
        this.formData = {};
        this.targetEditor = null;
        this.observerActive = false;
    }

    // Mapear campos do formulário OTRS para rótulos amigáveis
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

    // Capturar campos dinamicamente da estrutura <div class="Field">
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

    // Categorizar campo baseado no ID e título
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

    // Obter ícone baseado no tipo de campo
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

    // Aguardar o carregamento completo do CKEditor
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

    // Capturar dados preenchidos nos formulários
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

    // Encontrar editor de texto (iframe ou textarea)
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
            '#RichText',
            // Seletores genéricos
            '.cke_wysiwyg_frame',
            'iframe[allowtransparency="true"]'
        ];

        for (const selector of editorSelectors) {
            const editor = document.querySelector(selector);
            if (editor) {
                // Verificar se o iframe é acessível
                if (editor.tagName === 'IFRAME') {
                    try {
                        const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                        if (iframeDoc && iframeDoc.body) {
                            console.log('Help OTRS: Editor CKEditor encontrado:', selector);
                            return editor;
                        }
                    } catch (accessError) {
                        console.log('Help OTRS: Iframe inacessível (CORS):', selector);
                        continue;
                    }
                } else {
                    console.log('Help OTRS: Editor textarea encontrado:', selector);
                    return editor;
                }
            }
        }

        // Busca mais ampla por iframes que podem ser editores
        const allIframes = document.querySelectorAll('iframe');
        for (const iframe of allIframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc && iframeDoc.body && iframeDoc.body.isContentEditable) {
                    console.log('Help OTRS: Editor contentEditable encontrado em iframe');
                    return iframe;
                }
            } catch (e) {
                // Ignorar iframes inacessíveis
                continue;
            }
        }

        console.log('Help OTRS: Editor não encontrado');
        return null;
    }

    // Criar popup suspenso
    createPopup() {
        if (this.popup) {
            this.popup.remove();
        }

        const popup = document.createElement('div');
        popup.id = 'helpOtrsFormReuser';
        popup.innerHTML = `
            <div class="form-reuser-header">
                <span class="form-reuser-title">📋 Reaproveitar Dados</span>
                <button class="form-reuser-close" title="Fechar">&times;</button>
            </div>
            <div class="form-reuser-content">
                <p class="form-reuser-description">Clique nos dados para adicionar ao texto:</p>
                <div class="form-reuser-categories" id="formReuserCategories">
                    <!-- Categorias serão inseridas aqui -->
                </div>
            </div>
        `;

        // Estilos CSS inline (para não depender de arquivo CSS externo)
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 280px;
            max-height: 70vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            opacity: 0;
            transform: translateY(-50%) translateX(100px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
            overflow: hidden;
        `;

        this.popup = popup;
        document.body.appendChild(popup);

        // Adicionar estilos para elementos internos
        this.addInternalStyles();

        // Event listeners
        popup.querySelector('.form-reuser-close').addEventListener('click', () => {
            this.hidePopup();
        });

        // Permitir arrastar o popup
        this.makeDraggable(popup);

        return popup;
    }

    // Adicionar estilos CSS internos
    addInternalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #helpOtrsFormReuser .form-reuser-header {
                padding: 15px;
                background: rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                backdrop-filter: blur(5px);
            }
            
            #helpOtrsFormReuser .form-reuser-title {
                font-weight: 600;
                font-size: 14px;
            }
            
            #helpOtrsFormReuser .form-reuser-close {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            #helpOtrsFormReuser .form-reuser-close:hover {
                background: rgba(255,255,255,0.2);
            }
            
            #helpOtrsFormReuser .form-reuser-content {
                padding: 15px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            #helpOtrsFormReuser .form-reuser-description {
                margin: 0 0 15px 0;
                font-size: 12px;
                opacity: 0.9;
            }
            
            #helpOtrsFormReuser .form-category {
                margin-bottom: 15px;
            }
            
            #helpOtrsFormReuser .form-category-title {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                opacity: 0.8;
                margin-bottom: 8px;
                padding-bottom: 4px;
                border-bottom: 1px solid rgba(255,255,255,0.2);
            }
            
            #helpOtrsFormReuser .form-data-item {
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                word-wrap: break-word;
            }
            
            #helpOtrsFormReuser .form-data-item:hover {
                background: rgba(255,255,255,0.2);
                transform: translateX(-2px);
                box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
            }
            
            #helpOtrsFormReuser .form-data-item:active {
                transform: scale(0.98);
            }
            
            #helpOtrsFormReuser .form-data-label {
                display: block;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            #helpOtrsFormReuser .form-data-value {
                opacity: 0.9;
                font-size: 12px;
            }
            
            #helpOtrsFormReuser .form-reuser-content::-webkit-scrollbar {
                width: 4px;
            }
            
            #helpOtrsFormReuser .form-reuser-content::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
            }
            
            #helpOtrsFormReuser .form-reuser-content::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.3);
                border-radius: 2px;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Tornar o popup arrastável
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        const header = element.querySelector('.form-reuser-header');
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('form-reuser-close')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        function onMouseMove(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.left = (startLeft + deltaX) + 'px';
            element.style.top = (startTop + deltaY) + 'px';
            element.style.right = 'auto';
            element.style.transform = 'none';
        }
        
        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    // Popular popup com dados capturados
    populatePopup() {
        const categoriesContainer = this.popup.querySelector('#formReuserCategories');
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
            categoryDiv.className = 'form-category';

            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'form-category-title';
            categoryTitle.textContent = categoryNames[categoryKey] || categoryKey;
            categoryDiv.appendChild(categoryTitle);

            categories[categoryKey].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'form-data-item';
                itemDiv.innerHTML = `
                    <div class="form-data-label">${item.label}</div>
                    <div class="form-data-value">${item.value}</div>
                `;
                
                itemDiv.addEventListener('click', async () => {
                    await this.insertDataIntoEditor(item);
                });

                categoryDiv.appendChild(itemDiv);
            });

            categoriesContainer.appendChild(categoryDiv);
        });

        if (Object.keys(categories).length === 0) {
            categoriesContainer.innerHTML = '<p style="opacity: 0.7; font-size: 12px; text-align: center; padding: 20px;">Nenhum dado encontrado nos formulários</p>';
        }
    }

    // Inserir dados no editor de texto
    async insertDataIntoEditor(item) {
        let editor = this.targetEditor;
        if (!editor) {
            console.log('Help OTRS: Editor não encontrado para inserção');
            return;
        }

        // Aguardar o editor ficar pronto se for iframe
        if (editor.tagName === 'IFRAME') {
            editor = await this.waitForEditorReady(editor, 3);
        }

        const textToInsert = `${item.label}: ${item.value}`;
        
        try {
            // Tentar inserir no iframe (CKEditor/Znuny)
            if (editor.tagName === 'IFRAME') {
                const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                const body = iframeDoc.body;
                
                if (body) {
                    // Focar no editor primeiro
                    editor.contentWindow.focus();
                    
                    // Criar elemento de linha de dados
                    const dataElement = iframeDoc.createElement('div');
                    dataElement.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
                    dataElement.style.marginBottom = '5px';
                    
                    // Verificar se há conteúdo existente
                    if (body.innerHTML.trim() === '' || body.innerHTML === '<p><br></p>' || body.innerHTML === '<br>') {
                        // Editor vazio - limpar e inserir
                        body.innerHTML = '';
                        body.appendChild(dataElement);
                    } else {
                        // Editor com conteúdo - adicionar no final
                        
                        // Remover últimos <br> vazios se existirem
                        const lastElements = body.querySelectorAll('br:last-child, p:last-child:empty');
                        lastElements.forEach(el => {
                            if (el.innerHTML === '' || el.innerHTML === '<br>') {
                                el.remove();
                            }
                        });
                        
                        // Adicionar quebra de linha antes do novo conteúdo
                        const breakElement = iframeDoc.createElement('br');
                        body.appendChild(breakElement);
                        
                        // Adicionar o novo dado
                        body.appendChild(dataElement);
                    }
                    
                    // Adicionar uma quebra de linha após o elemento
                    const finalBreak = iframeDoc.createElement('br');
                    body.appendChild(finalBreak);
                    
                    // Colocar cursor no final
                    const range = iframeDoc.createRange();
                    const selection = editor.contentWindow.getSelection();
                    range.selectNodeContents(body);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Disparar evento de mudança para CKEditor
                    const changeEvent = new iframeDoc.defaultView.Event('input', { bubbles: true });
                    body.dispatchEvent(changeEvent);
                    
                    console.log('Help OTRS: Dados inseridos no CKEditor iframe:', textToInsert);
                }
            }
            // Tentar inserir em textarea
            else if (editor.tagName === 'TEXTAREA') {
                const currentValue = editor.value;
                const newValue = currentValue + (currentValue ? '\n' : '') + textToInsert;
                editor.value = newValue;
                editor.focus();
                
                // Disparar evento de mudança
                const changeEvent = new Event('input', { bubbles: true });
                editor.dispatchEvent(changeEvent);
                
                console.log('Help OTRS: Dados inseridos em textarea:', textToInsert);
            }

            // Feedback visual
            this.showInsertFeedback(item);
            
        } catch (error) {
            console.error('Help OTRS: Erro ao inserir dados:', error);
            
            // Fallback: tentar inserção simples
            try {
                if (editor.tagName === 'IFRAME') {
                    const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                    if (iframeDoc && iframeDoc.body) {
                        iframeDoc.body.innerHTML += `<br><strong>${item.label}:</strong> ${item.value}<br>`;
                        editor.contentWindow.focus();
                    }
                }
            } catch (fallbackError) {
                console.error('Help OTRS: Erro no fallback de inserção:', fallbackError);
            }
        }
    }

    // Mostrar feedback de inserção
    showInsertFeedback(item) {
        // Criar elemento de feedback temporário
        const feedback = document.createElement('div');
        feedback.textContent = `✅ ${item.label} adicionado`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10001;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(feedback);
        
        // Animar entrada
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 100);
        
        // Remover após 2 segundos
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-20px)';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    // Mostrar popup
    async showPopup() {
        if (!this.captureFormData()) {
            console.log('Help OTRS: Nenhum dado encontrado nos formulários');
            return false;
        }

        this.targetEditor = this.findTextEditor();
        if (!this.targetEditor) {
            console.log('Help OTRS: Editor de texto não encontrado');
            return false;
        }

        // Aguardar o editor ficar pronto se for iframe
        if (this.targetEditor.tagName === 'IFRAME') {
            console.log('Help OTRS: Aguardando CKEditor ficar pronto...');
            this.targetEditor = await this.waitForEditorReady(this.targetEditor);
        }

        if (!this.popup) {
            this.createPopup();
        }

        this.populatePopup();

        // Mostrar com animação
        setTimeout(() => {
            this.popup.style.opacity = '1';
            this.popup.style.transform = 'translateY(-50%) translateX(0)';
        }, 100);

        this.isVisible = true;
        return true;
    }

    // Esconder popup
    hidePopup() {
        if (this.popup) {
            this.popup.style.opacity = '0';
            this.popup.style.transform = 'translateY(-50%) translateX(100px)';
            
            setTimeout(() => {
                if (this.popup) {
                    this.popup.remove();
                    this.popup = null;
                }
            }, 300);
        }
        
        this.isVisible = false;
    }

    // Alternar visibilidade
    async togglePopup() {
        if (this.isVisible) {
            this.hidePopup();
        } else {
            await this.showPopup();
        }
    }

    // Inicializar observador de mudanças nos formulários
    initFormObserver() {
        if (this.observerActive) return;

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Verificar se novos campos Field foram adicionados
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const fieldDivs = node.classList?.contains('Field') ? [node] : node.querySelectorAll?.('div.Field') || [];
                            if (fieldDivs.length > 0) {
                                console.log('Help OTRS: Novos campos Field detectados:', fieldDivs.length);
                                shouldUpdate = true;
                            }
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    // Verificar mudanças de value em inputs
                    if (mutation.target.tagName === 'INPUT' || mutation.target.tagName === 'SELECT' || mutation.target.tagName === 'TEXTAREA') {
                        shouldUpdate = true;
                    }
                }
            });

            // Atualizar dados se popup estiver visível
            if (shouldUpdate && this.isVisible) {
                setTimeout(() => {
                    console.log('Help OTRS: Atualizando dados capturados...');
                    this.captureFormData();
                    this.populatePopup();
                }, 500);
            }
        });

        // Observar mudanças no formulário
        const form = document.querySelector('form') || document.body;
        observer.observe(form, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['value', 'checked', 'selected']
        });

        // Também observar mudanças de input em tempo real
        document.addEventListener('input', (event) => {
            if (this.isVisible && (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA')) {
                clearTimeout(this.inputTimeout);
                this.inputTimeout = setTimeout(() => {
                    console.log('Help OTRS: Campo alterado:', event.target.id || event.target.name);
                    this.captureFormData();
                    this.populatePopup();
                }, 1000); // Debounce de 1 segundo
            }
        });

        this.observerActive = true;
        console.log('Help OTRS: Observador de formulário iniciado com detecção de div.Field');
    }

    // Criar botão flutuante para ativar funcionalidade
    createFloatingButton() {
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

        button.addEventListener('click', () => {
            this.togglePopup();
            // Efeito de click
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        });

        document.body.appendChild(button);
        return button;
    }

    // Inicializar funcionalidade
    init() {
        if (!configManager.isFeatureEnabled('formDataReuser')) {
            console.log('Help OTRS: Funcionalidade de reaproveitamento de dados desabilitada');
            return;
        }

        console.log('Help OTRS: Inicializando reaproveitamento de dados do formulário');
        
        this.createFloatingButton();
        this.initFormObserver();
        
        console.log('Help OTRS: Funcionalidade de reaproveitamento de dados inicializada');
    }

    // Limpar recursos
    destroy() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        
        const button = document.getElementById('helpOtrsReuseBtn');
        if (button) {
            button.remove();
        }
        
        this.isVisible = false;
        this.observerActive = false;
    }
}

// Instância global do reaproveitador de dados
const formDataReuser = new FormDataReuser();

// ========================================
// FIM DA FUNCIONALIDADE: REAPROVEITAR DADOS
// ========================================

async function init() {
    console.log('=== INIT FUNCTION START ===');
    
    // Carregar configurações primeiro
    await configManager.loadConfig();
    
    console.log('Help OTRS: Verificando se extensão está habilitada...');
    console.log('Help OTRS: Configuração carregada:', configManager.config);
    console.log('Help OTRS: Sistema atual detectado:', configManager.currentOtrsSystem);
    console.log('Help OTRS: URL atual:', window.location.href);
    
    // Verificar se há sistemas configurados
    if (!configManager.config || !configManager.config.otrs_systems || configManager.config.otrs_systems.length === 0) {
        console.log('🔧 Help OTRS: Nenhum sistema OTRS configurado!');
        console.log('📝 Help OTRS: Para usar a extensão, acesse as configurações e adicione pelo menos um sistema OTRS.');
        console.log('⚙️ Help OTRS: Clique no ícone da extensão na barra de ferramentas para abrir as configurações.');
        console.log('=== INIT FUNCTION END (NO SYSTEMS CONFIGURED) ===');
        return false;
    }
    
    // Verificar se a extensão está habilitada para este site
    if (!configManager.isExtensionEnabledForCurrentSite()) {
        console.log('❌ Help OTRS: Extensão desabilitada para este site');
        console.log('Help OTRS: Sistemas configurados:', configManager.config?.otrs_systems?.map(s => ({
            name: s.name,
            enabled: s.enabled,
            baseUrl: s.baseUrl,
            hostname: s.baseUrl ? new URL(s.baseUrl).hostname : 'URL inválida'
        })));
        console.log('💡 Help OTRS: Para habilitar neste site, adicione um sistema OTRS com o hostname:', new URL(window.location.href).hostname);
        console.log('=== INIT FUNCTION END (DISABLED) ===');
        return false;
    }

    console.log('✅ Help OTRS: Extensão HABILITADA! Iniciando para', configManager.currentOtrsSystem.name);
    console.log('Help OTRS: Perfil do usuário:', configManager.getUserProfile());

    if (isTicketCreationPage()) {
        console.log('Help OTRS: Página de criação de ticket detectada');
        const userLevel = getCurrentUserLevel();
        if (userLevel) {
            console.log('Help OTRS: Configurando observador para nível:', userLevel);
            setMutationObserverToServiceDiv(userLevel);
        } else {
            console.log('Help OTRS: Nível de usuário não encontrado');
        }
        
        // Configurar observador para tipo de atendimento
        setMutationObserverToServiceType();
        
        // Fazer validação inicial
        setTimeout(() => {
            validateServiceTypeForQueue();
        }, 1000);
    }

    if (isTicketNotePage()) {
        console.log('Help OTRS: Página de nota de ticket detectada');
        setMutationObserverToNextStateDiv();
        setMutationObserverToServiceClassification();
    }

    if (isTicketZoomPage() && isOwner() && isTicketInService()) {
        console.log('Help OTRS: Página de zoom de ticket detectada');
        const queue = await isCorrectQueue();
        if (!queue) {
            addDivAlert();
        }
    }
    
    // Inicializar reaproveitamento de dados do formulário
    if (configManager.isFeatureEnabled('formDataReuser')) {
        setTimeout(() => {
            formDataReuser.init();
        }, 1000); // Aguardar carregamento completo da página
    }
    
    console.log('✅ Help OTRS: Inicialização concluída com sucesso');
    console.log('=== INIT FUNCTION END (SUCCESS) ===');
    return true;
}

// Listener para atualizações de configuração
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'CONFIG_UPDATED') {
        configManager.config = request.config;
        configManager.detectCurrentOtrsSystem();
        console.log('Help OTRS: Configuração atualizada');
        
        // Recarregar a página para aplicar novas configurações
        if (configManager.isExtensionEnabledForCurrentSite()) {
            location.reload();
        }
    }
});

window.addEventListener("load", async function () {
    // Obter informações da extensão
    const manifest = chrome.runtime.getManifest();
    
    console.log('=== HELP OTRS DEBUG START ===');
    console.log(`📦 Help OTRS - MAPA v${manifest.version} (${manifest.version_name || 'Build padrão'})`);
    console.log(`👥 Desenvolvido por: ${manifest.author}`);
    console.log(`📅 Manifest Version: ${manifest.manifest_version}`);
    console.log('Help OTRS: Window load event disparado');
    console.log('Help OTRS: URL:', window.location.href);
    console.log('Help OTRS: Hostname:', window.location.hostname);
    console.log('Help OTRS: Protocol:', window.location.protocol);
    console.log('Help OTRS: Pathname:', window.location.pathname);
    console.log('Help OTRS: Search:', window.location.search);
    
    // Usar delay configurável
    await configManager.loadConfig();
    const delayTime = configManager.getDelayTime();
    console.log('Help OTRS: Aguardando delay de', delayTime, 'ms');
    await delay(delayTime);

    console.log('Help OTRS: Chamando init()');
    const result = await init();
    console.log(`=== HELP OTRS DEBUG END v${manifest.version} ===`);
    return result;
});
