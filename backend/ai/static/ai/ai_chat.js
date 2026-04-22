(function(){
  const toggle = document.getElementById('ai-chat-toggle');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const messagesBox = document.getElementById('ai-chat-messages');
  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');

  if (!toggle || !chatWindow || !messagesBox || !input || !sendBtn) {
    return;
  }

  function scrollToBottom() {
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function renderMessage(text, sender) {
    const container = document.createElement('div');
    container.className = `ai-message ${sender}`;
    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';
    bubble.textContent = text;
    container.appendChild(bubble);
    messagesBox.appendChild(container);
    scrollToBottom();
  }

  function renderCards(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return;
    const row = document.createElement('div');
    row.className = 'ai-card-row';
    cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'ai-card';
      cardEl.innerHTML = `<strong>${card.title}</strong><br/><span>${card.value}</span>`;
      row.appendChild(cardEl);
    });
    messagesBox.appendChild(row);
    scrollToBottom();
  }

  function setLoading(isLoading) {
    if (isLoading) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Đang gửi...';
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Gửi';
    }
  }

  function askAI() {
    const question = input.value.trim();
    if (!question) {
      return;
    }

    renderMessage(question, 'user');
    input.value = '';
    setLoading(true);

    fetch('/api/ai/chat/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
      credentials: 'include'
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
        renderMessage('Lỗi: ' + (error.message || 'Không thể kết nối AI.').toString(), 'ai');
      })
      .finally(() => setLoading(false));
  }

  toggle.addEventListener('click', () => {
    const hidden = chatWindow.classList.toggle('hidden');
    if (!hidden) {
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
})();
