/**
 * Main Application Entry Point - Help OTRS Extension
 * 
 * Orquestra todos os módulos da extensão e controla o fluxo principal de execução.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function() {
    'use strict';

    // Aguardar carregamento de todos os módulos
    function waitForModules() {
        return new Promise((resolve) => {
            const checkModules = () => {
                if (window.HelpOTRS && 
                    window.HelpOTRS.ConfigManager &&
                    window.HelpOTRS.DebugHelper &&
                    window.HelpOTRS.FormDataReuser &&
                    window.HelpOTRS.QueueValidator &&
                    window.HelpOTRS.ServiceTypeValidator &&
                    window.HelpOTRS.ClassificationValidator) {
                    resolve();
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            checkModules();
        });
    }

    /**
     * Classe principal da aplicação
     */
    class HelpOtrsApp {
    constructor() {
        this.configManager = null;
        this.formDataReuser = null;
        this.debugHelper = null;
        this.queueValidator = null;
        this.serviceTypeValidator = null;
        this.classificationValidator = null;
        this.initialized = false;
    }

    /**
     * Aguardar tempo especificado
     * @param {number} ms - Milissegundos para aguardar
     * @returns {Promise<void>}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verificar se é uma página de criação de ticket
     * @returns {boolean}
     */
    isTicketCreationPage() {
        const url = window.location.href;
        return url.includes('Action=AgentTicketPhone') || 
               url.includes('Action=AgentTicketEmail') || 
               url.includes('Action=CustomerTicketMessage') ||
               url.includes('/ticket/create') ||
               url.includes('/new-ticket');
    }

    /**
     * Verificar se é uma página de nota de ticket
     * @returns {boolean}
     */
    isTicketNotePage() {
        const url = window.location.href;
        return url.includes('Action=AgentTicketNote') || 
               url.includes('/ticket/') && url.includes('/note');
    }

    /**
     * Verificar se é uma página de zoom de ticket
     * @returns {boolean}
     */
    isTicketZoomPage() {
        const url = window.location.href;
        return url.includes('Action=AgentTicketZoom') || 
               url.includes('/ticket/zoom');
    }

    /**
     * Verificar se o usuário é o proprietário do ticket
     * @returns {boolean}
     */
    isOwner() {
        // TODO: Implementar lógica específica baseada no DOM
        return true; // Placeholder
    }

    /**
     * Verificar se o ticket está em atendimento
     * @returns {boolean}
     */
    isTicketInService() {
        // TODO: Implementar lógica específica baseada no DOM
        return true; // Placeholder
    }

    /**
     * Inicializar todos os módulos
     * @returns {Promise<void>}
     */
    async initializeModules() {
        console.log('Help OTRS: Inicializando módulos...');

        // Inicializar ConfigManager primeiro (dependência de todos os outros)
        this.configManager = new window.HelpOTRS.ConfigManager();
        await this.configManager.loadConfig();

        // Inicializar DebugHelper (para debug e testes)
        this.debugHelper = new window.HelpOTRS.DebugHelper(this.configManager);
        
        // Inicializar sistema de alertas
        this.alertSystem = new window.HelpOTRS.AlertSystem();
        
        // Sistema de alertas simples para injeção de dependência
        const alertSystem = this.alertSystem;

        // Inicializar validadores
        this.queueValidator = new window.HelpOTRS.QueueValidator(this.configManager, alertSystem);
        this.serviceTypeValidator = new window.HelpOTRS.ServiceTypeValidator(this.configManager, alertSystem);
        
        // Inicializar classificação validator
        this.classificationValidator = new window.HelpOTRS.ClassificationValidator();
        this.classificationValidator.init(alertSystem);

        // Inicializar reaproveitador de dados
        this.formDataReuser = new window.HelpOTRS.FormDataReuser(this.configManager, alertSystem);

        // Configurar interface global de debug
        this.debugHelper.setupGlobalDebugInterface();

        console.log('Help OTRS: Módulos inicializados com sucesso');
    }

    /**
     * Executar validações baseadas no tipo de página
     * @returns {Promise<void>}
     */
    async executePageSpecificLogic() {
        const userProfile = this.configManager.getUserProfile();
        console.log('Help OTRS: Perfil do usuário:', userProfile);

        if (this.isTicketCreationPage()) {
            console.log('Help OTRS: Página de criação de ticket detectada');
            
            // Inicializar validadores para página de criação
            this.queueValidator.init();
            this.serviceTypeValidator.init();
            
            // Fazer validação inicial com delay
            setTimeout(() => {
                this.serviceTypeValidator.validateServiceTypeForQueue();
            }, 1000);
        }

        if (this.isTicketNotePage()) {
            console.log('Help OTRS: Página de nota de ticket detectada');
            
            // Inicializar observadores específicos para notas
            this.serviceTypeValidator.init();
        }

        if (this.isTicketZoomPage() && this.isOwner() && this.isTicketInService()) {
            console.log('Help OTRS: Página de zoom de ticket detectada');
            
            // Inicializar validação de fila
            this.queueValidator.init();
        }
        
        // Inicializar reaproveitamento de dados do formulário (se habilitado)
        if (this.configManager.isFeatureEnabled('formDataReuser')) {
            setTimeout(() => {
                this.formDataReuser.init();
            }, 1000);
        }
    }

    /**
     * Configurar listener para atualizações de configuração
     */
    setupConfigurationListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'CONFIG_UPDATED') {
                this.configManager.config = request.config;
                this.configManager.detectCurrentOtrsSystem();
                console.log('Help OTRS: Configuração atualizada');
                
                // Recarregar a página para aplicar novas configurações
                if (this.configManager.isExtensionEnabledForCurrentSite()) {
                    location.reload();
                }
                
                // Importante: retornar false para indicar resposta síncrona
                return false;
            }
            
            // Se não reconheceu a mensagem, retornar false
            return false;
        });
    }

    /**
     * Função principal de inicialização
     * @returns {Promise<boolean>}
     */
    async init() {
        if (this.initialized) {
            console.log('Help OTRS: Aplicação já foi inicializada');
            return true;
        }

        console.log('=== HELP OTRS INIT START ===');
        
        try {
            // Inicializar módulos
            await this.initializeModules();
            
            console.log('Help OTRS: Verificando se extensão está habilitada...');
            console.log('Help OTRS: Configuração carregada:', this.configManager.config);
            console.log('Help OTRS: Sistema atual detectado:', this.configManager.currentOtrsSystem);
            console.log('Help OTRS: URL atual:', window.location.href);
            
            // Verificar se há sistemas configurados
            if (!this.configManager.config || !this.configManager.config.otrs_systems || this.configManager.config.otrs_systems.length === 0) {
                console.log('🔧 Help OTRS: Nenhum sistema OTRS configurado!');
                console.log('📝 Help OTRS: Para usar a extensão, acesse as configurações e adicione pelo menos um sistema OTRS.');
                console.log('⚙️ Help OTRS: Clique no ícone da extensão na barra de ferramentas para abrir as configurações.');
                console.log('=== HELP OTRS INIT END (NO SYSTEMS CONFIGURED) ===');
                return false;
            }
            
            // Verificar se a extensão está habilitada para este site
            if (!this.configManager.isExtensionEnabledForCurrentSite()) {
                console.log('❌ Help OTRS: Extensão desabilitada para este site');
                console.log('Help OTRS: Sistemas configurados:', this.configManager.config?.otrs_systems?.map(s => ({
                    name: s.name,
                    enabled: s.enabled,
                    baseUrl: s.baseUrl,
                    hostname: s.baseUrl ? new URL(s.baseUrl).hostname : 'URL inválida'
                })));
                console.log('💡 Help OTRS: Para habilitar neste site, adicione um sistema OTRS com o hostname:', new URL(window.location.href).hostname);
                console.log('=== HELP OTRS INIT END (DISABLED) ===');
                return false;
            }

            console.log('✅ Help OTRS: Extensão HABILITADA! Iniciando para', this.configManager.currentOtrsSystem.name);

            // Executar lógica específica da página
            await this.executePageSpecificLogic();
            
            // Configurar listener de configuração
            this.setupConfigurationListener();
            
            this.initialized = true;
            console.log('✅ Help OTRS: Inicialização concluída com sucesso');
            console.log('=== HELP OTRS INIT END (SUCCESS) ===');
            return true;

        } catch (error) {
            console.error('❌ Help OTRS: Erro durante inicialização:', error);
            console.log('=== HELP OTRS INIT END (ERROR) ===');
            return false;
        }
    }

    /**
     * Limpar recursos da aplicação
     */
    destroy() {
        if (this.formDataReuser) {
            this.formDataReuser.destroy();
        }
        
        if (this.queueValidator) {
            this.queueValidator.destroy?.();
        }
        
        if (this.serviceTypeValidator) {
            this.serviceTypeValidator.destroy?.();
        }
        
        if (this.classificationValidator) {
            this.classificationValidator.dispose?.();
        }
        
        this.initialized = false;
        console.log('Help OTRS: Recursos limpos');
    }

    /**
     * Obter informações da aplicação
     * @returns {Object}
     */
    getAppInfo() {
        const manifest = chrome.runtime.getManifest();
        return {
            name: manifest.name,
            version: manifest.version,
            versionName: manifest.version_name || 'Build padrão',
            author: manifest.author,
            manifestVersion: manifest.manifest_version,
            initialized: this.initialized,
            currentSystem: this.configManager?.currentOtrsSystem?.name || 'Nenhum',
            userProfile: this.configManager?.getUserProfile() || 'Desconhecido'
        };
    }
}

