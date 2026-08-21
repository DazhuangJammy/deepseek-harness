# @deepseek-ai/dsh-client-ui-learning

[English](README.md) | 中文

Agent Learning 是一个可卸载、只读的浏览器学习视图，用来从一条真实的 DeepSeek Harness Session 学会 Agent 架构。它注册一个名为 `learning` 的 `conversation.view`，读取标准 `ConversationSnapshot`，不创建第二份运行记录。

页面的主教学界面是真实事件节点图。每个节点按当前快照的顺序生成，保留事件编号，以及快照提供的 Turn / Step。点击节点后在原地展开，固定回答四个问题：组件收到了什么输入，观察到的能力或插件角色做了什么处理，产生了什么输出，Agent Loop 下一步去哪里。输入和输出在快照有数据时显示真实内容，例如 Tool 名称、参数、命令结果或模型片段；快照没有提供 Prompt 或插件包名时会明确标出来。连续的 Context 节点会标成“同一批 Prompt 输入”：它们是多个独立 Provider 汇入同一个 Step，不是两个 Agent Loop 步骤。处理过程按真实记录的节点类型选择，不是预先画好的演示流程。

图中会把事实和教学解释分开：用户消息、模型摘要、工具名、命令结果、上下文来源、错误、重试、压缩和流式片段来自这次运行；能力类别、入门解释、“为什么”和“下一步”是对该类事件的稳定说明。快照没有暴露 Cordis 包名时，图中会明确写“当前快照未提供”，不会编造归因；要核对具体包名请看 Trajectory 或插件清单。

术语字典固定在节点图下面，先展示少量常用词，也可以按需打开完整列表。每个术语都有入门解释、技术含义、项目归属、合作关系和当前证据；精确的 Prompt、Tool Schema、token、耗时和原始事件仍以 Trajectory 为准。

这个插件不新增事件监听、持久化事件、Prompt Section、模型请求、Context 注入或 Tool。它只是对现有快照做教学投影；卸载后不会影响 Harness 的运行。

## 开发

源码包位于 `packages/client/ui-learning`，使用标准客户端包的构建、类型检查和覆盖率路径。使用 `pnpm --filter @deepseek-ai/dsh-client-ui-learning bundle` 构建客户端 bundle。

## 更新与加载

普通运行使用已构建的客户端 bundle。修改插件源码后重新执行 bundle 命令，再刷新当前 `dsh web` 页面；如果同时运行同一检出目录的 `pnpm run dev:web`，watcher 重建 bundle 后客户端 HMR 通常会替换插件。修改 Web 组合包的插件名单或首次安装插件仍需要重启对应 Profile。

## 模型体验

### 浏览器投影

#### 模型看到什么

模型看不到这个插件。它只渲染浏览器端的 `ConversationSnapshot`，不改变 Prompt、工具、Provider 请求、上下文组装或模型可见事件。

#### Token 影响

无。插件不产生模型请求，也不向模型可见上下文加入内容。

#### KV Cache 影响

无。插件不产生模型请求，也不向模型可见上下文加入内容。

## Known Limitations and Deferred Work

- 学习页只能解释持久化会话节点和标准快照，不能声称每一次内部 Service 调用都可见。
- 插件归因是能力类别级别的教学说明，不虚构某条事件对应的唯一 Cordis 插件。
- Profile、Bundle、Loader 的装载事实属于启动配置，需用 `dsh --profile web --dump-config` 或插件清单核对。
- 这是一个学习视图，不提供插件商城、拖拽替换或运行时编辑 Agent 图。
