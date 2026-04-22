(function() {
  const toggle = document.getElementById('advisor-chat-toggle');
  const chatWindow = document.getElementById('advisor-chat-window');
  const closeBtn = document.getElementById('advisor-chat-close');
  const messagesBox = document.getElementById('advisor-chat-messages');
  const input = document.getElementById('advisor-chat-input');
  const sendBtn = document.getElementById('advisor-chat-send');

  if (!toggle || !chatWindow || !messagesBox || !input || !sendBtn) {
    return;
  }

  function scrollToBottom() {
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function createMessageBubble(text, sender) {
    const container = document.createElement('div');
    container.className = `advisor-message ${sender}`;
    const bubble = document.createElement('div');
    bubble.className = 'advisor-message-bubble';
    bubble.textContent = text;
    container.appendChild(bubble);
    messagesBox.appendChild(container);
    scrollToBottom();
    return bubble;
  }

  function setLoading(isLoading) {
    sendBtn.disabled = isLoading;
    sendBtn.textContent = isLoading ? 'Đang trả lời...' : 'Gửi';
  }

  async function askAI() {
    const question = input.value.trim();
    if (!question) {
      return;
    }

    input.value = '';
    const userBubble = createMessageBubble(question, 'user');
    const assistantBubble = createMessageBubble('', 'assistant');
    setLoading(true);

    try {
      const response = await fetch('/api/advisor/stream/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: question }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errorText = body?.text || 'Lỗi máy chủ khi gọi API advisor.';
        assistantBubble.textContent = errorText;
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        assistantBubble.textContent = assistantText;
        scrollToBottom();
      }
    } catch (error) {
      assistantBubble.textContent = 'Lỗi: ' + (error.message || 'Không thể kết nối tới advisor.');
    } finally {
      setLoading(false);
    }
  }

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
})();
