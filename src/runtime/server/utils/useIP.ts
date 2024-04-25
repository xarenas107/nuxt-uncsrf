import { getRequestIP } from 'h3'
import type { H3Event } from "h3"

export const useIP = (event:H3Event) => getRequestIP(event) || getRequestIP(event,{ xForwardedFor:true }) || '127.0.0.1'
