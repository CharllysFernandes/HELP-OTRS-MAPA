// Configurações padrão
const DEFAULT_CONFIG = {
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

// Variáveis globais
let currentConfig = {};
let availableProfiles = [];
let editingSystemId = null;

// Inic    profileSelect.innerHTML = `
       // <option value="">Selecione um perfil</option>
       // <option value="Cliente">Cliente</option>
      //  <option value="CSC">CSC</option>
      //  <option value="Nível 1">Nível 1</option>
      //  <option value="técnico remoto">Técnico Remoto</option>
      //  <option value="Nível 2">Nível 2</option>
    //    <option value="técnico presencial">Técnico Presencial</option>
    //    <option value="Nível 3">Nível 3</option>
    
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando...');
    loadConfiguration();
    setupEventListeners();
    loadExtensionInfo(); // Carregar informações da extensão
    
    // Listener para mudanças automáticas de configuração
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'sync' && changes.helpOtrsConfig) {
            const oldConfig = changes.helpOtrsConfig.oldValue;
            const newConfig = changes.helpOtrsConfig.newValue;
            
            // Se não foi uma mudança feita por esta página (detectar pelo timestamp)
            if (oldConfig && newConfig && JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
                // Recarregar a configuração
                currentConfig = newConfig;
                renderOtrsSystems();
                renderFeatures();
                renderAdvancedSettings();
                
                // Mostrar alerta de sincronização
                showAutoSyncAlert('Configurações sincronizadas de outra aba');
            }
        }
    });
});

// Carregar configurações
async function loadConfiguration() {
    try {
        const result = await chrome.storage.sync.get(['helpOtrsConfig']);
        currentConfig = result.helpOtrsConfig || DEFAULT_CONFIG;
        
        await renderOtrsSystems();
        renderFeatures();
        renderAdvancedSettings();
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showStatus('Erro ao carregar configurações', 'error');
    }
}

// Renderizar sistemas OTRS
async function renderOtrsSystems() {
    const container = document.getElementById('otrsList');
    container.innerHTML = '';

    // Se não há sistemas configurados, mostrar mensagem informativa
    if (!currentConfig.otrs_systems || currentConfig.otrs_systems.length === 0) {
        container.innerHTML = `
            <div class="no-systems-message">
                <h4>� Bem-vindo ao Help OTRS!</h4>
                <p><strong>Para começar, você precisa configurar pelo menos um sistema OTRS.</strong></p>
                
                <div class="setup-instructions">
                    <h5>📝 Como configurar:</h5>
                    <ol>
                        <li><strong>Nome do Sistema:</strong> Ex: "MAPA", "MT", "SFB", etc.</li>
                        <li><strong>URL Base:</strong> Ex: "https://atendetiadmin.agro.gov.br/otrs/" ou "http://itsm-mtpa.hepta.com.br/otrs/"</li>
                        <li><strong>Perfil do Usuário:</strong> Use "Carregar Perfis" para buscar automaticamente ou "Inserir Manualmente"</li>
                        <li><strong>Adicionar:</strong> Clique em "Adicionar Sistema" e conceda as permissões quando solicitado</li>
                    </ol>
                </div>
                
                <div class="important-note">
                    <h5>⚠️ Importante:</h5>
                    <p>A extensão só funcionará nos sites OTRS que você configurar aqui. Certifique-se de estar logado no sistema OTRS antes de tentar carregar os perfis.</p>
                </div>
            </div>
        `;
        return;
    }

    // Criar todos os itens de sistemas de forma assíncrona
    for (const system of currentConfig.otrs_systems) {
        const otrsItem = await createOtrsItem(system);
        container.appendChild(otrsItem);
    }
}

// Criar item de sistema OTRS
async function createOtrsItem(system) {
    const div = document.createElement('div');
    div.className = `otrs-item ${!system.enabled ? 'disabled' : ''}`;
    div.dataset.id = system.id;

    div.innerHTML = `
        <div class="otrs-header">
            <div class="otrs-name">${system.name}</div>
            <div class="otrs-actions">
                <label class="switch">
                    <input type="checkbox" ${system.enabled ? 'checked' : ''} 
                           data-system-id="${system.id}" class="toggle-system">
                    <span class="slider"></span>
                </label>
                <button type="button" class="btn-small edit-system-btn" data-system-id="${system.id}">
                    ✏️ Editar
                </button>
                <button type="button" class="btn-danger btn-small remove-system-btn" data-system-id="${system.id}">
                    🗑️ Remover
                </button>
            </div>
        </div>
        <div class="otrs-info">
            <div><strong>URL Base:</strong> ${system.baseUrl}</div>
            <div><strong>Perfil de Usuário:</strong> ${system.userProfile}</div>
        </div>
    `;

    // Adicionar event listeners diretamente
    const toggleCheckbox = div.querySelector('.toggle-system');
    const editBtn = div.querySelector('.edit-system-btn');
    const removeBtn = div.querySelector('.remove-system-btn');
    
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', function() {
            toggleOtrsSystem(system.id, this.checked);
        });
    }
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            editOtrsSystem(system.id);
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            removeOtrsSystem(system.id);
        });
    }

    return div;
}

