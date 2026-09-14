export type AgentActionType =
  | "launch_app"
  | "tap_text"
  | "tap_point"
  | "swipe"
  | "input_text"
  | "back"
  | "home"
  | "open_url"
  | "observe"
  | "screenshot"
  | "send_message"
  | "delete_data"
  | "purchase"
  | "change_security"
  | "grant_permission"
  | "change_device_setting";

export type AgentAction = {
  id: string;
  type: AgentActionType;
  args: Record<string, unknown>;
  requiresConfirmation?: boolean;
  reason?: string;
};

export type AgentPlan = {
  safe: boolean;
  refusalReason?: string;
  summary: string;
  actions: AgentAction[];
  confirmations: string[];
};

const blockedPatterns = [
  /spy on|spy|stalk|secretly monitor|hidden monitor|keylogger/i,
  /steal (password|credential|cookie|token)|credential theft|password dump/i,
  /bypass (security|authentication|2fa|2fa|lock|permission)|security bypass/i,
  /root (the|my) phone|root access|exploit/i,
  /disable antivirus|disable play protect/i,
  /install malware|ransomware|remote shell/i,
];

const confirmationTypes = new Set<AgentActionType>([
  "send_message",
  "delete_data",
  "purchase",
  "change_security",
  "grant_permission",
  "change_device_setting",
]);

export function safetyCheck(command: string): { safe: boolean; reason?: string } {
  const hit = blockedPatterns.find((pattern) => pattern.test(command));
  if (hit) {
    return { safe: false, reason: "SCOOTY blocked this request because it asks for hidden, unauthorized, harmful, or security-bypassing control." };
  }
  return { safe: true };
}

export function applyConfirmationPolicy(actions: AgentAction[]): AgentAction[] {
  return actions.map((action) => ({
    ...action,
    requiresConfirmation: action.requiresConfirmation ?? confirmationTypes.has(action.type),
  }));
}

export function sanitizePlan(plan: AgentPlan): AgentPlan {
  const actions = applyConfirmationPolicy(plan.actions ?? []);
  return {
    safe: Boolean(plan.safe),
    refusalReason: plan.refusalReason,
    summary: String(plan.summary ?? "").slice(0, 500),
    actions,
    confirmations: actions.filter((a) => a.requiresConfirmation).map((a) => a.reason || a.type),
  };
}
