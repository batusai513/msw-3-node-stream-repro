import { readFileSync } from 'node:fs'
import { setupServer } from 'msw/node'

// msw 3 moved `http` to its own entrypoint; fall back to the root for 2.x.
const { http, HttpResponse } = await import('msw/http').catch(() => import('msw'))
const { version } = JSON.parse(
  readFileSync(new URL('./node_modules/msw/package.json', import.meta.url), 'utf8'),
)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let push

const server = setupServer(
  http.get('http://localhost/stream', ({ request }) => {
    request.signal.addEventListener('abort', () => {
      console.log('handler: request.signal aborted')
    })
    const stream = new ReadableStream({
      start(controller) {
        push = () => controller.enqueue(new TextEncoder().encode('data: hello\n\n'))
      },
      cancel() {
        console.log('handler: stream cancelled')
      },
    })
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }),
)
server.listen()

console.log(`msw ${version}, node ${process.version}`)

// 1. The response should arrive before the stream's first chunk.
const abortController = new AbortController()
const pending = fetch('http://localhost/stream', { signal: abortController.signal })
console.log(
  'fetch() before the first chunk:',
  await Promise.race([
    pending.then(() => 'resolved'),
    wait(500).then(() => 'pending after 500 ms'),
  ]),
)
push()
console.log('fetch() after the first chunk:', (await pending).status)

// 2. Aborting the request should reach the handler.
abortController.abort()
await wait(500)
console.log('done (no "handler:" line above means the abort was not seen)')
server.close()
