import * as Quick from './lib'

const app = Quick.quick()

const parseJSON: Quick.Middleware = (request, response, next) => {
  const body: Uint8Array[] = []
  request
    .on('data', (chunk) => {
      body.push(chunk)
    })
    .on('end', () => {
      const cattedBody = Buffer.concat(body).toString()
      request.body = JSON.parse(cattedBody)
      next && next()
    })
}

const logger: Quick.Middleware = (request) => {
  console.log(`${request.method} ${request.url}`)
}

const bodyParser: Quick.Middleware = (request, response, next) => {
  if (request.method === 'POST') {
    parseJSON(request, response, next)
  } else {
    next && next()
  }
}

const delay = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

app
  .use(logger, bodyParser, delay)
  .get('/', (request, response) => {
    response.end('hello')
  })
  .post('/', (request, response) => {
    const {id} = request.body
    response.status(200).json({id: id + 1, timestamp: (request as any).timestamp})
  })