// Renderizar funcionalidades
function renderFeatures() {
    const features = currentConfig.features;
    
    document.getElementById('alertsEnabled').checked = features.alertsEnabled;
    document.getElementById('typeOfServiceAlerts').checked = features.typeOfServiceAlerts;
    document.getElementById('serviceClassificationAlerts').checked = features.serviceClassificationAlerts;
    document.getElementById('queueValidation').checked = features.queueValidation;
    document.getElementById('formDataReuser').checked = features.formDataReuser;
}

// Renderizar configurações avançadas
function renderAdvancedSettings() {
    document.getElementById('delayTime').value = currentConfig.advanced.delayTime;
}

// Configurar event listeners
function setupEventListeners() {
    // Botão carregar perfis
    document.getElementById('loadProfilesBtn').addEventListener('click', loadUserProfiles);
    
    // Botão inserir perfil manualmente
    document.getElementById('manualProfileBtn').addEventListener('click', showManualProfileInput);
    
    // Botão adicionar OTRS
    document.getElementById('addOtrsBtn').addEventListener('click', addOtrsSystem);
    
    // Botão salvar edição
    document.getElementById('saveEditBtn').addEventListener('click', saveEditedSystem);
    
    // Botões para fechar modal
    document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    
    // Botão salvar
    document.getElementById('saveBtn').addEventListener('click', saveConfiguration);
    
    // Botão resetar
    document.getElementById('resetBtn').addEventListener('click', resetConfiguration);
    
    // Checkboxes de funcionalidades
    document.getElementById('alertsEnabled').addEventListener('change', updateFeature);
    document.getElementById('typeOfServiceAlerts').addEventListener('change', updateFeature);
    document.getElementById('serviceClassificationAlerts').addEventListener('change', updateFeature);
    document.getElementById('queueValidation').addEventListener('change', updateFeature);
    document.getElementById('formDataReuser').addEventListener('change', updateFeature);
    
    // Input de delay
    document.getElementById('delayTime').addEventListener('change', updateAdvancedSetting);
    
    // Monitorar mudanças na URL para habilitar os botões
    document.getElementById('otrsUrl').addEventListener('input', function() {
        const url = this.value.trim();
        const loadBtn = document.getElementById('loadProfilesBtn');
        const manualBtn = document.getElementById('manualProfileBtn');
        const profileGroup = document.getElementById('profileGroup');
        
        if (url && isValidUrl(url)) {
            loadBtn.disabled = false;
            manualBtn.disabled = false;
            clearFieldError('otrsUrl');
        } else {
            loadBtn.disabled = true;
            manualBtn.disabled = true;
            profileGroup.style.display = 'none';
            document.getElementById('addOtrsBtn').disabled = true;
        }
    });

    // Validação em tempo real para nome do sistema
    document.getElementById('otrsName').addEventListener('input', function() {
        const name = this.value.trim();
        if (name.length > 0) {
            clearFieldError('otrsName');
            
            // Verificar se nome já existe
            if (currentConfig.otrs_systems.some(system => 
                system.name.toLowerCase() === name.toLowerCase())) {
                showFieldError('otrsName', '⚠️ Já existe um sistema com este nome');
            } else if (name.length < 2) {
                showFieldError('otrsName', '📝 Nome deve ter pelo menos 2 caracteres');
            } else if (name.length > 50) {
                showFieldError('otrsName', '📝 Nome deve ter no máximo 50 caracteres');
            } else {
                showFieldSuccess('otrsName');
            }
        } else {
            clearFieldError('otrsName');
        }
        
        validateAddButton();
    });

    // Validação em tempo real para URL
    document.getElementById('otrsUrl').addEventListener('blur', function() {
        const url = this.value.trim();
        if (url.length > 0) {
            if (!isValidUrl(url)) {
                showFieldError('otrsUrl', '🌐 URL inválida. Use formato: https://exemplo.com/otrs/');
            } else {
                // Verificar se URL já existe
                const normalizedUrl = url.endsWith('/') ? url : url + '/';
                if (currentConfig.otrs_systems.some(system => 
                    system.baseUrl.toLowerCase() === normalizedUrl.toLowerCase())) {
                    showFieldError('otrsUrl', '⚠️ Já existe um sistema com esta URL');
                } else {
                    showFieldSuccess('otrsUrl');
                }
            }
        }
        
        validateAddButton();
    });

    // Validação para seleção de perfil
    document.getElementById('userProfile').addEventListener('change', function() {
        const profile = this.value;
        if (profile) {
            showFieldSuccess('userProfile');
        } else {
            clearFieldError('userProfile');
        }
        
        validateAddButton();
    });
    
    // Fechar modal quando clicar fora dele
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('editModal').style.display !== 'none') {
            closeEditModal();
        }
    });
}

