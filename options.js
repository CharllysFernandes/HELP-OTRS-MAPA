// Configurações padrão
const DEFAULT_CONFIG = {
    otrs_systems: [],
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
    
    // Manter função closeEditModal global para uso no HTML
    window.closeEditModal = closeEditModal;
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

    // Verificar permissões para este sistema
    let hasPermissions = false;
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'CHECK_PERMISSIONS',
            url: system.baseUrl
        });
        hasPermissions = response.hasPermissions;
    } catch (error) {
        console.error('Erro ao verificar permissões:', error);
    }

    const permissionStatus = hasPermissions 
        ? '<span class="permission-status granted">✅ Permissões concedidas</span>'
        : '<span class="permission-status denied">❌ Sem permissões</span>';
    
    const permissionButton = !hasPermissions 
        ? `<button type="button" class="btn-small grant-permissions-btn" data-system-id="${system.id}" data-url="${system.baseUrl}">🔓 Conceder Permissões</button>`
        : '';

    div.innerHTML = `
        <div class="otrs-header">
            <div class="otrs-name">${system.name}</div>
            <div class="otrs-actions">
                <label class="switch">
                    <input type="checkbox" ${system.enabled ? 'checked' : ''} 
                           data-system-id="${system.id}" class="toggle-system">
                    <span class="slider"></span>
                </label>
                ${permissionButton}
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
            <div><strong>Status:</strong> ${permissionStatus}</div>
        </div>
    `;

    // Adicionar event listeners diretamente
    const toggleCheckbox = div.querySelector('.toggle-system');
    const editBtn = div.querySelector('.edit-system-btn');
    const removeBtn = div.querySelector('.remove-system-btn');
    const grantPermissionsBtn = div.querySelector('.grant-permissions-btn');
    
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
    
    if (grantPermissionsBtn) {
        grantPermissionsBtn.addEventListener('click', async function() {
            const btn = this;
            btn.disabled = true;
            btn.textContent = '🔄 Solicitando...';
            
            const granted = await requestPermissionsForSystem(system.baseUrl);
            if (granted) {
                // Atualizar a interface para mostrar que as permissões foram concedidas
                renderOtrsSystems();
            }
            
            btn.disabled = false;
            btn.textContent = '🔓 Conceder Permissões';
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
    
    // Botão salvar
    document.getElementById('saveBtn').addEventListener('click', saveConfiguration);
    
    // Botão resetar
    document.getElementById('resetBtn').addEventListener('click', resetConfiguration);
    
    // Checkboxes de funcionalidades
    document.getElementById('alertsEnabled').addEventListener('change', updateFeature);
    document.getElementById('typeOfServiceAlerts').addEventListener('change', updateFeature);
    document.getElementById('serviceClassificationAlerts').addEventListener('change', updateFeature);
    document.getElementById('queueValidation').addEventListener('change', updateFeature);
    
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
        } else {
            loadBtn.disabled = true;
            manualBtn.disabled = true;
            profileGroup.style.display = 'none';
            document.getElementById('addOtrsBtn').disabled = true;
        }
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
        showStatus(`Perfis carregados com sucesso! (${options.length} perfis encontrados)`, 'success');
        
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
// Função para solicitar permissões para uma URL
async function requestPermissionsForSystem(baseUrl) {
    try {
        showStatus('Solicitando permissões para acesso ao sistema...', 'info');
        
        const response = await chrome.runtime.sendMessage({
            type: 'REQUEST_PERMISSIONS',
            url: baseUrl
        });
        
        if (response.success) {
            showStatus('Permissões concedidas! A extensão pode acessar este sistema.', 'success');
            return true;
        } else {
            showStatus('Permissões negadas. A extensão não funcionará neste sistema até que as permissões sejam concedidas.', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Erro ao solicitar permissões:', error);
        showStatus('Erro ao solicitar permissões. Tente novamente.', 'error');
        return false;
    }
}

// Adicionar sistema OTRS
async function addOtrsSystem() {
    const name = document.getElementById('otrsName').value.trim();
    const baseUrl = document.getElementById('otrsUrl').value.trim();
    const selectedProfile = document.getElementById('userProfile').value;

    // Validações detalhadas com mensagens específicas
    if (!name) {
        showStatus('Por favor, informe o nome do sistema OTRS', 'error');
        return;
    }
    
    if (!baseUrl) {
        showStatus('Por favor, informe a URL do sistema OTRS', 'error');
        return;
    }
    
    if (!selectedProfile) {
        showStatus('Por favor, selecione o perfil do usuário. Use "Carregar Perfis" ou "Inserir Manualmente"', 'error');
        return;
    }

    // Validar URL
    if (!isValidUrl(baseUrl)) {
        showStatus('URL inválida. Verifique se a URL está correta', 'error');
        return;
    }

    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    
    // Solicitar permissões para o novo sistema
    const permissionsGranted = await requestPermissionsForSystem(normalizedUrl);

    const newSystem = {
        id: generateId(),
        name: name,
        baseUrl: normalizedUrl,
        userProfile: selectedProfile,
        enabled: true,
        hasPermissions: permissionsGranted
    };

    currentConfig.otrs_systems.push(newSystem);
    
    // Limpar campos
    document.getElementById('otrsName').value = '';
    document.getElementById('otrsUrl').value = '';
    document.getElementById('userProfile').value = '';
    document.getElementById('profileGroup').style.display = 'none';
    document.getElementById('addOtrsBtn').disabled = true;
    document.getElementById('loadProfilesBtn').disabled = true;
    
    await renderOtrsSystems();
    
    if (permissionsGranted) {
        showStatus('Sistema OTRS adicionado com sucesso! Permissões concedidas.', 'success');
    } else {
        showStatus('Sistema OTRS adicionado, mas sem permissões. Clique em "Conceder Permissões" para habilitá-lo.', 'warning');
    }
}

// Alternar sistema OTRS
function toggleOtrsSystem(id, enabled) {
    const system = currentConfig.otrs_systems.find(s => s.id === id);
    if (system) {
        system.enabled = enabled;
        renderOtrsSystems();
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
function saveEditedSystem() {
    if (!editingSystemId) return;
    
    const name = document.getElementById('editOtrsName').value.trim();
    const baseUrl = document.getElementById('editOtrsUrl').value.trim();
    const userProfile = document.getElementById('editUserProfile').value;

    // Validações
    if (!name || !baseUrl || !userProfile) {
        showStatus('Todos os campos são obrigatórios', 'error');
        return;
    }

    if (!isValidUrl(baseUrl)) {
        showStatus('URL inválida', 'error');
        return;
    }

    // Encontrar e atualizar o sistema
    const system = currentConfig.otrs_systems.find(s => s.id === editingSystemId);
    if (system) {
        system.name = name;
        system.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        system.userProfile = userProfile;
        
        renderOtrsSystems();
        closeEditModal();
        showStatus('Sistema OTRS atualizado com sucesso!', 'success');
    } else {
        showStatus('Erro ao atualizar sistema', 'error');
    }
}

// Fechar modal de edição
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restaurar scroll da página
    editingSystemId = null;
    
    // Limpar campos
    document.getElementById('editOtrsName').value = '';
    document.getElementById('editOtrsUrl').value = '';
    document.getElementById('editUserProfile').value = '';
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
    showStatus(`Sistema "${system.name}" removido com sucesso`, 'success');
    
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
        await chrome.storage.sync.set({ helpOtrsConfig: currentConfig });
        showStatus('Configurações salvas com sucesso!', 'success');
        
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
        showStatus('Erro ao salvar configurações', 'error');
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
        
        showStatus('Configurações restauradas para o padrão', 'success');
    } catch (error) {
        console.error('Erro ao resetar configurações:', error);
        showStatus('Erro ao resetar configurações', 'error');
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

// Gerar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
