/**
 * DebugHelper - Ferramenta de Debug e Testes
 * 
 * Fornece funções de debug, teste e diagnóstico para
 * desenvolvimento e troubleshooting da extensão Help OTRS.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function(global) {
    'use strict';

    class DebugHelper {
    constructor(configManager) {
        this.configManager = configManager;
        this.setupGlobalDebugInterface();
    }

    /**
     * Configurar interface de debug global
     */
    setupGlobalDebugInterface() {
        window.helpOtrsDebug = {
            testUrlDetection: (url) => this.configManager.debugUrlDetection(url),
            getCurrentConfig: () => this.configManager.config,
            getCurrentSystem: () => this.configManager.currentOtrsSystem,
            forceReload: async () => {
                await this.configManager.loadConfig();
                console.log('Configuração recarregada:', this.configManager.config);
                return this.configManager.currentOtrsSystem;
            },
            testCurrentUrl: () => this.testCurrentUrl(),
            reinitialize: async () => this.reinitializeExtension(),
            testLevelNormalization: (level) => this.testLevelNormalization(level),
            compareLevels: (level1, level2) => this.compareLevels(level1, level2),
            debugCurrentLevel: () => this.debugCurrentLevel(),
            testLocalTechnicianValidation: () => this.testLocalTechnicianValidation(),
            testRemoteTechnicianValidation: () => this.testRemoteTechnicianValidation(),
            testAllServiceTypeValidation: () => this.testAllServiceTypeValidation(),
            forceValidateLocalTechnician: () => this.forceValidateLocalTechnician(),
            forceValidateServiceType: () => this.forceValidateServiceType(),
            getVersion: () => this.getVersion(),
            getStats: () => this.getStats()
        };
    }

    /**
     * Testar detecção da URL atual
     * @returns {boolean}
     */
    testCurrentUrl() {
        console.log('=== TESTE MANUAL DA URL ATUAL ===');
        console.log('URL:', window.location.href);
        console.log('Config atual:', this.configManager.config);
        const result = this.configManager.debugUrlDetection();
        console.log('Resultado:', result ? '✅ DETECTADO' : '❌ NÃO DETECTADO');
        return result;
    }

    /**
     * Reinicializar extensão
     * @returns {Promise<boolean>}
     */
    async reinitializeExtension() {
        console.log('🔄 Reinicializando extensão...');
        await this.configManager.loadConfig();
        // TODO: Chamar função init() quando estiver disponível
        console.log('Reinicialização completa');
        return true;
    }

    /**
     * Testar normalização de níveis
     * @param {string} level
     * @returns {string}
     */
    testLevelNormalization(level) {
        console.log('=== TESTE DE NORMALIZAÇÃO DE NÍVEIS ===');
        console.log('Nível original:', level);
        const normalized = this.configManager.normalizeUserLevel(level);
        console.log('Nível normalizado:', normalized);
        return normalized;
    }

    /**
     * Comparar níveis
     * @param {string} level1
     * @param {string} level2
     * @returns {boolean}
     */
    compareLevels(level1, level2) {
        console.log('=== TESTE DE COMPARAÇÃO DE NÍVEIS ===');
        console.log('Nível 1:', level1);
        console.log('Nível 2:', level2);
        const result = this.configManager.compareUserLevels(level1, level2);
        console.log('São iguais?', result ? '✅ SIM' : '❌ NÃO');
        return result;
    }

    /**
     * Debug do nível atual
     * @returns {string}
     */
    debugCurrentLevel() {
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
        
        // TODO: Resultado final quando função getCurrentLevel() estiver disponível
        // const currentLevel = getCurrentLevel();
        // console.log('Nível final capturado:', currentLevel);
        
        return destSelection?.textContent || 'N/A';
    }

    /**
     * Teste de validação técnico local
     * @returns {Object}
     */
    testLocalTechnicianValidation() {
        console.log('=== TESTE DE VALIDAÇÃO TÉCNICO LOCAL ===');
        console.log('URL atual:', window.location.href);
        
        // TODO: Implementar quando funções de validação estiverem disponíveis
        const isLocalQueue = false; // isLocalTechnicianQueue()
        const isPresencial = false; // isTypeOfServicePresencial()
        const alertExists = false; // isLocalTechnicianAlertAdded()
        
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
    }

    /**
     * Teste de validação técnico remoto
     * @returns {Object}
     */
    testRemoteTechnicianValidation() {
        console.log('=== TESTE DE VALIDAÇÃO TÉCNICO REMOTO/NÍVEL 1 ===');
        console.log('URL atual:', window.location.href);
        
        // TODO: Implementar quando funções de validação estiverem disponíveis
        const isRemoteQueue = false; // isRemoteTechnicianQueue()
        const isRemoto = false; // isTypeOfServiceRemoto()
        const alertExists = false; // isRemoteTechnicianAlertAdded()
        
        console.log('Fila é Técnico Remoto/Nível 1:', isRemoteQueue ? '✅ SIM' : '❌ NÃO');
        console.log('Tipo é Remoto:', isRemoto ? '✅ SIM' : '❌ NÃO');
        console.log('Alerta existe:', alertExists ? '✅ SIM' : '❌ NÃO');
        
        // Elementos de debug
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        console.log('Texto da fila selecionada:', destSelection?.textContent);
        if (destSelection) {
            const normalizedLevel = this.configManager.normalizeUserLevel(destSelection.textContent.trim());
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
    }

    /**
     * Teste completo de validação
     * @returns {Object}
     */
    testAllServiceTypeValidation() {
        console.log('=== TESTE COMPLETO DE VALIDAÇÃO DE TIPO DE ATENDIMENTO ===');
        const localTest = this.testLocalTechnicianValidation();
        const remoteTest = this.testRemoteTechnicianValidation();
        
        return {
            local: localTest,
            remote: remoteTest
        };
    }

    /**
     * Forçar validação de técnico local
     * @returns {Object}
     */
    forceValidateLocalTechnician() {
        console.log('🔄 Forçando validação de Técnico Local...');
        // TODO: validateLocalTechnicianServiceType();
        return this.testLocalTechnicianValidation();
    }

    /**
     * Forçar validação de tipo de serviço
     * @returns {Object}
     */
    forceValidateServiceType() {
        console.log('🔄 Forçando validação completa de tipo de atendimento...');
        // TODO: validateServiceTypeForQueue();
        return this.testAllServiceTypeValidation();
    }

    /**
     * Obter informações da versão
     * @returns {Object}
     */
    getVersion() {
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

    /**
     * Obter estatísticas de debug
     * @returns {Object}
     */
    getStats() {
        return {
            version: this.getVersion(),
            config: this.configManager.getStats(),
            url: window.location.href,
            hostname: window.location.hostname,
            pathname: window.location.pathname,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Log estruturado para debug
     * @param {string} level - Nível do log (info, warn, error)
     * @param {string} message - Mensagem
     * @param {Object} data - Dados adicionais
     */
    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] Help OTRS Debug: ${message}`;
        
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
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.DebugHelper = DebugHelper;

})(window);
