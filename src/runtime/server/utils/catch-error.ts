import { createError } from 'nuxt/server'

export default function catchError<T>(callback: () => T, status = 400) {
  try {
    return callback()
  }
  catch (error) {
    if (error instanceof Error) {
      const err = createError({ ...error, status })
      err.message = `Uncsrf: ${err.message}`
      throw err
    }

    throw error
  }
}