// Instância global da aplicação
const helpOtrsApp = new HelpOtrsApp();

    // Event listener principal
    window.addEventListener("load", async function () {
        console.log('Help OTRS: Aguardando carregamento de módulos...');
        await waitForModules();
        
        // Obter informações da extensão
        const appInfo = helpOtrsApp.getAppInfo();    console.log('=== HELP OTRS DEBUG START ===');
    console.log(`📦 Help OTRS - MAPA v${appInfo.version} (${appInfo.versionName})`);
    console.log(`👥 Desenvolvido por: ${appInfo.author}`);
    console.log(`📅 Manifest Version: ${appInfo.manifestVersion}`);
    console.log('Help OTRS: Window load event disparado');
    console.log('Help OTRS: URL:', window.location.href);
    console.log('Help OTRS: Hostname:', window.location.hostname);
    console.log('Help OTRS: Protocol:', window.location.protocol);
    console.log('Help OTRS: Pathname:', window.location.pathname);
    console.log('Help OTRS: Search:', window.location.search);
    
    // Aguardar delay configurável (será carregado na inicialização)
    console.log('Help OTRS: Aguardando delay padrão de 1000ms');
    await helpOtrsApp.delay(1000);

    console.log('Help OTRS: Chamando init()');
    const result = await helpOtrsApp.init();
    console.log(`=== HELP OTRS DEBUG END v${appInfo.version} ===`);
    return result;
});

    // Disponibilizar globalmente
    window.HelpOtrsApp = helpOtrsApp;

})();
