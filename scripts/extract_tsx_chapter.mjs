#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'

const traverse = traverseModule.default ?? traverseModule

function usage() {
  return [
    'Usage:',
    '  node scripts/extract_tsx_chapter.mjs <chapter.tsx> [--out <dir>]',
    '',
    'What it does:',
    '  - Parses a TSX chapter file and extracts Section/Paragraph text into Markdown.',
    '',
    'Example:',
    '  node scripts/extract_tsx_chapter.mjs src/chapters/Chapter2.tsx --out /tmp/babygpt-current',
    '',
  ].join('\n')
}

function getArgValue(args, flag, defaultValue) {
  const idx = args.indexOf(flag)
  if (idx === -1) return defaultValue
  return args[idx + 1] ?? defaultValue
}

function normalizeSpaces(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

function jsxName(node) {
  if (!node) return null
  if (node.type === 'JSXIdentifier') return node.name
  if (node.type === 'JSXMemberExpression') return `${jsxName(node.object)}.${jsxName(node.property)}`
  return null
}

function attrValue(attrs, name) {
  for (const attr of attrs) {
    if (attr.type !== 'JSXAttribute') continue
    if (attr.name.type !== 'JSXIdentifier') continue
    if (attr.name.name !== name) continue
    if (!attr.value) return null
    if (attr.value.type === 'StringLiteral') return attr.value.value
    if (attr.value.type === 'JSXExpressionContainer') {
      const expr = attr.value.expression
      if (expr.type === 'StringLiteral') return expr.value
      if (expr.type === 'TemplateLiteral') return expr.quasis.map((q) => q.value.cooked ?? '').join('')
    }
  }
  return null
}

function flattenJsx(node) {
  if (!node) return ''

  switch (node.type) {
    case 'JSXText':
      return node.value
    case 'StringLiteral':
      return node.value
    case 'NumericLiteral':
      return String(node.value)
    case 'TemplateLiteral':
      return node.quasis.map((q) => q.value.cooked ?? '').join('')
    case 'JSXExpressionContainer': {
      const expr = node.expression
      if (!expr) return ''
      if (expr.type === 'StringLiteral') return expr.value
      if (expr.type === 'TemplateLiteral') return flattenJsx(expr)
      if (expr.type === 'NumericLiteral') return String(expr.value)
      if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') return flattenJsx(expr)
      return ''
    }
    case 'JSXFragment':
      return node.children.map(flattenJsx).join('')
    case 'JSXElement':
      return node.children.map(flattenJsx).join('')
    case 'BinaryExpression':
      if (node.operator === '+') return `${flattenJsx(node.left)}${flattenJsx(node.right)}`
      return ''
    case 'ParenthesizedExpression':
      return flattenJsx(node.expression)
    default:
      return ''
  }
}

function extractEvents(ast) {
  const events = []
  traverse(ast, {
    JSXElement(path) {
      const name = jsxName(path.node.openingElement.name)
      if (name === 'Section') {
        const number = attrValue(path.node.openingElement.attributes, 'number')
        const title = attrValue(path.node.openingElement.attributes, 'title')
        if (number && title) events.push({ kind: 'section', number, title })
      }

      if (name === 'Callout') {
        const title = attrValue(path.node.openingElement.attributes, 'title')
        const variant = attrValue(path.node.openingElement.attributes, 'variant')
        if (title) events.push({ kind: 'callout', title, variant: variant ?? null })
      }

      if (name === 'summary') {
        const text = normalizeSpaces(path.node.children.map(flattenJsx).join(''))
        if (text.length) events.push({ kind: 'summary', text })
      }

      if (name === 'li') {
        const text = normalizeSpaces(path.node.children.map(flattenJsx).join(''))
        if (text.length) events.push({ kind: 'li', text })
      }

      if (name === 'Paragraph') {
        const text = normalizeSpaces(path.node.children.map(flattenJsx).join(''))
        if (text.length) events.push({ kind: 'paragraph', text })
      }
    },
  })
  return events
}

function eventsToMarkdown({ chapterName, events }) {
  const lines = [`# ${chapterName} (extracted from TSX)`, '']

  for (const ev of events) {
    if (ev.kind === 'section') {
      lines.push(`## ${ev.number} ${ev.title}`, '')
      continue
    }
    if (ev.kind === 'callout') {
      lines.push(`### Callout: ${ev.title}`, '')
      continue
    }
    if (ev.kind === 'summary') {
      lines.push(`#### ${ev.text}`, '')
      continue
    }
    if (ev.kind === 'li') {
      lines.push(`- ${ev.text}`, '')
      continue
    }
    if (ev.kind === 'paragraph') {
      lines.push(ev.text, '')
      continue
    }
  }

  return lines.join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    process.exit(args.length === 0 ? 1 : 0)
  }

  const inputPath = args[0]
  const outDir = getArgValue(args, '--out', '/tmp/babygpt-current')
  fs.mkdirSync(outDir, { recursive: true })

  const code = fs.readFileSync(inputPath, 'utf8')
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  })

  const events = extractEvents(ast)
  const base = path.basename(inputPath, path.extname(inputPath))
  fs.writeFileSync(path.join(outDir, `${base}.events.json`), `${JSON.stringify(events, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, `${base}.content.md`), `${eventsToMarkdown({ chapterName: base, events })}\n`)

  console.log(`Extracted ${events.length} events from ${inputPath}`)
  console.log(`Wrote files to: ${outDir}`)
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})
