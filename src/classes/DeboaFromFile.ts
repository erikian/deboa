import type { ReadStream } from 'fs'
import fs from 'fs'
import path from 'path'
import type { IWriteToArchive, IDeboaFromFile } from '../types'
import { createFileHeader } from '../utils/createFileHeader'
import { writeToArchive } from '../utils/writeToArchive'

/**
 * @return IDeboaFromFile
 */
export class DeboaFromFile implements IDeboaFromFile {
  #header: string = null

  isARFile: IDeboaFromFile['isARFile'] = false

  outputFile: IDeboaFromFile['outputFile'] = null

  writeStream: IWriteToArchive['writeStream'] = null

  constructor(options: IDeboaFromFile) {
    const { outputFile, isARFile } = options

    this.isARFile = isARFile
    this.outputFile = outputFile

    this.writeStream = fs.createWriteStream(outputFile, {
      encoding: 'binary',
    })
  }

  /**
   * Creates a ReadStream from the input file.
   * Useful if you need access to the underlying stream.
   */
  async createReadStream(inputFile: string): Promise<ReadStream> {
    if (this.#header !== null) {
      throw new Error('You can only have one ReadStream at a time.')
    }

    const readStream = fs.createReadStream(inputFile, { encoding: 'binary' })

    const stats = await fs.promises.lstat(inputFile)

    this.#header = createFileHeader({
      fileName: path.basename(inputFile),
      fileSize: stats.size,
    })

    return readStream
  }

  async writeFromStream(readStream: ReadStream): Promise<void> {
    if (this.#header === null) {
      throw new Error(
        'Missing header, please create the ReadStream using the `createReadStream` method.',
      )
    }

    await writeToArchive({
      header: Buffer.from(this.#header),
      isARFile: this.isARFile,
      readStream,
      writeStream: this.writeStream,
    })

    this.#header = null
  }

  /**
   * Writes the input file to the .deb.
   */
  async writeFromFile(inputFile: string): Promise<void> {
    const readStream = await this.createReadStream(inputFile)

    return this.writeFromStream(readStream)
  }
}
