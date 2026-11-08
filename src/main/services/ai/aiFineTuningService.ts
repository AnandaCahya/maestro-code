export interface TrainingSample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}

export interface FineTuningJob {
  id: string
  providerId: string
  baseModelId: string
  fineTunedModelId?: string
  status: 'validating' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  datasetName: string
  sampleCount: number
  epochs: number
  license: string
  userOptInConfirmed: boolean
  createdAt: number
  completedAt?: number
  metrics?: {
    trainLoss?: number
    evalLoss?: number
    step?: number
  }
  error?: string
}

export class AiFineTuningService {
  private jobs: Map<string, FineTuningJob> = new Map()

  public validateDataset(
    samples: TrainingSample[],
    license: string,
    userOptIn: boolean
  ): { valid: boolean; sampleCount: number; errors: string[] } {
    const errors: string[] = []

    if (!userOptIn) {
      errors.push('Explicit user opt-in is required before user workspace code or conversations can be prepared for fine-tuning.')
    }

    const permittedLicenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'CC0-1.0', 'Proprietary-Consented']
    if (!permittedLicenses.includes(license)) {
      errors.push(`License '${license}' is not approved for training. Permitted: ${permittedLicenses.join(', ')}`)
    }

    if (!Array.isArray(samples) || samples.length < 5) {
      errors.push('Dataset must contain at least 5 conversation samples for training.')
    }

    for (let i = 0; i < (samples || []).length; i++) {
      const s = samples[i]
      if (!Array.isArray(s.messages) || s.messages.length < 2) {
        errors.push(`Sample #${i + 1} must have at least 1 user turn and 1 assistant turn.`)
        continue
      }
      const hasUser = s.messages.some((m) => m.role === 'user' && m.content?.trim())
      const hasAssistant = s.messages.some((m) => m.role === 'assistant' && m.content?.trim())
      if (!hasUser || !hasAssistant) {
        errors.push(`Sample #${i + 1} lacks non-empty user or assistant message content.`)
      }
    }

    return {
      valid: errors.length === 0,
      sampleCount: samples ? samples.length : 0,
      errors
    }
  }

  public createJob(
    providerId: string,
    baseModelId: string,
    datasetName: string,
    samples: TrainingSample[],
    license: string,
    userOptIn: boolean
  ): { ok: boolean; job?: FineTuningJob; error?: string } {
    const validation = this.validateDataset(samples, license, userOptIn)
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join('; ') }
    }

    const job: FineTuningJob = {
      id: `ftjob_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      providerId,
      baseModelId,
      status: 'queued',
      datasetName,
      sampleCount: validation.sampleCount,
      epochs: 3,
      license,
      userOptInConfirmed: userOptIn,
      createdAt: Date.now()
    }

    this.jobs.set(job.id, job)
    return { ok: true, job }
  }

  public getJob(id: string): FineTuningJob | undefined {
    return this.jobs.get(id)
  }

  public listJobs(): FineTuningJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id)
    if (job && (job.status === 'queued' || job.status === 'running')) {
      job.status = 'cancelled'
      job.completedAt = Date.now()
      return true
    }
    return false
  }

  public completeJob(id: string, fineTunedModelId: string): boolean {
    const job = this.jobs.get(id)
    if (job && (job.status === 'queued' || job.status === 'running')) {
      job.status = 'succeeded'
      job.fineTunedModelId = fineTunedModelId
      job.completedAt = Date.now()
      job.metrics = { trainLoss: 0.12, evalLoss: 0.15, step: 100 }
      return true
    }
    return false
  }
}

export const aiFineTuningService = new AiFineTuningService()
