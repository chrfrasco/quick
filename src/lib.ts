import * as http from 'http'

const isPromise = <T>(obj: any): obj is Promise<T> =>
  obj != null &&
  (typeof obj === 'object' || typeof obj === 'function') &&
  typeof obj.then === 'function'

export type Request = {
  method: Methods
  url: string
  body: any | undefined
} & http.IncomingMessage

const enhanceRequest = (request: http.IncomingMessage): Request =>
  Object.assign({
    method: 'get' as Methods,
    url: '/',
    body: undefined,
  }, request)

export type Response = {
  status(code: number): Response
  json(obj: any): Response
} & http.ServerResponse

const enhanceResponse = (response: http.ServerResponse): Response =>
  Object.assign(response, {
    status(statusCode: number) {
      this.statusCode = statusCode
      return this
    },
    json(obj) {
      this.setHeader('Content-Type', 'application/json')
      this.end(JSON.stringify(obj))
      return this
    }
  } as Response)

export type NextFn = () => void

export type Middleware = (request: Request, response: Response, next?: NextFn) => void

type Methods = 'GET' | 'POST'

const getMethod = (method?: string): Methods => {
  const meth = method ? method.toUpperCase() : 'GET'
  switch (meth) {
    case 'GET':
    case 'POST':
      return meth;
    default:
      throw new Error(`${method} is not a valid HTTP verb`)
  }
}

type Handlers = { [Method in Methods]: { [path: string]: Middleware } }

export const quick = () => {
  const handlers: Handlers = {
    GET: {},
    POST: {}
  }

  const middlewares: Middleware[] = []

  const makeNext = (middlewares: Middleware[], request: Request, response: Response) => (): void => {
    if (middlewares.length > 0) {
      const [middleware, ...remainingMiddlewares] = middlewares
      const next = makeNext(remainingMiddlewares, request, response)

      if (middleware.length > 2) {
        middleware(request, response)
        return
      }

      const result = middleware(request, response)
      if (isPromise(result)) {
        result.then(() => next())
        return
      }

      next()
    }

    const method = getMethod(request.method)
    const handler = handlers[method][request.url]

    if (handler != null) {
      handler(request, response)
      return
    }

    response.status(404).end()
  }

  const listen = (port: number) =>
    http
      .createServer((request, response) => {
        makeNext(
          middlewares,
          enhanceRequest(request),
          enhanceResponse(response)
        )()
      })
      .listen(port)

  return {
    use(...middleware: Middleware[]) {
      middlewares.push(...middleware)
      return this
    },
    get(path: string, middleware: Middleware) {
      handlers.GET[path] = middleware
      return this
    },
    post(path: string, middleware: Middleware) {
      handlers.POST[path] = middleware
      return this
    },
    listen
  }
}
