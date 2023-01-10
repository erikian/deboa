/**
 * Some useful references:
 *
 * https://radagast.ca/linux/anatomy_of_a_deb_file.html
 * https://pubs.opengroup.org/onlinepubs/9699919799/utilities/ar.html
 * https://www.unix.com/man-page/opensolaris/3head/ar.h/
 */

import type { IDeboa, MaintainerScript } from '../types'
import { once } from 'events'
import os from 'os'
import path from 'path'
import type { WriteStream } from 'fs'
import fs from 'fs'
import fsExtra from 'fs-extra'
import { promisify } from 'util'
import fastFolderSize from 'fast-folder-size'
import tar from 'tar-fs'
import { writeFileFromLines } from '../utils/writeFileFromLines'
import { DeboaFromFile } from './DeboaFromFile'
import { PassThrough as PassThroughStream } from 'stream'
import { addTarEntries } from '../utils/addTarEntries'

/**
 * @return IDeboa
 */
class Deboa implements IDeboa {
  /** See {@link IDeboa.additionalTarEntries} */
  additionalTarEntries: IDeboa['additionalTarEntries'] = []

  /** See {@link IDeboa.beforeCreateDesktopEntry} */
  beforeCreateDesktopEntry: IDeboa['beforeCreateDesktopEntry'] = null

  /** See {@link IDeboa.beforePackage} */
  beforePackage: IDeboa['beforePackage'] = null

  /** See {@link IDeboa.controlFileOptions} */
  controlFileOptions: IDeboa['controlFileOptions'] = {
    /** See {@link IDeboa.architecture} */
    architecture: null,

    /** See {@link IDeboa.builtUsing} */
    builtUsing: null,

    /** See {@link IDeboa.conflicts} */
    conflicts: null,

    /** See {@link IDeboa.depends} */
    depends: null,

    /** See {@link IDeboa.essential} */
    essential: null,

    /** See {@link IDeboa.extendedDescription} */
    extendedDescription: null,

    /** See {@link IDeboa.homepage} */
    homepage: null,

    /** See {@link IDeboa.maintainer} */
    maintainer: null,

    /** See {@link IDeboa.maintainerScripts} */
    maintainerScripts: {
      preinst: null,
      postinst: null,
      prerm: null,
      postrm: null,
    },

    /** See {@link IDeboa.packageName} */
    packageName: null,

    /** See {@link IDeboa.preDepends} */
    preDepends: null,

    /** See {@link IDeboa.priority} */
    priority: null,

    /** See {@link IDeboa.recommends} */
    recommends: null,

    /** See {@link IDeboa.section} */
    section: null,

    /** See {@link IDeboa.shortDescription} */
    shortDescription: null,

    /** See {@link IDeboa.source} */
    source: null,

    /** See {@link IDeboa.suggests} */
    suggests: null,

    /** See {@link IDeboa.version} */
    version: null,
  }

  /** See {@link IDeboa.icon} */
  icon: IDeboa['icon'] = null

  /** See {@link IDeboa.modifyTarHeader} */
  modifyTarHeader: IDeboa['modifyTarHeader'] = null

  /** See {@link IDeboa.sourceDir} */
  sourceDir: IDeboa['sourceDir'] = null

  /** See {@link IDeboa.tarballFormat} */
  tarballFormat: IDeboa['tarballFormat'] = null

  /** See {@link IDeboa.targetDir} */
  targetDir: IDeboa['targetDir'] = null

  readonly #appFolderDestination: string = null

  readonly #controlFolderDestination: string = null

  readonly #dataFolderDestination: string = null

  #hooksLoaded = false

  readonly #outputFile: string = null

  readonly #tempDir: string = null

  constructor(options: IDeboa) {
    if (!Object.keys(options || {}).length) {
      throw new Error('No configuration options provided')
    }

    const { sourceDir, targetDir } = options

    if (!sourceDir) {
      throw new Error('The `sourceDir` field is mandatory')
    }

    if (!targetDir) {
      throw new Error('The `targetDir` field is mandatory')
    }

    Deboa.#validateOptions(options)

    const { controlFileOptions } = options

    const osArch = os.arch()

    // default values
    options = {
      ...options,
      controlFileOptions: {
        ...controlFileOptions,
        ...(!controlFileOptions.architecture && {
          architecture: osArch === 'x64' ? 'amd64' : osArch,
        }),
        ...(!controlFileOptions.maintainerScripts && {
          maintainerScripts:
            {} as IDeboa['controlFileOptions']['maintainerScripts'],
        }),
        ...(!controlFileOptions.priority && { priority: 'optional' }),
        ...(!controlFileOptions.extendedDescription && {
          extendedDescription: controlFileOptions.shortDescription,
        }),
      },
      tarballFormat: (
        ['tar', 'tar.gz', 'tar.xz'] as IDeboa['tarballFormat'][]
      ).includes(options.tarballFormat)
        ? options.tarballFormat
        : 'tar.gz',
    }

    for (const [property, value] of Object.entries(options)) {
      this[property] = value
    }

    this.#tempDir = path.join(os.tmpdir(), 'deboa_temp')

    const { architecture, packageName, version } = this.controlFileOptions

    this.#outputFile = path.join(
      this.targetDir,
      `${packageName}_${version}_${architecture}.deb`,
    )

