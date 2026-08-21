declare module '*.module.css' {
  const classes: Readonly<Record<string, string>> & {
    readonly dictionaryModal: string
    readonly dictionaryModalContent: string
    readonly glossaryModal: string
    readonly glossaryModalContent: string
  }
  export default classes
}