// Função para validar se o botão "Adicionar Sistema" deve estar habilitado
function validateAddButton() {
    const name = document.getElementById('otrsName').value.trim();
    const url = document.getElementById('otrsUrl').value.trim();
    const profile = document.getElementById('userProfile').value;
    const addBtn = document.getElementById('addOtrsBtn');
    
    const isNameValid = name.length >= 2 && name.length <= 50 && 
        !currentConfig.otrs_systems.some(system => 
            system.name.toLowerCase() === name.toLowerCase());
    
    const isUrlValid = isValidUrl(url) && 
        !currentConfig.otrs_systems.some(system => {
            const normalizedUrl = url.endsWith('/') ? url : url + '/';
            return system.baseUrl.toLowerCase() === normalizedUrl.toLowerCase();
        });
    
    const isProfileValid = profile && profile.length > 0;
    
    if (isNameValid && isUrlValid && isProfileValid) {
        addBtn.disabled = false;
        addBtn.textContent = 'Adicionar Sistema';
        addBtn.style.opacity = '1';
    } else {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
        
        // Dar dicas sobre o que está faltando
        if (!name) {
            addBtn.textContent = 'Digite o nome do sistema';
        } else if (!isNameValid) {
            addBtn.textContent = 'Nome inválido';
        } else if (!url) {
            addBtn.textContent = 'Digite a URL do sistema';
        } else if (!isUrlValid) {
            addBtn.textContent = 'URL inválida';
        } else if (!profile) {
            addBtn.textContent = 'Selecione o perfil';
        } else {
            addBtn.textContent = 'Preencha todos os campos';
        }
    }
}

