import { createError } from 'nuxt/server'

function catchError<T, E extends true>(callback: () => T, status: number, emit?: E): string
function catchError<T, E extends false>(callback: () => T, status: number, emit: E): string | undefined
function catchError<T>(callback: () => T, status = 400, emit = true) {
  try {
    return callback()
  }
  catch (error) {
    const create = <T>(error: T) => {
      if (emit) throw error
      else console.error(error)
    }

    if (error instanceof Error) {
      const err = createError({ ...error, status })
      err.message = `Uncsrf: ${err.message}`
      create(err)
    }

    create(error)
  }
}

export default catchError
