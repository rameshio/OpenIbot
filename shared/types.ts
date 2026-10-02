export type BotStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';
export type AvatarShape = 'orbit' | 'prism' | 'pebble' | 'bloom' | 'capsule' | 'sprout' | 'triangle' | 'drop';
export type AvatarAccessory = 'none' | 'glasses' | 'headphones' | 'halo' | 'cap' | 'crown' | 'sparkles';
export type AvatarExpression = 'neutral' | 'attentive' | 'surprised' | 'excited' | 'happy' | 'laughing' | 'angry' | 'sad' | 'scared' | 'suspicious' | 'confused' | 'curious' | 'proud' | 'shy' | 'unimpressed' | 'sleepy';
export interface Bot { modelConnectionId?:string; networkHosts?: string[]; id: string; name: string; role: string; instructions: string; memory: string; color: string; avatar: AvatarShape; accessory?: AvatarAccessory; avatarImage?: string; expression?: AvatarExpression; completedAt?: string; status: BotStatus; createdAt: string; }
export interface Chat { untrustedContext?:boolean; id: string; title: string; botIds: string[]; createdAt: string; updatedAt: string; status: 'idle' | 'running' | 'paused' | 'error'; }
export interface Attachment { id: string; name: string; path: string; size: number; botId?: string; }
export interface Message { id: string; chatId: string; botId?: string; role: 'user' | 'assistant' | 'event' | 'error'; content: string; createdAt: string; attachments?: Attachment[]; }
export interface Routine { id: string; botId: string; name: string; prompt: string; time: string; days: number[]; timezone: string; enabled: boolean; lastRunAt?: string; nextRunAt?: string; lastStatus?: string; }
export interface Skill { id: string; name: string; description: string; instructions: string; botIds: string[]; installed: boolean; source: 'builtin' | 'taught' | 'custom'; createdAt?: string; }
export type EffectClass = 'read' | 'write' | 'send' | 'spend' | 'delete' | 'upload' | 'persist' | 'execute' | 'admin';
export type EffectActor = 'user' | 'agent' | 'system';
export interface ActionRecord {id:string;chatId:string;taskId:string;actorId:string;effectId:string;effectClass:string;transport:string;targetHash:string;argsHash:string;state:'dispatched'|'succeeded'|'failed'|'uncertain'|'reconciled';createdAt:string;}
/** Constructed by trusted main-process dispatchers, never accepted from model/IPC arguments. */
export interface Effect { id: string; transport: string; class?: EffectClass; actor: EffectActor; actorId: string; chatId: string; taskId: string; target: string; args: unknown; dataScope: string[]; connectorId?: string; defaultPolicy?: 'allow'; toolName?: string; toolSchemaHash?: string; unconfirmedConnector?: boolean; untrustedContext?:boolean; }
export interface EffectGrant { effectClass: EffectClass; target: string; argsHash: string; dataScope: string[]; policyVersion: number; scope: 'once' | 'chat' | 'task' | 'until'; expiresAt: string; }
export interface EffectApprovalDecision { approved: boolean; scope?: EffectGrant['scope']; expiresAt?: string; }
export interface Approval { id: string; chatId: string; botId: string; action: string; details: string; status: 'pending' | 'approved' | 'denied'; createdAt: string; effect?: Omit<Effect, 'args' | 'defaultPolicy'> & {argsHash: string}; policyVersion?: number; grant?: EffectGrant; presentation?: ApprovalPresentation; }
export interface ApprovalPresentation { args: unknown; purpose: string; purposeSource: 'model' | 'host'; target: string; alwaysEligible: boolean; }
export interface ReadToolConfirmation { key: string; classification: 'read'; policyVersion: number; confirmedAt: string; }
export interface ActionRule { id: string; action: string; policy: 'ask' | 'allow' | 'block'; }
export interface ProviderSettings { provider: string; model: string; baseUrl: string; hasKey: boolean; }
export interface AvailableModel { id: string; name: string; contextLength?: number; tools?: boolean; }
export interface ProviderConnection extends ProviderSettings { id: string; name: string; models: AvailableModel[]; createdAt: string; updatedAt: string; }
export interface ModelDiscovery { models: AvailableModel[]; message: string; discoveryId?: string; keyVerified?: boolean; catalog?: 'account' | 'public'; }
export interface VoicePreferences { connectionId: string; transcriptionModel: string; voiceURI: string; rate: number; language: string; microphoneId: string; }
export interface MediaModel { id: string; name: string; }
export interface AppSettings { theme: 'dark' | 'light' | 'system'; language: string; timezone: string; motion: 'full' | 'reduced' | 'off'; closeToTray: boolean; notifications: boolean; autoReview: boolean; rules: ActionRule[]; policyVersion: number; provider: ProviderSettings; connections: ProviderConnection[]; activeConnectionId?: string; voice?: VoicePreferences; maxSteps: number; maxBots: number; }
export interface UsageRecord { id: string; botId: string; chatId: string; provider: string; model: string; inputTokens: number; outputTokens: number; createdAt: string; }
export interface ConnectorTool { name: string; description: string; inputSchema?: Record<string,unknown>; outputSchema?: Record<string,unknown>; annotations?: {readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean}; suggestedClass?: EffectClass; definitionHash?: string; }
export interface Connector { id: string; name: string; url: string; hasToken: boolean; auth?: 'token' | 'oauth'; catalogId?: string; enabled: boolean; botIds: string[]; tools: ConnectorTool[]; toolEffects?: Record<string,EffectClass>; toolEffectHashes?: Record<string,string>; catalogEvents?: {id:string;summary:string;createdAt:string}[]; error?: string; }
export interface AppState { version: number; mainBotId?: string; archivedBots?:Bot[]; bots: Bot[]; chats: Chat[]; messages: Message[]; routines: Routine[]; skills: Skill[]; approvals: Approval[]; settings: AppSettings; usage: UsageRecord[]; connectors: Connector[]; readToolConfirmations?: ReadToolConfirmation[]; }
export interface WorkspaceInfo { botId: string; status: 'not-created' | 'starting' | 'running' | 'stopped' | 'error'; containerName?: string; desktopUrl?: string; vncUrl?: string; password?: string; error?: string; }
export interface RuntimeStatus { available: boolean; imageReady: boolean; message: string; building?: boolean; }
export interface WorkspaceFile { name: string; path: string; directory: boolean; size: number; }
export interface CommandResult { stdout: string; stderr: string; exitCode: number; }
export interface RuntimeService {
  computer?(botId:string,args:Record<string,unknown>,signal?:AbortSignal,beforeEffect?:()=>void):Promise<CommandResult>;
  openBrowser?(botId:string,url:string,signal?:AbortSignal,beforeEffect?:()=>void):Promise<CommandResult>;
  setNetworkPolicy?(botId:string,hosts:string[]):Promise<void>;
  status(): Promise<RuntimeStatus>;
  buildImage(onLog?: (line: string)=>void): Promise<RuntimeStatus>;
  ensure(botId: string, beforeEffect?:()=>void): Promise<WorkspaceInfo>;
  inspect(botId: string): Promise<WorkspaceInfo>;
  stop(botId: string): Promise<void>;
  exec(botId: string, command: string, signal?: AbortSignal, beforeEffect?:()=>void): Promise<CommandResult>;
  listFiles(botId: string, path?: string, beforeEffect?:()=>void): Promise<WorkspaceFile[]>;
  readFile(botId: string, path: string, beforeEffect?:()=>void): Promise<string>;
  writeFile(botId: string, path: string, content: string, beforeEffect?:()=>void): Promise<void>;
  shareFile(sourceBotId: string, sourcePath: string, targetBotId: string, targetPath: string, beforeEffect?:()=>void): Promise<void>;
  importFile(botId: string, source: string, name: string, beforeEffect?:()=>void): Promise<void>;
  exportFile(botId: string, path: string, destination: string): Promise<void>;
  screenshot(botId: string, beforeEffect?:()=>void): Promise<string>;
}
export interface DesktopAPI { invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>; onState(callback: (state: AppState)=>void): ()=>void; onRuntimeLog(callback:(line:string)=>void):()=>void; onVoiceStop(callback:()=>void):()=>void; window(action: 'minimize' | 'maximize' | 'close'): void; }
declare global { interface Window { ibot: DesktopAPI; } }
