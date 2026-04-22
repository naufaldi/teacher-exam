import { Layer } from 'effect'
import { DbLayer } from './DbLayer.js'

// Compose all service layers here as they are added
export const AppLayer = DbLayer
