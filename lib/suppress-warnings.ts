// Suppress Node.js deprecation warnings from dependencies
// This suppresses url.parse() deprecation warnings from NextAuth/Google APIs
if (typeof process !== 'undefined') {
  const originalEmitWarning = process.emitWarning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.emitWarning = function (warning: any, ...args: any[]) {
    // Suppress DEP0169 (url.parse() deprecation) warnings
    if (
      typeof warning === 'string' &&
      warning.includes('url.parse()')
    ) {
      return // Suppress this warning
    }
    if (
      warning &&
      typeof warning === 'object' &&
      warning.name === 'DeprecationWarning' &&
      warning.message &&
      warning.message.includes('url.parse()')
    ) {
      return // Suppress this warning
    }
    // Call original emitWarning for other warnings
    return originalEmitWarning.call(process, warning, ...args)
  } as typeof process.emitWarning
}




