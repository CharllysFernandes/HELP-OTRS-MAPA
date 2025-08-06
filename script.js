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
        
        // Mapeamento de sinônimos
        const levelMappings = {
            'Técnico Remoto': 'Nível 1',
            'Técnico Remotox': 'Nível 1',
            'técnico remoto': 'Nível 1',
            'tecnico remoto': 'Nível 1',
            'remoto': 'Nível 1',
            'nível 1': 'Nível 1',
            'nivel 1': 'Nível 1',
            'n1': 'Nível 1',
            'l1': 'Nível 1',
            'level 1': 'Nível 1',

            'Técnico Presencial': 'Nível 2',
            'Técnico Presencialx': 'Nível 2',            
            'técnico presencial': 'Nível 2',
            'tecnico presencial': 'Nível 2',
            'presencial': 'Nível 2',
            'nível 2': 'Nível 2',
            'nivel 2': 'Nível 2',
            'n2': 'Nível 2',
            'l2': 'Nível 2',
            'level 2': 'Nível 2',
            
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
    const elements = document.querySelectorAll(".InputField_Selection");
    if (elements.length < 4) return null;

    let level = elements[3].textContent.split(" -")[0];
    level = level.replace("l", "l ");
    
    // Normalizar o nível usando o ConfigManager
    return configManager.normalizeUserLevel(level);
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

                console.log('Help OTRS: Verificando níveis - Usuário:', userLevel, 'Atual:', currentLevel);

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
