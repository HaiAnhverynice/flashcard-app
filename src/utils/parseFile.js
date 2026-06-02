import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Two supported formats (auto-detected):
 *
 * 1. Full format:
 *    Column 1: Question text
 *    Column 2: Type — "MCQ" or "written"
 *    Column 3: Correct answer
 *    Column 4+: MCQ choices (for MCQ type; correct answer should be among them)
 *
 * 2. Word/definition format (header "Word,Definition" or any 2-column file):
 *    Column 1: Word / term
 *    Column 2: Definition
 *    Each word becomes an MCQ question; the correct choice is its definition
 *    and distractors are randomly drawn from the other definitions.
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const questions = processRows(results.data)
            resolve(questions)
          } catch (e) {
            reject(e)
          }
        },
        error: reject,
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
          const questions = processRows(rows)
          resolve(questions)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Unsupported file type. Please upload a .csv or .xlsx file.'))
    }
  })
}

function processRows(rows) {
  if (!rows || rows.length === 0) throw new Error('No question data found in file.')

  const firstCell = String(rows[0]?.[0] || '').toLowerCase()
  const secondCell = String(rows[0]?.[1] || '').toLowerCase()

  // Detect the word/definition format:
  //  - explicit header (Word/Term + Definition/Meaning), or
  //  - a header-less file whose second column is not a known question type.
  const wordDefHeaders = ['word', 'term', 'vocab', 'vocabulary']
  const defHeaders = ['definition', 'meaning', 'def', 'description']
  const hasWordDefHeader =
    wordDefHeaders.includes(firstCell) && defHeaders.includes(secondCell)
  const hasStandardHeader = ['question', 'q', '#'].includes(firstCell)

  if (!hasStandardHeader) {
    const probe = hasWordDefHeader
      ? String(rows[1]?.[1] || '').trim().toUpperCase()
      : secondCell.toUpperCase()
    if (hasWordDefHeader || !['MCQ', 'WRITTEN'].includes(probe)) {
      return processWordDefinitions(rows.slice(hasWordDefHeader ? 1 : 0))
    }
  }

  // Skip header row if first cell looks like a label
  const startIndex = hasStandardHeader ? 1 : 0
  const dataRows = rows.slice(startIndex)

  if (dataRows.length === 0) throw new Error('No question data found in file.')

  return dataRows.map((row, i) => {
    const question = String(row[0] || '').trim()
    const type = String(row[1] || '').trim().toUpperCase()
    const answer = String(row[2] || '').trim()

    if (!question) throw new Error(`Row ${i + startIndex + 1}: Missing question text.`)
    if (!['MCQ', 'WRITTEN'].includes(type))
      throw new Error(`Row ${i + startIndex + 1}: Type must be "MCQ" or "written", got "${row[1]}"`)
    if (!answer) throw new Error(`Row ${i + startIndex + 1}: Missing answer.`)

    let choices = []
    let resolvedAnswer = answer
    if (type === 'MCQ') {
      choices = row
        .slice(3)
        .map((c) => String(c).trim())
        .filter(Boolean)

      if (choices.length < 2)
        throw new Error(`Row ${i + startIndex + 1}: MCQ questions need at least 2 choices in columns D onwards.`)

      // Support numeric answer (1/2/3/4) as 1-based index into choices
      const numericIndex = parseInt(answer, 10)
      if (!isNaN(numericIndex) && numericIndex >= 1 && numericIndex <= choices.length) {
        resolvedAnswer = choices[numericIndex - 1]
      } else if (!choices.includes(answer)) {
        throw new Error(
          `Row ${i + startIndex + 1}: The answer "${answer}" must be a valid choice number (1–${choices.length}) or match one of the choices exactly.`
        )
      }

      // Shuffle choices
      choices = shuffle(choices)
    }

    return { question, type, answer: resolvedAnswer, choices }
  })
}

function processWordDefinitions(dataRows) {
  const pairs = dataRows
    .map((r) => ({
      word: String(r[0] || '').trim(),
      definition: String(r[1] || '').trim(),
    }))
    .filter((p) => p.word && p.definition)

  if (pairs.length < 2)
    throw new Error(
      'Word/definition format needs at least 2 rows so each question has multiple choices.'
    )

  const allDefs = [...new Set(pairs.map((p) => p.definition))]

  return pairs.map((p) => {
    const distractors = shuffle(allDefs.filter((d) => d !== p.definition)).slice(0, 3)
    const choices = shuffle([p.definition, ...distractors])
    return { question: p.word, type: 'MCQ', answer: p.definition, choices }
  })
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
