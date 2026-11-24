import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { defineConfig } from 'vite'

function offlineShell() {
  let config
  return {
    name: 'traincraft-offline-shell',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async writeBundle(output) {
      const directory = output.dir
      const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
        .filter(entry => entry.isFile() && entry.name !== 'sw.js')
        .map(entry => '/' + relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/'))
        .sort()
      const worker = await readFile(join(config.root, 'scripts/service-worker.js'), 'utf8')
      const hash = createHash('sha256').update(worker)
      for (const file of files) {
        hash.update(file).update(await readFile(join(directory, file)))
      }
      const cacheName = 'traincraft-shell-' + hash.digest('hex').slice(0, 16)
      await writeFile(join(directory, 'sw.js'),
        `const CACHE_NAME = ${JSON.stringify(cacheName)}\nconst APP_FILES = ${JSON.stringify(files)}\n${worker}`)
    },
  }
}

export default defineConfig({
  plugins: [offlineShell()],
})
