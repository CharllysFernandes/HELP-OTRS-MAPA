import requests
import json
import os

token = os.environ.get('GITHUB_TOKEN')
headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Help-OTRS-Release-Manager/1.0'
}

# Testar criar um release simples
release_data = {
    'tag_name': 'v1.0.3-test',
    'name': 'Test Release v1.0.3',
    'body': 'Test release automático para validar permissões',
    'draft': True,
    'prerelease': False
}

response = requests.post(
    'https://api.github.com/repos/CharllysFernandes/HELP-OTRS-MAPA/releases',
    json=release_data,
    headers=headers
)

print(f'Status: {response.status_code}')
if response.status_code == 201:
    print('✅ Token funcionando! Release de teste criado com sucesso.')
    data = response.json()
    print(f'Release ID: {data.get("id")}')
    print(f'URL: {data.get("html_url")}')
else:
    print(f'❌ Erro: {response.text[:500]}')
