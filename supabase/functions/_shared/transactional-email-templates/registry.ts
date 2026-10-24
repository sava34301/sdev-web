/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<Record<string, unknown>>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string
}

import { template as launchReminder } from './launch-reminder.tsx'
import { template as launchDay } from './launch-day.tsx'
import { template as postLaunchGuide } from './post-launch-guide.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'launch-reminder': launchReminder,
  'launch-day': launchDay,
  'post-launch-guide': postLaunchGuide,
}
