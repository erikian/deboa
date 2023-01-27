import type { IDeboa } from '../types'

/**
 * Ensures all files/directories in the .tar archive are owned by root,
 * not by the current user when running on Unix or by a invalid user on Windows.
 */
export const changeOwnerToRoot: Exclude<IDeboa['modifyTarHeader'], string> =
  header => {
    header.gname = 'root'
    header.uname = 'root'
    header.gid = 0
    header.uid = 0

    return header
  }
