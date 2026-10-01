import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppState } from '../shared/types';
import { providerName } from '../shared/providers';

export interface StoredData { state: AppState; secrets: Record<string, string>; routineSlots: Record<string, string>; }
export function initialState(): AppState {
  return { version: 1, bots: [{ id: 'chief', name: 'Chief', role: 'Team coordinator', instructions: 'Understand the goal, form a focused team when useful, coordinate work, and verify deliverables before reporting completion.', memory: '', color: '#edae6a', avatar: 'orbit', status: 'idle', createdAt: new Date().toISOString() }], chats: [], messages: [], routines: [], approvals: [], connectors: [], usage: [],
    skills: [
      { id: 'skill-research', name: 'Research with sources', description: 'Compare original sources and keep an evidence trail.', instructions: 'Prefer primary sources. Record exact URLs, dates, and supporting excerpts. Separate verified facts from inference. State inaccessible sources.', botIds: [], installed: false, source: 'builtin' },
      { id: 'skill-verify', name: 'Verify before delivery', description: 'Check outputs against the original request.', instructions: 'Inspect actual files, run relevant checks, and report the evidence. Never describe an intended action as completed. Clearly list remaining failures.', botIds: [], installed: false, source: 'builtin' },
      { id: 'skill-handoff', name: 'Clear team handoffs', description: 'Give the next bot the context and files it needs.', instructions: 'Include the objective, completed work, exact file paths, evidence, open questions, and next action in every handoff.', botIds: [], installed: false, source: 'builtin' },
    ],
    settings: { theme: 'dark', language: 'en', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', motion: 'full', closeToTray: true, notifications: true, autoReview: true, rules: [], provider: { provider: 'openai', model: '', baseUrl: 'https://api.openai.com/v1', hasKey: false }, connections: [], maxSteps: 30, maxBots: 8 } };
}

/** Sync atomic snapshots serialize all mutations on Electron's main thread. Secrets are ciphertext only. */
export class Store {
  readonly path: string;
  data: StoredData;
  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'state.json');
    this.data = { state: initialState(), secrets: {}, routineSlots: {} };
    if (existsSync(this.path)) {
      try {
        const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as StoredData;
        if (parsed.state?.version !== 1 || !Array.isArray(parsed.state.bots) || !Array.isArray(parsed.state.chats)) throw new Error('Unsupported or invalid state');
        this.data = parsed;
        this.data.secrets ??= {};
        this.data.routineSlots ??= {};
      } catch (error) {
        // Never overwrite unreadable user data with an empty account.
        throw new Error(`Cannot load I Bot data at ${this.path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Upgrade a single saved provider without decrypting or exposing its credential.
    const settings = this.data.state.settings;
    if (!Array.isArray(settings.connections)) {
      settings.connections = [];
      if (settings.provider.model) {
        const id = randomUUID(), time = new Date().toISOString();
        settings.connections.push({...settings.provider, id, name: providerName(settings.provider.provider), models: [], createdAt: time, updatedAt: time});
        if (this.data.secrets.provider) this.data.secrets[`provider:${id}`] = this.data.secrets.provider;
        settings.activeConnectionId = id;
      }
    }
    delete this.data.secrets.provider;
    for (const connection of settings.connections) connection.hasKey = !!this.data.secrets[`provider:${connection.id}`];
    const active = settings.connections.find(item => item.id === settings.activeConnectionId) ?? settings.connections[0];
    if (active) settings.provider = {provider: active.provider, model: active.model, baseUrl: active.baseUrl, hasKey: active.hasKey};
    settings.activeConnectionId = active?.id;
    if (!active && settings.provider.model) settings.provider = initialState().settings.provider;
    for (const chat of this.data.state.chats) {
      if (chat.status === 'running') {
        chat.status = 'paused';
        this.data.state.messages.push({ id: randomUUID(), chatId: chat.id, role: 'event', content: 'This run stopped when I Bot closed. Resume explicitly to continue from the saved conversation.', createdAt: new Date().toISOString() });
      }
    }
    for (const bot of this.data.state.bots) if (['thinking', 'working', 'waiting'].includes(bot.status)) bot.status = 'idle';
    for (const approval of this.data.state.approvals) if (approval.status === 'pending') approval.status = 'denied';
    this.save();
  }
  save() {
    const temp = `${this.path}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(this.data, null, 2), { encoding: 'utf8', mode: 0o600, flush: true });
    if (existsSync(this.path)) copyFileSync(this.path, `${this.path}.bak`);
    renameSync(temp, this.path);
  }
  snapshot(): AppState { return structuredClone(this.data.state); }
}
