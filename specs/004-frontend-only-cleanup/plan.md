# Implementation Plan: 前端项目遗留后端清理

**Branch**: `[004-frontend-only-cleanup]` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)

## Summary

将仓库从“前后端混合”收敛为“前端-only”工程：删除后端代码、删减后端依赖测试、保留前端验证链路。

## Technical Context

- Language/Version: JavaScript (ES2023), HTML, CSS
- Primary Dependencies: Vite, Vitest, Tauri API
- Testing: 前端 unit/integration/smoke e2e

## Constitution Check

- Code Quality Gate: PASS
- Test Standards Gate: PASS
- UX Consistency Gate: PASS
- Performance Gate: PASS（不引入额外运行时）
- Simplicity Gate: PASS（减少历史复杂度）
