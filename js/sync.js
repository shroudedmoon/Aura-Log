document.addEventListener('DOMContentLoaded', () => {
    const myPeerIdEl = document.getElementById('my-peer-id');
    const connectBtn = document.getElementById('connect-btn');
    const remoteIdInput = document.getElementById('remote-peer-id');
    const syncLog = document.getElementById('sync-log');

    let peer;

    function log(msg) {
        syncLog.textContent += `> ${msg}\n`;
        syncLog.scrollTop = syncLog.scrollHeight;
    }

    try {
        peer = new Peer(); 
        
        peer.on('open', (id) => {
            myPeerIdEl.textContent = id;
            log(`Pronto. Meu ID: ${id}`);
        });

        peer.on('connection', (conn) => {
            log(`Conexão recebida de ${conn.peer}`);
            handleConnection(conn);
        });

        peer.on('error', (err) => {
            log(`Erro: ${err.type}`);
        });

    } catch (e) {
        log(`Falha ao carregar PeerJS: ${e.message}`);
    }

    connectBtn.addEventListener('click', () => {
        const remoteId = remoteIdInput.value.trim();
        if (!remoteId) return;

        log(`Conectando a ${remoteId}...`);
        const conn = peer.connect(remoteId);
        handleConnection(conn);
    });

    function handleConnection(conn) {
        conn.on('open', async () => {
            log('Conexão estabelecida! Enviando dados locais...');
            const allDreams = await window.db.getAllDreams();
            const savedDreams = allDreams.filter(d => !d.isDraft);
            
            conn.send({
                type: 'sync',
                dreams: savedDreams
            });
            log(`Enviadas ${savedDreams.length} entradas.`);
        });

        conn.on('data', async (data) => {
            if (data.type === 'sync') {
                log(`Recebidas ${data.dreams.length} entradas do dispositivo.`);
                let added = 0;
                for (const dream of data.dreams) {
                    const existing = await window.db.getDream(dream.id);
                    if (!existing) {
                        await window.db.saveDream(dream);
                        added++;
                    }
                }
                log(`Sincronização completa. ${added} novas entradas adicionadas.`);
            }
        });
        
        conn.on('close', () => {
            log('Conexão encerrada.');
        });
    }
});
