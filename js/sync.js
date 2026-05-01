document.addEventListener('DOMContentLoaded', async () => {
    const myPeerIdEl = document.getElementById('my-peer-id');
    const connectBtn = document.getElementById('connect-btn');
    const remoteIdInput = document.getElementById('remote-peer-id');
    const syncLog = document.getElementById('sync-log');

    let peer;

    function log(msg) {
        if (!syncLog) return;
        syncLog.textContent += `> ${msg}\n`;
        syncLog.scrollTop = syncLog.scrollHeight;
    }

    async function initPeer() {
        let savedId = await window.db.getSetting('myPeerId');
        
        try {
            // If we have a saved ID, try to use it
            peer = savedId ? new Peer(savedId) : new Peer(); 
            
            peer.on('open', async (id) => {
                if (!savedId) {
                    await window.db.saveSetting('myPeerId', id);
                }
                myPeerIdEl.textContent = id;
                log(`Pronto. Meu ID Permanente: ${id}`);
            });

            peer.on('connection', (conn) => {
                log(`Conexão recebida de ${conn.peer}`);
                handleConnection(conn);
            });

            peer.on('error', (err) => {
                log(`Erro: ${err.type}`);
                if (err.type === 'unavailable-id') {
                    log('ID já em uso. Gerando novo...');
                    window.db.saveSetting('myPeerId', null).then(() => initPeer());
                }
            });

        } catch (e) {
            log(`Falha ao carregar PeerJS: ${e.message}`);
        }
    }

    await initPeer();

    connectBtn.addEventListener('click', async () => {
        const remoteId = remoteIdInput.value.trim();
        if (!remoteId) return;

        log(`Conectando a ${remoteId}...`);
        const conn = peer.connect(remoteId);
        handleConnection(conn);
        
        // Save remote ID for future convenience (persistence)
        await window.db.saveSetting('lastRemotePeerId', remoteId);
    });

    // Auto-fill last remote ID if exists
    const lastRemote = await window.db.getSetting('lastRemotePeerId');
    if (lastRemote && remoteIdInput) {
        remoteIdInput.value = lastRemote;
    }

    function handleConnection(conn) {
        conn.on('open', async () => {
            log('Conexão estabelecida! Sincronizando dados...');
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
                log(`Sincronização completa. ${added} novas entradas.`);
                if (added > 0 && window.refreshAnalysis) window.refreshAnalysis();
            }
        });
        
        conn.on('close', () => {
            log('Conexão encerrada.');
        });
    }
});
