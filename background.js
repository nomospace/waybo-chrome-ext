// background.js - FinView Background Service Worker
// 处理 API 请求，绕过 CORS 限制

const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const MODEL = 'qwen-turbo';

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAI') {
    handleAICall(request.content, request.apiKey)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

async function handleAICall(content, apiKey) {
  const prompt = `用户需分析复盘文字，从拆解核心主旨、底层逻辑、情绪及市场洞察入手，进一步梳理关键观点与吐槽点，分层次展开分析。

以下是需要分析的内容：

${content}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        messages: [
          { role: 'system', content: '你是专业的财经分析师，擅长解读财经内容。请用简洁易懂的语言回答。' },
          { role: 'user', content: prompt }
        ]
      },
      parameters: {
        temperature: 0.3,
        max_tokens: 2000
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `API 错误 (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.message || errJson.error) {
        errMsg = `${errMsg}: ${errJson.message || errJson.error}`;
      }
      if (errJson.code) {
        errMsg = `${errMsg} (code: ${errJson.code})`;
      }
    } catch (e) {
      if (errText) {
        errMsg = `${errMsg}: ${errText.substring(0, 200)}`;
      }
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  const output = data.output || {};
  let result = output.text || '';
  
  if (!result && data.choices) {
    result = data.choices[0]?.message?.content || '';
  }

  if (!result) {
    throw new Error('AI 返回为空');
  }

  return result.trim();
}