import { Headers as TarStreamHeader, Pack } from 'tar-stream'

export interface IAddTarEntriesParams {
  entries: TarStreamHeader[]
  pack: Pack
}
