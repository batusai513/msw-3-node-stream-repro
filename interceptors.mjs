import { readFileSync } from 'node:fs'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'

const { version } = JSON.parse(
  readFileSync(
    new URL('./node_modules/@mswjs/interceptors/package.json', import.meta.url),
    'utf8',
  ),
)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let push

const interceptor = new FetchInterceptor()
interceptor.on('request', ({ request, controller }) => {
  request.signal.addEventListener('abort', () => {
    console.log('listener: request.signal aborted')
  })
  const stream = new ReadableStream({
    start(streamController) {
      push = () => streamController.enqueue(new TextEncoder().encode('data: hello\n\n'))
    },
    cancel() {
      console.log('listener: stream cancelled')
    },
  })
  controller.respondWith(
    new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
  )
})
interceptor.apply()

console.log(`@mswjs/interceptors ${version}, node ${process.version}`)

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

// 2. Aborting the request should reach the listener.
abortController.abort()
await wait(500)
console.log('done (no "listener:" line above means the abort was not seen)')
interceptor.dispose()
