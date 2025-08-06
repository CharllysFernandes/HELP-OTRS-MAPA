// Background script para gerenciar configurações
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
                    queueValidation: true
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
                
                // Notificar todos os content scripts sobre a atualização
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'CONFIG_UPDATED',
                            config: config
                        }).catch(() => {
                            // Ignorar erros de tabs que não tem content script
                        });
                    });
                });
            });
        }
    });
});

// Listener para mensagens dos content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'GET_CONFIG') {
        chrome.storage.sync.get(['helpOtrsConfig'], function(result) {
            sendResponse(result.helpOtrsConfig);
        });
        return true; // Indica que a resposta será assíncrona
    }
});

// Abrir página de opções quando o ícone da extensão for clicado
chrome.action.onClicked.addListener(function(tab) {
    chrome.runtime.openOptionsPage();
});

// Background script para lidar com requisições cross-origin

// Função para gerenciar permissões dinâmicas
async function requestPermissionsForUrl(url) {
    try {
        const urlObj = new URL(url);
        const origin = `${urlObj.protocol}//${urlObj.hostname}`;
        const permissions = [origin + '/*'];
        
        console.log('Background: Solicitando permissões para:', permissions);
        
        const granted = await chrome.permissions.request({
            origins: permissions
        });
        
        if (granted) {
            console.log('Background: Permissões concedidas para:', origin);
            
            // Registrar content script dinamicamente para esta origem
            try {
                await chrome.scripting.registerContentScripts([{
                    id: `otrs-${urlObj.hostname.replace(/\./g, '-')}`,
                    matches: [origin + '/otrs/*'],
                    js: ['script.js'],
                    runAt: 'document_end'
                }]);
                console.log('Background: Content script registrado para:', origin);
            } catch (error) {
                console.log('Background: Content script já registrado ou erro:', error.message);
            }
        }
        
        return granted;
    } catch (error) {
        console.error('Background: Erro ao solicitar permissões:', error);
        return false;
    }
}

// Função para verificar permissões existentes
async function checkPermissionsForUrl(url) {
    try {
        const urlObj = new URL(url);
        const origin = `${urlObj.protocol}//${urlObj.hostname}`;
        
        const hasPermission = await chrome.permissions.contains({
            origins: [origin + '/*']
        });
        
        console.log('Background: Permissão para', origin, ':', hasPermission);
        return hasPermission;
    } catch (error) {
        console.error('Background: Erro ao verificar permissões:', error);
        return false;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background: Mensagem recebida:', request);
    
    if (request.type === 'REQUEST_PERMISSIONS') {
        requestPermissionsForUrl(request.url)
            .then(granted => {
                sendResponse({ success: granted });
            })
            .catch(error => {
                console.error('Background: Erro ao solicitar permissões:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    
    if (request.type === 'CHECK_PERMISSIONS') {
        checkPermissionsForUrl(request.url)
            .then(hasPermission => {
                sendResponse({ hasPermission });
            })
            .catch(error => {
                console.error('Background: Erro ao verificar permissões:', error);
                sendResponse({ hasPermission: false, error: error.message });
            });
        return true;
    }
    
    if (request.type === 'FETCH_PROFILES') {
        fetchProfiles(request.url, request.baseUrl)
            .then(response => {
                console.log('Background: Resposta preparada:', { success: response.success, dataLength: response.data?.length });
                sendResponse(response);
            })
            .catch(error => {
                console.error('Background: Erro:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        // Retorna true para indicar resposta assíncrona
        return true;
    }
});

async function fetchProfiles(url, baseUrl) {
    console.log('Background: Iniciando fetch para:', url);
    console.log('Background: URL base:', baseUrl);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('Background: Status da resposta:', response.status);
        console.log('Background: Headers da resposta:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            // Tentar obter mais informações sobre o erro
            let errorText = '';
            try {
                errorText = await response.text();
                console.log('Background: Texto do erro (primeiros 200 chars):', errorText.substring(0, 200));
            } catch (e) {
                console.log('Background: Não foi possível ler o texto do erro');
            }
            
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
        
        // Verificar se é uma página de login (redirecionamento)
        if (text.includes('name="login"') || text.includes('LoginBox') || text.includes('Login') && text.includes('Password')) {
            console.log('Background: Página de login detectada');
            throw new Error('Redirecionado para página de login. Faça login no sistema OTRS primeiro.');
        }
        
        // Verificar se é realmente uma página OTRS
        if (!text.includes('OTRS') && !text.includes('index.pl') && !text.includes('AgentPreferences')) {
            console.log('Background: Página não parece ser do OTRS');
            console.log('Background: Verificações - OTRS:', text.includes('OTRS'), 'index.pl:', text.includes('index.pl'), 'AgentPreferences:', text.includes('AgentPreferences'));
        }

        return { success: true, data: text };
        
    } catch (error) {
        console.error('Background: Erro detalhado:', error);
        
        // Melhorar mensagens de erro baseadas no tipo
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, error: `Erro de rede: Não foi possível conectar ao servidor ${baseUrl}. Verifique sua conexão e se o servidor está acessível.` };
        } else if (error.message.includes('CORS')) {
            return { success: false, error: `Erro de CORS: O servidor não permite requisições da extensão. Contate o administrador do sistema.` };
        } else {
            return { success: false, error: error.message };
        }
    }
}
