# Feature Specification: 前端项目遗留后端清理

**Feature Branch**: `[004-frontend-only-cleanup]`  
**Created**: 2026-03-06  
**Status**: Draft  
**Input**: User description: "项目是前端项目，Node 后端是历史遗留，清理掉。"

## User Scenarios & Testing

### User Story 1 - 作为前端项目运行 (Priority: P1)

开发者仅使用前端命令运行和验证项目，不再依赖本地 Node API。

**Independent Test**: `npm run dev`、`npm run test`、`npm run test:e2e` 可运行且无后端依赖错误。

### User Story 2 - 代码库移除后端遗留 (Priority: P1)

仓库不再包含后端运行代码与依赖后端的测试。

**Independent Test**: 仓库中无 `backend/src/**`；测试中无对后端模块导入。

## Functional Requirements

- **FR-001**: MUST 删除后端目录 `backend/src/**`。  
- **FR-002**: MUST 移除 `package.json` 中后端启动脚本与后端数据库依赖。  
- **FR-003**: MUST 移除依赖后端 API 的 contract/integration/e2e 测试。  
- **FR-004**: MUST 保留并通过前端相关单测、集成测试与 smoke e2e。  
- **FR-005**: MUST 更新测试流程文档为前端项目口径。

## Success Criteria

- **SC-001**: `npm run test:all` 全部通过。  
- **SC-002**: 无后端模块残留引用导致的运行/测试错误。  
