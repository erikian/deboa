import { createFileHeader } from './createFileHeader'
import { IWriteToArchive } from '../types'

/**
 * Writes the .ar archive signature. If it's a .deb file,
 * also writes the `debian-control` file and its header.
 */
async function writeArchiveHeader({
  writeStream,
  isARFile = false,
}: Omit<IWriteToArchive, 'header' | 'readStream'>): Promise<void> {
  return new Promise((resolve, reject) => {
    const arArchiveSignature = '!<arch>\n'

    const header = [arArchiveSignature]

    // this part is .deb-specific, so we don't need it in plain .ar files
    if (!isARFile) {
      const debianBinaryFile = '2.0\n'

      const debianBinaryIdentifier = createFileHeader({
        fileName: 'debian-binary',
        fileSize: debianBinaryFile.length,
      })

      header.push(debianBinaryIdentifier, debianBinaryFile)
    }

    writeStream.write(Buffer.concat(header.map(Buffer.from)), headerErr => {
      if (headerErr) {
        reject(`Error writing the archive header: ${headerErr}`)
      }

      resolve()
    })
  })
}

/**
 *
 */
export async function writeToArchive({
  header,
  isARFile = false,
  readStream,
  writeStream,
}: IWriteToArchive): Promise<void> {
  const shouldWriteArchiveHeader = writeStream.bytesWritten === 0

  if (shouldWriteArchiveHeader) {
    console.log('Writing the archive header...\n')

    await writeArchiveHeader({ writeStream, isARFile })

    console.log('Archive header successfully written\n')
  }

  return new Promise((resolve, reject) => {
    const fileNameIdentifier = header.toString('utf-8').slice(0, 16).trim()

    writeStream.write(header, identifierErr => {
      console.log(
        `Writing the identifier header for ${fileNameIdentifier}...\n`,
      )

      if (identifierErr) {
        reject(
          `Error writing the identifier header for ${fileNameIdentifier}: ${identifierErr}`,
        )
      }

      console.log(
        `Identifier header for ${fileNameIdentifier} successfully written\n`,
      )

      const initialBytesWritten = writeStream.bytesWritten

      console.log(`Writing file ${fileNameIdentifier}...\n`)

      readStream.on('error', fileError =>
        reject(`Error writing file ${fileNameIdentifier}: ${fileError}`),
      )

      readStream.pipe(writeStream, { end: false })

      readStream.on('end', () => {
        const readStreamSize = writeStream.bytesWritten - initialBytesWritten

        const shouldWritePaddingByte = readStreamSize % 2 !== 0

        if (!shouldWritePaddingByte) {
          console.log(`File ${fileNameIdentifier} successfully written\n`)

          return resolve()
        }

        console.log(`Writing padding byte for ${fileNameIdentifier}...\n`)

        writeStream.write(Buffer.from('\n'), paddingError => {
          if (paddingError) {
            reject(
              `Error writing padding byte for ${fileNameIdentifier}: ${identifierErr}`,
            )
          }

          console.log(`File ${fileNameIdentifier} successfully written\n`)

          return resolve()
        })
      })
    })
  })
}