// Carregar perfis de usuário do sistema OTRS
async function loadUserProfiles() {
    const baseUrl = document.getElementById('otrsUrl').value.trim();
    
    if (!baseUrl || !isValidUrl(baseUrl)) {
        showStatus('URL inválida', 'error');
        return;
    }

    const loadBtn = document.getElementById('loadProfilesBtn');
    const profileSelect = document.getElementById('userProfile');
    const profileGroup = document.getElementById('profileGroup');
    
    // Mostrar loading
    loadBtn.disabled = true;
    loadBtn.textContent = 'Carregando...';
    profileSelect.innerHTML = '<option value="">Carregando perfis...</option>';
    profileGroup.style.display = 'block';

    try {
        // Construir URL do perfil do usuário - normalizar a URL
        let normalizedUrl = baseUrl;
        if (!normalizedUrl.endsWith('/')) {
            normalizedUrl += '/';
        }
        
        // Remover possível duplicação de /otrs/
        normalizedUrl = normalizedUrl.replace(/\/otrs\/+/g, '/otrs/');
        
        const profileUrl = `${normalizedUrl}index.pl?Action=AgentPreferences;Subaction=Group;Group=UserProfile`;
        
        console.log('URL original:', baseUrl);
        console.log('URL normalizada:', normalizedUrl);
        console.log('URL do perfil:', profileUrl);
        
        // Usar background script para fazer a requisição (contorna CORS)
        const response = await chrome.runtime.sendMessage({
            type: 'FETCH_PROFILES',
            url: profileUrl,
            baseUrl: normalizedUrl
        });

        console.log('Resposta do background script:', response);

        if (!response.success) {
            throw new Error(response.error || 'Erro ao carregar perfis');
        }

        const text = response.data;
        console.log('HTML recebido (primeiros 500 chars):', text.substring(0, 500));
        
        // Criar um elemento temporário para fazer o parse do HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Buscar o select com id="UserArea" ou elementos alternativos
        let userAreaSelect = tempDiv.querySelector('#UserArea');
        
        // Se não encontrar #UserArea, tentar outras possibilidades
        if (!userAreaSelect) {
            console.log('Elemento #UserArea não encontrado, tentando alternativas...');
            
            // Tentar buscar por name ou outros seletores comuns
            userAreaSelect = tempDiv.querySelector('select[name="UserArea"]') ||
                           tempDiv.querySelector('select[name="Group"]') ||
                           tempDiv.querySelector('select[id*="Area"]') ||
                           tempDiv.querySelector('select[id*="Profile"]') ||
                           tempDiv.querySelector('select[id*="Group"]');
                           
            console.log('Elemento alternativo encontrado:', userAreaSelect);
        }
        
        // Se ainda não encontrar, listar todos os selects disponíveis
        if (!userAreaSelect) {
            const allSelects = tempDiv.querySelectorAll('select');
            console.log('Todos os selects encontrados na página:');
            allSelects.forEach((select, index) => {
                console.log(`Select ${index}:`, {
                    id: select.id,
                    name: select.name,
                    className: select.className,
                    optionsCount: select.options.length
                });
            });
            
            // Tentar usar o primeiro select que tenha opções
            userAreaSelect = Array.from(allSelects).find(select => select.options.length > 1);
            
            if (userAreaSelect) {
                console.log('Usando select alternativo:', userAreaSelect);
            }
        }
        
        if (!userAreaSelect) {
            // Verificar se a página é realmente a página de preferências
            const pageTitle = tempDiv.querySelector('title')?.textContent || 'Título não encontrado';
            const loginCheck = tempDiv.querySelector('form[name="login"]') || tempDiv.querySelector('#LoginBox');
            
            console.log('Título da página:', pageTitle);
            console.log('Formulário de login encontrado:', !!loginCheck);
            
            if (loginCheck) {
                throw new Error('Página de login detectada. Faça login no sistema OTRS primeiro.');
            }
            
            throw new Error(`Elemento de perfil do usuário não encontrado. Título da página: "${pageTitle}". Verifique se você está logado no sistema e se a URL está correta.`);
        }

        // Extrair todas as opções disponíveis (exceto a primeira que é vazia)
        const options = Array.from(userAreaSelect.querySelectorAll('option'))
            .filter(option => option.value && option.value.trim() !== '')
            .map(option => ({
                value: option.value,
                title: option.title || option.textContent.trim(),
                selected: option.hasAttribute('selected')
            }));

        console.log('Opções encontradas:', options);

        if (options.length === 0) {
            throw new Error('Nenhum perfil encontrado no sistema.');
        }

        availableProfiles = options;
        populateProfileSelect(availableProfiles);
        
        // Usar alerta personalizado para carregamento de perfis
        showSaveAlert(`🔄 Perfis carregados com sucesso! (${options.length} perfis encontrados)`);
        
    } catch (error) {
        console.error('Erro detalhado ao carregar perfis:', error);
        
        // Sempre oferecer opção manual quando há erro
        showManualProfileInput();
        
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            showStatus('Não foi possível carregar automaticamente devido a restrições do navegador. Use a opção manual.', 'warning');
        } else if (error.message.includes('403') || error.message.includes('401') || error.message.includes('login')) {
            showStatus('Acesso negado ou necessário fazer login. Faça login no sistema OTRS primeiro.', 'error');
        } else if (error.message.includes('Título da página')) {
            showStatus(`Página inesperada carregada. ${error.message}`, 'error');
        } else {
            showStatus(`Erro ao carregar perfis: ${error.message}`, 'error');
        }
    } finally {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Carregar Perfis';
    }
}

// Mostrar opção de input manual de perfil
function showManualProfileInput() {
    const profileGroup = document.getElementById('profileGroup');
    const profileSelect = document.getElementById('userProfile');
    
    // Limpar o select e adicionar opções padrão
    profileSelect.innerHTML = `
        <option value="">Selecione seu perfil...</option>
        <option value="Cliente">Cliente</option>
        <option value="CSC">CSC</option>
        <option value="Nível 1">Nível 1</option>
        <option value="Nível 2">Nível 2</option>
        <option value="Nível 3">Nível 3</option>
    `;
    
    profileGroup.style.display = 'block';
    
    // Adicionar uma pequena nota explicativa
    const existingSmall = profileGroup.querySelector('small');
    if (existingSmall) {
        existingSmall.textContent = '⚠️ Seleção manual - escolha seu nível/perfil no sistema OTRS';
        existingSmall.style.color = '#d63384';
    }
    
    // Habilitar o botão adicionar quando um perfil for selecionado
    profileSelect.addEventListener('change', function() {
        document.getElementById('addOtrsBtn').disabled = !this.value;
    });
}

// Popular o select com os perfis disponíveis
function populateProfileSelect(profiles) {
    const profileSelect = document.getElementById('userProfile');
    const addBtn = document.getElementById('addOtrsBtn');
    
    profileSelect.innerHTML = '<option value="">Selecione seu perfil...</option>';
    
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.value;
        option.textContent = profile.title;
        profileSelect.appendChild(option);
    });
    
    // Habilitar o botão adicionar quando um perfil for selecionado
    profileSelect.addEventListener('change', function() {
        addBtn.disabled = !this.value;
    });
}

// Validar URL
// Funções utilitárias de validação
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('invalid', 'valid');
    }
    if (errorDiv) {
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('valid');
        field.classList.add('invalid');
        field.focus();
    }
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

function showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('invalid');
        field.classList.add('valid');
    }
    if (errorDiv) {
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
    }
}

