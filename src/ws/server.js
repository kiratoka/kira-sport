import { WebSocket, WebSocketServer } from 'ws'

// Fungsi utilitas untuk mengirim payload JSON ke satu socket.


function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
}

// Fungsi broadcast untuk kirim pesan ke SEMUA client terkoneksi.
// BUG: Di versi awal, di dalam loop semua client, fungsi `socket.send` yang dipanggil, padahal yang didefinisikan di for...of adalah `client`.
// Harusnya: `client.send`, bukan `socket.send`.
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload)); // Bug diperbaiki: gunakan 'client.send', bukan 'socket.send'
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024,
    });

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome' });

        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated };
}