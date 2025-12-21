#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { parse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import generatorModule from '@babel/generator'

const traverse = traverseModule.default ?? traverseModule
const generate = generatorModule.default ?? generatorModule

function usage() {
  return [
    'Usage:',
    '  node scripts/extract_backup_chapters.mjs <bundle.js> [--out <dir>]',
    '',
    'What it does:',
    '  - Finds the Chapter 1 and Chapter 2 component functions inside a Vite bundle (e.g. backup.js).',
    '  - Writes pretty-printed component code and a rough Markdown text dump (sections + paragraphs).',
    '',
    'Example:',
    '  node scripts/extract_backup_chapters.mjs backup.js --out /tmp/babygpt-recovered',
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

function getObjectProp(obj, keyName) {
  if (!obj || obj.type !== 'ObjectExpression') return null
  for (const prop of obj.properties) {
    if (prop.type !== 'ObjectProperty') continue
    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'StringLiteral'
          ? prop.key.value
          : null
    if (key === keyName) return prop.value
  }
  return null
}

function isJsxRuntimeCall(node) {
  if (!node || node.type !== 'CallExpression') return false
  const callee = node.callee
  if (!callee || callee.type !== 'MemberExpression') return false
  const prop = callee.property
  if (!prop || prop.type !== 'Identifier') return false
  return prop.name === 'jsx' || prop.name === 'jsxs'
}

function flattenText(expr) {
  if (!expr) return ''

  switch (expr.type) {
    case 'StringLiteral':
      return expr.value
    case 'NumericLiteral':
      return String(expr.value)
    case 'TemplateLiteral': {
      // Drop expressions; keep the human-written text.
      return expr.quasis.map((q) => q.value.cooked ?? '').join('')
    }
    case 'ArrayExpression':
      return expr.elements.map((el) => flattenText(el)).join('')
    case 'CallExpression': {
      if (!isJsxRuntimeCall(expr)) return ''
      const props = expr.arguments[1]
      const children = getObjectProp(props, 'children')
      return flattenText(children)
    }
    case 'ObjectExpression': {
      const children = getObjectProp(expr, 'children')
      return flattenText(children)
    }
    case 'ConditionalExpression':
      return `${flattenText(expr.consequent)}${flattenText(expr.alternate)}`
    case 'BinaryExpression':
      if (expr.operator === '+') return `${flattenText(expr.left)}${flattenText(expr.right)}`
      return ''
    case 'ParenthesizedExpression':
      return flattenText(expr.expression)
    default:
      return ''
  }
}

function inferComponentIds(funcPath) {
  const paragraphCounts = new Map()
  const sectionCounts = new Map()
  const calloutCounts = new Map()

  funcPath.traverse({
    CallExpression(path) {
      const node = path.node
      if (!isJsxRuntimeCall(node)) return
      const component = node.arguments[0]
      const props = node.arguments[1]
      if (!props || props.type !== 'ObjectExpression') return

      const children = getObjectProp(props, 'children')
      const hasChildren = children !== null

      const numberNode = getObjectProp(props, 'number')
      const titleNode = getObjectProp(props, 'title')
      const variantNode = getObjectProp(props, 'variant')

      if (component?.type === 'Identifier' && hasChildren) {
        const propCount = props.properties.filter((p) => p.type === 'ObjectProperty').length
        if (propCount <= 2) {
          paragraphCounts.set(component.name, (paragraphCounts.get(component.name) ?? 0) + 1)
        }
      }

      if (
        component?.type === 'Identifier' &&
        numberNode?.type === 'StringLiteral' &&
        /^\d+\.\d+/.test(numberNode.value) &&
        titleNode?.type === 'StringLiteral'
      ) {
        sectionCounts.set(component.name, (sectionCounts.get(component.name) ?? 0) + 1)
      }

      if (
        component?.type === 'Identifier' &&
        variantNode?.type === 'StringLiteral' &&
        titleNode?.type === 'StringLiteral'
      ) {
        calloutCounts.set(component.name, (calloutCounts.get(component.name) ?? 0) + 1)
      }
    },
  })

  const pickMostCommon = (m) => {
    let best = null
    let bestCount = -1
    for (const [k, v] of m.entries()) {
      if (v > bestCount) {
        best = k
        bestCount = v
      }
    }
    return best
  }

  return {
    paragraphId: pickMostCommon(paragraphCounts),
    sectionId: pickMostCommon(sectionCounts),
    calloutId: pickMostCommon(calloutCounts),
  }
}

function extractLinearEvents(funcPath) {
  const { paragraphId, sectionId, calloutId } = inferComponentIds(funcPath)

  const events = []

  funcPath.traverse({
    CallExpression(path) {
      const node = path.node
      if (!isJsxRuntimeCall(node)) return

      const component = node.arguments[0]
      const props = node.arguments[1]
      if (!props || props.type !== 'ObjectExpression') return

      if (component?.type === 'StringLiteral' && component.value === 'summary') {
        const text = normalizeSpaces(flattenText(getObjectProp(props, 'children')))
        if (text.length) events.push({ kind: 'summary', text })
        return
      }

      if (component?.type === 'StringLiteral' && component.value === 'li') {
        const text = normalizeSpaces(flattenText(getObjectProp(props, 'children')))
        if (text.length) events.push({ kind: 'li', text })
        return
      }

      if (calloutId && component?.type === 'Identifier' && component.name === calloutId) {
        const titleNode = getObjectProp(props, 'title')
        const variantNode = getObjectProp(props, 'variant')
        if (titleNode?.type === 'StringLiteral') {
          events.push({
            kind: 'callout',
            title: titleNode.value,
            variant: variantNode?.type === 'StringLiteral' ? variantNode.value : null,
          })
        }
        return
      }

      if (component?.type === 'Identifier' && component.name === sectionId) {
        const numberNode = getObjectProp(props, 'number')
        const titleNode = getObjectProp(props, 'title')
        if (numberNode?.type === 'StringLiteral' && titleNode?.type === 'StringLiteral') {
          events.push({ kind: 'section', number: numberNode.value, title: titleNode.value })
        }
        return
      }

      if (component?.type === 'Identifier' && component.name === paragraphId) {
        const text = normalizeSpaces(flattenText(getObjectProp(props, 'children')))
        if (text.length) events.push({ kind: 'paragraph', text })
        return
      }
    },
  })

  return { paragraphId, sectionId, calloutId, events }
}

function eventsToMarkdown({ chapterName, events }) {
  const lines = [`# ${chapterName} (extracted from bundle)`, '']

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

function findChapterFunctionPaths(ast) {
  const out = new Map()

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name
      if (name === 'wP' || name === 'SP') out.set(name, path)
    },
    VariableDeclarator(path) {
      const id = path.node.id
      const init = path.node.init
      if (id?.type !== 'Identifier') return
      if (id.name !== 'wP' && id.name !== 'SP') return
      if (!init) return
      if (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression') {
        out.set(id.name, path.get('init'))
      }
    },
  })

  return out
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    process.exit(args.length === 0 ? 1 : 0)
  }

  const inputPath = args[0]
  const outDir = getArgValue(args, '--out', '/tmp/babygpt-recovered')

  fs.mkdirSync(outDir, { recursive: true })

  const code = fs.readFileSync(inputPath, 'utf8')
  const ast = parse(code, {
    sourceType: 'script',
    plugins: ['jsx'],
    errorRecovery: true,
  })

  const chapters = findChapterFunctionPaths(ast)
  if (!chapters.size) {
    throw new Error('Could not find chapter component functions (expected names: wP, SP).')
  }

  for (const [name, funcPath] of chapters.entries()) {
    const pretty = generate(funcPath.node, {
      comments: false,
      compact: false,
      jsescOption: { minimal: true },
    }).code

    fs.writeFileSync(path.join(outDir, `${name}.pretty.js`), `${pretty}\n`)

    const extracted = extractLinearEvents(funcPath)
    fs.writeFileSync(path.join(outDir, `${name}.events.json`), `${JSON.stringify(extracted, null, 2)}\n`)

    const chapterLabel = name === 'wP' ? 'Chapter 1' : name === 'SP' ? 'Chapter 2' : name
    fs.writeFileSync(path.join(outDir, `${name}.content.md`), `${eventsToMarkdown({ chapterName: chapterLabel, events: extracted.events })}\n`)
  }

  const found = [...chapters.keys()].sort().join(', ')
  console.log(`Extracted: ${found}`)
  console.log(`Wrote files to: ${outDir}`)
}

main().catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})
