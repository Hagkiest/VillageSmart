<div align="center">

# 🏘️ 农村村务管理系统

**CountryManageSystem**

[![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

*基层村务管理综合信息化平台 —— 居民管理 · 人口统计 · 补贴发放 · 党建工作 · 数据安全*

</div>

---

## 📋 项目简介

农村村务管理系统是一套面向基层村务管理的综合信息化平台，集成了 **居民信息管理、人口统计分析、社会救助、党建管理、项目管理、调解仲裁、数据安全** 等核心功能，旨在提升村务治理效率与信息化水平。

### ✨ 核心功能

| 模块 | 功能 |
|------|------|
| 👥 **居民管理** | 居民信息 CRUD、Excel 批量导入导出、高级筛选、一键删除 |
| 📊 **人口统计** | 年龄结构、性别分布、村组统计、人口趋势图表 |
| 💰 **社会救助** | 低保对象管理、残疾人管理、补贴发放记录 |
| ⚑ **党建管理** | 党员信息管理、组织架构、党务活动记录 |
| 🌾 **乡村振兴** | 项目管理、耕地信息、公益岗位管理 |
| ⚖️ **调解仲裁** | 调解档案管理、纠纷趋势分析 |
| 🔒 **数据安全** | 数据库备份与恢复、操作日志审计、清除数据 |

---

## 🧱 项目架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                          │
│                                                                  │
│   🖥 管理系统界面设计/                                             │
│     ├── src/app/pages/        📄 业务页面（22个功能模块）          │
│     ├── src/app/lib/          🔧 工具库（API 请求、弹窗、设置）   │
│     ├── src/app/components/   🧩 通用组件（布局、弹窗、表单）     │
│     ├── package.json          📦 依赖声明                        │
│     └── vite.config.ts        ⚡ 构建配置                         │
│                                                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │  REST API (JSON)
┌──────────────────────▼───────────────────────────────────────────┐
│                    Backend (Django)                              │
│                                                                  │
│   ⚙ village_affairs/    主应用（业务逻辑）                         │
│     ├── views.py         📡 API 视图（30+ 端点）                  │
│     ├── services.py      🧠 业务逻辑层（查询、导入、序列化）       │
│     ├── models.py        🗃 数据模型（15+ 模型）                  │
│     ├── urls.py          🛣 路由配置                              │
│     ├── middleware.py    🔐 中间件（登录检查、操作日志、激活验证）  │
│     └── migrations/      📜 数据库迁移                            │
│                                                                  │
│   ⚙ config/             项目配置                                 │
│     └── settings.py      ⚙ Django 配置（数据库、中间件、应用）    │
│                                                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    🗄 MySQL/SQLite 🔨 Nuitka    ☁ Supabase
      (数据库)     (打包工具)   (远程激活验证)
```

### 🛠 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **前端框架** | React 19 + TypeScript 5 | UI 组件与页面 |
| **构建工具** | Vite 6 | 快速开发与构建 |
| **UI 组件** | shadcn/ui (Radix UI) | 无障碍 UI 组件库 |
| **样式** | Tailwind CSS 4 | 原子化 CSS |
| **图表** | Recharts | 数据可视化 |
| **后端框架** | Django 6.0 | Web 框架与 ORM |
| **数据库** | MySQL 8+ / SQLite 3 | 数据存储 |
| **激活验证** | Supabase (PostgreSQL) | 远程激活码校验 |
| **打包** | Nuitka 4 + Zig (可选) | 原生可执行文件 |

---

## 📁 目录结构

```
CountryManageSystem/
├── config/                      # Django 项目配置
│   └── settings.py              #   数据库、中间件、应用注册
├── village_affairs/             # 主应用（全部后端逻辑）
│   ├── views.py                 #   API 端点（居民、导入、认证等）
│   ├── services.py              #   业务逻辑层
│   ├── models.py                #   数据模型
│   ├── urls.py                  #   路由映射
│   ├── middleware.py            #   中间件（登录、日志、激活）
│   ├── activation_service.py    #   远程激活验证服务
│   ├── templates/               #   前端 HTML 入口
│   ├── static/                  #   前端构建产物
│   └── migrations/              #   数据库迁移文件
├── 管理系统界面设计/                   # 前端源码
│   ├── src/app/pages/           #   业务页面组件
│   ├── src/app/lib/             #   工具库
│   ├── src/app/components/      #   通用组件
│   ├── package.json             #   依赖声明
│   └── vite.config.ts           #   Vite 配置
├── manage.py                    # Django 管理入口
├── run_server.py                # 启动脚本（含自动迁移）
└── media/                       # 用户上传文件
```

---

## 👥 关于项目

|  |  |
|------|------|
| **制作人** | GYC |
| **团队** | Hispirit 团队 |
| **项目名称** | 农村村务管理系统 (CountryManageSystem) |
| **版本** | 1.0.17 |
| **技术栈** | Python 3.13 / Django 6.0 / React 19 / TypeScript 5 |
| **数据库** | MySQL 8+ / SQLite |
| **许可证** | 专有软件，保留所有权利 |

---

<div align="center">
  <sub>Copyright © 2024-2026 Hispirit 团队。保留所有权利。</sub>
</div>
