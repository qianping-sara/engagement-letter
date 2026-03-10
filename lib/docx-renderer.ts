import { readFileSync } from 'fs'
import { join } from 'path'
import type { TemplateData } from './types'

const TEMPLATE_FILENAME = '2026 SA template_1.docx'

/**
 * Load template from project root and render one docx with the given data.
 * Returns the docx file as a Buffer.
 */
export function renderDocx(templateData: TemplateData): Buffer {
  const Docxtemplater = require('docxtemplater')
  const PizZip = require('pizzip')

  const templatePath = join(process.cwd(), TEMPLATE_FILENAME)
  const content = readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)

  const doc = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
  })

  doc.render(templateData)
  return doc.toBuffer()
}

export function getTemplatePath(): string {
  return join(process.cwd(), TEMPLATE_FILENAME)
}
