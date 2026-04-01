const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const oldFunc = `async function generateMeetingFramework(goal) {
  const systemPrompt = '你是资深战略顾问，擅长将会议目标拆解为结构化的思考框架。\\n\\n生成思维导图 JSON，格式：\\n{"topic":"主题","children":[{"topic":"维度 1","children":[{"topic":"核心洞察"}]}]}\\n\\n严格规则：\\n1. 只生成 3-5 个一级分支（维度），每个分支 1-3 个子节点\\n2. 节点内容必须是「观点」或「判断」，不是数据罗列\\n3. 不要罗列数字、人名、日期等原始数据\\n4. 用简洁有力的短语表达核心洞察（如「下沉市场是增长突破口」而非「三线城市用户占比 53.6%」）\\n5. 一级分支加 emoji 前缀\\n6. 最多 3 层，不要更深\\n7. 只输出 JSON';
  addMessage('ai', '<div class="loading-dots"><span></span><span></span><span></span></div> 正在生成框架...');
  const result = await callAI(systemPrompt, '会议目标：' + goal);
  if (result) {
    try {
      const data = JSON.parse(result.match(/\\{[\\s\\S]*\\}/)[0]);
      renderMindmap(data); addMessage('ai', '会议框架已生成，围绕"' + goal + '"展开。');
      saveCurrentToHistory(goal);
    } catch(e) { addMessage('ai', '框架生成失败，请重试。'); }
  }
}`;

const newFunc = `async function generateMeetingFramework(goal) {
  const systemPrompt = \`你是资深会议引导师，擅长将会议目标拆解为结构化的思考框架，特别适合无领导小组讨论和需求评审会。

生成思维导图 JSON，格式：{"topic":"会议主题","children":[{"topic":"维度 1","children":[{"topic":"具体观点/行动项"}]}]}

严格规则：
1. 只生成 3-5 个一级分支（维度），每个分支 2-4 个子节点
2. **子节点必须有具体内容**，不能是"未命名"或空字符串
3. 节点内容必须是「观点」「判断」「行动项」或「待讨论问题」
4. 如果是需求讨论会，要包含：需求点、优先级、技术难点、排期建议
5. 如果是无领导小组讨论，要包含：问题定义、分析维度、解决方案、评估标准
6. 一级分支加 emoji 前缀（如 🎯 💡 📊 🔄 ⚠️）
7. 最多 3 层，不要更深
8. **只输出纯 JSON**，不要有任何 markdown 格式（如 \`\`\`json）

示例输出：
{"topic":"如何提升用户留存率","children":[{"topic":"📊 数据分析","children":[{"topic":"分析次日/7 日/30 日留存率差异"},{"topic":"识别流失高峰时间点"}]},{"topic":"💡 用户体验","children":[{"topic":"优化 onboarding 流程降低首周流失"},{"topic":"增加核心功能使用引导"}]}]}\`;

  addMessage('ai', '<div class="loading-dots"><span></span><span></span><span></span></div> 正在生成框架...');
  
  try {
    const result = await callAI(systemPrompt, '会议目标：' + goal);
    
    if (!result) {
      addMessage('ai', '❌ 框架生成失败：AI 未返回结果，请检查网络连接或 API 配置。', true);
      return;
    }
    
    // 更健壮的 JSON 提取
    let jsonStr = '';
    const jsonMatch = result.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    } else {
      jsonStr = result.trim();
    }
    
    // 清理可能的 markdown 标记
    jsonStr = jsonStr.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*/g, '').trim();
    
    console.log('[Brainstorm] 解析的 JSON:', jsonStr.substring(0, 200) + '...');
    
    const data = JSON.parse(jsonStr);
    
    // 验证数据结构
    if (!data.topic || !data.children || data.children.length === 0) {
      throw new Error('返回的 JSON 结构不完整');
    }
    
    // 验证子节点是否有内容
    for (let i = 0; i < data.children.length; i++) {
      const child = data.children[i];
      if (!child.topic || child.topic.trim() === '' || child.topic === '未命名') {
        console.warn('[Brainstorm] 发现空的一级分支:', child);
        child.topic = '待讨论维度 ' + (i + 1);
      }
      if (child.children && child.children.length > 0) {
        for (let j = 0; j < child.children.length; j++) {
          const subChild = child.children[j];
          if (!subChild.topic || subChild.topic.trim() === '' || subChild.topic === '未命名') {
            console.warn('[Brainstorm] 发现空的子节点:', subChild);
            subChild.topic = '待讨论要点';
          }
        }
      }
    }
    
    renderMindmap(data);
    addMessage('ai', '✅ 会议框架已生成，围绕"' + goal + '"展开。你可以在左侧继续补充内容，导图会自动更新。');
    saveCurrentToHistory(goal);
    
  } catch(e) {
    console.error('[Brainstorm] 解析失败:', e, '原始返回:', result);
    let errorMsg = '❌ 框架生成失败：' + e.message;
    if (e.message.includes('JSON')) {
      errorMsg += '\\n可能是 AI 返回格式有误，请重试。如果多次失败，请检查 Prompt 设置。';
    }
    addMessage('ai', errorMsg, true);
  }
}`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync('index.html', content);
console.log('✅ Patch applied successfully!');
