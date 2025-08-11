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
    console.log('=== HELP OTRS DEBUG START ===');
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
    console.log('=== HELP OTRS DEBUG END ===');
    return result;
});
