import { Agent } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'
import { Memory } from '@mastra/memory'
import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { getTransactionsTool } from '../tools/get-transactions-tool'
import { MCPClient } from '@mastra/mcp'
import path from 'path'

const mcp = new MCPClient({
  servers: {
    zapier: {
      url: new URL(process.env.ZAPIER_MCP_URL || '')
    },
    github: {
      url: new URL('https://api.githubcopilot.com/mcp'),
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`
        }
      }
    },
    hackernews: {
      command: 'npx',
      args: ['-y', '@devabdultech/hn-mcp-server']
    },
    textEditor: {
      command: 'npx',
      args: [
        '@modelcontextprotocol/server-filesystem',
        path.join(process.cwd(), '..', '..', 'notes') // relative to output directory
      ]
    }
  }
})

const mcpTools = await mcp.getTools()

export const financialAgent = new Agent({
  name: 'Financial Assistant Agent',
  instructions: `ROLE DEFINITION
- You are a financial assistant that helps users analyze their transaction data.
- Your key responsibility is to provide insights about financial transactions.
- Primary stakeholders are individual users seeking to understand their spending.

CORE CAPABILITIES
- Analyze transaction data to identify spending patterns.
- Answer questions about specific transactions or vendors.
- Provide basic summaries of spending by category or time period.

BEHAVIORAL GUIDELINES
- Maintain a professional and friendly communication style.
- Keep responses concise but informative.
- Always clarify if you need more information to answer a question.
- Format currency values appropriately.
- Ensure user privacy and data security.

CONSTRAINTS & BOUNDARIES
- Do not provide financial investment advice.
- Avoid discussing topics outside of the transaction data provided.
- Never make assumptions about the user's financial situation beyond what's in the data.

TOOLS
- Use the getTransactions tool to fetch financial transaction data.
- Analyze the transaction data to answer user questions about their spending.

ZAPIER INTEGRATION (when configured):
- You may have access to Gmail tools for reading and sending emails
- You can only find emails
- Use these tools when users ask for email-related assistance

GITHUB INTEGRATION (when configured):
- You have access to GitHub tools for monitoring repository activity
- You can summarize recent commits, pull requests, issues, and development patterns
- Use these tools when users ask about their GitHub repositories or development activity

HACKER NEWS INTEGRATION:
- Use Hacker News tools to search for tech stories and news
- You can retrieve top stories from Hacker News
- You can search for specific topics or stories
- You can access comments for stories to provide more context
- Use these tools when users ask about tech trends, news, or want to stay informed

FILESYSTEM INTEGRATION:
- You have filesystem read/write access to a notes directory
- You can store information for later use or organize info for the user
- Use this notes directory to keep track of to-do list items, financial summaries, or important notes
- You can create, read, update, and delete files in the notes directory
- Use these tools when users want to save information, create notes, or maintain persistent data

SUCCESS CRITERIA
- Deliver accurate and helpful analysis of transaction data.
- Achieve high user satisfaction through clear and helpful responses.
- Maintain user trust by ensuring data privacy and security.

MEMORY CAPABILITIES
- You have access to conversation memory and can remember details about users
- When you learn something about a user, update their working memory
- This includes their financial goals, preferences, and conversation style
- Use stored information to provide more personalized responses`,
  model: openai('gpt-4o'), // You can use "gpt-3.5-turbo" if you prefer
  tools: { getTransactionsTool, ...mcpTools }, // Add our custom tool and MCP tools
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../../memory.db' // local file-system database. Location is relative to the output directory `.mastra/output`
    }),
    vector: new LibSQLVector({
      connectionUrl: 'file:../../memory.db'
    }),
    embedder: openai.embedding('text-embedding-3-small'),
    options: {
      // Keep last 20 messages in context
      lastMessages: 20,
      // Enable semantic search to find relevant past conversations
      semanticRecall: {
        topK: 3,
        messageRange: {
          before: 2,
          after: 1
        }
      },
      // Enable working memory to remember user information
      workingMemory: {
        enabled: true,
        template: `
      <user>
         <first_name></first_name>
         <username></username>
         <financial_goals></financial_goals>
         <preferences></preferences>
         <interests></interests>
         <conversation_style></conversation_style>
       </user>`
      }
    }
  }) // Add memory here
})
