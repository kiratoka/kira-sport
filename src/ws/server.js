import { WebSocket, WebSocketServer } from 'ws'
import { wsArcjet } from '../arcjet.js';
    
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

    wss.on('connection', async (socket, req) => {

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
                    socket.close(code, reason);
                    return;
                }
            }

            catch (e) {
                console.error("WS connection error", e);
                socket.close(1011, "Server security error");
                return;
            }
        }


        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });

        socket.subscriptions = new Set();

        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            handleMessage(socket, data);
        });

        socket.on('error', () => {
            socket.terminate();
        });

        socket.on('close', () => {
            cleanupSubscriptions(socket);
        })

        socket.on('error', console.error);
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        })
    }, 30000);

    wss.on('close', () => clearInterval(interval));
    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated };
}