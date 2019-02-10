import {greet} from './lib'

test('it greets correctly', () => {
  expect(greet('Typescript + Jest')).toBe('Hello Typescript + Jest')
})
