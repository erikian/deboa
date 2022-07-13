import { promises as fs } from 'fs'
import { IWriteFileFromLinesArgs } from '../types'

/**
 * Creates a file from a string array.
 */
export async function writeFileFromLines({
  filePath,
  lines,
}: IWriteFileFromLinesArgs): Promise<void> {
  const joined = lines.join('\n') + '\n'

  await fs.writeFile(filePath, joined)
}
