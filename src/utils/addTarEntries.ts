import { IAddTarEntriesParams } from '../types'

/**
 * Adds entries to the .tar archive after all the files are packed.
 */
export async function addTarEntries({
  entries,
  pack,
}: IAddTarEntriesParams): Promise<void> {
  const entriesCopy = entries.slice()

  return new Promise<void>((resolve, reject) => {
    function packEntry(err?: Error): void {
      if (err) {
        reject(err)
      }

      if (entriesCopy.length === 0) {
        return resolve()
      }

      const entry = entriesCopy.shift()

      pack.entry(entry, packEntry)
    }

    packEntry()

    pack.on('error', reject)
  })
}
