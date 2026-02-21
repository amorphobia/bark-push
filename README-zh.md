# Bark Push

---
[English Readme](./README.md)

一个 Tampermonkey 用户脚本，让你可以从任意网站使用 [Bark](https://github.com/Finb/Bark) 向 iOS 设备发送自定义推送通知。

## 功能特点

- **通用** - 支持所有网站
- **多设备** - 可同时向多个 iOS 设备发送
- **丰富通知** - 支持自定义铃声、图标、图片等
- **Markdown** - 发送富文本格式消息
- **历史记录** - 查看和管理已发送的通知
- **撤回** - 删除已发送的通知
- **隐私优先** - 所有数据存储在本地设备
- **国际化** - 支持英文、简体中文、繁体中文、日语、韩语

## 安装步骤

1. 安装 [Tampermonkey](https://tampermonkey.net/) 浏览器扩展
2. 从 [Releases](https://gitea.xuesong.eu.org/me/bark-push/releases) 页面下载 `bark-push.user.js`
3. 打开 Tampermonkey 仪表盘，进入"实用工具"
4. 点击"导入"并选择下载的文件
5. 或者：复制脚本内容，创建新的 Tampermonkey 脚本

## 使用方法

1. 按 `Alt+B`（或自定义快捷键）打开推送对话框
2. 输入消息内容，选择目标设备
3. 点击"发送通知"
4. 您的 iOS 设备将收到推送通知

### 历史记录与撤回

- 点击"历史记录"标签查看所有已发送的通知
- 使用搜索过滤器查找特定消息
- 点击撤回按钮（撤销图标）删除已发送的通知
- 导出/导入历史记录进行备份

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本用户脚本
pnpm build

# 运行测试
pnpm test:run
```

## 许可证

[AGPL-3.0](./LICENSE)
