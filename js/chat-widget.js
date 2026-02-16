/* ==========================================================================
   Scrap Chat Widget — PowerScraper Pro
   Vanilla JS, zero dependencies
   ========================================================================== */
(() => {
  'use strict';

  const API_URL = '/api/chat';
  const WELCOME_MSG = "Hey! 👋 I'm Scrap, the PowerScraper Pro assistant. Ask me anything about the app — features, setup, platforms, artwork, you name it!";
  const MAX_HISTORY = 20;

  let isOpen = false;
  let isLoading = false;
  let messages = []; // {role: 'user'|'assistant', content: string}

  // --- Build DOM ---
  function init() {
    // Toggle button
    const toggle = el('button', { class: 'scrap-toggle', 'aria-label': 'Open chat', title: 'Chat with Scrap' });
    toggle.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="scrap-toggle__dot"></span>
    `;

    // Chat window
    const chat = el('div', { class: 'scrap-chat', role: 'dialog', 'aria-label': 'Chat with Scrap' });
    chat.innerHTML = `
      <div class="scrap-chat__header">
        <div class="scrap-chat__avatar">🎬</div>
        <div class="scrap-chat__info">
          <div class="scrap-chat__name">Scrap</div>
          <div class="scrap-chat__status">
            <span class="scrap-chat__status-dot"></span>
            PowerScraper Pro Assistant
          </div>
        </div>
        <button class="scrap-chat__close" aria-label="Close chat">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>
      </div>
      <div class="scrap-chat__messages" id="scrapMessages"></div>
      <div class="scrap-chat__input-area">
        <textarea class="scrap-chat__input" id="scrapInput" placeholder="Ask about PowerScraper Pro..." rows="1" maxlength="1000"></textarea>
        <button class="scrap-chat__send" id="scrapSend" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="scrap-chat__footer">Powered by AI · May occasionally be wrong</div>
    `;

    document.body.appendChild(toggle);
    document.body.appendChild(chat);

    // Refs
    const msgContainer = document.getElementById('scrapMessages');
    const input = document.getElementById('scrapInput');
    const sendBtn = document.getElementById('scrapSend');
    const closeBtn = chat.querySelector('.scrap-chat__close');

    // Show welcome message
    addBotMessage(WELCOME_MSG, msgContainer);

    // --- Helper: open/close chat ---
    function openChat() {
      isOpen = true;
      chat.classList.add('scrap-chat--visible');
      toggle.classList.add('scrap-toggle--open');
      toggle.setAttribute('aria-label', 'Close chat');
      if (window.innerWidth <= 480) document.body.style.overflow = 'hidden';
      input.focus();
    }

    function closeChat() {
      isOpen = false;
      chat.classList.remove('scrap-chat--visible');
      toggle.classList.remove('scrap-toggle--open');
      toggle.setAttribute('aria-label', 'Open chat');
      chat.style.height = '';
      chat.style.transform = '';
      document.body.style.overflow = '';
    }

    // --- Events ---
    toggle.addEventListener('click', () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);

    sendBtn.addEventListener('click', () => sendMessage(input, msgContainer, sendBtn));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input, msgContainer, sendBtn);
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
        toggle.focus();
      }
    });

    // Mobile: handle virtual keyboard resize
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (isOpen && window.innerWidth <= 480) {
          chat.style.height = window.visualViewport.height + 'px';
          scrollToBottom(msgContainer);
        }
      });
      window.visualViewport.addEventListener('scroll', () => {
        if (isOpen && window.innerWidth <= 480) {
          chat.style.transform = `translateY(${window.visualViewport.offsetTop}px)`;
        }
      });
    }

    // Mobile: prevent body scroll when chat is open (allow scrolling messages)
    chat.addEventListener('touchmove', (e) => {
      if (e.target === msgContainer || msgContainer.contains(e.target)) return;
      e.preventDefault();
    }, { passive: false });
  }

  // --- Send Message ---
  async function sendMessage(input, container, sendBtn) {
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Add user message
    addUserMessage(text, container);
    messages.push({ role: 'user', content: text });

    input.value = '';
    input.style.height = 'auto';
    isLoading = true;
    sendBtn.disabled = true;

    // Show typing indicator
    const typing = showTyping(container);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-MAX_HISTORY) }),
      });

      const data = await res.json();
      removeTyping(typing, container);

      if (data.error) {
        addBotMessage("Oops, something went wrong on my end. Try again in a sec! 😅", container);
      } else {
        const reply = data.reply;
        addBotMessage(reply, container);
        messages.push({ role: 'assistant', content: reply });
      }
    } catch (err) {
      removeTyping(typing, container);
      addBotMessage("Hmm, I can't reach my brain right now. Check your internet and try again! 🔌", container);
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // --- Message Rendering ---
  function addUserMessage(text, container) {
    const msg = el('div', { class: 'scrap-msg scrap-msg--user' });
    msg.textContent = text;
    container.appendChild(msg);
    scrollToBottom(container);
  }

  function addBotMessage(text, container) {
    const msg = el('div', { class: 'scrap-msg scrap-msg--bot' });
    msg.innerHTML = formatMessage(text);
    container.appendChild(msg);
    scrollToBottom(container);
  }

  function showTyping(container) {
    const typing = el('div', { class: 'scrap-typing' });
    typing.innerHTML = `
      <span class="scrap-typing__dot"></span>
      <span class="scrap-typing__dot"></span>
      <span class="scrap-typing__dot"></span>
    `;
    container.appendChild(typing);
    scrollToBottom(container);
    return typing;
  }

  function removeTyping(typing, container) {
    if (typing && typing.parentNode === container) {
      container.removeChild(typing);
    }
  }

  // --- Simple Markdown-ish formatting ---
  function formatMessage(text) {
    return text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Inline code `text`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  // --- Helpers ---
  function el(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function scrollToBottom(container) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  // --- Init on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
