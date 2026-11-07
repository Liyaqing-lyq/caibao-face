# 财宝儿换脸 / Caibao Face

以中央财经大学财宝儿为主题的二维实时手势换脸互动作品，支持四款形象随机切换与校园创意合影。

## 快速开始

安装 Python 3.8+ 后双击 `start.cmd`，或执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

在 Edge/Chrome 中打开 http://localhost:8840/ ，允许摄像头。双手各比 L 形围住脸并保持约 0.7 秒，放下手约 0.6 秒后再次触发。也可使用按钮。四款每轮各出现一次，连续两次不同。

所有识别资源随包提供，无需 npm install。查看 [使用手册](使用手册.md) 了解功能、故障处理、运行限制与源码结构。

## 开发检查

```powershell
node --test tests/engine.test.js
python serve.py --port 8841 --open
```

界面与逻辑采用原生 JavaScript、Canvas 2D，识别采用本地 MediaPipe Hands 与 Face Mesh。仅处理单人脸，照片在浏览器中合成。第三方依赖及财宝儿素材说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

四款头像已重绘为干净的透明二维素材，并保留可编辑 SVG；原画参考与适配说明见 [素材说明.md](素材说明.md)。
