import type { MockRequest } from '../types.js'
import { authMethod } from './authMethod.js'

/**
 * Named preset registry. Resolved from here by `withMocks` (Playwright), the
 * manual runner (`mock:dev --preset <name>`) and the lab's in-app scenario
 * picker, so a preset added here shows up in all three.
 */
export const presets = {
  authMethod,
} satisfies Record<string, MockRequest[]>

export type PresetName = keyof typeof presets
