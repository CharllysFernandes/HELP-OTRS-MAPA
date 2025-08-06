HELP OTRS - Extensão Configurável para Múltiplos Sistemas OTRS
================================================================

INSTALAÇÃO:
----------
1 - Abra o navegador Google Chrome;
2 - Acesse o site: chrome://extensions/
3 - Ative o modo de desenvolvedor, no canto superior direito da tela;
4 - Clique em "Carregar sem compactação";
5 - Procure o diretório onde você extraiu o arquivo ZIP, abra a pasta e clique no botão selecionar pasta;

CONFIGURAÇÃO:
------------
1 - Após a instalação, clique no ícone da extensão na barra de ferramentas;
2 - A página de configurações será aberta automaticamente;

3 - Para adicionar um novo sistema OTRS:
   a) Digite o nome do sistema (Ex: MAPA, SFB, MT)
   b) Digite a URL base do OTRS (Ex: https://sistema.agro.gov.br/otrs/)
   c) Clique em "Carregar Perfis" - a extensão buscará automaticamente os perfis disponíveis
   d) Selecione seu perfil/nível no dropdown
   e) Clique em "Adicionar Sistema"

4 - Configure as funcionalidades:
   - Alertas de Fila
   - Alertas de Tipo de Atendimento  
   - Alertas de Classificação de Serviço
   - Validação de Fila

5 - Salve as configurações

NOVO FLUXO DE CONFIGURAÇÃO:
--------------------------
✅ Detecção automática de perfis de usuário
✅ Não é mais necessário inserir URL do perfil manualmente
✅ Sistema inteligente que busca os perfis diretamente do OTRS
✅ Dropdown com todos os perfis disponíveis (Cliente, CSC, Nível 1, Nível 2, Nível 3)

FUNCIONALIDADES:
---------------
✅ Suporte a múltiplos sistemas OTRS
✅ Configuração automática de perfis de usuário
✅ Controle granular de funcionalidades
✅ Interface de configuração intuitiva
✅ Backup automático das configurações
✅ Detecção inteligente de níveis/perfis

SISTEMAS SUPORTADOS:
-------------------
- MAPA (pré-configurado)
- SFB
- MT
- Outros sistemas OTRS governamentais

VERSÃO: 2.0.0
AUTORES: João Felipe Lima e Charllys Fernandes

SOLUÇÃO DE PROBLEMAS:
--------------------
Se os botões "Editar" e "Remover" não estiverem funcionando:

1. Abra as Ferramentas do Desenvolvedor (F12)
2. Vá para a aba "Console"
3. Clique nos botões problemáticos
4. Verifique se aparecem mensagens de erro no console
5. Se houver erros de "função não definida", recarregue a página de configurações

Comandos de teste no console:
- editOtrsSystem('ID_DO_SISTEMA')
- removeOtrsSystem('ID_DO_SISTEMA')

Para encontrar o ID de um sistema, execute no console:
- console.log(window.currentConfig?.otrs_systems)