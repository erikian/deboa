import type { Headers as OriginalTarFSHeader } from 'tar-fs'
import type { Headers as TarStreamHeader } from 'tar-stream'
import { IControlFileOptions } from './IControlFileOptions'

type TarFSHeader = OriginalTarFSHeader &
  Pick<TarStreamHeader, 'uname' | 'gname'>

/**
 * @property {IDeboa["additionalTarEntries"]} [additionalTarEntries] -
 *  Additional entries to be added to the .tar archive. This is useful for
 *  creating symlinks on Windows. See the [Headers]{@link TarStreamHeader}
 *  interface from tar-stream for more details. Optional.
 *
 *
 * @property {IDeboa["beforeCreateDesktopEntry"]} [beforeCreateDesktopEntry] -
 *  Runs before the desktop entry file is created, allowing you to add more
 *  entries or modify the default entries if necessary. This can be a function
 *  or a path to a file that has a function as its default export. Check
 *  {@link https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html}
 *  for more details. Optional.
 *
 *
 * @property {IDeboa["beforePackage"]} [beforePackage] -
 *  Runs after the control file, maintainer scripts and sourceDir contents
 *  are copied to the temporary directory and before they're packaged. Receives
 *  the temporary directory path as an argument. This can be a function or a
 *  path to a file that has a function as its default export. Optional.
 *
 *
 * @property {IDeboa["controlFileOptions"]} controlFileOptions -
 *  Control file fields.
 *  {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html}
 *
 *
 * @property {IDeboa["icon"]} [icon] -
 *  Path to the image you want to use as your app icon. It is copied to
 *  /usr/share/pixmaps. Optional.
 *
 *
 * @property {IDeboa["installationRoot"]} [installationRoot] -
 *  Directory your files will be installed to. Defaults to `/usr/lib/${packageName}`.
 *
 *
 * @property {IDeboa["modifyTarHeader"]} [modifyTarHeader] -
 *  This callback makes it possible to modify file headers before they're
 *  written to the .tar archive, which is useful for setting permissions.
 *  This can be a function or a path to a file that has a function as its
 *  default export. See the [Headers]{@link TarFSHeader} interface from tar-fs
 *  and {@link https://github.com/mafintosh/tar-fs/blob/7ec11cb27f93948193770f32b4d820e2e7195715/README.md}
 *  for more details. Optional.
 *
 *
 * @property {IDeboa["sourceDir"]} sourceDir -
 *  Location of the files you want to package. **This field is mandatory.**
 *
 *
 * @property {IDeboa["tarballFormat"]} [tarballFormat] -
 *  Sets the format used for storing the files. This impacts the build time
 *  and .deb output size. Defaults to `tar.gz`.
 *
 *  As a rule of thumb, you can expect the following from each format:
 *  - `tar` (no compression): lowest resources usage, faster build time, largest .deb size
 *  - `tar.gz` (gzip compression using zlib): low resources usage, good build time, good .deb size
 *  - `tar.xz` (xz compression using lzma-native): high resources usage, slowest build time, smallest .deb size
 *
 *
 * @property {IDeboa["targetDir"]} targetDir -
 *  Directory where your .deb file will be copied to.
 *  **This field is mandatory.**
 */
export interface IDeboa {
  /**
   * Additional entries to be added to the .tar archive. This is useful for
   * creating symlinks on Windows. See the [Headers]{@link TarStreamHeader}
   * interface from tar-stream for more details. Optional.
   */
  additionalTarEntries?: TarStreamHeader[]

  /**
   * Runs before the desktop entry file is created, allowing you to add more
   * entries or modify the default entries if necessary. This can be a function
   * or a path to a file that has a function as its default export. Check
   * {@link https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html}
   * for more details. Optional.
   */
  beforeCreateDesktopEntry?:
    | string
    | (<T extends Record<string, string>>(desktopEntries: T) => Promise<T> | T)

  /**
   * Runs after the control file, maintainer scripts and sourceDir contents
   * are copied to the temporary directory and before they're packaged. Receives
   * the temporary directory path as an argument. This can be a function or a
   * path to a file that has a function as its default export. Optional.
   */
  beforePackage?: string | ((tempDir: string) => Promise<void> | void)

  /**
   * Control file fields.
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html}
   */
  controlFileOptions: IControlFileOptions

  /**
   * Path to the image you want to use as your app icon. It is copied to
   * /usr/share/pixmaps. Optional.
   */
  icon?: string

  /**
   * Directory your files will be installed to. Defaults to `/usr/lib/${packageName}`.
   */
  installationRoot?: string

  /**
   * This callback makes it possible to modify file headers before they're
   * written to the .tar archive, which is useful for setting permissions.
   * This can be a function or a path to a file that has a function as its
   * default export. See the [Headers]{@link TarFSHeader} interface from tar-fs
   * and {@link https://github.com/mafintosh/tar-fs/blob/7ec11cb27f93948193770f32b4d820e2e7195715/README.md}
   * for more details. Optional.
   */
  modifyTarHeader?: string | ((header: TarFSHeader) => TarFSHeader)

  /**
   * Location of the files you want to package. **This field is mandatory.**
   */
  sourceDir: string

  /**
   * Sets the format used for storing the files. This impacts the build time
   * and .deb output size. Defaults to `tar.gz`.
   *
   * As a rule of thumb, you can expect the following from each format:
   * - `tar` (no compression): lowest resources usage, faster build time, largest .deb size
   * - `tar.gz` (gzip compression using zlib): low resources usage, good build time, good .deb size
   * - `tar.xz` (xz compression using lzma-native): high resources usage, slowest build time, smallest .deb size
   */
  tarballFormat?: 'tar' | 'tar.gz' | 'tar.xz'

  /**
   * Directory where your .deb file will be copied to.
   * **This field is mandatory.**
   */
  targetDir: string

  /**
   * Filename without the `.deb` extension. Defaults to
   * `${packageName}_${version}_${architecture}`.
   */
  targetFileName?: string
}
