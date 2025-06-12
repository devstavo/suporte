// server.js
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // para fazer chamadas de API

const app = express();
const port = 3001;

// Middlewares
app.use(cors()); // Permite que o frontend se comunique com este backend
app.use(express.json()); // Permite que o servidor entenda JSON
app.get('/config', (req, res) => {
    // Enviamos apenas o Client ID, que é seguro de ser exposto no frontend
    res.json({
        gotoClientId: process.env.GOTO_CLIENT_ID 
    });
});

const GOTO_CLIENT_ID = process.env.GOTO_CLIENT_ID;
const GOTO_CLIENT_SECRET = process.env.GOTO_CLIENT_SECRET;

let gotoAccessToken = null; // Vamos armazenar o token de acesso em memória (simples)

// Endpoint para trocar o código de autorização por um token
app.post('/exchange-token', async (req, res) => {
    const { code } = req.body;
    const redirectUri = 'http://127.0.0.1:5500/index.html'; // A URL exata do seu frontend

    if (!code) {
        return res.status(400).json({ error: 'Código de autorização ausente.' });
    }

    try {
        const basicAuth = Buffer.from(`${GOTO_CLIENT_ID}:${GOTO_CLIENT_SECRET}`).toString('base64');
        const response = await fetch('https://api.getgo.com/oauth/v2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error_description || 'Falha ao obter token');
        }

        gotoAccessToken = data.access_token; // Salva o token
        console.log("Token de acesso do GoTo obtido com sucesso!");
        res.json({ success: true, message: 'Autenticado com sucesso!' });

    } catch (error) {
        console.error("Erro no /exchange-token:", error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para buscar o histórico de gravações
app.get('/get-recordings', async (req, res) => {
    if (!gotoAccessToken) {
        return res.status(401).json({ error: 'Não autenticado. Por favor, conecte-se com o GoTo primeiro.' });
    }

    try {
        const response = await fetch('https://api.getgo.com/connect/v1/recordings', {
            headers: { 'Authorization': `Bearer ${gotoAccessToken}` }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Falha ao buscar gravações do GoTo.');
        }
        
        console.log(`Encontradas ${data.results?.length || 0} gravações.`);
        res.json(data);

    } catch (error) {
        console.error("Erro no /get-recordings:", error);
        res.status(500).json({ error: error.message });
    }
});

// A lógica de transcrição e análise também pode ser movida para cá no futuro.

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});