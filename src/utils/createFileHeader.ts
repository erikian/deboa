import { INormalizeOptionLength } from '../types'

export function createFileHeader(options: INormalizeOptionLength): string {
  const { fileName, ...numericOptions } = options

  const {
    timestamp = String(Math.trunc(new Date().getTime() / 1000)),
    ownerID = '0',
    groupID = '0',
    fileMode = '100644',
    fileSize,
  } = numericOptions

  if (!fileName) {
    throw new Error('filename is required')
  }

  const maxLengthMap: Record<
    keyof INormalizeOptionLength,
    { maxLength: number; value: string }
  > = {
    fileName: {
      maxLength: 16,
      value: fileName,
    },
    timestamp: {
      maxLength: 12,
      value: String(timestamp),
    },
    ownerID: {
      maxLength: 6,
      value: String(ownerID),
    },
    groupID: {
      maxLength: 6,
      value: String(groupID),
    },
    fileMode: {
      maxLength: 8,
      value: String(fileMode),
    },
    fileSize: {
      maxLength: 10,
      value: String(fileSize),
    },
  }

  const paddedFields = Object.entries(maxLengthMap).map(
    ([optionName, { maxLength, value }]) => {
      // checks if the numeric options are correct
      if (optionName in numericOptions) {
        const asNumber = +value

        if (Number.isNaN(asNumber)) {
          throw new Error(
            `The \`${optionName}\` option must be a numeric value`,
          )
        }

        if (!Number.isInteger(asNumber)) {
          throw new Error(`The \`${optionName}\` option must be a integer`)
        }
      }

      // checks if the option length is correct
      if (value.length > maxLength) {
        throw new Error(
          `The \`${optionName}\` option must be at most ${maxLength} characters`,
        )
      }

      return value.padEnd(maxLength)
    },
  )

  // ending sequence
  paddedFields.push('`\n')

  return paddedFields.join('')
}
