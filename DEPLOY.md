# MindFlow 后端部署指南

## 📦 部署到阿里云函数计算 (FC)

### 前置准备

1. **开通阿里云百炼** - 获取 API Key
   - 访问 https://bailian.console.aliyun.com/
   - 创建 API Key（格式：`sk-xxxxxxxx`）

2. **开通函数计算 FC**
   - 访问 https://fcnext.console.aliyun.com/
   - 确保已开通服务

---

## 🚀 方式一：控制台部署（推荐新手）

### 步骤 1：创建函数

1. 进入 **函数计算 FC 控制台**
2. 点击 **创建函数**
3. 选择 **Web 函数**（注意：不是普通函数！）
4. 填写基本信息：
   - 函数名称：`mindflow-proxy`
   - 运行环境：`Node.js 18`
   - 代码上传方式：`Zip 包上传` 或 `在线编辑`

### 步骤 2：配置环境变量（重要！）

在 **环境变量** 标签页添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `MINDFLOW_API_KEY` | `sk-xxxxxxxx` | 你的百炼 API Key |
| `FC_SERVER_PORT` | `9000` | 默认端口，可不填 |

⚠️ **安全提醒：**
- 不要将 API Key 硬编码在代码里！
- 使用环境变量存储敏感信息
- 定期轮换 API Key

### 步骤 3：上传代码

**选项 A：在线编辑**
1. 选择 **在线编辑**
2. 复制 `index.js` 的全部内容
3. 粘贴到编辑器
4. 点击 **保存并部署**

**选项 B：Zip 包上传**
```bash
# 本地打包
cd /path/to/mindflow
zip code.zip index.js

# 上传到 FC 控制台
```

### 步骤 4：配置公网访问

1. 进入函数详情 → **触发器管理**
2. 创建 **HTTP 触发器**
3. 认证方式：**匿名**（因为前端需要直接调用）
4. 记录生成的 URL：
   ```
   https://<your-app>.cn-hangzhou.fcapp.run
   ```

### 步骤 5：测试

```bash
# 测试 HTTP 请求
curl -X POST https://<your-app>.cn-hangzhou.fcapp.run \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-plus",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

预期返回：
```json
{
  "choices": [{
    "message": {"content": "Hello! How can I help you?"}
  }]
}
```

---

## 🔧 方式二：CLI 部署（适合开发者）

### 安装 Serverless Devs

```bash
npm install @serverless-devs/s -g
s config add
```

### 创建 s.yaml

```yaml
edition: 1.0.0
name: mindflow-proxy
access: "aliyun"

vars:
  region: cn-hangzhou
  functionName: mindflow-proxy
  runtime: nodejs18

services:
  mindflow:
    component: fc
    props:
      region: ${vars.region}
      functionName: ${vars.functionName}
      description: 'MindFlow API Proxy'
      runtime: ${vars.runtime}
      handler: index.handler
      codeUri: ./code
      timeout: 60
      memorySize: 512
      diskSize: 512
      layers: []
      environmentVariables:
        MINDFLOW_API_KEY: ${env.MINDFLOW_API_KEY}
      customRuntimeConfig:
        port: 9000
        command:
          - node
          - index.js
      triggers:
        - name: httpTrigger
          type: http
          config:
            authType: anonymous
            methods:
              - POST
              - OPTIONS
```

### 部署

```bash
# 准备代码
mkdir -p code
cp index.js code/

# 设置环境变量
export MINDFLOW_API_KEY=sk-xxxxxxx

# 部署
s deploy
```

---

## 🔐 安全最佳实践

### 1. 使用环境变量
```javascript
// ✅ 正确
const apiKey = process.env.MINDFLOW_API_KEY;

// ❌ 错误
const apiKey = 'sk-xxxxxx'; // 不要硬编码！
```

### 2. 定期轮换密钥
- 每 90 天更换一次 API Key
- 在百炼控制台禁用旧 Key，生成新 Key
- 更新 FC 环境变量

### 3. 限制 CORS
当前配置允许所有域名访问（`*`），生产环境建议改为：
```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://yunzhixu620-stack.github.io');
```

### 4. 监控用量
- 在百炼控制台查看 API 调用量
- 设置费用预警
- 防止恶意刷量

---

## 📊 成本估算

| 项目 | 免费额度 | 超出后价格 | 预估月成本 |
|------|----------|------------|------------|
| **函数计算** | 100 万次调用/月 | ¥0.0000125/次 | ¥0 (个人用足够) |
| **百炼 API** | 无免费额度 | qwen-plus: ¥0.004/1K tokens | ¥50-200 |
| **流量费** | 100GB/月 | ¥0.25/GB | ¥0 |
| **合计** | - | - | **¥50-200/月** |

---

## 🐛 常见问题

### Q1: 函数返回 500 错误
**可能原因：** 环境变量未设置  
**解决：** 检查 FC 控制台是否添加了 `MINDFLOW_API_KEY`

### Q2: CORS 错误
**现象：** 浏览器报错 `No 'Access-Control-Allow-Origin' header`  
**解决：** 确保前端发送了 `OPTIONS` 预检请求，后端已处理

### Q3: WebSocket 连接失败
**现象：** 语音识别报错  
**解决：** 检查 `/asr` 路径是否正确，确认 FC 支持 WebSocket

### Q4: API 调用超时
**解决：** 
1. 增加 FC 超时时间（默认 60 秒 → 120 秒）
2. 使用更快的 AI 模型（`qwen-turbo`）

---

## 📞 获取帮助

- 阿里云 FC 文档：https://help.aliyun.com/product/50978.html
- 百炼 API 文档：https://help.aliyun.com/product/42154.html
- 项目 Issues：https://github.com/yunzhixu620-stack/mindflow/issues

---

**最后更新:** 2026-04-01  
**维护者:** my claw 🦞
