/** Makes the browser download a JSON file. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Reads a user-selected file as JSON. */
export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text())
}
