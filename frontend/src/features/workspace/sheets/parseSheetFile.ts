import * as XLSX from '@e965/xlsx'
import type { ColumnType, SheetRow, SheetUploadPayload, SheetValue } from '@/lib/sheets'

const MAX_ROWS = 5000
const MAX_COLUMNS = 100

function normalizeCell(value: unknown): SheetValue {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${value.getFullYear()}-${month}-${day}`
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return String(value)
}

function isDateValue(value: SheetValue): boolean {
  if (typeof value !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

function normalizeDateString(value: string): string {
  const isoDate = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  if (isoDate?.[1]) return isoDate[1]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

function detectType(values: SheetValue[]): ColumnType {
  const populated = values.filter((value): value is Exclude<SheetValue, null> => value !== null)
  if (populated.length === 0) return 'text'

  if (populated.every(value => typeof value === 'boolean' || (typeof value === 'string' && /^(true|false|yes|no)$/i.test(value)))) {
    return 'boolean'
  }

  if (populated.every(value => typeof value === 'string' && isDateValue(value))) return 'date'
  if (populated.every(value => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))))) {
    return 'number'
  }

  const uniqueCount = new Set(populated.map(String)).size
  return uniqueCount <= 12 || uniqueCount / populated.length <= 0.15 ? 'category' : 'text'
}

export function parseSheetFile(fileName: string, contents: ArrayBuffer): SheetUploadPayload {
  const workbook = XLSX.read(contents, { type: 'array', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('The file does not contain a readable worksheet.')

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) throw new Error('The first worksheet could not be read.')

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  })
  if (!matrix.length) throw new Error('The worksheet is empty.')

  const headerRow = matrix[0] ?? []
  const columnCount = Math.max(0, ...matrix.map(row => row.length))
  if (columnCount === 0) throw new Error('The worksheet does not contain any columns.')
  if (columnCount > MAX_COLUMNS) throw new Error(`The worksheet exceeds the ${MAX_COLUMNS}-column limit.`)
  if (matrix.length - 1 > MAX_ROWS) throw new Error(`The worksheet exceeds the ${MAX_ROWS}-row limit.`)

  const seenNames = new Map<string, number>()
  const columns = Array.from({ length: columnCount }, (_, index) => {
    const rawName = headerRow[index]
    const baseName = rawName === null || rawName === undefined || String(rawName).trim() === ''
      ? `Column ${index + 1}`
      : String(rawName).trim()
    const occurrence = seenNames.get(baseName) ?? 0
    seenNames.set(baseName, occurrence + 1)
    const name = occurrence === 0 ? baseName : `${baseName} ${occurrence + 1}`
    return { name, type: 'text' as ColumnType }
  })

  const dataMatrix = matrix.slice(1)
  const rows: SheetRow[] = dataMatrix.map(row => Object.fromEntries(
    columns.map((column, index) => [column.name, normalizeCell(row[index])])
  ))

  columns.forEach((column, index) => {
    column.type = detectType(dataMatrix.map(row => normalizeCell(row[index])))
    if (column.type === 'boolean') {
      rows.forEach(row => {
        const value = row[column.name]
        if (typeof value === 'string') row[column.name] = /^(true|yes)$/i.test(value)
      })
    } else if (column.type === 'date') {
      rows.forEach(row => {
        const value = row[column.name]
        if (typeof value === 'string') row[column.name] = normalizeDateString(value)
      })
    }
  })

  return {
    name: fileName.replace(/\.[^.]+$/, '') || fileName,
    columns,
    rows,
  }
}