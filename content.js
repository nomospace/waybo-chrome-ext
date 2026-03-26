// content.js - FinView 财经内容 AI 解读
// 选中文字 → 弹出 AI 解读按钮 → 点击解读 → 结果显示在原文下方

(function() {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    minTextLength: 10,
  };

  // ==================== 状态 ====================
  let apiKey = null;
  let selectionButton = null;
  let savedSelection = null;
  let savedRect = null;
  let isLoading = false;
  let resultId = 0; // 用于生成唯一 ID

  // ==================== 加载 API Key ====================
  async function loadApiKey() {
    if (apiKey) return apiKey;
    
    return new Promise((resolve) => {
      chrome.storage.local.get(['finview_apikey'], (result) => {
        if (result.finview_apikey) {
          apiKey = result.finview_apikey;
          resolve(apiKey);
        } else {
          resolve(null);
        }
      });
    });
  }

  // ==================== 文本选择监听 ====================
  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('#finview-btn') || e.target.closest('.finview-result')) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        hideButton();
        return;
      }

      const text = selection.toString().trim();

      if (text && text.length >= CONFIG.minTextLength) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          savedSelection = text;
          savedRect = rect;
          
          showButton(rect);
        } catch (e) {
          hideButton();
        }
      } else {
        savedSelection = null;
        savedRect = null;
        hideButton();
      }
    }, 50);
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#finview-btn') && !e.target.closest('.finview-result')) {
      hideButton();
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (!text || text.length < CONFIG.minTextLength) {
          savedSelection = null;
          savedRect = null;
        }
      }, 100);
    }
  });

  window.addEventListener('scroll', hideButton, { passive: true });

  // ==================== UI 组件 ====================
  function showButton(rect) {
    hideButton();

    selectionButton = document.createElement('div');
    selectionButton.id = 'finview-btn';
    selectionButton.innerHTML = `
      <span class="finview-btn-icon">🦞</span>
      <span class="finview-btn-text">AI 解读</span>
    `;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let left = rect.right + scrollLeft + 10;
    let top = rect.top + scrollTop - 5;

    if (left + 120 > window.innerWidth + scrollLeft) {
      left = rect.left + scrollLeft - 130;
    }
    if (top < scrollTop + 10) {
      top = rect.bottom + scrollTop + 10;
    }

    selectionButton.style.left = `${left}px`;
    selectionButton.style.top = `${top}px`;

    selectionButton.addEventListener('click', handleInterpret);
    document.body.appendChild(selectionButton);
  }

  function hideButton() {
    if (selectionButton) {
      selectionButton.remove();
      selectionButton = null;
    }
  }

  function showLoading(rect) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    resultId++;
    const currentId = `finview-result-${resultId}`;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'finview-result finview-loading';
    resultDiv.id = currentId;
    resultDiv.innerHTML = `
      <div class="finview-loading-inner">
        <span class="finview-spinner"></span>
        <span>AI 解读中...</span>
      </div>
    `;

    positionResult(resultDiv, rect, scrollTop, scrollLeft);
    document.body.appendChild(resultDiv);
    
    return currentId;
  }

  function showResult(rect, content) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    resultId++;
    const currentId = `finview-result-${resultId}`;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'finview-result';
    resultDiv.id = currentId;
    resultDiv.innerHTML = `
      <div class="finview-header">
        <span class="finview-logo">🦞</span>
        <span class="finview-title">AI 解读</span>
        <button class="finview-close" data-id="${currentId}">✕</button>
      </div>
      <div class="finview-content">${escapeHtml(content)}</div>
    `;

    positionResult(resultDiv, rect, scrollTop, scrollLeft);
    document.body.appendChild(resultDiv);
    
    // 绑定关闭按钮事件
    resultDiv.querySelector('.finview-close').addEventListener('click', () => {
      resultDiv.remove();
    });
  }

  function positionResult(resultDiv, rect, scrollTop, scrollLeft) {
    if (!resultDiv) return;

    let left = rect.left + scrollLeft;
    let top = rect.bottom + scrollTop + 12;
    const maxWidth = Math.min(Math.max(rect.width, 400), 550);

    if (left + maxWidth > window.innerWidth + scrollLeft - 20) {
      left = window.innerWidth + scrollLeft - maxWidth - 20;
    }
    if (left < scrollLeft + 10) {
      left = scrollLeft + 10;
    }

    resultDiv.style.left = `${left}px`;
    resultDiv.style.top = `${top}px`;
    resultDiv.style.width = `${maxWidth}px`;
  }

  function showError(rect, message) {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    resultId++;
    const currentId = `finview-result-${resultId}`;
    
    let errorTitle = '解读失败';
    if (message.includes('配置 API Key')) {
      errorTitle = '未配置';
    }
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'finview-result finview-error';
    resultDiv.id = currentId;
    resultDiv.innerHTML = `
      <div class="finview-header">
        <span class="finview-logo">🦞</span>
        <span class="finview-title">${errorTitle}</span>
        <button class="finview-close" data-id="${currentId}">✕</button>
      </div>
      <div class="finview-content">
        <div class="finview-error-detail">${escapeHtml(message)}</div>
      </div>
    `;

    positionResult(resultDiv, rect, scrollTop, scrollLeft);
    document.body.appendChild(resultDiv);
    
    // 绑定关闭按钮事件
    resultDiv.querySelector('.finview-close').addEventListener('click', () => {
      resultDiv.remove();
    });
    
    console.error('[FinView]', message);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // ==================== AI 请求 ====================
  async function handleInterpret() {
    if (isLoading) return;

    const text = savedSelection;
    const rect = savedRect;

    if (!text || !rect) {
      return;
    }

    hideButton();
    isLoading = true;

    const loadingId = showLoading(rect);

    try {
      const key = await loadApiKey();
      
      if (!key) {
        document.getElementById(loadingId)?.remove();
        showError(rect, '请点击扩展图标配置 API Key');
        return;
      }
      
      // 通过 background.js 调用 API（绕过 CORS）
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'callAI', content: text, apiKey: key },
          (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          }
        );
      });
      
      // 移除 loading
      document.getElementById(loadingId)?.remove();
      
      if (!response.success) {
        showError(rect, response.error || 'AI 调用失败');
      } else {
        showResult(rect, response.result);
      }
    } catch (e) {
      document.getElementById(loadingId)?.remove();
      showError(rect, e.message);
    } finally {
      isLoading = false;
    }
  }

})();