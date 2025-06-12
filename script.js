// script.js - VERSÃO FINAL CORRIGIDA

// ===================================================================
// PARTE 1: CONFIGURAÇÃO - COLOQUE SUAS CHAVES REAIS AQUI
// ===================================================================
const GOTO_CLIENT_ID = "13f17265-c6e5-440b-adb8-a63604521d6e";
const GOOGLE_API_KEY = "3KDl5mjahOTRPUCenZzmDtLo";

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
    const fetchRecordingsButton = document.getElementById('fetchRecordingsButton');
    const statusText = document.getElementById('statusText');
    const recordingsListDiv = document.getElementById('gotoRecordingsList');
    // Adicione os seletores para a parte de análise aqui quando formos implementar
    
    function updateStatus(message) {
        if(statusText) statusText.textContent = message;
    }

    // Função que redireciona o usuário para a página de autenticação do GoTo
    function startAuthenticationFlow() {
        if (!GOTO_CLIENT_ID || GOTO_CLIENT_ID.includes("SEU_CLIENT_ID")) {
            alert('ERRO: Por favor, edite o arquivo script.js e insira seu Client ID real no topo do arquivo.');
            return;
        }
        updateStatus('Redirecionando para autorização do GoTo...');
        const REDIRECT_URI = window.location.origin + window.location.pathname;
        const scopes = "recording.v1.read cr.v1.read";
        const authUrl = `https://identity.goto.com/oauth/authorize?response_type=code&client_id=${GOTO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
        window.location.href = authUrl;
    }

    // Função que é chamada quando o GoTo redireciona de volta com um código
    async function handleAuthCallback(code) {
        updateStatus('Autenticando com GoTo...');
        try {
            const response = await fetch('https://api.getgo.com/oauth/v2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: window.location.origin + window.location.pathname,
                    client_id: GOTO_CLIENT_ID,
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error_description || 'Falha ao obter token de acesso.');
            }
            const data = await response.json();
            sessionStorage.setItem('goto_access_token', data.access_token);
            await fetchAndDisplayRecordings();
        } catch (error) {
            updateStatus(`Erro de autenticação: ${error.message}`);
            console.error("Erro no callback:", error);
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Função para buscar e exibir a lista de gravações
    async function fetchAndDisplayRecordings() {
        const accessToken = sessionStorage.getItem('goto_access_token');
        if (!accessToken) {
            updateStatus('Não autenticado. Por favor, conecte-se.');
            return;
        }
        updateStatus('Buscando gravações...');
        try {
            const response = await fetch('https://api.getgo.com/connect/v1/recordings', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar gravações.');
            
            const data = await response.json();
            recordingsListDiv.innerHTML = ''; // Limpa a lista
            
            if (data.results && data.results.length > 0) {
                data.results.forEach(rec => {
                    const item = document.createElement('div');
                    item.className = 'recording-item';
                    item.innerHTML = `<span>Chamada de ${new Date(rec.startTime).toLocaleString('pt-BR')}</span><button data-id="${rec.recordingId}">Analisar</button>`;
                    recordingsListDiv.appendChild(item);
                });
                updateStatus(`${data.results.length} gravações encontradas.`);
            } else {
                updateStatus('Nenhuma gravação encontrada.');
            }
        } catch(error) {
            updateStatus(`Erro ao buscar gravações: ${error.message}`);
            console.error("Erro ao buscar gravações:", error);
        }
    }
    
    // --- Lógica de Inicialização e Eventos ---

    // Verifica se o botão principal existe antes de adicionar o evento
    if (fetchRecordingsButton) {
        fetchRecordingsButton.addEventListener('click', startAuthenticationFlow);
    } else {
        console.error("ERRO CRÍTICO: Botão com id 'fetchRecordingsButton' não encontrado no HTML.");
    }
    
    // Adiciona o evento para os botões "Analisar" que serão criados
    if (recordingsListDiv) {
        recordingsListDiv.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-id]');
            if(button) {
                const recordingId = button.dataset.id;
                alert(`Análise da gravação ${recordingId} será implementada no próximo passo.`);
            }
        });
    }

    // Roda quando a página carrega
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        handleAuthCallback(code);
    } else {
        updateStatus('Pronto.');
    }
});