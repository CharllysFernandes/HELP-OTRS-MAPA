/**
 * ServiceTypeValidator - Validação de Tipos de Atendimento
 * 
 * Responsável por validar se o tipo de atendimento selecionado
 * é compatível com a fila escolhida.
 * 
 * @author Help OTRS Team
 * @version 2.2.0
 */

(function(global) {
    'use strict';

    class ServiceTypeValidator {
    constructor(configManager, alertSystem) {
        this.configManager = configManager;
        this.alertSystem = alertSystem;
        this.alertIds = {
            typeOfService: 'TypeOfServiceAlert',
            localTechnician: 'LocalTechnicianAlert',
            remoteTechnician: 'RemoteTechnicianAlert',
            serviceClassification: 'ServiceClassificationAlert'
        };
    }

    /**
     * Verificar se tipo de atendimento não está vazio
     * @returns {boolean}
     */
    isTypeOfServiceNotEmpty() {
        const element = document.querySelector("#DynamicField_PRITipoAtendimento_Search")?.nextElementSibling?.firstChild;
        if (!element) return false;
        
        console.log('Tipo de atendimento atual:', element.textContent);
        return element.textContent === "Presencial" || element.textContent === "Remoto";
    }

    /**
     * Verificar se tipo de atendimento é Remoto
     * @returns {boolean}
     */
    isTypeOfServiceRemoto() {
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

    /**
     * Verificar se tipo de atendimento é Presencial
     * @returns {boolean}
     */
    isTypeOfServicePresencial() {
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

    /**
     * Obter tipo de atendimento atual
     * @returns {string|null}
     */
    getCurrentServiceType() {
        // Verificar select
        const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
        if (serviceSelect && serviceSelect.value) {
            return serviceSelect.value === "P" ? "Presencial" : 
                   serviceSelect.value === "R" ? "Remoto" : serviceSelect.value;
        }
        
        // Verificar campo visível
        const serviceSearch = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
        if (serviceSearch && serviceSearch.nextElementSibling) {
            return serviceSearch.nextElementSibling.textContent?.trim();
        }
        
        return null;
    }

    /**
     * Adicionar alerta geral para tipo de atendimento
     */
    addTypeOfServiceAlert() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;
        if (this.alertSystem.exists(this.alertIds.typeOfService)) return;

        this.alertSystem.showServiceTypeQueueAlert(
            'Erro: Tipo de Atendimento',
            '⚠️ Garanta que o tipo de atendimento seja adequado ao serviço oferecido.',
            'error',
            this.alertIds.typeOfService
        );
    }

    /**
     * Adicionar alerta para técnico local
     */
    addLocalTechnicianAlert() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;
        if (this.alertSystem.exists(this.alertIds.localTechnician)) return;

        this.alertSystem.showServiceTypeQueueAlert(
            'Erro: Incompatibilidade Fila x Tipo de Atendimento',
            '⚠️ Para fila de <strong>Técnico Local</strong>, o tipo de atendimento deve ser <strong>Presencial</strong>.',
            'error',
            this.alertIds.localTechnician
        );
    }

    /**
     * Adicionar alerta para técnico remoto
     */
    addRemoteTechnicianAlert() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;
        if (this.alertSystem.exists(this.alertIds.remoteTechnician)) return;

        this.alertSystem.showServiceTypeQueueAlert(
            'Erro: Incompatibilidade Fila x Tipo de Atendimento',
            '⚠️ Para fila de <strong>Técnico Remoto</strong>, o tipo de atendimento deve ser <strong>Remoto</strong>.',
            'error',
            this.alertIds.remoteTechnician
        );
    }

    /**
     * Adicionar alerta para fila presencial com tipo remoto
     */
    addPresentialQueueRemoteTypeAlert() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;
        if (this.alertSystem.exists(this.alertIds.remoteTechnician)) return;

        this.alertSystem.showServiceTypeQueueAlert(
            'Erro: Incompatibilidade Fila x Tipo de Atendimento',
            '⚠️ A fila selecionada é <strong>presencial</strong>, mas o tipo de atendimento está marcado como <strong>Remoto</strong>. Altere para <strong>Presencial</strong>.',
            'error',
            this.alertIds.remoteTechnician
        );
    }

    /**
     * Adicionar alerta para classificação de serviço
     */
    addServiceClassificationAlert() {
        if (!this.configManager.isFeatureEnabled('serviceClassificationAlerts')) return;
        if (this.alertSystem.exists(this.alertIds.serviceClassification)) return;

        this.alertSystem.showServiceTypeQueueAlert(
            'Erro: Classificação de Serviço',
            '⚠️ Garanta que a classificação do serviço seja adequada ao atendimento.',
            'error',
            this.alertIds.serviceClassification
        );
    }

    /**
     * Validar técnico local
     */
    validateLocalTechnician() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

        // TODO: Importar QueueValidator quando estiver disponível
        // const isLocalQueue = queueValidator.isLocalTechnicianQueue();
        const isLocalQueue = false; // Placeholder
        const isPresencial = this.isTypeOfServicePresencial();
        const alertExists = this.alertSystem.exists(this.alertIds.localTechnician);
        
        console.log('Help OTRS: Validação Técnico Local:', {
            isLocalQueue,
            isPresencial,
            alertExists
        });
        
        if (isLocalQueue && !isPresencial) {
            // Fila é Técnico Local mas tipo não é Presencial - mostrar alerta
            if (!alertExists) {
                this.addLocalTechnicianAlert();
            }
        } else if (alertExists) {
            // Condições não se aplicam mais - remover alerta
            this.alertSystem.removeAlert(this.alertIds.localTechnician);
        }
    }

    /**
     * Validar técnico remoto - casos de incompatibilidade entre fila e tipo
     */
    validateRemoteTechnician() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

        // TODO: Importar QueueValidator quando estiver disponível
        // const isRemoteQueue = queueValidator.isRemoteTechnicianQueue();
        
        // Detecção temporária da fila remota
        const queueSelect = document.querySelector('#Dest');
        let isRemoteQueue = false;
        
        if (queueSelect) {
            const selectedOption = queueSelect.options[queueSelect.selectedIndex];
            const queueText = selectedOption ? selectedOption.text : '';
            console.log('Help OTRS: Fila selecionada:', queueText);
            
            // Verificar se é uma fila de técnico remoto/nível 1
            isRemoteQueue = queueText.toLowerCase().includes('técnico remoto') || 
                           queueText.toLowerCase().includes('nível 1') ||
                           queueText.toLowerCase().includes('nivel 1') ||
                           queueText.toLowerCase().includes('remoto');
        }
        
        const isRemoto = this.isTypeOfServiceRemoto();
        const alertExists = this.alertSystem.exists(this.alertIds.remoteTechnician);
        
        console.log('Help OTRS: Validação Técnico Remoto/Nível 1:', {
            isRemoteQueue,
            isRemoto,
            alertExists,
            queueText: queueSelect ? queueSelect.options[queueSelect.selectedIndex]?.text : 'N/A'
        });
        
        // CENÁRIO 1: Fila REMOTA mas tipo PRESENCIAL
        // CENÁRIO 2: Fila PRESENCIAL mas tipo REMOTO (o caso do usuário anterior)
        const hasIncompatibility = (isRemoteQueue && !isRemoto) || (!isRemoteQueue && isRemoto);
        
        if (hasIncompatibility) {
            if (!alertExists) {
                // Determinar mensagem baseada no cenário
                if (isRemoteQueue && !isRemoto) {
                    // Cenário 1: Fila remota com tipo presencial
                    this.addRemoteTechnicianAlert();
                } else if (!isRemoteQueue && isRemoto) {
                    // Cenário 2: Fila presencial com tipo remoto
                    this.addPresentialQueueRemoteTypeAlert();
                }
            }
        } else if (alertExists) {
            // Não há mais incompatibilidade - remover alerta
            this.alertSystem.removeAlert(this.alertIds.remoteTechnician);
        }
    }

    /**
     * Validar tipo de serviço para fila
     */
    validateServiceTypeForQueue() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts')) return;

        // Validar ambos os casos
        this.validateLocalTechnician();
        this.validateRemoteTechnician();
    }

    /**
     * Validar classificação de serviço
     */
    validateServiceClassification() {
        if (!this.configManager.isFeatureEnabled('serviceClassificationAlerts')) return;

        // TODO: Implementar lógica específica de classificação
        const needsAlert = false; // Placeholder
        
        if (needsAlert) {
            this.addServiceClassificationAlert();
        }
    }

    /**
     * Executar todas as validações
     */
    validateAll() {
        this.validateServiceTypeForQueue();
        this.validateServiceClassification();
    }

    /**
     * Inicializar validador
     */
    init() {
        if (!this.configManager.isFeatureEnabled('typeOfServiceAlerts') && 
            !this.configManager.isFeatureEnabled('serviceClassificationAlerts')) {
            console.log('Help OTRS: Validações de tipo de serviço desabilitadas');
            return;
        }

        console.log('Help OTRS: Inicializando validador de tipos de atendimento');
        this.setupEventListeners();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Observar mudanças no campo de tipo de atendimento
        const serviceField = document.querySelector("#DynamicField_PRITipoAtendimento_Search");
        if (serviceField) {
            const observer = new MutationObserver(() => {
                setTimeout(() => this.validateAll(), 100);
            });

            observer.observe(serviceField.parentElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        // Observar mudanças no select oculto
        const serviceSelect = document.querySelector("#DynamicField_PRITipoAtendimento");
        if (serviceSelect) {
            serviceSelect.addEventListener('change', () => {
                setTimeout(() => this.validateAll(), 100);
            });
        }
    }

    /**
     * Limpar todos os alertas
     */
    clearAllAlerts() {
        Object.values(this.alertIds).forEach(alertId => {
            this.alertSystem.removeAlert(alertId);
        });
    }

    /**
     * Obter status das validações
     * @returns {Object}
     */
    getValidationStatus() {
        return {
            currentServiceType: this.getCurrentServiceType(),
            isPresencial: this.isTypeOfServicePresencial(),
            isRemoto: this.isTypeOfServiceRemoto(),
            alerts: {
                typeOfService: this.alertSystem.exists(this.alertIds.typeOfService),
                localTechnician: this.alertSystem.exists(this.alertIds.localTechnician),
                remoteTechnician: this.alertSystem.exists(this.alertIds.remoteTechnician),
                serviceClassification: this.alertSystem.exists(this.alertIds.serviceClassification)
            }
        };
    }
}

// Disponibilizar globalmente
global.HelpOTRS = global.HelpOTRS || {};
global.HelpOTRS.ServiceTypeValidator = ServiceTypeValidator;

})(window);
