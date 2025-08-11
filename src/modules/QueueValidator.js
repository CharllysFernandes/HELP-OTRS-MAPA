/**
 * QueueValidator - Validação de Filas
 * 
 * Responsável por validar se a fila selecionada é compatível
 * com o tipo de atendimento escolhido.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function(global) {
    'use strict';

    class QueueValidator {
    constructor(configManager, alertSystem) {
        this.configManager = configManager;
        this.alertSystem = alertSystem;
    }

    /**
     * Verificar se é página de nota de ticket
     * @returns {boolean}
     */
    isTicketNotePage() {
        return document.URL.includes("AgentTicketNote");
    }

    /**
     * Verificar se é página de criação de ticket
     * @returns {boolean}
     */
    isTicketCreationPage() {
        return document.URL.includes("AgentTicketPhone");
    }

    /**
     * Verificar se é fila de técnico remoto/Nível 1
     * @returns {boolean}
     */
    isRemoteTechnicianQueue() {
        // Verificar se a fila selecionada é "Técnico Remoto" ou variações de Nível 1
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        if (destSelection) {
            const queueText = destSelection.textContent.trim();
            console.log('Help OTRS: Verificando fila para Técnico Remoto/Nível 1:', queueText);
            
            // Normalizar o nível da fila usando o ConfigManager
            const normalizedLevel = this.configManager.normalizeUserLevel(queueText);
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
            const normalizedLevel = this.configManager.normalizeUserLevel(queueText);
            console.log('Help OTRS: Nível normalizado (select):', normalizedLevel);
            
            return normalizedLevel === "Nível 1";
        }
        
        return false;
    }

    /**
     * Verificar se é fila de técnico local
     * @returns {boolean}
     */
    isLocalTechnicianQueue() {
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

    /**
     * Obter fila atual selecionada
     * @returns {string|null}
     */
    getCurrentQueue() {
        // Método 1: Verificar elemento de seleção visível (mais comum no OTRS moderno)
        const destSelection = document.querySelector("#Dest_Search")?.parentElement?.querySelector(".InputField_Selection .Text");
        if (destSelection && destSelection.textContent.trim()) {
            const queueText = destSelection.textContent.trim();
            console.log('Help OTRS: Fila detectada (método 1):', queueText);
            return queueText;
        }
        
        // Método 2: Verificar no select oculto
        const destSelect = document.querySelector("#Dest");
        if (destSelect && destSelect.selectedOptions.length > 0) {
            const queueText = destSelect.selectedOptions[0].textContent.trim();
            console.log('Help OTRS: Fila detectada (método 2):', queueText);
            return queueText;
        }
        
        // Método 3: Verificar campo de input diretamente
        const destInput = document.querySelector("#Dest_Search");
        if (destInput && destInput.value.trim()) {
            const queueText = destInput.value.trim();
            console.log('Help OTRS: Fila detectada (método 3):', queueText);
            return queueText;
        }
        
        // Método 4: Verificar por outros seletores comuns
        const alternatives = [
            'select[name="Dest"] option:checked',
            '#DestQueueID option:checked',
            '.QueueID option:checked'
        ];
        
        for (const selector of alternatives) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                const queueText = element.textContent.trim();
                console.log('Help OTRS: Fila detectada (método alternativo):', queueText);
                return queueText;
            }
        }
        
        console.log('Help OTRS: Nenhuma fila detectada');
        return null;
    }

    /**
     * Obter nível normalizado da fila atual
     * @returns {string|null}
     */
    getCurrentQueueLevel() {
        const queue = this.getCurrentQueue();
        if (queue) {
            return this.configManager.normalizeUserLevel(queue);
        }
        return null;
    }

    /**
     * Verificar se ticket está em atendimento
     * @returns {boolean}
     */
    isTicketInService() {
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

    /**
     * Verificar se é registro de requisições
     * @returns {boolean|null}
     */
    isRequestRecord() {
        const service = document.querySelector("#ServiceID_Search")?.nextSibling;

        if (!service) {
            return null;
        }

        return service.textContent === "Registro de Requisiçõesx";
    }

    /**
     * Verificar se serviço está vazio
     * @returns {boolean}
     */
    isServiceEmpty() {
        const element = document.querySelector("#ServiceID_Search")?.parentElement;
        return element ? element.children.length == 1 : true;
    }

    /**
     * Remover serviço selecionado
     */
    serviceRemover() {
        const service = document.querySelector("#ServiceID_Search")?.nextSibling?.children[1]?.firstChild;
        if (service) {
            service.click();
        }
    }

    /**
     * Verificar compatibilidade entre fila e perfil do usuário
     * @returns {Object}
     */
    validateQueueCompatibility() {
        const currentQueue = this.getCurrentQueue();
        const currentQueueLevel = this.getCurrentQueueLevel();
        const userProfile = this.configManager.getUserProfile();

        console.log('Help OTRS: Validando compatibilidade de fila:', {
            currentQueue,
            currentQueueLevel,
            userProfile
        });

        // Se não temos dados suficientes, não mostrar aviso
        if (!currentQueue || !userProfile) {
            console.log('Help OTRS: Dados insuficientes para validação - fila ou perfil não detectados');
            return {
                currentQueue: currentQueue || 'Não detectada',
                currentQueueLevel: currentQueueLevel || 'Não detectado',
                userProfile: userProfile || 'Não detectado',
                isCompatible: true, // Assumir compatível se não podemos validar
                shouldShowWarning: false
            };
        }

        const isCompatible = currentQueueLevel && userProfile && 
                            this.configManager.compareUserLevels(currentQueueLevel, userProfile);

        return {
            currentQueue,
            currentQueueLevel,
            userProfile,
            isCompatible,
            shouldShowWarning: !isCompatible && currentQueue && userProfile
        };
    }

    /**
     * Inicializar validações de fila
     */
    init() {
        if (!this.configManager.isFeatureEnabled('queueValidation')) {
            console.log('Help OTRS: Validação de fila desabilitada');
            return;
        }

        console.log('Help OTRS: Inicializando validador de filas');
        this.setupEventListeners();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Observar mudanças na seleção de fila
        const observer = new MutationObserver(() => {
            this.validateCurrentQueue();
        });

        // Observar mudanças no elemento de seleção
        const destElement = document.querySelector("#Dest_Search");
        if (destElement) {
            observer.observe(destElement.parentElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    /**
     * Validar fila atual
     */
    validateCurrentQueue() {
        const validation = this.validateQueueCompatibility();
        
        console.log('Help OTRS: Resultado da validação:', validation);
        
        // Só mostrar alerta de perfil e fila se há incompatibilidade
        if (validation.shouldShowWarning) {
            console.log('Help OTRS: Mostrando alerta - perfis incompatíveis');
            if (validation.currentQueue && validation.userProfile) {
                this.alertSystem?.showUserProfileAlert(validation.userProfile, validation.currentQueue);
            }
            
            // Mostrar alerta de validação completa
            if (this.alertSystem?.validateAndShowAlerts) {
                this.alertSystem.validateAndShowAlerts(this.configManager, this);
            }
            
            // Mostrar aviso de compatibilidade detalhado
            const alertId = 'queue-compatibility-warning';
            const message = `A fila selecionada "${validation.currentQueue}" pode não ser compatível com o perfil "${validation.userProfile}".`;
            
            this.alertSystem?.showQueueWarning(
                alertId,
                message,
                validation.currentQueue || 'Não identificada',
                validation.userProfile || 'Não identificado'
            );
        } else {
            console.log('Help OTRS: Perfis compatíveis - não mostrando alertas');
            // Remover alertas existentes se compatíveis
            this.alertSystem?.remove('user-profile-alert');
            this.alertSystem?.remove('service-type-queue-alert');
            this.alertSystem?.remove('queue-compatibility-warning');
        }
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.QueueValidator = QueueValidator;

})(window);
