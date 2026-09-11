# Agent Note: Chat file capabilities

Status: implemented

English | [中文](2026-09-11-chat-file-capabilities.zh.md)

## Problem

Chat accepts the same uploaded files as other modes, but a file reaches the model as a saved-path handle rather than inline bytes. An empty Chat tool set leaves that handle unreadable. A model may then emit its learned shell-call syntax as ordinary text because no matching tool schema or executor exists.

Chat experts inherit the same gap. A separate document ingestion path would make file behavior differ between Chat and Standard mode and duplicate an existing execution path.

## Decision

The shipped `chat` preset mounts the same platform shell, filesystem, image-read, and filesystem-search tool plugins that `standard` uses for uploaded files. Image attachments continue through the model adapter when the selected route supports images; file handles can use the mounted tools and the same sandbox and approval policy as Standard mode.

Chat still omits skill discovery, project instructions, runtime context, compaction, planning, goals, subagents, workflows, Web tools, and explicit deliverable tools. The complete conversational persona and Session transcript behavior remain unchanged.

Managed expert compositions contain the same file-tool rows. Before an expert mounts, the agent-preset service restores its managed composition so experts created by an earlier release receive the current Chat capabilities without changing prompt versions or metadata.

## Alternatives considered

**Add a separate document-ingestion capability.** Rejected because the requested behavior is parity with Standard mode, including the same supported formats and shell-based extraction path. A second parser stack would have separate format coverage and failure behavior.

**Mount only the UTF-8 `read` tool.** Rejected because uploaded Word and PDF files are not UTF-8 text. The existing `read` tool cannot extract them, while Standard mode handles them through its shell and filesystem tools.

**Mount the complete Standard preset.** Rejected because file parity does not require coding instructions, skills, planning, delegation, Web access, goals, or workflows. Those capabilities would change the purpose and request cost of Chat.

## Consequences

Chat requests carry the file-tool schemas and guidance, so they cost more context than an empty-tool request. Chat can execute shell commands and file mutations permitted by the same sandbox and approval policy as Standard mode; the mode is conversational by default, not a security boundary.

The [earlier Chat decision](2026-08-21-tool-free-chat-preset.md) continues to own the complete persona, transcript, and omitted non-file capabilities. This decision supersedes only its empty-tool-set rule and the snapshots that asserted an absent `tools` header.