function validateField(fieldId, value, validationRules) {
    clearFieldError(fieldId);
    
    for (const rule of validationRules) {
        if (!rule.test(value)) {
            showFieldError(fieldId, rule.message);
            return false;
        }
    }
    
    showFieldSuccess(fieldId);
    return true;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        
        // Verificar se é HTTP ou HTTPS
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false;
        }
        
        // Log para debug
        console.log('URL validada:', {
            original: string,
            protocol: url.protocol,
            hostname: url.hostname,
            pathname: url.pathname,
            valid: true
        });
        
        return true;
    } catch (error) {
        console.log('URL inválida:', string, error.message);
        return false;
    }
}

// Adicionar sistema OTRS
async function addOtrsSystem() {
    const name = document.getElementById('otrsName').value.trim();
    const baseUrl = document.getElementById('otrsUrl').value.trim();
    const selectedProfile = document.getElementById('userProfile').value;

    console.log('Tentando adicionar sistema:', { name, baseUrl, selectedProfile });
    
    // Limpar erros anteriores
    clearFieldError('otrsName');
    clearFieldError('otrsUrl');
    clearFieldError('userProfile');

    let hasErrors = false;

    // Validar nome do sistema
    const nameValidation = [
        {
            test: (value) => value.length > 0,
            message: '📝 Nome do sistema é obrigatório'
        },
        {
            test: (value) => value.length >= 2,
            message: '📝 Nome deve ter pelo menos 2 caracteres'
        },
        {
            test: (value) => value.length <= 50,
            message: '📝 Nome deve ter no máximo 50 caracteres'
        },
        {
            test: (value) => {
                // Verificar se já existe um sistema com esse nome
                return !currentConfig.otrs_systems.some(system => 
                    system.name.toLowerCase() === value.toLowerCase()
                );
            },
            message: '⚠️ Já existe um sistema com este nome'
        }
    ];

    if (!validateField('otrsName', name, nameValidation)) {
        hasErrors = true;
    }

    // Validar URL
    const urlValidation = [
        {
            test: (value) => value.length > 0,
            message: '🌐 URL do sistema é obrigatória'
        },
        {
            test: (value) => isValidUrl(value),
            message: '🌐 URL inválida. Use formato: https://exemplo.com/otrs/'
        },
        {
            test: (value) => {
                // Verificar se já existe um sistema com essa URL
                const normalizedUrl = value.endsWith('/') ? value : value + '/';
                return !currentConfig.otrs_systems.some(system => 
                    system.baseUrl.toLowerCase() === normalizedUrl.toLowerCase()
                );
            },
            message: '⚠️ Já existe um sistema com esta URL'
        }
    ];

    if (!validateField('otrsUrl', baseUrl, urlValidation)) {
        hasErrors = true;
    }

    // Validar perfil (se o campo estiver visível)
    const profileGroup = document.getElementById('profileGroup');
    if (profileGroup.style.display !== 'none') {
        const profileValidation = [
            {
                test: (value) => value.length > 0,
                message: '👤 Seleção de perfil é obrigatória'
            }
        ];

        if (!validateField('userProfile', selectedProfile, profileValidation)) {
            hasErrors = true;
        }
    } else if (!selectedProfile) {
        showFieldError('userProfile', '👤 Use "Carregar Perfis" ou "Inserir Manualmente" para definir o perfil');
        hasErrors = true;
    }

    // Se há erros, não continuar
    if (hasErrors) {
        showStatus('❌ Corrija os erros indicados nos campos acima', 'error');
        return;
    }

    try {
        const normalizedUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        
        const newSystem = {
            id: generateId(),
            name: name,
            baseUrl: normalizedUrl,
            userProfile: selectedProfile,
            enabled: true
        };

        currentConfig.otrs_systems.push(newSystem);
        
        // Limpar campos e remover estilos de validação
        document.getElementById('otrsName').value = '';
        document.getElementById('otrsUrl').value = '';
        document.getElementById('userProfile').value = '';
        document.getElementById('profileGroup').style.display = 'none';
        document.getElementById('addOtrsBtn').disabled = true;
        document.getElementById('loadProfilesBtn').disabled = false;
        
        // Limpar todos os estados de validação
        clearFieldError('otrsName');
        clearFieldError('otrsUrl');
        clearFieldError('userProfile');
        
        await renderOtrsSystems();
        
        // Usar alerta personalizado para adicionar sistema
        showSaveAlert(`✅ Sistema "${name}" adicionado com sucesso! Não esqueça de salvar as configurações.`);
        
        console.log('Sistema adicionado com sucesso:', newSystem);
        
    } catch (error) {
        console.error('Erro ao adicionar sistema:', error);
        showStatus('❌ Erro interno ao adicionar sistema. Tente novamente.', 'error');
    }
}

