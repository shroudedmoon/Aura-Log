**Persona:**
Atue como um Engenheiro de Software Senior e Arquiteto Frontend Expert em JavaScript Vanilla (ES6+), PWA (Service Workers, Web Notifications), IndexedDB, D3.js, HTML5 Semântico e CSS3 Moderno (Design System com variáveis, Flexbox, Grid e UI/UX mística/cyberpunk).

**Contexto:**
Estamos reformulando o PWA **Aura-Log** (Diário de Sonhos), composto atualmente por arquivos como `index.html`[cite: 1], `styles.css`[cite: 10], `db.js`[cite: 6], `app.js`[cite: 5], `analysis.js`[cite: 4], `gemini.js`[cite: 7], `incubation.js`[cite: 8], `sync.js`[cite: 9] e `sw.js`[cite: 3]. O aplicativo utiliza um tema escuro e onírico com acentos em ciano, magenta e roxo (`--bg-color: #0b0614`)[cite: 10].

---

### 🎯 Tarefas e Especificações de Refatoração

#### 1. Remoção da Função de Incubação de Sonho
- **Remoção de Arquivos e Código:** Remover completamente o módulo `incubation.js`[cite: 8] e sua inclusão nas tags de script da `index.html`[cite: 1].
- **Remoção de Cache no SW:** Atualizar o `sw.js` para remover `./js/incubation.js` da lista de `ASSETS`[cite: 3].
- **UI/Navegação:** Eliminar a aba/seção `<div id="view-incubation">`[cite: 1] e o botão correspondente da barra de navegação inferior (`<button class="nav-btn" data-target="view-incubation">`)[cite: 1].
- **IndexedDB:** Limpar instâncias ou chamadas relativas à `activeIncubation` no banco local[cite: 8].

#### 2. Adição do Módulo "Dashboard" (Novo Painel de Controle)
- **Substituição na Navegação:** Alocar o ícone/botão da aba removida para o novo **Dashboard** (substituindo a aba "Incubar" por "Dashboard")[cite: 1].
- **Interface e Métrica (UI/UX):**
  - **Cards Místicos de Estatísticas (Overview):**
    - Total de sonhos registrados.
    - Frequência/porcentagem de Sonhos Lúcidos vs. Pesadelos (baseado nas tags).
    - Sequência atual (Streak) de dias consecutivos registrantes.
  - **Gráfico de Atividade:** Gráfico ou visualização rápida de frequência de registros nos últimos 30 dias.
  - **Núcleos de Símbolos:** Exibição elegante das 5 tags mais frequentes registradas.
- **Integração com IndexedDB:** Criar funções otimizadas em `db.js` ou em um novo `dashboard.js` para realizar buscas agregadas de forma rápida sem travar a thread principal[cite: 6].

#### 3. Refinamento do Sistema de Notificações (Checagens de Realidade)
- **Migração da Lógica:** Desvincular as Checagens de Realidade do arquivo `incubation.js`[cite: 8] e centralizar em um módulo dedicado `notifications.js`.
- **Melhorias de UX/UI em Ajustes (`view-settings`):**
  - Interface intuitiva com botão *toggle* claro[cite: 1, 8], slider de intervalo com *feedback* imediato e seletores de horário limite (ex: *não notificar durante a noite/horário de sono*).
  - Teste de notificação instantâneo (botão "Testar Alerta").
- **Robustez PWA & Service Worker:**
  - Garantir fallback adequado quando o navegador/S.O. bloquear notificações.
  - Otimizar o *loop* de checagem (`setInterval`) para evitar consumo excessivo de bateria em background no mobile.

#### 4. Otimização de Funções, Refatoração e Performance JavaScript
- **Modularização & Clean Code:** Refatorar scripts espalhados para evitar contaminação do escopo global (`window.*`)[cite: 4, 5, 8].
- **Gerenciamento de Memória & D3.js:** Na visualização da constelação em `analysis.js`, garantir o descarte correto do SVG e limpezas das simulações D3 (`simulation.stop()`) antes de redesenhar para evitar *memory leaks*[cite: 4].
- **Tratamento de Erros:** Padronizar retornos das chamadas da API Gemini (`gemini.js`)[cite: 7] e do IndexedDB (`db.js`)[cite: 6] com respostas visuais elegantes para o usuário em caso de falha de conexão ou chave inválida.

#### 5. Melhorias Gerais de UI e UX
- **Responsividade & Layout:** Ajustar o *Grid* desktop e a visualização mobile para que a navegação e o scroll de entradas no histórico sejam mais fluidos[cite: 10].
- **Microinterações:** Adicionar animações suaves (*fade/slide*) na troca de abas, feedback tátil/visual ao salvar rascunhos e tags interativas com efeito *glow* inspirados no estilo do app[cite: 10].
- **Acessibilidade & Usabilidade:** Ajustar contraste de fontes secundárias e garantir estados de *focus/active* adequados em botões e inputs[cite: 10].

---

### ⚠️ REGRA EXECUTIVA DE PROGRESSO (MANDATÓRIO)

A cada etapa ou arquivo concluído, **você deve atualizar e exibir uma lista de validação usando checkboxes em Markdown (`[ ]` para pendente e `[x]` para concluído)** no final da resposta. Isso permitirá rastrear o progresso e retomar exatamente de onde paramos caso haja uma pausa ou mudança de contexto.

Utilize o seguinte modelo de checklist nas suas respostas:

- [ ] **Passo 1:** Limpeza do projeto (Remover `incubation.js`[cite: 8], referências na `index.html`[cite: 1] e atualizações no `sw.js`[cite: 3]).
- [ ] **Passo 2:** Criar o módulo de Notificações refinado (`notifications.js`) e atualizar as configurações[cite: 1, 8].
- [ ] **Passo 3:** Implementar a view e a lógica do novo Dashboard na `index.html`[cite: 1] e scripts.
- [ ] **Passo 4:** Refatorar e otimizar `analysis.js` (D3.js / Constelação)[cite: 4] e chamadas IndexedDB (`db.js`)[cite: 6].
- [ ] **Passo 5:** Ajustar refinamentos visuais de UI/UX em `styles.css`[cite: 10] e navegação mobile/desktop[cite: 5, 10].

Comece agora pelo **Passo 1**, fornecendo as modificações nos arquivos necessários e o checklist atualizado.