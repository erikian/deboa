deboa
===========

deboa is a Node.js tool for creating .deb files (and .ar files, if you ever need one for some reason).

It doesn't depend on any Unix-specific external binaries (I'm looking at you, dpkg and fakeroot), so you can create a
.deb file in pretty much any platform you can run Node.js on: Windows (🔥), OS X, Linux (because why not), you name it.


# Features

deboa provides all the tools you need to create a .deb from scratch or from your own `control` and `data` files:
- Create your .deb in any OS, no superuser privileges or external binaries required
- Supports compression in .tar, .tar.gz or .tar.xz out of the box. If you need another format, you can easily provide your own compressed files and let deboa do the rest
- Support for icon and desktop specification file
- Ability to set chmod permissions for every packaged file and to create symlinks, even on Windows


# About .deb files

A .deb file is just an .ar file, which is made up by a file signature / magic number (the string `!<arch>`) followed by
any number of metadata/file contents pairs.

.debs have three files, the last two are usually compressed in .tar, .tar.gz or .tar.xz format:

- the `debian-binary` file, containing just the string `2.0\n`
- the `control` file, containing metadata about the software it contains and possibly some scripts to be executed
  before/after the software is installed/uninstalled
- the `data` file, which contains the actual software


# Installation

```shell
# Yarn
yarn add --dev deboa

# npm
npm i -D deboa
```

# API

## Creating a .deb from scratch

So you have a folder with the Linux version of your app ready to package. You can use the `Deboa` class to create
the `control` file
and compress the specified directory into the `data` file for you. The following code creates a .deb file with the bare
minimum options:

```ts
import { Deboa } from 'deboa'

const deboa = new Deboa({
  controlFileOptions: {
    maintainer: 'John Doe <john@example.com>',
    packageName: 'my-awesome-app',
    shortDescription: 'users will see this when installing your app',
    version: '1.0.0',
  },
  sourceDir: './my-awesome-app-linux-x64',
  targetDir: './out',
})

deboa.package().then(() => {
  console.log('done')
})
```


### Additional options

For more details, please see the [IDeboa interface](https://github.com/erikian/deboa/blob/main/src/types/IDeboa.ts).

- `additionalTarEntries`: runs after all source files are added to the .tar archive. You can use it to create any symbolic links you might need:

  ```ts
  const deboa = new Deboa({
    additionalTarEntries: [
      // creates a relative symlink from /usr/lib/my-awesome-app/some-executable-file
      // to /usr/bin/my-awesome-app, equivalent to:
      // cd /usr/bin && ln -s ../lib/my-awesome-app/some-executable-file some-executable-file
      {
        gname: 'root',
        linkname: '../lib/my-awesome-app/some-executable-file', // link source
        mode: parseInt('777', 8),
        name: 'usr/bin/my-awesome-app', // link target
        type: 'symlink',
        uname: 'root',
      }
    ],
    // other options
  })
  ```
- `beforeCreateDesktopEntry`: runs before the desktop entry file is created. Allows you to modify the default entries and to add your own.
- `beforePackage`: runs after the files are copied to the temporary directory and before they're packaged. You can use this to add/delete/rename any files before they're packaged.
- `controlFileOptions`: additional control file fields. See the [IControlFileOptions interface](https://github.com/erikian/deboa/blob/main/src/types/IControlFileOptions.ts) for details.
- `icon`: path to the image you want to use as your app icon.
- `modifyTarHeader`: allows you to modify the header of a file before it's added to the `data` tar archive. The main use case
  for this option is setting permissions in order to make files executable when creating a .deb on Windows:

  ```ts
  const deboa = new Deboa({
    modifyTarHeader: header => {
      if (header.name === 'usr/lib/my-awesome-app/some-executable-file') {
        header.mode = parseInt('0755', 8)
      }

      return header
    },
    // other options
  })
  ```
- `tarballFormat`: can be `tar`, `tar.gz` (default) or `tar.xz`.

## Creating a .deb from existing `control` and `data` files

If you have your `control` file handy and your `data` file already compressed and ready to go, you can use
the `writeFromFile` method from the `DeboaFromFile` class to create the metadata and write them directly to the .deb
file. This allows you to have your files compressed by your favorite tool in the format that is best for your case.

```ts
import { DeboaFromFile } from 'deboa'

;(async () => {
  const deboa = new DeboaFromFile({
    outputFile: '/path/to/my-awesome-app_1.0.0_amd64.deb',
  })

  await deboa.writeFromFile('/path/to/control.tar.gz')
  await deboa.writeFromFile('/path/to/data.tar.gz')

  deboa.writeStream.close()

  console.log('done')
})()
```

If you need access to the underlying read streams, you can use the `createReadStream` method, which takes
care of the metadata, then pass the returned stream to the `writeFromStream` method:

```ts
import { DeboaFromFile } from 'deboa'

;(async () => {
  const deboa = new DeboaFromFile({
    outputFile: '/path/to/my-awesome-app_1.0.0_amd64.deb',
  })

  const controlStream = await deboa.createReadStream('/path/to/control.tar.gz')
  await deboa.writeFromStream(controlStream)

  const dataStream = await deboa.createReadStream('/path/to/data.tar.gz')
  await deboa.writeFromStream(dataStream)

  deboa.writeStream.close()

  console.log('done')
})()
```

Note that you need to write the `control` and `data` files **in that order**, otherwise the generated .deb will be
invalid.

### Creating an .ar file

Same as above, just add the `isARFile: true` option to the constructor so the `debian-binary` file doesn't get
created:

```ts
import { DeboaFromFile } from 'deboa'

;(async() => {
  const ar = new DeboaFromFile({
    outputFile: '/path/to/output.ar',
    isARFile: true,
  })

  await ar.writeFromFile('/path/to/some/file')

  deboa.writeStream.close()

  console.log('done')
})()
```

I've added this option just because it was trivial. If you're here because of it, please leave a comment, I'm very
interested in knowing what you've been working with.