// Alternar sistema OTRS
function toggleOtrsSystem(id, enabled) {
    const system = currentConfig.otrs_systems.find(s => s.id === id);
    if (system) {
        system.enabled = enabled;
        renderOtrsSystems();
        
        // Mostrar alerta personalizado para toggle
        if (enabled) {
            showSaveAlert(`✅ Sistema "${system.name}" habilitado!`);
        } else {
            showRemoveAlert(`⚠️ Sistema "${system.name}" desabilitado!`);
        }
    }
}

// Editar sistema OTRS
function editOtrsSystem(id) {
    console.log('editOtrsSystem chamada com ID:', id);
    console.log('currentConfig:', currentConfig);
    console.log('otrs_systems:', currentConfig.otrs_systems);
    
    if (!currentConfig || !currentConfig.otrs_systems) {
        console.error('Configurações não carregadas');
        showStatus('Configurações não carregadas. Recarregue a página.', 'error');
        return;
    }
    
    const system = currentConfig.otrs_systems.find(s => s.id === id);
    if (!system) {
        console.error('Sistema não encontrado para ID:', id);
        console.log('Sistemas disponíveis:', currentConfig.otrs_systems.map(s => ({ id: s.id, name: s.name })));
        showStatus('Sistema não encontrado', 'error');
        return;
    }

    console.log('Sistema encontrado:', system);

    // Guardar o ID do sistema sendo editado
    editingSystemId = id;
    
    // Popular o select do perfil com opções padrão
    const editProfileSelect = document.getElementById('editUserProfile');
    editProfileSelect.innerHTML = `
        <option value="">Selecione o perfil...</option>
        <option value="Cliente">Cliente</option>
        <option value="CSC">CSC</option>
        <option value="Nível 1">Nível 1</option>
        <option value="Nível 2">Nível 2</option>
        <option value="Nível 3">Nível 3</option>
    `;
    
    // Preencher os campos do modal com os dados atuais
    document.getElementById('editOtrsName').value = system.name;
    document.getElementById('editOtrsUrl').value = system.baseUrl;
    document.getElementById('editUserProfile').value = system.userProfile;
    
    // Mostrar o modal
    document.getElementById('editModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevenir scroll da página
    
    console.log('Modal de edição aberto');
}

// Salvar sistema editado
async function saveEditedSystem() {
    if (!editingSystemId) return;
    
    const name = document.getElementById('editOtrsName').value.trim();
    const baseUrl = document.getElementById('editOtrsUrl').value.trim();
    const userProfile = document.getElementById('editUserProfile').value;

    console.log('Tentando salvar edição:', { name, baseUrl, userProfile });
    
    // Limpar erros anteriores
    clearFieldError('editOtrsName');
    clearFieldError('editOtrsUrl');
    clearFieldError('editUserProfile');

    let hasErrors = false;

    // Validar nome do sistema
    const nameValidation = [
        {
            test: (value) => value.length > 0,
            message: '📝 Nome do sistema é obrigatório'
        },
        {
            test: (value) => value.length >= 2,
            message: '📝 Nome deve ter pelo menos 2 caracteres'
        },
        {
            test: (value) => value.length <= 50,
            message: '📝 Nome deve ter no máximo 50 caracteres'
        },
        {
            test: (value) => {
                // Verificar se já existe um sistema com esse nome (exceto o atual)
                return !currentConfig.otrs_systems.some(system => 
                    system.id !== editingSystemId && system.name.toLowerCase() === value.toLowerCase()
                );
            },
            message: '⚠️ Já existe um sistema com este nome'
        }
    ];

    if (!validateField('editOtrsName', name, nameValidation)) {
        hasErrors = true;
    }

    // Validar URL
    const urlValidation = [
        {
            test: (value) => value.length > 0,
            message: '🌐 URL do sistema é obrigatória'
        },
        {
            test: (value) => isValidUrl(value),
            message: '🌐 URL inválida. Use formato: https://exemplo.com/otrs/'
        },
        {
            test: (value) => {
                // Verificar se já existe um sistema com essa URL (exceto o atual)
                const normalizedUrl = value.endsWith('/') ? value : value + '/';
                return !currentConfig.otrs_systems.some(system => 
                    system.id !== editingSystemId && system.baseUrl.toLowerCase() === normalizedUrl.toLowerCase()
                );
            },
            message: '⚠️ Já existe um sistema com esta URL'
        }
    ];

    if (!validateField('editOtrsUrl', baseUrl, urlValidation)) {
        hasErrors = true;
    }

    // Validar perfil
    const profileValidation = [
        {
            test: (value) => value.length > 0,
            message: '👤 Seleção de perfil é obrigatória'
        }
    ];

    if (!validateField('editUserProfile', userProfile, profileValidation)) {
        hasErrors = true;
    }

    // Se há erros, não continuar
    if (hasErrors) {
        showStatus('❌ Corrija os erros indicados nos campos acima', 'error');
        return;
    }

    try {
        // Encontrar e atualizar o sistema
        const system = currentConfig.otrs_systems.find(s => s.id === editingSystemId);
        if (system) {
            const oldName = system.name;
            system.name = name;
            system.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
            system.userProfile = userProfile;
            
            await renderOtrsSystems();
            closeEditModal();
            
            // Mostrar alerta personalizado de sucesso
            showSaveAlert(`✅ Sistema "${name}" atualizado com sucesso!`);
            
            console.log('Sistema editado com sucesso:', system);
        } else {
            showStatus('❌ Sistema não encontrado para edição', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar edição:', error);
        showStatus('❌ Erro interno ao salvar edição. Tente novamente.', 'error');
    }
}

// Fechar modal de edição
function closeEditModal() {
    console.log('closeEditModal chamada');
    document.getElementById('editModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restaurar scroll da página
    editingSystemId = null;
    
    // Limpar campos e estados de validação
    document.getElementById('editOtrsName').value = '';
    document.getElementById('editOtrsUrl').value = '';
    document.getElementById('editUserProfile').value = '';
    
    // Limpar estados de validação
    clearFieldError('editOtrsName');
    clearFieldError('editOtrsUrl');
    clearFieldError('editUserProfile');
}

// Remover sistema OTRS
function removeOtrsSystem(id) {
    console.log('removeOtrsSystem chamada com ID:', id);
    console.log('currentConfig:', currentConfig);
    
    if (!currentConfig || !currentConfig.otrs_systems) {
        console.error('Configurações não carregadas');
        showStatus('Configurações não carregadas. Recarregue a página.', 'error');
        return;
    }
    
    const system = currentConfig.otrs_systems.find(s => s.id === id);
    if (!system) {
        console.error('Sistema não encontrado para ID:', id);
        console.log('Sistemas disponíveis:', currentConfig.otrs_systems.map(s => ({ id: s.id, name: s.name })));
        showStatus('Sistema não encontrado', 'error');
        return;
    }

    console.log('Sistema encontrado para remoção:', system);

    // Criar modal de confirmação personalizado
    const confirmed = confirm(
        `Tem certeza que deseja remover o sistema "${system.name}"?\n\n` +
        `Esta ação não pode ser desfeita e você perderá todas as configurações deste sistema.`
    );
    
    if (!confirmed) {
        console.log('Remoção cancelada pelo usuário');
        return;
    }

    // Verificar se não é o último sistema
    if (currentConfig.otrs_systems.length <= 1) {
        const keepLast = confirm(
            'Este é o último sistema OTRS configurado.\n\n' +
            'Remover todos os sistemas pode fazer a extensão parar de funcionar.\n\n' +
            'Deseja continuar mesmo assim?'
        );
        
        if (!keepLast) {
            console.log('Remoção do último sistema cancelada');
            return;
        }
    }

    // Remover o sistema
    currentConfig.otrs_systems = currentConfig.otrs_systems.filter(s => s.id !== id);
    renderOtrsSystems();
    
    // Mostrar alerta personalizado de remoção
    showRemoveAlert(`Sistema "${system.name}" removido com sucesso!`);
    
    console.log('Sistema removido com sucesso');
    
    // Se não há mais sistemas, mostrar uma mensagem
    if (currentConfig.otrs_systems.length === 0) {
        const container = document.getElementById('otrsList');
        container.innerHTML = `
            <div class="no-systems-message">
                <h4>⚠️ Nenhum sistema OTRS configurado</h4>
                <p>Adicione pelo menos um sistema OTRS para usar a extensão.</p>
            </div>
        `;
    }
}

// Atualizar funcionalidade
function updateFeature(event) {
    const feature = event.target.id;
    const enabled = event.target.checked;
    
    currentConfig.features[feature] = enabled;
}

// Atualizar configuração avançada
function updateAdvancedSetting(event) {
    const setting = event.target.id;
    const value = parseInt(event.target.value);
    
    if (setting === 'delayTime') {
        currentConfig.advanced.delayTime = Math.max(0, Math.min(5000, value));
        event.target.value = currentConfig.advanced.delayTime;
    }
}

// Salvar configurações
async function saveConfiguration() {
    try {
        // Verificar se não há nenhum sistema habilitado
        const enabledSystems = currentConfig.otrs_systems.filter(s => s.enabled);
        
        if (currentConfig.otrs_systems.length > 0 && enabledSystems.length === 0) {
            const confirmSave = confirm(
                '⚠️ ATENÇÃO: Nenhum sistema OTRS está habilitado!\n\n' +
                'A extensão não funcionará até que você habilite pelo menos um sistema.\n\n' +
                'Deseja salvar mesmo assim?'
            );
            
            if (!confirmSave) {
                return;
            }
        }
        
        await chrome.storage.sync.set({ helpOtrsConfig: currentConfig });
        
        // Detectar quantos sistemas estão habilitados para mostrar informação detalhada
        let message = '✅ Configurações salvas com sucesso!';
        
        if (enabledSystems.length > 0) {
            message += ` (${enabledSystems.length} sistema${enabledSystems.length > 1 ? 's' : ''} habilitado${enabledSystems.length > 1 ? 's' : ''})`;
        } else if (currentConfig.otrs_systems.length > 0) {
            message = '⚠️ Configurações salvas! Lembre-se de habilitar pelo menos um sistema OTRS.';
        }
        
        // Usar alerta personalizado de salvamento
        showSaveAlert(message);
        
        // Notificar content scripts sobre mudanças
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                if (tab.url && (tab.url.includes('otrs') || tab.url.includes('agro.gov.br'))) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'CONFIG_UPDATED',
                        config: currentConfig
                    }).catch(() => {
                        // Ignorar erros para tabs que não têm o content script
                    });
                }
            });
        });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showStatus('❌ Erro ao salvar configurações', 'error');
    }
}

