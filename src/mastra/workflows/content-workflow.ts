import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const validateContentStep = createStep({
  id: 'validate-content',
  description: 'Validates incoming text content',
  inputSchema: z.object({
    content: z.string().min(1, 'Content cannot be empty'),
    type: z.enum(['article', 'blog', 'social']).default('article')
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    isValid: z.boolean()
  }),
  execute: async ({ inputData }) => {
    const { content, type } = inputData

    const wordCount = content.trim().split(/\s+/).length
    const isValid = wordCount >= 5 // Minimum 5 words

    if (!isValid) {
      throw new Error(`Content too short: ${wordCount} words`)
    }

    return {
      content: content.trim(),
      type,
      wordCount,
      isValid
    }
  }
})

const enhanceContentStep = createStep({
  id: 'enhance-content',
  description: 'Adds metadata to validated content',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    isValid: z.boolean()
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    })
  }),
  execute: async ({ inputData }) => {
    const { content, type, wordCount } = inputData

    // Calculate reading time (200 words per minute)
    const readingTime = Math.ceil(wordCount / 200)

    // Determine difficulty based on word count
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy'
    if (wordCount > 100) difficulty = 'medium'
    if (wordCount > 300) difficulty = 'hard'

    return {
      content,
      type,
      wordCount,
      metadata: {
        readingTime,
        difficulty,
        processedAt: new Date().toISOString()
      }
    }
  }
})

export const contentWorkflow = createWorkflow({
  id: 'content-processing-workflow',
  description: 'Validates and enhances content',
  inputSchema: z.object({
    content: z.string(),
    type: z.enum(['article', 'blog', 'social']).default('article')
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    })
  })
})
  .then(validateContentStep)
  .then(enhanceContentStep)
  .commit()
