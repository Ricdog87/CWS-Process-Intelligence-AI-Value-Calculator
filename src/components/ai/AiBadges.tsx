import { Ban, Bot, CheckCircle2, Cloud, Cog, Hourglass, Lock, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { SECURITY_TIERS } from '../../config/aiConfig';
import type { CopilotVerdict } from '../../lib/aiCost';
import type { AiDecisionKey } from '../../lib/evaluation';
import type { SecurityTier } from '../../types/ai';
import { Badge, type BadgeTone } from '../ui/Badge';

const TIER_STYLE: Record<SecurityTier, { tone: BadgeTone; icon: typeof Lock }> = {
  A: { tone: 'green', icon: Lock },
  B: { tone: 'teal', icon: ShieldCheck },
  C: { tone: 'amber', icon: Cloud },
  D: { tone: 'red', icon: ShieldAlert },
};

export function TierBadge({ tier, short }: { tier: SecurityTier; short?: boolean }) {
  const s = TIER_STYLE[tier];
  return (
    <Badge tone={s.tone} icon={s.icon} title={`${SECURITY_TIERS[tier].label}: ${SECURITY_TIERS[tier].description}`}>
      {short ? `Stufe ${tier}` : `${tier} · ${SECURITY_TIERS[tier].short}`}
    </Badge>
  );
}

const DECISION_STYLE: Record<AiDecisionKey, { tone: BadgeTone; icon: typeof Lock }> = {
  go: { tone: 'green', icon: CheckCircle2 },
  check: { tone: 'amber', icon: Hourglass },
  no_go: { tone: 'red', icon: XCircle },
  no_ai: { tone: 'blue', icon: Cog },
};

export function DecisionBadge({ decision, label, title }: { decision: AiDecisionKey; label: string; title?: string }) {
  const s = DECISION_STYLE[decision];
  return (
    <Badge tone={s.tone} icon={s.icon} title={title}>
      {label}
    </Badge>
  );
}

const VERDICT_STYLE: Record<CopilotVerdict, { tone: BadgeTone; icon: typeof Lock; label: string }> = {
  yes_license: { tone: 'green', icon: CheckCircle2, label: 'Copilot' },
  yes_studio: { tone: 'green', icon: Bot, label: 'Copilot-Agent' },
  partial: { tone: 'amber', icon: Hourglass, label: 'Teilweise' },
  no: { tone: 'neutral', icon: Ban, label: 'Nein' },
  not_needed: { tone: 'blue', icon: Cog, label: 'Kein LLM' },
};

export function CopilotVerdictBadge({ verdict, title }: { verdict: CopilotVerdict; title?: string }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <Badge tone={s.tone} icon={s.icon} title={title}>
      {s.label}
    </Badge>
  );
}