// Resetar configurações
async function resetConfiguration() {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão? Todas as suas configurações personalizadas serão perdidas.')) {
        return;
    }

    try {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        await chrome.storage.sync.set({ helpOtrsConfig: currentConfig });
        
        renderOtrsSystems();
        renderFeatures();
        renderAdvancedSettings();
        
        // Usar alerta personalizado para reset
        showSaveAlert('🔄 Configurações restauradas para o padrão');
    } catch (error) {
        console.error('Erro ao resetar configurações:', error);
        showStatus('❌ Erro ao resetar configurações', 'error');
    }
}

// Exibir status
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
    }, 3000);
}

// Exibir alerta personalizado de salvamento
function showSaveAlert(message) {
    // Remover alerta existente se houver
    const existingAlert = document.querySelector('.save-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Criar elemento do alerta
    const alert = document.createElement('div');
    alert.className = 'save-alert';
    alert.innerHTML = `
        <span class="save-alert-text">${message}</span>
    `;
    
    // Adicionar ao body
    document.body.appendChild(alert);
    
    // Mostrar com animação
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);
    
    // Ocultar após 3 segundos
    setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        
        // Remover do DOM após animação
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 400);
    }, 3000);
}

// Exibir alerta personalizado de configuração automática
function showAutoSyncAlert(message) {
    // Remover alerta existente se houver
    const existingAlert = document.querySelector('.save-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Criar elemento do alerta (usando estilo de save mas com ícone diferente)
    const alert = document.createElement('div');
    alert.className = 'save-alert';
    alert.style.background = 'linear-gradient(135deg, #17a2b8 0%, #117a8b 100%)';
    alert.innerHTML = `
        <span class="save-alert-text">🔄 ${message}</span>
    `;
    
    // Adicionar ao body
    document.body.appendChild(alert);
    
    // Mostrar com animação
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);
    
    // Ocultar após 2.5 segundos (um pouco menos para sync automático)
    setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        
        // Remover do DOM após animação
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 400);
    }, 2500);
}

