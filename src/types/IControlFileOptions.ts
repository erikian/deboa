import { MaintainerScript } from './MaintainerScript'
import { Priority } from './Priority'
import { Section } from './Section'

/**
 * The descriptions are mostly just shameless copies from the following docs:
 *
 * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html}
 *
 * {@link https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html}
 *
 * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html}
 */
export interface IControlFileOptions {
  /**
   * Target architecture. Defaults to the current system's architecture.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-architecture}
   */
  architecture?: string

  /**
   * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html#s-built-using}
   */
  builtUsing?: string

  /**
   * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html}
   */
  conflicts?: string[]

  /**
   * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html}
   */
  depends?: string[]

  /**
   * If set to `yes`, then the package management system will refuse to
   * remove
   * the package (upgrading and replacing it is still possible). The other
   * possible value is `no`, which is the same as not having the field at
   * all.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-essential}
   */
  essential?: 'yes' | 'no'

  /**
   * Extended description for the package. Defaults to the value provided for
   * the `shortDescription` option.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-description}
   */
  extendedDescription?: string

  /**
   * URL for this package.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-homepage}
   */
  homepage?: string

  /**
   * The package maintainer's name and email address. The name must come
   * first, then the email address inside angle brackets. **This field is
   * mandatory.**
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-maintainer}
   */
  maintainer: string

  /**
   * Path to the scripts you want to execute before/after the system
   * installs/upgrades/removes your package. There are quite a few rules
   * here,
   * so please check
   * {@link
   * https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html} for
   * details.
   */
  maintainerScripts?: Partial<Record<MaintainerScript, string>>

  /**
   * Binary package name. Must be at least two characters long and must start
   * with an alphanumeric character. Only lower case letters (a-z), digits
   * (0-9), plus (+) and minus (-) signs, and periods (.) are allowed. **This
   * field is mandatory.**
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source}
   */
  packageName: string

  /**
   * See {@link
   * https://www.debian.org/doc/debian-policy/ch-relationships.html} for
   * details.
   */
  preDepends?: string[]

  /**
   * This field represents how important it is that the user have the package
   * installed. Defaults to `optional`.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-priority}
   */
  priority?: Priority

  /**
   * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html}
   */
  recommends?: string[]

  /**
   * This field specifies an application area into which the package has been
   * classified. This is a recommended field.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-section}
   */
  section?: Section

  /**
   * Short, single-line synopsys for the package. Usually ~80 characters.
   * **This field is mandatory.**
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-description}
   */
  shortDescription: string

  /**
   * Source package name.
   *
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source}
   */
  source?: string

  /**
   * {@link https://www.debian.org/doc/debian-policy/ch-relationships.html}
   */
  suggests?: string[]

  /**
   * Version number of the package in the
   * `[epoch:]upstream_version[-debian_revision]` format. See
   * {@link https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-version}
   * for details. **This field is mandatory.**
   */
  version: string
}
