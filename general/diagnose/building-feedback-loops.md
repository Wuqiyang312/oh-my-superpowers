# 构建反馈回路

## 为什么反馈回路是第一优先级

如果没有一个快速的通过/失败信号，你就是在盲目调试。反馈回路是你的"示波器"——它把不可见的行为变成可观察的信号。

**核心原则：** 在拥有你信任的回路之前，不要进入假设阶段。

## 10 种构建反馈回路的方法

### 1. 失败的测试

在能触及 Bug 的任何接缝处编写测试：
- 单元测试——针对单个函数/类
- 集成测试——针对组件交互
- 端到端测试——针对完整系统

```typescript
// 例：针对购物车 Bug 的失败测试
test("cart total with discount code applied", () => {
  const cart = createCart();
  cart.add({ id: "hat", price: 100 });
  cart.applyDiscount("SAVE10");
  expect(cart.total()).toBe(90);
});
```

### 2. Curl / HTTP 脚本

对运行中的开发服务器发起请求，断言响应：

```bash
curl -s http://localhost:3000/api/orders | jq '.data | length'
```

### 3. CLI 调用 + diff

使用固定输入，将 stdout 与已知正确输出 diff：

```bash
my-cli --input test/fixtures/bad-data.json > /tmp/actual.txt
diff /tmp/expected.txt /tmp/actual.txt
```

### 4. 无头浏览器脚本

用 Playwright 或 Puppeteer 驱动 UI，对 DOM/控制台/网络做断言。

### 5. Trace 重放

捕获真实网络请求/事件日志到磁盘，在隔离环境中重放：

```bash
# 录制
curl -o capture.json https://api.example.com/orders

# 回放
my-service --replay capture.json
```

### 6. 临时测试架

启动最小子系统（一个服务 + mock 依赖），用单个函数调用触发 Bug 路径。

### 7. 属性/模糊测试

如果 Bug 是"有时输出错误"，运行 1000 个随机输入查找模式：

```bash
npx fast-check --num-runs 1000 --fail-fast
```

### 8. 二分测试架

在两个已知状态之间（提交、数据集、版本）自动化检查：

```bash
git bisect start
git bisect bad HEAD
git bisect good v1.0
git bisect run npm test
```

### 9. 差异循环

在旧版和新版中运行相同输入并 diff 输出。

### 10. HITL bash 脚本

最后的手段。如果必须由人类点击，用 `scripts/hitl-loop.template.sh` 驱动。

## 迭代优化回路

一旦有了*一个*回路，问自己：

- **更快？** 缓存设置、跳过无关初始化、缩小测试范围
- **信号更清晰？** 对特定症状断言，而不是"没崩溃"
- **更确定？** 固定时间、种子随机数、隔离文件系统、冻结网络

**30 秒的 flaky 回路 ≈ 没有回路。2 秒的确定性回路 = 超能力。**