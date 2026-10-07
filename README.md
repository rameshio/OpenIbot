# OpenIbot

A Windows desktop application for directing a team of persistent AI bots through a chat interface. Start a conversation, describe an outcome, and let Chief coordinate specialists. Each bot has its own memory and an isolated Linux computer.

## Major Features

- **Team Coordination**: Direct multiple bots in group chats, each with its own role and memory.
- **Isolated Linux Computers**: Each bot runs in its own Docker-powered Linux environment complete with a graphical desktop, browser, terminal, and persistent files.
- **Animated Avatars**: Bots have customizable animated avatars and unique identities.
- **Action Review**: Approve or decline actions in the conversation before the bot executes them.
- **Teach a Task**: Record pointer/navigation steps to save reusable skills for your bots.
- **Routines**: Schedule recurring background tasks.
- **Privacy and Security**: API keys are encrypted via your OS's native secure storage facility and remain strictly on your local device.

## Supported AI Providers & Models

OpenIbot supports a wide variety of APIs through built-in connections and standard OpenAI-compatible endpoints:

- OpenAI
- Anthropic
- Google Gemini
- xAI (Grok)
- Groq
- DeepSeek
- Mistral
- Cohere
- OpenRouter
- Local Servers (e.g. LM Studio, Ollama)

## High-Level Architecture

OpenIbot is built as an Electron desktop application:
- **Renderer (`renderer/`)**: The chat interface, bot UI, and noVNC viewer built with React and Vite.
- **Main Process (`desktop/`)**: Handles OS integration, safeStorage credential encryption, IPC, orchestration, tool routing, and approvals.
- **Docker Containers (`containers/`)**: Linux workspace images provisioned dynamically for each bot using the Docker engine.

## Prerequisites

- **Windows**: The current release focuses on the Windows desktop environment.
- **Node.js**: v20 or newer (for development).
- **Docker Desktop**: Required to provision the Linux workspaces. Ensure Docker is running with the Linux engine.

## Installation & Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rameshio/OpenIbot.git
   cd OpenIbot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment variables file:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and set a strong `IBOT_LOCAL_PASSWORD` (at least 16 characters). Provider API keys can be provided here or configured within the application UI (where they will be securely encrypted).

## Development Commands

Run the application in development mode (starts the Vite dev server and the Electron app):
```bash
npm run dev
```

Run tests and type checks:
```bash
npm run typecheck
npm test
npm run test:desktop
npm run test:providers
```

## Production Build Commands

Build the production assets:
```bash
npm run build
```

Package the application as a portable Windows executable:
```bash
npm run package
```
The output will be placed in the `release/` directory.

## Project Structure

- `renderer/` — React frontend, chat UI, settings, and computer view
- `desktop/` — Electron main process, orchestrator, state storage, and runtime manager
- `containers/` — Dockerfiles for the Linux environments and VNC viewer
- `shared/` — Types and IPC contract definitions
- `docs/` — Documentation handbook for understanding the codebase
- `tests-desktop/` — E2E and unit tests

## Security Guidance

- **Do not commit secrets**: Ensure your API keys and passwords stay out of `.env` files meant for git. Use `.env.local`.
- **Review container actions**: Running untrusted code on your machine is dangerous. OpenIbot isolates bots in Docker containers, but please review what bots do via the Action Review feature.
- See `SECURITY.md` for more information on vulnerability reporting.

## Contribution Instructions

We welcome contributions! Please see `CONTRIBUTING.md` for details on how to set up the project, make changes, and submit a Pull Request.

Ensure any code changes are reflected in the `docs/code/` directory, following the maintenance guidelines.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.