    this.#controlFolderDestination = path.join(this.#tempDir, 'control')

    this.#dataFolderDestination = path.join(this.#tempDir, 'data')

    this.#appFolderDestination = path.join(
      this.#dataFolderDestination,
      ...(options.installationRoot
        ? [options.installationRoot]
        : ['usr', 'lib', packageName]),
    )
  }

  /**
   * Ensures that all required options are present and that the `packageName`
   * and `maintainer` fields are provided in the right format.
   */
  static #validateOptions(options: IDeboa): void {
    console.log('Validating options...\n')

    const {
      controlFileOptions: {
        shortDescription,
        maintainer,
        packageName,
        version,
      },
    } = options as IDeboa

    if (!packageName) {
      throw new Error('The controlFileOptions.`packageName` field is mandatory')
    }

    if (!version) {
      throw new Error('The `controlFileOptions.version` field is mandatory')
    }

    if (!maintainer) {
      throw new Error('The `controlFileOptions.maintainer` field is mandatory')
    }

    if (!shortDescription) {
      throw new Error('The `controlFileOptions.description` field is mandatory')
    }

    if (packageName.length < 2) {
      throw new Error(
        'The `controlFileOptions.packageName` field must be at least two characters long',
      )
    }

    if (
      packageName
        .replace(/[^a-z\d\-+.]/g, '')
        .replace(/^[-+.]/g, '')
        .toLowerCase() !== packageName
    ) {
      throw new Error(
        'The `controlFileOptions.packageName` field contains illegal characters',
      )
    }

    /*
     if (!maintainer.match(/^(\p{L}+ ?)+ ?<(.*?)@(.*?)>$/u)) {
     throw new Error(
     'The `controlFileOptions.maintainer` field does not match the expected format `John Doe <johndoe@example.com>`',
     )
     }
     */

    const { postinst, prerm, postrm, preinst } =
      options.controlFileOptions.maintainerScripts || {}

    for (const [scriptName, scriptPath] of Object.entries({
      postinst,
      postrm,
      preinst,
      prerm,
    })) {
      if (scriptPath) {
        try {
          fs.accessSync(path.resolve(scriptPath))
        } catch (e) {
          throw new Error(
            `Error accessing \`${scriptPath}\` (provided in \`controlFileOptions.maintainerScripts.${scriptName}\`). Make sure that this file exists and is accessible by the current user.`,
          )
        }
      }
    }
  }

  /**
   * Creates the .deb file.
   * @return {Promise<string>} outputFile - Absolute path to the generated .deb
   */
  async package(): Promise<string> {
    const startTime = process.hrtime.bigint()

    const tempDir = this.#tempDir

    await fsExtra.ensureDir(tempDir)

    if (!this.#hooksLoaded) {
      await this.loadHooks()
    }

    await this.#copyFolderTree()

    await this.#copyMaintainerScripts()

    await this.#copyPackageFiles()

    await this.#createControlFile()

    await this.#copyIconAndDesktopEntryFile()

    if (typeof this.beforePackage === 'function') {
      await this.beforePackage(this.#dataFolderDestination)
    }

    await this.#createTarballs()

    await this.#createDeb()

    console.log('Removing temporary files...\n')

    await fs.promises.rm(this.#tempDir, { recursive: true })

    const endTime = process.hrtime.bigint()

    const duration = parseInt(String(endTime - startTime))

    console.log(`.deb created in ${(duration / 1e9).toFixed(2)}s`)

    return this.#outputFile
  }

  /**
   * Creates the tarballs for the control and data files.
   */
  async #createTarballs(): Promise<void> {
    console.log('Packaging files....\n')

    const { tarballFormat } = this

    const dataFileLocation = this.#dataFolderDestination + `.${tarballFormat}`

    const controlFileLocation =
      this.#controlFolderDestination + `.${tarballFormat}`

    let dataFileCompressor: WriteStream
    let controlFileCompressor: WriteStream

    switch (tarballFormat) {
      case 'tar': {
        dataFileCompressor = new PassThroughStream() as unknown as WriteStream
        controlFileCompressor =
          new PassThroughStream() as unknown as WriteStream

        break
      }

      case 'tar.gz': {
        const zlib = (await import('zlib')).default

        dataFileCompressor = zlib.createGzip() as unknown as WriteStream
        controlFileCompressor = zlib.createGzip() as unknown as WriteStream

        break
      }

      case 'tar.xz': {
        const lzma = (await import('lzma-native')).default

        dataFileCompressor = lzma.createCompressor({
          threads: 0,
        }) as unknown as WriteStream

        controlFileCompressor = lzma.createCompressor({
          threads: 0,
        }) as unknown as WriteStream

        break
      }
    }

    const dataFileWriteStream = fs.createWriteStream(dataFileLocation)
    const controlFileWriteStream = fs.createWriteStream(controlFileLocation)

    tar
      .pack(this.#dataFolderDestination, {
        map: header => {
          // Why: while undocumented, this header accepts options for the header passed to tar-stream's pack function

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          header.gname = 'root'

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          header.uname = 'root'

          // sensible defaults for Windows users
          if (process.platform === 'win32') {
            const defaultFilePermission = parseInt('0644', 8)
            const defaultFolderPermission = parseInt('0755', 8)

            switch (header.type) {
              case 'file': {
                header.mode = defaultFilePermission
                break
              }

              case 'directory': {
                header.mode = defaultFolderPermission
                break
              }
            }
          }

          if (typeof this.modifyTarHeader === 'function') {
            header = this.modifyTarHeader(header)
          }

          return header
        },
        ...(this.additionalTarEntries.length && {
          finalize: false,
          finish: async pack => {
            await addTarEntries({ entries: this.additionalTarEntries, pack })
            pack.finalize()
          },
        }),
      })
      .pipe(dataFileCompressor)
      .pipe(dataFileWriteStream)

    tar
      .pack(this.#controlFolderDestination, {
        map: header => {
          const maintainerScripts: MaintainerScript[] = [
            'postinst',
            'postrm',
            'preinst',
            'prerm',
          ]

          // maintainer scripts must be executable
          if (maintainerScripts.includes(header.name as MaintainerScript)) {
            header.mode = parseInt('0755', 8)
          }

          return header
        },
      })
      .pipe(controlFileCompressor)
      .pipe(controlFileWriteStream)

    await Promise.all([
      once(dataFileWriteStream, 'finish'),
      once(controlFileWriteStream, 'finish'),
    ])
  }

  /**
   * Copies the empty folders to the temporary location.
   */
  async #copyFolderTree(): Promise<void> {
    console.log('Creating directory structure in the temporary folder...\n')

    await fsExtra.ensureDir(this.#appFolderDestination)
    await fsExtra.ensureDir(this.#controlFolderDestination)
  }

  /**
   * Copies the source files to the temporary folder.
   */
  async #copyPackageFiles(): Promise<void> {
    console.log('Copying source directory...\n')

    await fsExtra.copy(this.sourceDir, this.#appFolderDestination)
  }

  /**
   * Copies the maintainer scripts to the temporary folder.
   */
  async #copyMaintainerScripts(): Promise<void> {
    console.log('Copying maintainer scripts...\n')

    const {
      controlFileOptions: {
        maintainerScripts: { postinst, postrm, preinst, prerm } = {},
      },
    } = this

    const scripts = Object.entries({ postinst, postrm, preinst, prerm }).filter(
      ([, scriptPath]) => scriptPath,
    )

    for (const [scriptName, scriptPath] of scripts) {
      await fs.promises.copyFile(
        path.resolve(scriptPath),
        path.join(this.#controlFolderDestination, scriptName),
      )
    }
  }

  /**
   * Creates the control file and writes it to the temporary folder.
   */
  async #createControlFile(): Promise<void> {
    console.log('Creating control file...\n')

    const {
      controlFileOptions: {
        packageName,
        version,
        section,
        priority,
        architecture,
        maintainer,
        homepage,
        suggests = [],
        depends = [],
        recommends = [],
        shortDescription,
        extendedDescription,
        builtUsing,
        conflicts = [],
        essential,
        preDepends = [],
      },
    } = this

    const fastFolderSizeAsync = promisify(fastFolderSize)

    const installedSize = await fastFolderSizeAsync(this.sourceDir)

    const lines = [
      `Package: ${packageName}`,
      `Version: ${version}`,
      section && `Section: ${section}`,
      `Priority: ${priority}`,
      `Architecture: ${architecture}`,
      `Maintainer: ${maintainer}`,
      Array.isArray(depends) &&
        depends.length &&
        `Depends: ${depends.join(', ')}`,
      preDepends.length && `Pre-Depends: ${preDepends.join(', ')}`,
      recommends.length && `Recommends: ${recommends.join(', ')}`,
      suggests.length && `Suggests: ${suggests.join(', ')}`,
      conflicts.length && `Conflicts: ${conflicts.join(', ')}`,
      `Installed-Size: ${Math.ceil(installedSize / 1024)}`,
      homepage && `Homepage: ${homepage}`,
      builtUsing && `Built-Using: ${builtUsing}`,
      essential && `Essential: ${essential}`,
      `Description: ${shortDescription}`,
      ` ${extendedDescription}`,
    ].filter(Boolean)

    await writeFileFromLines({
      filePath: path.join(this.#controlFolderDestination, 'control'),
      lines,
    })
  }

  /**
   * Copies the provided icon to the temporary folder
   * and writes the desktop entry file.
   */
  async #copyIconAndDesktopEntryFile(): Promise<void> {
    let iconFileExists = false

    let iconDestination = null

    const { packageName, shortDescription } = this.controlFileOptions

    if (this.icon) {
      const iconPath = path.resolve(this.icon)

      iconFileExists = await fsExtra.pathExists(iconPath)

      const { ext: extension } = path.parse(iconPath)

      if (iconFileExists) {
        iconDestination = path.join(
          this.#dataFolderDestination,
          'usr/share/pixmaps',
          packageName + extension,
        )

        await fsExtra.ensureDir(path.resolve(iconDestination, '../'))

        await fsExtra.copy(iconPath, iconDestination)

        console.log(`App icon saved to ${iconDestination}`)
      } else {
        console.warn(
          `\nWARNING: file \`${iconPath}\` not found, skipping app icon...\n`,
        )
      }
    }

    let desktopEntries: Record<string, string> = {
      Comment: shortDescription,
      GenericName: packageName,
      Name: packageName,
      Type: 'Application',
      ...(iconFileExists && {
        Icon: packageName,
      }),
    }

    if (typeof this.beforeCreateDesktopEntry === 'function') {
      desktopEntries = await this.beforeCreateDesktopEntry(desktopEntries)
    }

    if (!Object.keys(desktopEntries).length) {
      return
    }

    const lines = Object.entries(desktopEntries).reduce(
      (acc, entry) => [...acc, entry.join('=')],
      [],
    )

    const desktopFileDestination = path.join(
      this.#dataFolderDestination,
      'usr/share/applications',
      `${packageName}.desktop`,
    )

    await fsExtra.ensureDir(path.resolve(desktopFileDestination, '../'))

    await writeFileFromLines({
      filePath: desktopFileDestination,
      lines: ['[Desktop Entry]', ...lines],
    })

    console.log(`Desktop entries file saved to ${desktopFileDestination}`)
  }

  /**
   * Checks if the values provided to the hook options are file paths
   * and imports the actual functions from them if necessary.
   */
  async loadHooks(): Promise<void> {
    const { beforePackage, modifyTarHeader, beforeCreateDesktopEntry } = this

    const hooks = {
      beforeCreateDesktopEntry,
      beforePackage,
      modifyTarHeader,
    }

    for (const [hookName, hookValue] of Object.entries(hooks)) {
      if (hookValue) {
        switch (typeof hookValue) {
          case 'function': {
            this[hookName] = hookValue
            break
          }

          case 'string': {
            const filePath = path.resolve(hookValue)

            const fileExists = await fsExtra.pathExists(filePath)

            if (!fileExists) {
              throw new Error(
                `The file \`${hookValue}\` doesn't exist or cannot be accessed by the current user.`,
              )
            }

            const importedFn = (await import(filePath)).default

            if (typeof importedFn === 'function') {
              this[hookName] = importedFn
            } else {
              throw new Error(
                `The file \`${filePath}\` must have a function as its default export.`,
              )
            }

            break
          }

          default: {
            throw new Error(
              `Invalid type provided for the \`${hookName}\` option, expected a function or a path to a file that has a function as its default export.`,
            )
          }
        }
      }
    }

    this.#hooksLoaded = true
  }

  /**
   * Writes the .deb to the output folder.
   */
  async #createDeb(): Promise<void> {
    console.log('Writing .deb file...\n')

    await fsExtra.ensureDir(this.targetDir)

    const deBoaFromFile = new DeboaFromFile({
      outputFile: this.#outputFile,
    })

    try {
      await deBoaFromFile.writeFromFile(
        this.#controlFolderDestination + `.${this.tarballFormat}`,
      )

      await deBoaFromFile.writeFromFile(
        this.#dataFolderDestination + `.${this.tarballFormat}`,
      )

      deBoaFromFile.writeStream.close()
    } catch (e) {
      console.log('ERROR: ', e)
      throw e
    }
  }
}

export { Deboa }
