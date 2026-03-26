// popup.js - FinView 设置页面

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  
  // 加载已保存的 API Key
  chrome.storage.local.get(['finview_apikey'], (result) => {
    if (result.finview_apikey) {
      apiKeyInput.value = result.finview_apikey;
    }
  });
  
  // 保存
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('请输入 API Key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('API Key 格式错误，应以 sk- 开头', 'error');
      return;
    }
    
    chrome.storage.local.set({ finview_apikey: apiKey }, () => {
      showStatus('保存成功！', 'success');
    });
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});