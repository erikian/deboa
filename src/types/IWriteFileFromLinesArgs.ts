/**
 * @property {string} filePath - Path to the output file.
 * @property {string[]} lines - Lines to be written.
 */
export interface IWriteFileFromLinesArgs {
  /** Path to the output file. */
  filePath: string

  /** Lines to be written. */
  lines: string[]
}
