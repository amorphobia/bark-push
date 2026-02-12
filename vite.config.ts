import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Bark Push',
        namespace: 'https://gitea.xuesong.eu.org/bark-push',
        match: ['*://*/*'],
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPg0KICA8ZGVmcz4NCiAgICA8Y2xpcFBhdGggaWQ9InJvdW5kZWRDb3JuZXJzIj4NCiAgICAgIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHJ4PSIxODAiIHJ5PSIxODAiLz4NCiAgICA8L2NsaXBQYXRoPg0KICA8L2RlZnM+DQogIA0KICA8IS0tIEJhY2tncm91bmQgd2l0aCByb3VuZGVkIGNvcm5lcnMgLS0+DQogIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHJ4PSIxODAiIHJ5PSIxODAiIGZpbGw9IiMwMDdBRkYiLz4NCiAgDQogIDwhLS0gSWNvbiBjb250ZW50IGNsaXBwZWQgdG8gcm91bmRlZCBjb3JuZXJzIC0tPg0KICA8ZyBjbGlwLXBhdGg9InVybCgjcm91bmRlZENvcm5lcnMpIj4NCiAgICA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMTQzLjIgNjExLjVjLTExLjItMjIuOC0yMi4zLTQ1LjctMzMuNS02OC41bC00NC4yLTkwLjFjLTYuOC0xMy45LTIuNi0yNC43IDExLjktMzAuMmw2My4xLTIzLjdjMS4zLS41IDIuNi0xLjUgNC0xdjIxMy40bC0xLjMuMXoiIC8+DQogICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTTE3Mi4zIDUxMS41di0xMjhjMC00LjItLjEtOC4zIDEuMS0xMi40YTIzLjEgMjMuMSAwIDAxMjguNS0xNS42YzQzLjggMTIuNCA4Ny43IDI0LjkgMTMxLjQgMzcuNSAxMC40IDMgMTYuNyAxMS42IDE2LjcgMjIuNHEtLjMgOTMuOC0uOCAxODcuNGMwIDEwLjgtNS45IDE4LjgtMTYuMSAyMi4ycS02NS40IDIxLjYtMTMwLjggNDNjLTE2LjQgNS4zLTMxLTYtMzEtMjMuNi4xLTI1LjkuMy01MS45LjQtNzcuOXoiIC8+DQogICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTTY0NyA0MzkuMXYxNDguNEgzNzdWNDM5LjFoMjcweiIgLz4NCiAgICA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNODUxLjYgNTEzdjEyOS40YzAgMy45IDAgNy43LTEuMSAxMS40LTMuNyAxMS45LTE2IDE5LjEtMjguMSAxNS43cS02Ni4xLTE4LjYtMTMyLjQtMzcuN0EyMi40IDIyLjQgMCAwMTY3NCA2MTBxLjItOTQuMS43LTE4Ny45Yy4xLTExLjIgNi4xLTE4LjkgMTcuMi0yMi41cTY0LjQtMjEuMyAxMjguOS00Mi40YzE3LjEtNS42IDMxLjkgNS4zIDMxLjggMjMuM3Y0MnoiIC8+DQogICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTTg3OS41IDYyNy4xVjQxMy41bDEuMS0uMmMxLjYgMy4yIDMuMSA2LjUgNC43IDkuN2w3My4xIDE0OS4xYzYuOSAxNC4xIDIuNSAyNC45LTEyLjIgMzAuNWwtNjEuNiAyMy4xYy0xLjcuNi0zLjMgMS42LTUuMSAxLjR6IiAvPg0KICA8L2c+DQo8L3N2Zz4NCg==',
        description: 'Send notifications to your Apple devices.',
        author: 'amorphobia',
        grant: [
          'GM_xmlhttpRequest',
          'GM_setValue',
          'GM_getValue',
          'GM_registerMenuCommand',
        ],
      },
      build: {
        // Post-process the generated file to add i18n metadata
        fileName: 'bark-push.user.js',
        externalGlobals: {},
        metaFileName: true,
      },
    }),
    // Custom plugin to inject i18n metadata after build
    {
      name: 'inject-i18n-metadata',
      apply: 'build',
      closeBundle() {
        const filePath = path.resolve(__dirname, 'dist/bark-push.user.js');
        
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf-8');
          
          // Find @name line and inject i18n names right after it
          const nameMatch = content.match(/(\/\/ @name\s+.*\n)/);
          if (nameMatch) {
            const nameI18n = `// @name:zh-CN    Bark 推送
// @name:zh-TW    Bark 推送
// @name:ja       Bark プッシュ
// @name:ko       Bark 푸시
`;
            content = content.replace(nameMatch[0], nameMatch[0] + nameI18n);
          }
          
          // Find @description line and inject i18n descriptions right after it
          const descMatch = content.match(/(\/\/ @description\s+.*\n)/);
          if (descMatch) {
            const descI18n = `// @description:zh-CN  向 Apple 设备发送通知信息
// @description:zh-TW  向 Apple 裝置發送通知訊息
// @description:ja     Apple デバイスに通知を送信します
// @description:ko     Apple 기기로 알림을 보냅니다
`;
            content = content.replace(descMatch[0], descMatch[0] + descI18n);
          }
          
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log('✓ i18n metadata injected into userscript header');
        }
      },
    },
  ],
});
