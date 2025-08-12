/**
 * HELP OTRS MAPA - Background Script
 * 
 * Este script roda em background e gerencia:
 * - Configurações iniciais da extensão na instalação
 * - Comunicação com content scripts via mensagens
 * - Requisições cross-origin para sistemas OTRS
 * - Abertura da página de opções
 * 
 * Características principais:
 * - Não adiciona sistemas OTRS automaticamente (configuração manual)
 * - Notifica content scripts sobre mudanças de configuração
 * - Faz proxy de requisições para contornar CORS
 * - Trata diferentes tipos de erro HTTP de forma específica
 * 
 * @author CharllysFernandes
 * @version 2.0
 * @since 2024
 */

// Background script para gerenciar configurações
/**
 * Event listener para quando a extensão é instalada ou atualizada
 * Configura as configurações padrão apenas na primeira instalação
 * Não sobrescreve configurações existentes
 */
chrome.runtime.onInstalled.addListener(function() {
    // Configurar configurações padrão na primeira instalação
    chrome.storage.sync.get(['helpOtrsConfig'], function(result) {
        let needsUpdate = false;
        let config = result.helpOtrsConfig;
        
        if (!config) {
            // Primeira instalação - criar configuração vazia para forçar configuração manual
            config = {
                otrs_systems: [], // Array vazio - usuário deve configurar manualmente
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
            needsUpdate = true;
            console.log('Background: Configuração inicial criada - sistemas OTRS devem ser configurados manualmente');
        } else {
            // Para configurações existentes, não adicionar mais sistemas automaticamente
            // O usuário deve configurar através da interface de opções
            console.log('Background: Configuração existente carregada - sistemas:', config.otrs_systems?.length || 0);
        }
        
        if (needsUpdate) {
            chrome.storage.sync.set({ helpOtrsConfig: config }, function() {
                console.log('Background: Configuração inicial salva');
                
                // Se é uma instalação nova (sem sistemas), abrir página de opções
                if (!config.otrs_systems || config.otrs_systems.length === 0) {
                    console.log('Background: Abrindo página de configuração para primeira configuração');
                    chrome.runtime.openOptionsPage();
                }
                
                // Notificar todos os content scripts sobre a atualização de configuração
                chrome.tabs.query({}, function(tabs) {
                    let notifiedTabs = 0;
                    tabs.forEach(tab => {
                        // Tentar enviar mensagem para cada tab ativo
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'CONFIG_UPDATED',
                            config: config
                        }).then(() => {
                            notifiedTabs++;
                        }).catch((error) => {
                            // Log específico para tabs que não têm content script
                            console.log(`Background: Tab ${tab.id} (${tab.url}) não possui content script ativo`);
                        });
                    });
                    console.log(`Background: Tentativa de notificar ${tabs.length} tabs sobre atualização de configuração`);
                });
            });
        }
    });
});

/**
 * Listener unificado para mensagens dos content scripts
 * Gerencia diferentes tipos de requisições dos content scripts
 * 
 * @param {Object} request - Objeto da requisição contendo type e dados
 * @param {Object} sender - Informações sobre quem enviou a mensagem
 * @param {Function} sendResponse - Função para enviar resposta de volta
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Background: Mensagem recebida:', request.type, 'de:', sender.tab?.url || 'popup/options');
    
    // Configurações - Retorna a configuração atual para o content script
    if (request.type === 'GET_CONFIG') {
        chrome.storage.sync.get(['helpOtrsConfig'], function(result) {
            console.log('Background: Enviando configuração');
            sendResponse(result.helpOtrsConfig);
        });
        return true; // Indica que a resposta será assíncrona
    }
    
    // Fetch de perfis (requisições cross-origin)
    // Permite que content scripts façam requisições para sistemas OTRS externos
    if (request.type === 'FETCH_PROFILES') {
        // Validação básica da URL antes de fazer a requisição
        if (!request.url || !request.baseUrl) {
            console.error('Background: URL ou baseUrl não fornecidas');
            sendResponse({ success: false, error: 'URL inválida' });
            return true;
        }

        fetchProfiles(request.url, request.baseUrl)
            .then(response => {
                console.log('Background: Resposta preparada:', { 
                    success: response.success, 
                    dataLength: response.data?.length,
                    sender: sender.tab?.url || 'unknown'
                });
                sendResponse(response);
            })
            .catch(error => {
                console.error('Background: Erro no fetch:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Retorna true para indicar resposta assíncrona
    }
    
    // Caso não reconheça o tipo de mensagem
    console.log('Background: Tipo de mensagem não reconhecido:', request.type);
    sendResponse({ success: false, error: 'Tipo de mensagem não suportado' });
    return false;
});

/**
 * Abre a página de opções da extensão quando o ícone for clicado
 * Permite configuração manual dos sistemas OTRS
 */
