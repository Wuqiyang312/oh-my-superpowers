# 好的测试与坏的测试

## 好的测试

**集成风格**：通过真实接口进行测试，而不是对内部部分进行 Mock。

```typescript
// 好：测试可观察的行为
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

特征：

- 测试用户/调用者关心的行为
- 仅使用公共 API
- 在内部重构后依然有效
- 描述**做什么**，而不是**怎么做**
- 每个测试一个逻辑断言

## 坏的测试

**实现细节测试**：与内部结构耦合。

```typescript
// 差：测试实现细节
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

危险信号：

- Mock 内部协作者
- 测试私有方法
- 断言调用次数/顺序
- 仅重构而不改变行为时测试就会失败
- 测试名称描述的是**怎么做**而非**做什么**
- 通过外部手段而非接口进行验证

```typescript
// 差：绕过接口进行验证
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// 好：通过接口进行验证
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```
