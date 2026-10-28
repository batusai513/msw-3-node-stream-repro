# msw 3 in Node: streamed responses

Two behaviours of `setupServer` that changed from msw 2.15.0 to 3.0.3, shown
with Node's own `fetch` and no test runner.

```bash
npm install
npm start
```

Compare with 2.x:

```bash
npm install msw@2.15.0 --no-save
npm start
```

## Output

msw 3.0.3:

```
msw 3.0.3, node v24.21.0
fetch() before the first chunk: pending after 500 ms
fetch() after the first chunk: 200
done (no "handler:" line above means the abort was not seen)
```

msw 2.15.0:

```
msw 2.15.0, node v24.21.0
fetch() before the first chunk: resolved
fetch() after the first chunk: 200
handler: request.signal aborted
done (no "handler:" line above means the abort was not seen)
```

1. **The response waits for the first chunk.** With 3.0.3, `fetch()` stays
   pending until the resolver's `ReadableStream` enqueues something. An
   `EventSource` therefore never fires `open` while the server has not sent an
   event yet.
2. **A client abort doesn't reach the handler.** With 3.0.3, aborting the
   request (or closing an `EventSource`) neither aborts `request.signal` nor
   calls the stream's `cancel()`.

In the browser (`setupWorker`, 3.0.3) the response arrives before the first
chunk, and an abort calls the stream's `cancel()`.

## Without msw

`interceptors.mjs` shows the same two behaviours with `@mswjs/interceptors`
alone (`FetchInterceptor`). Both changed in 0.42.0.

```bash
npm run interceptors
npm install @mswjs/interceptors@0.41.9 --no-save && npm run interceptors
```

@mswjs/interceptors 0.45.10 (same on 0.42.0):

```
fetch() before the first chunk: pending after 500 ms
fetch() after the first chunk: 200
done (no "listener:" line above means the abort was not seen)
```

@mswjs/interceptors 0.41.9:

```
fetch() before the first chunk: resolved
fetch() after the first chunk: 200
listener: request.signal aborted
done (no "listener:" line above means the abort was not seen)
```