chrome.action.onClicked.addListener(function(tab) {
    console.log('Background: Abrindo página de opções via clique no ícone');
    chrome.runtime.openOptionsPage();
});

/**
 * Realiza requisições HTTP para sistemas OTRS externos
 * Contorna limitações de CORS fazendo a requisição através do background script
 * 
 * @param {string} url - URL completa para fazer a requisição
 * @param {string} baseUrl - URL base do sistema OTRS (para logs e mensagens de erro)
 * @returns {Promise<{success: boolean, data?: string, error?: string}>} Resultado da requisição
 */
async function fetchProfiles(url, baseUrl) {
    console.log('Background: Iniciando fetch para:', url);
    console.log('Background: URL base:', baseUrl);
    
    // Validação básica de URL
    try {
        new URL(url);
    } catch (error) {
        console.error('Background: URL inválida:', url);
        return { success: false, error: `URL inválida: ${url}` };
    }
    
    try {
        // Configurar timeout para a requisição (30 segundos)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Importante para manter sessão do OTRS
            signal: controller.signal,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        clearTimeout(timeoutId); // Limpar o timeout se a requisição foi bem-sucedida

        console.log('Background: Status da resposta:', response.status);
        console.log('Background: Headers da resposta:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            // Tentar obter mais informações sobre o erro HTTP
            let errorText = '';
            try {
                errorText = await response.text();
                console.log('Background: Texto do erro (primeiros 200 chars):', errorText.substring(0, 200));
            } catch (e) {
                console.log('Background: Não foi possível ler o texto do erro');
            }
            
            // Tratamento específico para diferentes códigos de status HTTP
            if (response.status === 404) {
                throw new Error(`Página não encontrada (404). Verifique se a URL está correta: ${url}`);
            } else if (response.status === 403) {
                throw new Error(`Acesso negado (403). Faça login no sistema OTRS primeiro.`);
            } else if (response.status === 401) {
                throw new Error(`Não autorizado (401). Suas credenciais expiraram, faça login novamente.`);
            } else if (response.status >= 500) {
                throw new Error(`Erro do servidor (${response.status}). Tente novamente mais tarde.`);
            } else {
                throw new Error(`Erro na requisição (${response.status}). Verifique sua conexão e se você está logado no sistema.`);
            }
        }

        const text = await response.text();
        console.log('Background: Conteúdo recebido, tamanho:', text.length);
        console.log('Background: Primeiros 300 caracteres:', text.substring(0, 300));
        
        // Verificar se foi redirecionado para página de login
        if (text.includes('name="login"') || text.includes('LoginBox') || 
            (text.includes('Login') && text.includes('Password'))) {
            console.log('Background: Página de login detectada - usuário não está autenticado');
            throw new Error('Redirecionado para página de login. Faça login no sistema OTRS primeiro.');
        }
        
        // Verificar se é realmente uma página válida do OTRS
        const isOtrsPage = text.includes('OTRS') || text.includes('index.pl') || text.includes('AgentPreferences');
        if (!isOtrsPage) {
            console.log('Background: Página não parece ser do OTRS');
            console.log('Background: Verificações - OTRS:', text.includes('OTRS'), 
                       'index.pl:', text.includes('index.pl'), 
                       'AgentPreferences:', text.includes('AgentPreferences'));
            // Não é um erro fatal, mas é bom saber
        }

        console.log('Background: Requisição bem-sucedida para:', baseUrl);
        return { success: true, data: text };
        
    } catch (error) {
        console.error('Background: Erro detalhado na requisição:', error);
        
        // Tratamento específico para diferentes tipos de erro
        if (error.name === 'AbortError') {
            return { success: false, error: `Timeout na requisição para ${baseUrl}. O servidor demorou muito para responder.` };
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, error: `Erro de rede: Não foi possível conectar ao servidor ${baseUrl}. Verifique sua conexão e se o servidor está acessível.` };
        } else if (error.message.includes('CORS')) {
            return { success: false, error: `Erro de CORS: O servidor não permite requisições da extensão. Contate o administrador do sistema.` };
        } else {
            return { success: false, error: error.message };
        }
    }
}
