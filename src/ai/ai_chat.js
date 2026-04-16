const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

function ensureChatWidgetHtml() {
  if (document.getElementById('ai-chat-widget')) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="ai-chat-widget" class="ai-chat-widget">
      <button id="ai-chat-toggle" class="ai-chat-toggle" aria-label="Open AI chat">💬</button>
      <div id="ai-chat-window" class="ai-chat-window hidden" role="dialog" aria-label="Finance AI Assistant">
        <div class="ai-chat-header">
          <span>Finance AI Assistant</span>
          <button id="ai-chat-close" class="ai-chat-close" aria-label="Close">✕</button>
        </div>
        <div id="ai-chat-messages" class="ai-chat-messages"></div>
        <div class="ai-chat-controls">
          <input id="ai-chat-input" type="text" placeholder="Hỏi AI về thu chi..." autocomplete="off" />
          <button id="ai-chat-send" class="ai-chat-send">Gửi</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
}

function initAIChat() {
  ensureChatWidgetHtml();

  const toggle = document.getElementById('ai-chat-toggle');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const messagesBox = document.getElementById('ai-chat-messages');
  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');

  if (!toggle || !chatWindow || !messagesBox || !input || !sendBtn) {
    console.warn('AI Chatbox: Some elements not found.');
    return;
  }

  const scrollToBottom = () => {
    if (!messagesBox) return;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const renderMessage = (text, sender) => {
    const container = document.createElement('div');
    container.className = `ai-message ${sender}`;
    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';
    bubble.textContent = text;
    container.appendChild(bubble);
    messagesBox.appendChild(container);
    scrollToBottom();
  };

  const renderCards = (cards) => {
    if (!Array.isArray(cards) || cards.length === 0) return;
    const row = document.createElement('div');
    row.className = 'ai-card-row';

    cards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'ai-card';
      cardEl.innerHTML = `<strong>${card.title}</strong><br/><span>${card.value}</span>`;
      row.appendChild(cardEl);
    });

    messagesBox.appendChild(row);
    scrollToBottom();
  };

  const setLoading = (isLoading) => {
    sendBtn.disabled = isLoading;
    sendBtn.textContent = isLoading ? 'Đang gửi...' : 'Gửi';
  };

  const askAI = () => {
    const question = input.value.trim();
    if (!question) {
      return;
    }

    renderMessage(question, 'user');
    input.value = '';
    setLoading(true);

    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {})
    };

    fetch(`${API_BASE}/api/ai/chat/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: question }),
    })
      .then(async (res) => {
        const responseBody = await res.json();
        if (!res.ok) {
          throw new Error(responseBody.text || 'Lỗi máy chủ');
        }
        renderMessage(responseBody.text || 'Không có phản hồi.', 'ai');
        renderCards(responseBody.cards);
      })
      .catch((error) => {
        renderMessage('Lỗi: ' + (error.message || 'Không thể kết nối AI.'), 'ai');
      })
      .finally(() => setLoading(false));
  };

  toggle.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
  });

  sendBtn.addEventListener('click', askAI);

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      askAI();
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initAIChat();
});