// Exibir alerta personalizado de remoção
function showRemoveAlert(message) {
    // Remover alerta existente se houver
    const existingAlert = document.querySelector('.remove-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Criar elemento do alerta
    const alert = document.createElement('div');
    alert.className = 'remove-alert';
    alert.innerHTML = `
        <span class="remove-alert-text">${message}</span>
    `;
    
    // Adicionar ao body
    document.body.appendChild(alert);
    
    // Mostrar com animação
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);
    
    // Ocultar após 4 segundos (um pouco mais tempo para remoção)
    setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        
        // Remover do DOM após animação
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 400);
    }, 4000);
}

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Carregar informações da extensão
function loadExtensionInfo() {
    try {
        const manifest = chrome.runtime.getManifest();
        
        // Atualizar versão
        const versionElement = document.getElementById('extensionVersion');
        if (versionElement) {
            versionElement.textContent = `v${manifest.version}`;
            versionElement.title = `Versão ${manifest.version} da extensão ${manifest.name}`;
        }
        
        console.log('✅ Informações da extensão carregadas:', {
            name: manifest.name,
            version: manifest.version,
            author: manifest.author
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar informações da extensão:', error);
        
        // Fallback para valores padrão se houver erro
        const versionElement = document.getElementById('extensionVersion');
        if (versionElement) {
            versionElement.textContent = 'v1.0.2';
            versionElement.title = 'Versão da extensão (fallback)';
        }
    }
}
