import type { ReadStream, WriteStream } from 'fs'

/**
 * @property {Buffer} header - AR header.
 * @property {boolean} [isARFile] - If true, the .deb-specific sections won't be added to the file.
 * @property {readStream} readStream - ReadStream from the input file.
 * @property {WriteStream} writeStream - WriteStream to the output file.
 */
export interface IWriteToArchive {
  /** AR header. */
  header: Buffer

  /** If true, the .deb-specific sections won't be added to the file. */
  isARFile?: boolean

  /** ReadStream from the input file. */
  readStream: ReadStream

  /** WriteStream to the output file. */
  writeStream: WriteStream
}
