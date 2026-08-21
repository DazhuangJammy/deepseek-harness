# @deepseek-ai/dsh-client-ui-learning

English | [中文](README.zh.md)

Agent Learning is a removable, read-only browser view for learning Agent architecture from one real DeepSeek Harness Session. It registers one `conversation.view` entry named `learning`, reads the standard `ConversationSnapshot`, and creates no second run record.

The main teaching surface is a real event node graph. Each node is created from the current snapshot in sequence, retains its event number and Turn / Step when available, and opens inline on click. The expanded node always answers four questions: what entered the component, what the observed capability or plugin role did, what came out, and where the Agent Loop goes next. Input and output values use the node's actual content when the snapshot carries it, such as a Tool name, arguments, command result, or assistant fragment; unavailable Prompt or package details are labeled as unavailable. Adjacent Context nodes are marked as one Prompt input batch: they are independent Provider contributions assembled into the same Step, not separate Agent Loop steps. The explanation of the processing step is selected by the recorded node kind; it is not a pre-drawn run fixture.

The graph distinguishes facts from teaching context. User messages, model previews, tool names, command results, context provenance, errors, retries, compaction, and streaming fragments come from this run. The capability label, beginner explanation, “why”, and “next” text are stable explanations of that kind of event. When the snapshot does not expose a Cordis package name, the graph says so instead of inventing one. Use Trajectory or the plugin inventory to verify exact package ownership.

The term dictionary stays available below the graph, with a small preview and an on-demand full list. Each term includes a beginner explanation, technical meaning, project ownership, collaborators, and current evidence; Trajectory remains authoritative for exact Prompt, Tool Schema, token, timing, and raw-event details.

The plugin adds no event listener, persistence event, Prompt Section, model request, Context injection, or Tool. It is a teaching projection over the existing snapshot; unloading it does not affect Harness execution.

## Development

The source package lives in `packages/client/ui-learning` and uses the standard client-package build, typecheck, and coverage paths. Build the client bundle with `pnpm --filter @deepseek-ai/dsh-client-ui-learning bundle`.

## Update and loading

Normal runs use the built client bundle. After editing this plugin, run the bundle command again and refresh the current `dsh web` page. When `pnpm run dev:web` watches the same checkout, client HMR can replace the plugin after the watcher rebuilds the bundle. Changing the Web composition roster or installing the plugin still requires restarting the affected Profile.

## Model Experience

### Browser projection

#### What the model sees

The model sees nothing from this plugin. It only renders the browser-side `ConversationSnapshot`; it does not change Prompt, tools, Provider requests, context assembly, or model-visible events.

#### Token effect

None. The plugin produces no model request and adds no model-visible content.

#### KV Cache effect

None. The plugin produces no model request and adds no model-visible content.

## Known Limitations and Deferred Work

- The learning page explains durable conversation nodes and the standard snapshot, but cannot claim that every internal Service call is visible.
- Plugin attribution is a capability-level teaching description, not an invented unique Cordis plugin for each event.
- Profile, Bundle, and Loader facts belong to boot composition; verify them with `dsh --profile web --dump-config` or the plugin inventory.
- This is a learning view, not a plugin marketplace, drag-and-drop replacement surface, or runtime Agent graph editor.
