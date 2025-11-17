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

const generateSummaryStep = createStep({
  id: 'generate-summary',
  description: 'Creates a summary of the content',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    })
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    }),
    summary: z.string()
  }),
  execute: async ({ inputData }) => {
    const { content, type, wordCount, metadata } = inputData

    // Create a simple summary from first sentence
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const firstSentence = sentences[0]?.trim() + '.'

    // Generate summary based on content length
    let summary = firstSentence
    if (wordCount > 50) {
      summary += ` This ${type} contains ${wordCount} words and takes approximately ${metadata.readingTime} minute(s) to read.`
    }

    console.log(`📝 Generated summary: ${summary.length} characters`)

    return {
      content,
      type,
      wordCount,
      metadata,
      summary
    }
  }
})

const aiAnalysisStep = createStep({
  id: 'ai-analysis',
  description: 'AI-powered content analysis',
  inputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    }),
    summary: z.string()
  }),
  outputSchema: z.object({
    content: z.string(),
    type: z.string(),
    wordCount: z.number(),
    metadata: z.object({
      readingTime: z.number(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      processedAt: z.string()
    }),
    summary: z.string(),
    aiAnalysis: z.object({
      score: z.number(),
      feedback: z.string()
    })
  }),
  execute: async ({ inputData, mastra }) => {
    const { content, type, wordCount, metadata, summary } = inputData

    // Create prompt for the AI agent
    const prompt = `
Analyze this ${type} content:

Content: "${content}"
Word count: ${wordCount}
Reading time: ${metadata.readingTime} minutes
Difficulty: ${metadata.difficulty}

Please provide:
1. A quality score from 1-10
2. Brief feedback on strengths and areas for improvement

Format as JSON: {"score": number, "feedback": "your feedback here"}
    `

    // Get the contentAgent from the mastra instance.
    const contentAgent = mastra.getAgent('contentAgent')
    const { text } = await contentAgent.generate([
      { role: 'user', content: prompt }
    ])

    // Parse AI response (with fallback)
    let aiAnalysis
    try {
      aiAnalysis = JSON.parse(text)
    } catch {
      aiAnalysis = {
        score: 7,
        feedback: 'AI analysis completed. ' + text
      }
    }

    console.log(`🤖 AI Score: ${aiAnalysis.score}/10`)

    return {
      content,
      type,
      wordCount,
      metadata,
      summary,
      aiAnalysis
    }
  }
})

export const contentWorkflow = createWorkflow({
  id: 'content-processing-workflow',
  description: 'Validates, enhances, and summarizes content',
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
    }),
    summary: z.string()
  })
})
  .then(validateContentStep)
  .then(enhanceContentStep)
  .then(generateSummaryStep)
  .commit()

export const aiContentWorkflow = createWorkflow({
  id: 'ai-content-workflow',
  description: 'AI-enhanced content processing with analysis',
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
    }),
    summary: z.string(),
    aiAnalysis: z.object({
      score: z.number(),
      feedback: z.string()
    })
  })
})
  .then(validateContentStep)
  .then(enhanceContentStep)
  .then(generateSummaryStep)
  .then(aiAnalysisStep)
  .commit()
