import { IWriteToArchive } from '../types'

/**
 * @property {string} outputFile - Path to the output file.
 */
export interface IDeboaFromFile extends Pick<IWriteToArchive, 'isARFile'> {
  /** Path to the output file. */
  outputFile: string
}
