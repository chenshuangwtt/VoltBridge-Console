export const pendingCommandStates = ['CREATED', 'SENT', 'ACKED', 'EXECUTING'] as const
export const terminalCommandStates = ['SUCCEEDED', 'FAILED', 'TIMEOUT'] as const
export const commandPollInterval = (status?: string) => pendingCommandStates.includes(status as typeof pendingCommandStates[number]) ? 2000 : false
