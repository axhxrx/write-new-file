/**
 Options for writing new files. Currently just lets you set the output directory, with more options possibly, maybe, potentially coming in *el futuro* (e.g. a custom unique-filename-generator function).

 @property outputDirectory Where to write the files (defaults to current working directory)
*/
export type WriteNewOptions = {
  outputDirectory: string;
  // mode?: string, // perhaps one day
};

/**
 Private class that manages the default options. You shouldn't need to (or be able to, if coding normally) use this directly - use WriteNewOptions.default instead.
*/
class WriteNewOptionsDefaults
{
  private constructor()
  {
    // 🌹 Hi, mom!!
  }

  private static _defaultOptions?: WriteNewOptions;

  static get defaultOptions(): WriteNewOptions
  {
    return this._defaultOptions ?? {
      outputDirectory: Deno.cwd(),
      // mode: '0666',
    };
  }

  static set defaultOptions(options: WriteNewOptions | null)
  {
    this._defaultOptions = options ?? undefined;
  }
}

/**
 This type isn't supposed to show up anywhere. This is my latest workaround for JSR's slow-types checking. I actually like the slow-types checking, and this workaround isn't as onerous as the previous ones I came up with.

 But, not well tested either so I hope "SlowTypesDefeater" doesn't show up in in-editor help popups, etc. (The problem at hand is that slow-types checking doesn't allow this old TypeScript saw of exporting a type and a const with the same name to get class-like convenience without class warfare.)
*/
type SlowTypesDefeater = WriteNewOptions & { default: WriteNewOptions };

/**
 Configuration object for writeNewFile(). Access default options via WriteNewOptions.default. You can also set the default options for your own app so that they needn't be passed to each call to `writeNewFile()`. (Useful if your app only writes to a single directory, for example.)
*/
export const WriteNewOptions: SlowTypesDefeater = {
  /**
   Gets the default options.
  */
  get default(): WriteNewOptions
  {
    return WriteNewOptionsDefaults.defaultOptions;
  },

  /**
   Sets the default options.
  */
  set default(options: WriteNewOptions | null)
  {
    WriteNewOptionsDefaults.defaultOptions = options;
  },

  get outputDirectory(): string
  {
    return this.default.outputDirectory;
  },
};
