/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as syncInvite } from './sync-invite.tsx'
import { template as reviewShared } from './review-shared.tsx'
import { template as reviewAcknowledged } from './review-acknowledged.tsx'
import { template as adminNewLead } from './admin-new-lead.tsx'
import { template as enterpriseLead } from './enterprise-lead.tsx'
import { template as leaderWelcome } from './leader-welcome.tsx'
import { template as memberWelcome } from './member-welcome.tsx'
import { template as hrAdminWelcome } from './hr-admin-welcome.tsx'
import { template as waitlistConfirmation } from './waitlist-confirmation.tsx'
import { template as syncCompleted } from './sync-completed.tsx'
import { template as weeklySummary } from './weekly-summary.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'sync-invite': syncInvite,
  'review-shared': reviewShared,
  'review-acknowledged': reviewAcknowledged,
  'admin-new-lead': adminNewLead,
  'enterprise-lead': enterpriseLead,
  'leader-welcome': leaderWelcome,
  'member-welcome': memberWelcome,
  'hr-admin-welcome': hrAdminWelcome,
  'waitlist-confirmation': waitlistConfirmation,
  'sync-completed': syncCompleted,
  'weekly-summary': weeklySummary,
}
