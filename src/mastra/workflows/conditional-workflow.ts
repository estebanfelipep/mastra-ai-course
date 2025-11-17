import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

// Conditional Workflow Steps
const assessmentStep = createStep({
  id: 'content-assessment',
  description: 'Assesses content characteristics for routing',
  inputSchema: z.object({
    content: z.string(),
    type: z.enum(['article', 'blog', 'social']).default('article')
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    category: z.enum(['short', 'medium', 'long']),
    complexity: z.enum(['simple', 'complex'])
  }),
  execute: async ({ inputData }) => {
    const { content, type } = inputData
    const wordCount = content.trim().split(/\s+/).length

    // Determine category
    let category: 'short' | 'medium' | 'long' = 'short'
    if (wordCount > 50) category = 'medium'
    if (wordCount > 200) category = 'long'

    // Determine complexity (simple heuristic based on sentence structure)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1)
    const complexity: 'simple' | 'complex' =
      avgWordsPerSentence > 15 ? 'complex' : 'simple'

    console.log(`📊 Assessment: ${category}, ${complexity}`)

    return {
      content,
      type,
      wordCount,
      category,
      complexity
    }
  }
})

const quickProcessingStep = createStep({
  id: 'quick-processing',
  description: 'Fast processing for short content',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    category: z.enum(['short', 'medium', 'long']),
    complexity: z.enum(['simple', 'complex'])
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    processingType: z.string(),
    summary: z.string()
  }),
  execute: async ({ inputData }) => {
    console.log('⚡ Quick processing...')
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      content: inputData.content,
      type: inputData.type,
      wordCount: inputData.wordCount,
      processingType: 'quick',
      summary: `Quick summary of ${inputData.wordCount} word ${inputData.type}`
    }
  }
})

const standardProcessingStep = createStep({
  id: 'standard-processing',
  description: 'Standard processing for medium content',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    category: z.enum(['short', 'medium', 'long']),
    complexity: z.enum(['simple', 'complex'])
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    processingType: z.string(),
    summary: z.string(),
    metadata: z.object({
      readingTime: z.number()
    })
  }),
  execute: async ({ inputData }) => {
    console.log('📝 Standard processing...')
    await new Promise(resolve => setTimeout(resolve, 300))

    const readingTime = Math.ceil(inputData.wordCount / 200)

    return {
      content: inputData.content,
      type: inputData.type,
      wordCount: inputData.wordCount,
      processingType: 'standard',
      summary: `Standard summary of ${inputData.wordCount} word ${inputData.type}`,
      metadata: {
        readingTime
      }
    }
  }
})

const deepProcessingStep = createStep({
  id: 'deep-processing',
  description: 'Thorough processing for long/complex content',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    category: z.enum(['short', 'medium', 'long']),
    complexity: z.enum(['simple', 'complex'])
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    processingType: z.string(),
    summary: z.string(),
    metadata: z.object({
      readingTime: z.number(),
      keyPoints: z.array(z.string())
    })
  }),
  execute: async ({ inputData }) => {
    console.log('🔍 Deep processing...')
    await new Promise(resolve => setTimeout(resolve, 500))

    const readingTime = Math.ceil(inputData.wordCount / 200)
    const sentences = inputData.content
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 0)
    const keyPoints = sentences.slice(0, 3).map(s => s.trim())

    return {
      content: inputData.content,
      type: inputData.type,
      wordCount: inputData.wordCount,
      processingType: 'deep',
      summary: `Deep analysis of ${inputData.wordCount} word ${inputData.type}`,
      metadata: {
        readingTime,
        keyPoints
      }
    }
  }
})

export const conditionalWorkflow = createWorkflow({
  id: 'conditional-content-workflow',
  description:
    'Routes content to different processing based on characteristics',
  inputSchema: z.object({
    content: z.string(),
    type: z.enum(['article', 'blog', 'social']).default('article')
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    processingType: z.string(),
    summary: z.string()
  })
})
  .then(assessmentStep)
  .branch([
    // Short content takes quick path
    [
      async ({ inputData }: any) => {
        return inputData.category === 'short'
      },
      quickProcessingStep
    ],
    // Long or complex content gets deep processing
    [
      async ({ inputData }: any) => {
        return (
          inputData.category === 'long' || inputData.complexity === 'complex'
        )
      },
      deepProcessingStep
    ],
    // Everything else gets standard processing
    [
      async ({ inputData }: any) => {
        return (
          inputData.category === 'medium' && inputData.complexity === 'simple'
        )
      },
      standardProcessingStep
    ]
  ])
  .commit()
